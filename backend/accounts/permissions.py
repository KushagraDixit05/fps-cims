"""
accounts/permissions.py
=======================
DRF permission classes for FPS RBAC Phase 2.

Classes:
  - HasFPSPermission         — view-level permission gate using JWT perms claim.
  - OwnEntryOrCheckerPermission — object-level gate (own vs any entry).
  - RegionEnforcedPermission — validates actor's district scope.

See docs/rbac/02-PERMISSION-ENGINE.md §5 for full specification.
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission


class HasFPSPermission(BasePermission):
    """
    Check that the authenticated user holds the required FPS permission codename.

    Usage (view-level):
        class MyView(APIView):
            permission_classes = [IsAuthenticated, HasFPSPermission]
            required_permission = 'can_create_crop_visit'

    Fast path: reads the ``perms`` claim from the JWT payload (zero DB hits).
    Slow path: falls back to a DB/cache lookup via PermissionService when the
    JWT is absent or was issued by an older version that omits the claim.

    If ``required_permission`` is not set on the view, the class passes (no
    restriction declared — combine with other permission classes instead).
    """

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False

        codename = getattr(view, 'required_permission', None)
        if not codename:
            return True  # no per-permission restriction on this view

        # ── Fast path: JWT claims ───────────────────────────────────────────
        if request.auth and hasattr(request.auth, 'payload'):
            perms = request.auth.payload.get('perms', None)
            if perms is not None:
                return codename in perms

        # ── Slow path: DB / Redis cache ─────────────────────────────────────
        from accounts.services.permission_service import PermissionService
        return PermissionService.user_has_permission(request.user, codename)


class OwnEntryOrCheckerPermission(BasePermission):
    """
    Object-level permission for field-data models (FarmerVisit, MandiArrival,
    ProductDemo).

    Rules:
      - User has ``can_edit_any_<module>`` → allowed for all objects.
      - User has ``can_edit_own_<module>`` → allowed only for objects they
        created (obj.created_by_id or obj.executive_id == request.user.id).
      - Otherwise → 403.

    The view must set ``own_perm`` and ``any_perm`` class attributes to the
    relevant codenames, e.g.:
        own_perm = 'can_edit_own_crop_visit'
        any_perm = 'can_edit_any_crop_visit'
    """

    own_perm: str | None = None
    any_perm: str | None = None

    def _get_perms(self, request) -> list:
        if request.auth and hasattr(request.auth, 'payload'):
            return request.auth.payload.get('perms', [])
        from accounts.services.permission_service import PermissionService
        return list(PermissionService.get_user_permissions(request.user))

    def has_object_permission(self, request, view, obj) -> bool:
        any_perm = getattr(view, 'any_perm', self.any_perm)
        own_perm = getattr(view, 'own_perm', self.own_perm)

        perms = self._get_perms(request)

        if any_perm and any_perm in perms:
            return True

        if own_perm and own_perm in perms:
            # Support both field naming conventions used across modules
            owner_id = (
                getattr(obj, 'created_by_id', None)
                or getattr(obj, 'executive_id', None)
                or getattr(obj, 'submitted_by_id', None)
            )
            return owner_id == request.user.id

        return False


class RegionEnforcedPermission(BasePermission):
    """
    Validates that the requesting user's ``districts`` JWT claim overlaps with
    the district of the target object.

    Users with a ``can_view_all_*`` permission bypass the district check.
    The view must set ``bypass_perm`` and ``district_attr`` class attributes:
        bypass_perm   = 'can_view_all_crop_entries'
        district_attr = 'district_name'   # attribute on the model object
    """

    bypass_perm: str | None = None
    district_attr: str = 'district_name'

    def _get_perms(self, request) -> list:
        if request.auth and hasattr(request.auth, 'payload'):
            return request.auth.payload.get('perms', [])
        from accounts.services.permission_service import PermissionService
        return list(PermissionService.get_user_permissions(request.user))

    def _get_districts(self, request) -> list:
        if request.auth and hasattr(request.auth, 'payload'):
            return request.auth.payload.get('districts', [])
        return getattr(request.user, 'districts', []) or []

    def has_object_permission(self, request, view, obj) -> bool:
        bypass = getattr(view, 'bypass_perm', self.bypass_perm)
        district_attr = getattr(view, 'district_attr', self.district_attr)

        perms = self._get_perms(request)
        if bypass and bypass in perms:
            return True  # admin / super-admin bypass

        districts = self._get_districts(request)
        if not districts:
            return False  # no district assignment → deny

        obj_district = getattr(obj, district_attr, None)
        return obj_district in districts


def permission_from_codename(codename: str) -> type:
    """Return a HasFPSPermission subclass gated on a specific permission codename.

    Allows per-action permission checking inside ViewSet.get_permissions():

        def get_permissions(self):
            if self.action == 'create':
                return [IsAuthenticated(), permission_from_codename('can_create_crop_visit')()]
    """
    return type(f"Requires_{codename}", (HasFPSPermission,), {"required_permission": codename})
