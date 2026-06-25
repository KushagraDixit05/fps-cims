import uuid

from django.conf import settings
from django.db import models


class Role(models.Model):
    """A named bundle of permissions. Preset roles ship with the system;
    admins may create custom roles (``is_preset=False``)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    is_preset = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_role'
        ordering = ['name']
        # `code` is already indexed by its UNIQUE constraint.
        indexes = [
            models.Index(fields=['is_active'], name='idx_role_active'),
        ]

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    """Many-to-many join between Role and Permission."""

    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name='role_permissions'
    )
    permission = models.ForeignKey(
        'accounts.Permission', on_delete=models.CASCADE,
        related_name='permission_roles',
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='granted_role_permissions',
    )

    class Meta:
        db_table = 'accounts_rolepermission'
        constraints = [
            models.UniqueConstraint(
                fields=['role', 'permission'], name='uniq_role_permission'
            ),
        ]
        indexes = [
            models.Index(fields=['role'], name='idx_roleperm_role'),
            models.Index(fields=['permission'], name='idx_roleperm_perm'),
        ]

    def __str__(self):
        return f'{self.role.code} → {self.permission.codename}'
