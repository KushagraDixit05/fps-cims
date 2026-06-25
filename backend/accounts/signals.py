"""
accounts/signals.py
===================
Django signal handlers for RBAC cache invalidation (Phase 2).

Signals wired here:
  - UserPermission save/delete → invalidate that user's permission cache.
  - RolePermission save/delete → invalidate cache for ALL users with that role.
  - User.primary_role change   → invalidate that user's permission cache.

These handlers ensure the Redis cache (fps:perms:<user_id>, 300s TTL) is
always consistent after any permission-related DB write.

Signals are registered via AccountsConfig.ready() in accounts/apps.py.

See docs/rbac/02-PERMISSION-ENGINE.md §3 (Permission Caching / Invalidation).
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


# ── UserPermission invalidation ───────────────────────────────────────────────

def _invalidate_user(user_id):
    """Fire-and-forget cache bust for a single user."""
    from accounts.services.permission_service import PermissionService
    PermissionService.invalidate_cache(user_id)


def _register_user_permission_signals():
    """
    Register save/delete signals for UserPermission.
    Defined as a function so that the model import is deferred until after
    Django's app registry is ready.
    """
    from accounts.models.user_permission import UserPermission

    @receiver(post_save, sender=UserPermission, weak=False,
              dispatch_uid='rbac_userperm_save_invalidate')
    def on_userperm_save(sender, instance, **kwargs):
        _invalidate_user(instance.user_id)

    @receiver(post_delete, sender=UserPermission, weak=False,
              dispatch_uid='rbac_userperm_delete_invalidate')
    def on_userperm_delete(sender, instance, **kwargs):
        _invalidate_user(instance.user_id)


# ── RolePermission invalidation ───────────────────────────────────────────────

def _register_role_permission_signals():
    from accounts.models.role import RolePermission

    @receiver(post_save, sender=RolePermission, weak=False,
              dispatch_uid='rbac_roleperm_save_invalidate')
    def on_roleperm_save(sender, instance, **kwargs):
        from accounts.services.permission_service import PermissionService
        PermissionService.invalidate_cache_for_role(instance.role_id)

    @receiver(post_delete, sender=RolePermission, weak=False,
              dispatch_uid='rbac_roleperm_delete_invalidate')
    def on_roleperm_delete(sender, instance, **kwargs):
        from accounts.services.permission_service import PermissionService
        PermissionService.invalidate_cache_for_role(instance.role_id)


# ── User.primary_role change invalidation ────────────────────────────────────

def _register_user_role_change_signals():
    from django.contrib.auth import get_user_model

    @receiver(post_save, sender=get_user_model(), weak=False,
              dispatch_uid='rbac_user_role_change_invalidate')
    def on_user_save(sender, instance, **kwargs):
        # Always bust the cache on any user save that might touch primary_role.
        # The cache TTL is 300s so the cost of an occasional spurious bust is
        # one extra DB round-trip — acceptable.
        _invalidate_user(instance.pk)


def register_signals():
    """
    Called from AccountsConfig.ready() to wire all RBAC cache-invalidation
    signals after Django's app registry is fully initialised.
    """
    _register_user_permission_signals()
    _register_role_permission_signals()
    _register_user_role_change_signals()
