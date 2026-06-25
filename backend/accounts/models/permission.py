import uuid

from django.db import models


class Permission(models.Model):
    """Master permission catalogue. Every permission codename lives here.

    Codenames follow the convention ``can_<verb>_<subject>`` (see
    docs/rbac/02-PERMISSION-ENGINE.md). Permissions are referenced by Role
    (via RolePermission) and by per-user overrides (UserPermission).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codename = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=200)
    module = models.CharField(max_length=50)
    category = models.CharField(max_length=50)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_permission'
        ordering = ['module', 'codename']
        # `codename` is already indexed by its UNIQUE constraint; only the
        # non-unique `module` lookup needs an explicit index.
        indexes = [
            models.Index(fields=['module'], name='idx_perm_module'),
        ]

    def __str__(self):
        return self.codename
