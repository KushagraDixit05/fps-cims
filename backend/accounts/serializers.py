from rest_framework import serializers
from .models import User


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
