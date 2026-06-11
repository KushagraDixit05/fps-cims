from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q


class PermissionService:
    CACHE_TTL = 300  # 5 minutes

    @classmethod
    def get_user_permissions(cls, user) -> set:
        if not user.is_active:
            return set()

        cache_key = f"fps:perms:{user.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return set(cached)

        perms = cls._resolve_from_db(user)
        cache.set(cache_key, list(perms), cls.CACHE_TTL)
        return perms

    @classmethod
    def _resolve_from_db(cls, user) -> set:
        from accounts.models import RolePermission, UserPermission

        role_perms = set()
        if user.primary_role_id:
            role_perms = set(
                RolePermission.objects
                .filter(role_id=user.primary_role_id)
                .values_list('permission__codename', flat=True)
            )

        now = timezone.now()
        overrides = UserPermission.objects.filter(
            user=user,
            permission__is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).select_related('permission')

        for override in overrides:
            if override.effect == 'allow':
                role_perms.add(override.permission.codename)
            else:
                role_perms.discard(override.permission.codename)

        return role_perms

    @classmethod
    def user_has_permission(cls, user, codename: str) -> bool:
        return codename in cls.get_user_permissions(user)

    @classmethod
    def invalidate_cache(cls, user_id):
        cache.delete(f"fps:perms:{user_id}")
