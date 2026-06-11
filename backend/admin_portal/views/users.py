from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from accounts.models import User, Role, RefreshTokenBlacklist
from accounts.services import PermissionService
from admin_portal.permissions import IsAdminPortalUser
from admin_portal.serializers import AdminUserSerializer, AdminUserCreateSerializer


class AdminUserListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/users/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'phone_number', 'email']
    filterset_fields = ['is_active', 'role']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.select_related('primary_role').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminUserCreateSerializer
        return AdminUserSerializer


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/admin/users/{id}/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related('primary_role')

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # If primary_role changed, update role field too and invalidate cache
        if 'primary_role' in request.data:
            role_id = request.data['primary_role']
            try:
                role = Role.objects.get(pk=role_id)
                user.primary_role = role
                user.role = role.code
            except Role.DoesNotExist:
                pass

        serializer.save()
        PermissionService.invalidate_cache(user.id)
        return Response(serializer.data)


class AdminDeactivateUserView(APIView):
    """POST /api/admin/users/{id}/deactivate/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = False
        user.deactivated_at = timezone.now()
        user.deactivated_by = request.user
        user.deactivation_reason = request.data.get('reason', '')
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivated_by', 'deactivation_reason'])
        PermissionService.invalidate_cache(user.id)
        return Response({'status': 'deactivated'})


class AdminReactivateUserView(APIView):
    """POST /api/admin/users/{id}/reactivate/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = True
        user.deactivated_at = None
        user.deactivated_by = None
        user.deactivation_reason = ''
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivated_by', 'deactivation_reason'])
        PermissionService.invalidate_cache(user.id)
        return Response({'status': 'reactivated'})


class AdminForceLogoutView(APIView):
    """POST /api/admin/users/{id}/force-logout/ — blacklists all active refresh tokens."""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Blacklist via simplejwt token blacklist app
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
            count = tokens.count()
        except Exception:
            count = 0

        PermissionService.invalidate_cache(user.id)
        return Response({'status': 'forced_logout', 'tokens_revoked': count})
