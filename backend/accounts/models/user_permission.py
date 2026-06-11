import uuid
from django.db import models


class UserPermission(models.Model):
    EFFECT_CHOICES = [('allow', 'Allow'), ('deny', 'Deny')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='user_permissions_rbac')
    permission = models.ForeignKey('accounts.Permission', on_delete=models.CASCADE, related_name='user_permissions')
    effect = models.CharField(max_length=10, choices=EFFECT_CHOICES)
    reason = models.TextField(blank=True)
    granted_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_user_permissions'
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_userpermission'
        unique_together = [('user', 'permission')]
        indexes = [
            models.Index(fields=['user'], name='idx_userperm_user'),
        ]

    def __str__(self):
        return f"{self.user.username} {self.effect} {self.permission.codename}"
