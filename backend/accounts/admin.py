from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin panel config for the custom User model.
    Extends Django's default UserAdmin with our extra fields.
    """
    list_display = ['username', 'get_full_name', 'role', 'region', 'phone_number', 'is_active']
    list_filter = ['role', 'is_active', 'region']
    search_fields = ['username', 'first_name', 'last_name', 'phone_number']

    # Add our custom fields to the edit form
    fieldsets = BaseUserAdmin.fieldsets + (
        ('FPS Profile', {
            'fields': ('phone_number', 'role', 'region'),
        }),
    )

    # Add our custom fields to the add (create) form
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('FPS Profile', {
            'classes': ('wide',),
            'fields': ('phone_number', 'role', 'region'),
        }),
    )
