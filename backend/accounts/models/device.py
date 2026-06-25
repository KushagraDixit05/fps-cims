import uuid

from django.conf import settings
from django.db import models


class DeviceRegistration(models.Model):
    """Tracks devices used by each field executive."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='devices',
    )
    device_id = models.CharField(max_length=200)
    device_name = models.CharField(max_length=200, blank=True, default='')
    platform = models.CharField(max_length=20, blank=True, default='')
    app_version = models.CharField(max_length=20, blank=True, default='')
    last_active_at = models.DateTimeField(null=True, blank=True)
    is_trusted = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_deviceregistration'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'device_id'], name='uniq_user_device'
            ),
        ]
        indexes = [
            models.Index(fields=['user'], name='idx_device_user'),
        ]

    def __str__(self):
        return f'{self.device_name or self.device_id} ({self.platform})'


class RefreshTokenBlacklist(models.Model):
    """Application-level record of revoked refresh tokens, keyed by JWT ``jti``.

    Complements ``rest_framework_simplejwt.token_blacklist`` by carrying a
    human-readable ``reason``. Consumed by the permission-revocation flow in
    later phases; schema only at Phase 1.
    """

    jti = models.UUIDField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='revoked_tokens',
    )
    revoked_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'accounts_refreshtokenblacklist'
        indexes = [
            models.Index(fields=['user'], name='idx_blacklist_user'),
        ]

    def __str__(self):
        return f'{self.jti} ({self.reason})'
