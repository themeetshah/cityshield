"""
Map legacy roles onto the new role model:
  admin / any superuser   -> superadmin
  Citizen (bad casing)    -> citizen
  municipality            -> municipal_officer
  government              -> citizen   (no equivalent; superadmin can re-assign)
and keep is_staff / is_superuser in sync with role.
"""
from django.db import migrations

LEGACY = {
    'admin': 'superadmin',
    'municipality': 'municipal_officer',
    'government': 'citizen',
}


def forwards(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.all():
        role = (user.role or 'citizen').strip()
        role = LEGACY.get(role, role.lower())
        if user.is_superuser:
            role = 'superadmin'
        user.role = role
        user.is_staff = user.is_superuser = role == 'superadmin'
        user.save(update_fields=['role', 'is_staff', 'is_superuser'])


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0013_alter_user_managers_user_created_by_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
