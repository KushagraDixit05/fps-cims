import uuid
from django.db import models


class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_preset = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_role'
        indexes = [
            models.Index(fields=['code'], name='idx_role_code'),
            models.Index(fields=['is_active'], name='idx_role_active'),
        ]

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey('accounts.Permission', on_delete=models.CASCADE, related_name='role_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_role_permissions'
    )

    class Meta:
        db_table = 'accounts_rolepermission'
        unique_together = [('role', 'permission')]
        indexes = [
            models.Index(fields=['role'], name='idx_roleperm_role'),
            models.Index(fields=['permission'], name='idx_roleperm_perm'),
        ]

    def __str__(self):
        return f"{self.role.code} → {self.permission.codename}"
