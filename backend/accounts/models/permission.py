import uuid
from django.db import models


class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codename = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=200)
    module = models.CharField(max_length=50)
    category = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_permission'
        indexes = [
            models.Index(fields=['module'], name='idx_perm_module'),
            models.Index(fields=['codename'], name='idx_perm_codename'),
        ]

    def __str__(self):
        return self.codename
