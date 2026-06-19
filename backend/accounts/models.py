import uuid
from django.contrib.auth.models import AbstractUser
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
    primary_role_id = models.UUIDField(null=True, blank=True)

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
