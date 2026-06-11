import uuid
from django.db import models


class DeviceRegistration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=200)
    device_name = models.CharField(max_length=200, blank=True)
    platform = models.CharField(max_length=20, blank=True)
    app_version = models.CharField(max_length=20, blank=True)
    last_active_at = models.DateTimeField(null=True, blank=True)
    is_trusted = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_deviceregistration'
        unique_together = [('user', 'device_id')]
        indexes = [
            models.Index(fields=['user'], name='idx_device_user'),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.device_id}"


class RefreshTokenBlacklist(models.Model):
    jti = models.UUIDField(primary_key=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blacklisted_tokens')
    revoked_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'accounts_refreshtokenblacklist'
        indexes = [
            models.Index(fields=['user'], name='idx_blacklist_user'),
        ]

    def __str__(self):
        return f"revoked {self.jti} ({self.reason})"
