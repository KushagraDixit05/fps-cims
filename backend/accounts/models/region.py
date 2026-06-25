import uuid

from django.conf import settings
from django.db import models


class Region(models.Model):
    """Structured geographic hierarchy (state → district → taluka). Replaces the
    legacy freeform ``User.region`` CharField as the canonical region source."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True, default='')
    taluka = models.CharField(max_length=100, blank=True, default='')
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='children',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_region'
        ordering = ['state', 'district', 'taluka']
        # `code` is already indexed by its UNIQUE constraint.
        indexes = [
            models.Index(fields=['state'], name='idx_region_state'),
            models.Index(fields=['parent'], name='idx_region_parent'),
        ]

    def __str__(self):
        return self.name


class UserRegion(models.Model):
    """Maps users to the regions they are responsible for (many-to-many)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='user_regions',
    )
    region = models.ForeignKey(
        Region, on_delete=models.CASCADE, related_name='region_users'
    )
    role = models.CharField(max_length=50, default='assigned')

    class Meta:
        db_table = 'accounts_userregion'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'region'], name='uniq_user_region'
            ),
        ]
        indexes = [
            models.Index(fields=['user'], name='idx_userregion_user'),
            models.Index(fields=['region'], name='idx_userregion_region'),
        ]

    def __str__(self):
        return f'{self.user_id} @ {self.region.code} ({self.role})'
