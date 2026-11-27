"""
Keep Supabase's auto-generated REST API (PostgREST) away from Django's tables.

Supabase exposes the `public` schema to its `anon` / `authenticated` roles, whose
keys are meant to be shipped to browsers. CityShield never uses that API - all
access goes through Django - so after every `migrate` we:

  * enable row level security on every table in `public` (no policies = no rows
    for API roles; Django connects as the table owner, which bypasses RLS), and
  * revoke all table/sequence privileges from `anon` and `authenticated`,
    including default privileges for tables created by future migrations.

Does nothing on SQLite or on a Postgres server without Supabase's roles.
"""
from django.db import connections

LOCKDOWN_SQL = """
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
END $$;
"""


def has_supabase_roles(connection):
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated')")
        return cursor.fetchone()[0] == 2


def lock_down_public_schema(using='default'):
    """Return True if the lockdown ran (Supabase Postgres), False if skipped."""
    connection = connections[using]
    if connection.vendor != 'postgresql' or not has_supabase_roles(connection):
        return False
    with connection.cursor() as cursor:
        cursor.execute(LOCKDOWN_SQL)
    return True


def lock_down_after_migrate(sender, using='default', **kwargs):
    lock_down_public_schema(using)
