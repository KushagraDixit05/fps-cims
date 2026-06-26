from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'
    verbose_name = 'Audit Trail'

    def ready(self):
        # Register audit signals (no-op for now; import triggers registration).
        try:
            import audit.signals  # noqa: F401
        except ImportError:
            pass
