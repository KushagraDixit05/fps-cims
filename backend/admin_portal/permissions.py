from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Allows access only to users with is_staff=True or is_superuser=True."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsAdminPortalUser(BasePermission):
    """
    Phase 8 — Accepts only tokens issued by POST /api/admin/auth/login/.

    The admin login endpoint (AdminTokenObtainPairView) sets aud='fps-admin'
    in the JWT payload via AdminTokenObtainPairSerializer.  This permission
    class validates that claim on every admin portal request, ensuring that
    mobile-issued tokens (which carry no aud claim) are rejected even if the
    bearer is a staff user.

    Implies authentication — returns False for anonymous/unauthenticated users.
    """

    message = 'Admin portal token required. Use POST /api/admin/auth/login/.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        token = request.auth
        if token is None:
            return False
        try:
            return token.get('aud') == 'fps-admin'
        except Exception:
            return False
