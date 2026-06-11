from django.urls import path
from admin_portal.views import (
    AdminUserListCreateView, AdminUserDetailView,
    AdminDeactivateUserView, AdminReactivateUserView, AdminForceLogoutView,
    AdminRoleListCreateView, AdminRoleDetailView, AdminRolePermissionsView,
    AdminPermissionCatalogueView, AdminUserPermissionView, AdminUserPermissionDeleteView,
    AdminApprovalListView, AdminForceApproveView, AdminReassignView,
    AdminProductivityView, AdminApprovalSLAView,
    AdminAuditLogView, AdminAuditExportView,
)

urlpatterns = [
    # Users
    path('users/', AdminUserListCreateView.as_view(), name='admin-users'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:pk>/deactivate/', AdminDeactivateUserView.as_view(), name='admin-user-deactivate'),
    path('users/<int:pk>/reactivate/', AdminReactivateUserView.as_view(), name='admin-user-reactivate'),
    path('users/<int:pk>/force-logout/', AdminForceLogoutView.as_view(), name='admin-user-force-logout'),

    # Roles
    path('roles/', AdminRoleListCreateView.as_view(), name='admin-roles'),
    path('roles/<uuid:pk>/', AdminRoleDetailView.as_view(), name='admin-role-detail'),
    path('roles/<uuid:pk>/permissions/', AdminRolePermissionsView.as_view(), name='admin-role-permissions'),

    # Permissions
    path('permissions/', AdminPermissionCatalogueView.as_view(), name='admin-permissions'),
    path('user-permissions/', AdminUserPermissionView.as_view(), name='admin-user-permissions'),
    path('user-permissions/<uuid:pk>/', AdminUserPermissionDeleteView.as_view(), name='admin-user-permission-delete'),

    # Approvals
    path('approvals/', AdminApprovalListView.as_view(), name='admin-approvals'),
    path('approvals/<uuid:pk>/force-approve/', AdminForceApproveView.as_view(), name='admin-approval-force-approve'),
    path('approvals/<uuid:pk>/reassign/', AdminReassignView.as_view(), name='admin-approval-reassign'),

    # Analytics
    path('analytics/productivity/', AdminProductivityView.as_view(), name='admin-analytics-productivity'),
    path('analytics/approval-sla/', AdminApprovalSLAView.as_view(), name='admin-analytics-sla'),

    # Audit
    path('audit/', AdminAuditLogView.as_view(), name='admin-audit'),
    path('audit/export/', AdminAuditExportView.as_view(), name='admin-audit-export'),
]
