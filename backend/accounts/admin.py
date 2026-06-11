from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, UserPermission, Region, UserRegion


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'get_full_name', 'role', 'primary_role', 'region', 'phone_number', 'is_active']
    list_filter = ['role', 'primary_role', 'is_active', 'region']
    search_fields = ['username', 'first_name', 'last_name', 'phone_number']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('FPS Profile', {
            'fields': ('phone_number', 'role', 'region', 'primary_role', 'state', 'districts', 'employee_id'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('FPS Profile', {
            'classes': ('wide',),
            'fields': ('phone_number', 'role', 'region', 'primary_role'),
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_preset', 'is_active']
    list_filter = ['is_preset', 'is_active']
    search_fields = ['name', 'code']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['codename', 'label', 'module', 'category', 'is_active']
    list_filter = ['module', 'category', 'is_active']
    search_fields = ['codename', 'label']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'granted_at']
    list_filter = ['role']
    raw_id_fields = ['role', 'permission', 'granted_by']


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'permission', 'effect', 'expires_at', 'created_at']
    list_filter = ['effect']
    raw_id_fields = ['user', 'permission', 'granted_by']


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'state', 'district', 'is_active']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'code']
