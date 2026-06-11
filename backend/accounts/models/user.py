from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('field_executive', 'Field Executive'),
        ('admin', 'Admin'),
        ('viewer', 'Viewer'),
    ]

    # Original fields — kept for backward compatibility
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='field_executive')
    region = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    # RBAC Phase 1 — new fields (all nullable to not break existing rows)
    employee_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    profile_photo = models.CharField(max_length=255, blank=True)

    primary_role = models.ForeignKey(
        'accounts.Role',
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name='users',
    )
    reporting_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports',
    )

    state = models.CharField(max_length=100, blank=True)
    districts = models.JSONField(default=list, blank=True)

    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deactivated_users',
    )
    deactivation_reason = models.TextField(blank=True)

    last_login_device = models.CharField(max_length=200, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['primary_role'], name='idx_user_role'),
            models.Index(fields=['reporting_to'], name='idx_user_reporting'),
            models.Index(fields=['state'], name='idx_user_state'),
            models.Index(fields=['is_active'], name='idx_user_active'),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_field_executive(self):
        return self.role == 'field_executive'
