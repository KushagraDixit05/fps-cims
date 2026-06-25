"""
accounts/mixins.py
==================
DRF mixin that applies region-scoped queryset filtering based on the
authenticated user's permission claims (Phase 2).

Usage:
    class MyViewSet(RegionScopedQuerysetMixin, generics.ListAPIView):
        # Override region_field to match the district path on the model.
        region_field = 'district_name'          # default
        all_perm     = 'can_view_all_crop_entries'
        region_perm  = 'can_view_region_crop_entries'

Filtering rules:
  1. User has ``all_perm``    → full, unfiltered queryset (admin/super-admin).
  2. User has ``region_perm`` → filtered to ``districts`` from JWT claim.
  3. Default                  → only records where ``created_by=request.user``
                                (or ``executive=request.user``).

See docs/rbac/02-PERMISSION-ENGINE.md §6 for full specification.
"""
from __future__ import annotations


class RegionScopedQuerysetMixin:
    """
    Mixin for ListAPIView / ModelViewSet subclasses.

    Class attributes (all overridable per-view):
        region_field (str)  — field path on the queryset model that holds the
                              district name; passed to ``filter(**{...})``.
        owner_field  (str)  — field path used for own-entries filtering.
        all_perm    (str)  — codename that bypasses region filter.
        region_perm (str)  — codename that enables region filter.
    """

    region_field: str = 'district_name'
    owner_field: str = 'executive'
    all_perm: str = ''
    region_perm: str = ''

    def _get_perms(self) -> list:
        request = self.request  # type: ignore[attr-defined]
        if request.auth and hasattr(request.auth, 'payload'):
            perms = request.auth.payload.get('perms', None)
            if perms is not None:
                return perms
        from accounts.services.permission_service import PermissionService
        return list(PermissionService.get_user_permissions(request.user))

    def _get_districts(self) -> list:
        request = self.request  # type: ignore[attr-defined]
        if request.auth and hasattr(request.auth, 'payload'):
            return request.auth.payload.get('districts', []) or []
        return getattr(request.user, 'districts', []) or []

    def get_queryset(self):
        qs = super().get_queryset()  # type: ignore[misc]
        request = self.request  # type: ignore[attr-defined]
        user = request.user

        perms = self._get_perms()

        # 1. Admin bypass — see all records
        all_perm = getattr(self, 'all_perm', '')
        if all_perm and all_perm in perms:
            return qs

        # 2. Region-scoped — filter to user's assigned districts
        region_perm = getattr(self, 'region_perm', '')
        if region_perm and region_perm in perms:
            districts = self._get_districts()
            if districts:
                region_field = getattr(self, 'region_field', 'district_name')
                return qs.filter(**{f'{region_field}__in': districts})

        # 3. Default — own entries only
        owner_field = getattr(self, 'owner_field', 'executive')
        return qs.filter(**{owner_field: user})
