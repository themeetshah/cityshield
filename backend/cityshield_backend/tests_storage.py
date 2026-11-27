"""Supabase Storage configuration. These tests build storages offline; nothing is uploaded."""
from django.test import SimpleTestCase
from django.utils.module_loading import import_string

from cityshield_backend.storage import SupabasePrivateStorage, supabase_storage_settings

SETTINGS = supabase_storage_settings(
    supabase_url='https://abcd1234.supabase.co',
    access_key='key-id',
    secret_key='secret',
    region='ap-south-1',
    public_bucket='report-media',
    private_bucket='sos-videos',
)


def build(alias):
    entry = SETTINGS[alias]
    return import_string(entry['BACKEND'])(**entry['OPTIONS'])


class SupabaseStorageSettingsTests(SimpleTestCase):
    def test_public_bucket_gives_plain_public_url(self):
        url = build('default').url('report_media/abc123.jpg')
        self.assertEqual(
            url, 'https://abcd1234.supabase.co/storage/v1/object/public/report-media/report_media/abc123.jpg')

    def test_private_bucket_never_builds_a_url(self):
        storage = build('sos_private')
        self.assertIsInstance(storage, SupabasePrivateStorage)
        with self.assertRaises(NotImplementedError):
            storage.url('sos_videos/1/clip.webm')

    def test_client_uses_supabase_s3_endpoint_with_path_style(self):
        for alias, bucket in (('default', 'report-media'), ('sos_private', 'sos-videos')):
            storage = build(alias)
            self.assertEqual(storage.bucket_name, bucket)
            self.assertEqual(storage.endpoint_url, 'https://abcd1234.supabase.co/storage/v1/s3')
            config = storage.client_config
            self.assertEqual(config.s3, {'addressing_style': 'path'})
            self.assertEqual(config.signature_version, 's3v4')
            self.assertFalse(storage.file_overwrite)

    def test_tests_never_use_remote_storage(self):
        from django.conf import settings
        self.assertFalse(settings.USE_SUPABASE_STORAGE)
        self.assertNotIn('sos_private', settings.STORAGES)


class SupabaseLockdownTests(SimpleTestCase):
    databases = {'default'}

    def test_skipped_outside_supabase_postgres(self):
        from cityshield_backend.supabase_lockdown import lock_down_public_schema
        self.assertFalse(lock_down_public_schema('default'))  # test DB is SQLite

    def test_lockdown_sql_covers_rls_grants_and_future_tables(self):
        from cityshield_backend.supabase_lockdown import LOCKDOWN_SQL
        for fragment in ('ENABLE ROW LEVEL SECURITY',
                         'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated',
                         'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES'):
            self.assertIn(fragment, LOCKDOWN_SQL)
