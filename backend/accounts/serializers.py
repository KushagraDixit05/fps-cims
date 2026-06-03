from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user self-registration.
    POST /api/auth/register/
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm password')
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2',
            'full_name', 'phone_number', 'role', 'region',
        ]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        # Split full_name into first/last
        full_name = validated_data.pop('full_name', '')
        parts = full_name.strip().split(' ', 1)
        first_name = parts[0] if parts else ''
        last_name = parts[1] if len(parts) > 1 else ''

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
            phone_number=validated_data.get('phone_number', None),
            role=validated_data.get('role', 'field_executive'),
            region=validated_data.get('region', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model — safe read-only representation.
    Used to embed user info in other serializers (e.g. submitted_by).
    """

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'region', 'phone_number']
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for returning the authenticated user's own profile.
    GET /api/auth/me/
    """
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'region', 'phone_number']
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
