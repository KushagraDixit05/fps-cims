import uuid

from django.conf import settings
from django.db import models


class UserPermission(models.Model):
    """Per-user permission override. ``effect='deny'`` always wins over a role
    grant; ``effect='allow'`` adds a permission on top of the role. ``expires_at``
    NULL means the override is permanent."""

    EFFECT_CHOICES = [
        ('allow', 'Allow'),
        ('deny', 'Deny'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='permission_overrides',
    )
    permission = models.ForeignKey(
        'accounts.Permission', on_delete=models.CASCADE,
        related_name='user_overrides',
    )
    effect = models.CharField(max_length=10, choices=EFFECT_CHOICES)
    reason = models.TextField(blank=True, default='')
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='granted_user_permissions',
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_userpermission'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'permission'], name='uniq_user_permission'
            ),
            models.CheckConstraint(
                condition=models.Q(effect__in=['allow', 'deny']),
                name='ck_userperm_effect',
            ),
        ]
        indexes = [
            models.Index(fields=['user'], name='idx_userperm_user'),
            models.Index(
                fields=['expires_at'], name='idx_userperm_expires',
                condition=models.Q(expires_at__isnull=False),
            ),
        ]

    def __str__(self):
        return f'{self.user_id} {self.effect} {self.permission.codename}'
