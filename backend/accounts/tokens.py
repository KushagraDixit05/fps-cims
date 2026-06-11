from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .services import PermissionService


class FPSTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        perms = PermissionService.get_user_permissions(user)
        regions = list(user.user_regions.values_list('region__code', flat=True))

        token['user_id'] = str(user.id)
        token['username'] = user.username
        token['email'] = user.email or ''
        token['role'] = user.primary_role.code if user.primary_role_id else user.role
        token['role_id'] = str(user.primary_role_id) if user.primary_role_id else ''
        token['state'] = user.state or ''
        token['districts'] = user.districts or []
        token['regions'] = regions
        token['perms'] = sorted(perms)
        token['aud'] = 'fps-mobile'

        return token
