from rest_framework import serializers
from accounts.models import User, Role


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    primary_role_code = serializers.SerializerMethodField()
    primary_role_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name',
            'role', 'primary_role', 'primary_role_code', 'primary_role_name',
            'phone_number', 'employee_id', 'state', 'districts', 'region',
            'reporting_to', 'is_active', 'deactivated_at', 'deactivation_reason',
            'last_login', 'date_joined',
        ]
        read_only_fields = ['id', 'last_login', 'date_joined', 'deactivated_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_primary_role_code(self, obj):
        return obj.primary_role.code if obj.primary_role_id else obj.role

    def get_primary_role_name(self, obj):
        return obj.primary_role.name if obj.primary_role_id else ''


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    primary_role_code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'email', 'full_name',
            'phone_number', 'employee_id', 'state', 'districts', 'region',
            'primary_role_code', 'reporting_to',
        ]

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        primary_role_code = validated_data.pop('primary_role_code', 'field_executive')
        parts = full_name.strip().split(' ', 1)

        user = User.objects.create_user(
            username=validated_data.pop('username'),
            password=validated_data.pop('password'),
            first_name=parts[0] if parts else '',
            last_name=parts[1] if len(parts) > 1 else '',
            role=primary_role_code,
            **validated_data,
        )
        try:
            user.primary_role = Role.objects.get(code=primary_role_code)
            user.save(update_fields=['primary_role'])
        except Role.DoesNotExist:
            pass
        return user
