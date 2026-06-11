from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters

from accounts.models import Role, Permission, RolePermission, UserPermission
from accounts.services import PermissionService
from accounts.models import User
from admin_portal.permissions import IsAdminPortalUser
from admin_portal.serializers import (
    RoleSerializer, RoleDetailSerializer,
    PermissionSerializer, UserPermissionSerializer,
)


class AdminRoleListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/roles/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    queryset = Role.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']

    def get_serializer_class(self):
        return RoleDetailSerializer if self.request.method == 'GET' else RoleSerializer

    def perform_create(self, serializer):
        serializer.save(is_preset=False)


class AdminRoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/roles/{id}/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    queryset = Role.objects.all()
    serializer_class = RoleDetailSerializer

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_preset:
            return Response({'detail': 'Preset roles cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        # Invalidate cache for all users with this role
        user_ids = User.objects.filter(primary_role=role).values_list('id', flat=True)
        for uid in user_ids:
            PermissionService.invalidate_cache(uid)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRolePermissionsView(APIView):
    """GET/POST/DELETE /api/admin/roles/{id}/permissions/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def get(self, request, pk):
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        perms = Permission.objects.filter(role_permissions__role=role)
        return Response(PermissionSerializer(perms, many=True).data)

    def post(self, request, pk):
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        perm_ids = request.data.get('permission_ids', [])
        added = 0
        for perm_id in perm_ids:
            try:
                perm = Permission.objects.get(pk=perm_id)
                _, created = RolePermission.objects.get_or_create(
                    role=role, permission=perm,
                    defaults={'granted_by': request.user}
                )
                if created:
                    added += 1
            except Permission.DoesNotExist:
                pass

        # Signal will handle cache invalidation
        return Response({'added': added})

    def delete(self, request, pk):
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        perm_ids = request.data.get('permission_ids', [])
        removed = RolePermission.objects.filter(role=role, permission_id__in=perm_ids).delete()[0]
        return Response({'removed': removed})


class AdminPermissionCatalogueView(generics.ListAPIView):
    """GET /api/admin/permissions/ — full permission catalogue"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.filter(is_active=True).order_by('module', 'category', 'codename')
    filter_backends = [filters.SearchFilter]
    search_fields = ['codename', 'label', 'module']


class AdminUserPermissionView(generics.ListCreateAPIView):
    """GET/POST /api/admin/user-permissions/ — per-user overrides"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = UserPermissionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__username', 'permission__codename']

    def get_queryset(self):
        qs = UserPermission.objects.select_related('user', 'permission')
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def perform_create(self, serializer):
        override = serializer.save(granted_by=request.user)
        PermissionService.invalidate_cache(override.user_id)

    def perform_create(self, serializer):
        override = serializer.save(granted_by=self.request.user)
        PermissionService.invalidate_cache(override.user_id)


class AdminUserPermissionDeleteView(generics.DestroyAPIView):
    """DELETE /api/admin/user-permissions/{id}/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = UserPermissionSerializer
    queryset = UserPermission.objects.all()

    def perform_destroy(self, instance):
        user_id = instance.user_id
        instance.delete()
        PermissionService.invalidate_cache(user_id)
