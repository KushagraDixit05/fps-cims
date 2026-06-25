"""
accounts/services/permission_service.py
========================================
Central permission-resolution service for FPS RBAC.

Resolution order (ABAC-lite):
  1. If user is inactive → empty set.
  2. Start with all permissions granted to user's primary_role via RolePermission.
  3. Apply per-user UserPermission overrides:
       - effect='allow'  → add codename to the set
       - effect='deny'   → remove codename from the set
  4. Cache the result in Redis (key: fps:perms:<user_id>, TTL: 300s).

Cache is invalidated by accounts/signals.py on any UserPermission or RolePermission
change, or when the user's primary_role changes.

See docs/rbac/02-PERMISSION-ENGINE.md §7 for full specification.
"""
from __future__ import annotations

from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q


class PermissionService:
    """
    Resolves, caches, and invalidates the effective permission set for a user.

    All public methods accept an unsaved / lazily-loaded User instance; only
    ``user.id``, ``user.is_active``, and ``user.primary_role_id`` are accessed
    on the hot path to minimise unnecessary DB round-trips.
    """

    # Redis TTL for the resolved permission set.  5 minutes balances freshness
    # against DB load — the actual worst-case staleness window on the mobile
    # app is the JWT access-token lifetime (12h), not this cache TTL.
    CACHE_TTL = 300  # seconds

    # ── Cache key helpers ────────────────────────────────────────────────────

    @staticmethod
    def _cache_key(user_id) -> str:
        return f"fps:perms:{user_id}"

    # ── Public API ───────────────────────────────────────────────────────────

    @classmethod
    def get_user_permissions(cls, user) -> set:
        """
        Return the effective set of permission codenames (strings) for *user*.

        Result is served from Redis if available; otherwise resolved from the
        DB and written back to cache.
        """
        if not user.is_active:
            return set()

        cache_key = cls._cache_key(user.id)
        cached = cache.get(cache_key)
        if cached is not None:
            return set(cached)

        perms = cls._resolve_from_db(user)
        # Store as a sorted list so serialisation is deterministic.
        cache.set(cache_key, sorted(perms), cls.CACHE_TTL)
        return perms

    @classmethod
    def user_has_permission(cls, user, codename: str) -> bool:
        """Convenience check — returns True if *user* has *codename*."""
        return codename in cls.get_user_permissions(user)

    @classmethod
    def invalidate_cache(cls, user_id) -> None:
        """
        Delete the cached permission set for a single user.
        Called from signals whenever a UserPermission or User.primary_role changes.
        """
        cache.delete(cls._cache_key(user_id))

    @classmethod
    def invalidate_cache_for_role(cls, role_id) -> None:
        """
        Bust the cache for *all* users whose primary_role_id == role_id.
        Called from signals when a RolePermission is changed.
        Uses a Redis pipeline (via cache.delete_many) to minimise round-trips.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_ids = list(
            User.objects.filter(primary_role_id=role_id).values_list('id', flat=True)
        )
        if user_ids:
            cache.delete_many([cls._cache_key(uid) for uid in user_ids])

    # ── Internal resolution ──────────────────────────────────────────────────

    @classmethod
    def _resolve_from_db(cls, user) -> set:
        """
        Resolve permissions from the DB without touching the cache.
        Imported inline to avoid circular imports at module load time.
        """
        from accounts.models.role import RolePermission
        from accounts.models.user_permission import UserPermission

        # 1. Role-based permissions
        role_perms: set = set()
        if user.primary_role_id:
            role_perms = set(
                RolePermission.objects
                .filter(role_id=user.primary_role_id)
                .values_list('permission__codename', flat=True)
            )

        # 2. User-level overrides (only non-expired ones)
        now = timezone.now()
        overrides = (
            UserPermission.objects
            .filter(user_id=user.id)
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .select_related('permission')
        )

        for override in overrides:
            codename = override.permission.codename
            if override.effect == 'allow':
                role_perms.add(codename)
            elif override.effect == 'deny':
                role_perms.discard(codename)

        return role_perms
