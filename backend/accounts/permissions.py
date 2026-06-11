from rest_framework.permissions import BasePermission


class HasFPSPermission(BasePermission):
    """
    Checks JWT claims for required permission codename.
    Falls back to DB check if JWT claims are absent.
    """
    required_permission = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False

        codename = getattr(view, 'required_permission', self.required_permission)
        if not codename:
            return True

        # Fast path: JWT claims
        if request.auth and hasattr(request.auth, 'payload'):
            perms = request.auth.payload.get('perms', [])
            if perms:
                return codename in perms

        # Slow path: DB (admin portal or management commands)
        from .services import PermissionService
        return PermissionService.user_has_permission(request.user, codename)


class OwnEntryOrCheckerPermission(BasePermission):
    """
    Object-level: either the user can edit any entry, or they own it.
    Set `own_perm` and `any_perm` on the view.
    """
    def has_object_permission(self, request, view, obj):
        if not request.auth or not hasattr(request.auth, 'payload'):
            return False
        perms = request.auth.payload.get('perms', [])

        any_perm = getattr(view, 'any_perm', None)
        own_perm = getattr(view, 'own_perm', None)

        if any_perm and any_perm in perms:
            return True
        if own_perm and own_perm in perms:
            return str(getattr(obj, 'created_by_id', None)) == str(request.user.id)
        return False


class IsAdminRole(BasePermission):
    """Allows access only to admin or super_admin roles."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.auth and hasattr(request.auth, 'payload'):
            role = request.auth.payload.get('role', '')
            return role in ('admin', 'super_admin')
        return request.user.role in ('admin',) or request.user.is_superuser
