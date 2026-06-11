import uuid
from django.db import models


class Region(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    taluka = models.CharField(max_length=100, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_region'
        indexes = [
            models.Index(fields=['state'], name='idx_region_state'),
            models.Index(fields=['parent'], name='idx_region_parent'),
            models.Index(fields=['code'], name='idx_region_code'),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class UserRegion(models.Model):
    ROLE_CHOICES = [
        ('assigned', 'Assigned'),
        ('backup', 'Backup'),
        ('observer', 'Observer'),
    ]

    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='user_regions')
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='user_regions')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='assigned')

    class Meta:
        db_table = 'accounts_userregion'
        unique_together = [('user', 'region')]
        indexes = [
            models.Index(fields=['user'], name='idx_userregion_user'),
            models.Index(fields=['region'], name='idx_userregion_region'),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.region.code}"
