from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Wire RBAC cache-invalidation signal handlers (Phase 2).
        # Import is deferred to here so the app registry is fully populated
        # before any model references are resolved.
        from accounts.signals import register_signals
        register_signals()
