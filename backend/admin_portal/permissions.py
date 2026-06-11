from rest_framework.permissions import BasePermission


class IsAdminPortalUser(BasePermission):
    """Allows access only to admin or super_admin roles via JWT role claim."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False

        if request.auth and hasattr(request.auth, 'payload'):
            role = request.auth.payload.get('role', '')
            return role in ('admin', 'super_admin')

        return request.user.role in ('admin',) or request.user.is_superuser


class IsSuperAdmin(BasePermission):
    """Allows access only to super_admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.auth and hasattr(request.auth, 'payload'):
            return request.auth.payload.get('role', '') == 'super_admin'
        return request.user.is_superuser
