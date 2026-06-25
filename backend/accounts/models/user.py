from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.indexes import GinIndex
from django.db import models


class User(AbstractUser):
    """
    Custom user model for Farm Prosperity Solutions.
    Covers field executives, admins, and institutional viewers.
    """

    ROLE_CHOICES = [
        ('field_executive', 'Field Executive'),
        ('admin', 'Admin'),
        ('viewer', 'Viewer'),  # for institutional buyers (future)
    ]

    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    # Legacy coarse role. Retained as the live/fallback role for one sprint while
    # code migrates to `primary_role`. New code should read `primary_role`.
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='field_executive')
    region = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    # RBAC / profile fields
    employee_id = models.CharField(max_length=50, null=True, blank=True)
    state = models.CharField(max_length=100, blank=True, default='')
    districts = models.JSONField(default=list)
    profile_photo = models.CharField(max_length=255, blank=True, default='')
    last_login_device = models.CharField(max_length=200, blank=True, default='')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    deactivation_reason = models.TextField(blank=True, default='')
    deactivated_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Canonical RBAC role (replaces the `role` CharField). Reuses the existing
    # `primary_role_id` column (previously a stub UUIDField) as a real FK.
    primary_role = models.ForeignKey(
        'accounts.Role', null=True, blank=True, on_delete=models.RESTRICT,
        db_column='primary_role_id', related_name='users',
    )

    created_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='created_users'
    )
    deactivated_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='deactivated_users'
    )
    reporting_to = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reportees'
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['primary_role'], name='idx_user_role'),
            models.Index(fields=['reporting_to'], name='idx_user_reporting'),
            models.Index(fields=['state'], name='idx_user_state'),
            models.Index(fields=['is_active'], name='idx_user_active'),
            GinIndex(fields=['districts'], name='idx_user_districts'),
        ]

    def save(self, *args, **kwargs):
        if not self.phone_number:
            self.phone_number = None
        if not self.email:
            self.email = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_field_executive(self):
        return self.role == 'field_executive'
