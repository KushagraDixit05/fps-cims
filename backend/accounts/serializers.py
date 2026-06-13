from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user self-registration.
    POST /api/auth/register/
    """
    password  = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm password')
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    email     = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        # NOTE: `role` is deliberately NOT writable here. Public self-registration
        # must never let a client choose its own role (a client sending
        # role='admin' would otherwise gain admin-wide read access to all field
        # data). All registrations are forced to 'field_executive' in create();
        # privileged accounts are provisioned only via Django admin / createsuperuser.
        fields = [
            'username', 'password', 'password2',
            'full_name', 'email', 'phone_number', 'region',
        ]
        extra_kwargs = {
            'phone_number': {
                'validators': [],  # disable auto-UniqueValidator; handled in validate_phone_number
            },
        }

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value.lower()

    def validate_email(self, value):
        if not value:
            return None
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_phone_number(self, value):
        if not value:
            return None
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('An account with this phone number already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        parts = full_name.strip().split(' ', 1)
        first_name = parts[0] if parts else ''
        last_name  = parts[1] if len(parts) > 1 else ''

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
            email=validated_data.get('email') or None,
            phone_number=validated_data.get('phone_number') or None,
            # Hardcoded — never trust a client-supplied role on public registration.
            role='field_executive',
            region=validated_data.get('region', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'region', 'phone_number']
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'region', 'phone_number']
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
