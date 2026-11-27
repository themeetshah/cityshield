from django.apps import AppConfig
from django.db.models.signals import post_migrate


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        from cityshield_backend.supabase_lockdown import lock_down_after_migrate

        # One run per `migrate` (sender filter) is enough: the SQL covers every table.
        post_migrate.connect(lock_down_after_migrate, sender=self, dispatch_uid='supabase_lockdown')
