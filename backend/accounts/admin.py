from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    DeviceRegistration,
    Permission,
    RefreshTokenBlacklist,
    Region,
    Role,
    RolePermission,
    User,
    UserPermission,
    UserRegion,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin panel config for the custom User model.
    Extends Django's default UserAdmin with our extra fields.
    """
    list_display = ['username', 'get_full_name', 'role', 'primary_role', 'region', 'phone_number', 'is_active']
    list_filter = ['role', 'primary_role', 'is_active', 'region']
    search_fields = ['username', 'first_name', 'last_name', 'phone_number', 'employee_id']
    autocomplete_fields = ['primary_role', 'reporting_to']

    # Add our custom fields to the edit form
    fieldsets = BaseUserAdmin.fieldsets + (
        ('FPS Profile', {
            'fields': ('phone_number', 'role', 'primary_role', 'employee_id',
                       'region', 'state', 'districts', 'reporting_to'),
        }),
    )

    # Add our custom fields to the add (create) form
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('FPS Profile', {
            'classes': ('wide',),
            'fields': ('phone_number', 'role', 'primary_role', 'region'),
        }),
    )


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    autocomplete_fields = ['permission']
    readonly_fields = ['granted_at']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_preset', 'is_active', 'created_at']
    list_filter = ['is_preset', 'is_active']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [RolePermissionInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['codename', 'label', 'module', 'category', 'is_active']
    list_filter = ['module', 'category', 'is_active']
    search_fields = ['codename', 'label']
    readonly_fields = ['created_at']


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'permission', 'effect', 'expires_at', 'created_at']
    list_filter = ['effect']
    search_fields = ['user__username', 'permission__codename']
    autocomplete_fields = ['user', 'permission', 'granted_by']
    readonly_fields = ['created_at']


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'state', 'district', 'taluka', 'is_active']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'code', 'state', 'district']
    readonly_fields = ['created_at']


@admin.register(UserRegion)
class UserRegionAdmin(admin.ModelAdmin):
    list_display = ['user', 'region', 'role']
    list_filter = ['role']
    search_fields = ['user__username', 'region__code']
    autocomplete_fields = ['user', 'region']


@admin.register(DeviceRegistration)
class DeviceRegistrationAdmin(admin.ModelAdmin):
    list_display = ['user', 'device_name', 'platform', 'app_version', 'is_trusted', 'last_active_at']
    list_filter = ['platform', 'is_trusted']
    search_fields = ['user__username', 'device_id', 'device_name']
    readonly_fields = ['registered_at']


@admin.register(RefreshTokenBlacklist)
class RefreshTokenBlacklistAdmin(admin.ModelAdmin):
    list_display = ['jti', 'user', 'reason', 'revoked_at']
    search_fields = ['user__username', 'reason']
    readonly_fields = ['revoked_at']
