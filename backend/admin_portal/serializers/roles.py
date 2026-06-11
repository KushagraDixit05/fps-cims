from rest_framework import serializers
from accounts.models import Role, Permission, RolePermission, UserPermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'label', 'module', 'category', 'is_active']
        read_only_fields = fields


class RoleSerializer(serializers.ModelSerializer):
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'code', 'description', 'is_preset', 'is_active', 'permission_count']
        read_only_fields = ['id', 'is_preset']

    def get_permission_count(self, obj):
        return obj.role_permissions.count()


class RoleDetailSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'code', 'description', 'is_preset', 'is_active', 'permissions']
        read_only_fields = ['id', 'is_preset']

    def get_permissions(self, obj):
        perms = Permission.objects.filter(
            role_permissions__role=obj
        ).values('id', 'codename', 'label', 'module', 'category')
        return list(perms)


class UserPermissionSerializer(serializers.ModelSerializer):
    permission_codename = serializers.CharField(source='permission.codename', read_only=True)
    permission_label = serializers.CharField(source='permission.label', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserPermission
        fields = [
            'id', 'user', 'username', 'permission', 'permission_codename',
            'permission_label', 'effect', 'reason', 'expires_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
