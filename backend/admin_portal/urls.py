from django.urls import path
from .views import (
    FarmerVisitListView, FarmerVisitExportView,
    MandiArrivalListView, MandiArrivalExportView,
    ProductDemoListView, ProductDemoExportView,
    ProductivityView, ApprovalSLAView,
    AdminUserListView, AdminUserCreateView, AdminUserDetailView,
    AdminDeactivateView, AdminReactivateView, AdminForceLogoutView,
    AuditLogView, AuditExportView,
    SummaryView, CropIntelligenceView, MarketIntelligenceView,
    ProductPerformanceView, RecentActivitiesView, ExecutivePerformanceView,
    # Phase 2 / Phase 5 — Role, Permission, and UserPermission management
    RoleListCreateView, RoleDetailView, RolePermissionsView,
    PermissionListView,
    UserPermissionListCreateView, UserPermissionDetailView,
    AdminResetPasswordView,
    # Phase 3 — Approval workflow admin endpoints
    AdminApprovalListView, AdminApprovalDetailView,
    AdminApprovalForceApproveView, AdminApprovalReassignView,
)

urlpatterns = [
    # Field data
    path('field-data/visits/',        FarmerVisitListView.as_view()),
    path('field-data/visits/export/', FarmerVisitExportView.as_view()),
    path('field-data/mandi/',         MandiArrivalListView.as_view()),
    path('field-data/mandi/export/',  MandiArrivalExportView.as_view()),
    path('field-data/demos/',         ProductDemoListView.as_view()),
    path('field-data/demos/export/',  ProductDemoExportView.as_view()),

    # Analytics
    path('analytics/productivity/',         ProductivityView.as_view()),
    path('analytics/approval-sla/',         ApprovalSLAView.as_view()),
    path('analytics/summary/',              SummaryView.as_view()),
    path('analytics/crop-intelligence/',    CropIntelligenceView.as_view()),
    path('analytics/market-intelligence/',  MarketIntelligenceView.as_view()),
    path('analytics/product-performance/',  ProductPerformanceView.as_view()),
    path('analytics/recent-activities/',    RecentActivitiesView.as_view()),
    path('analytics/executive-performance/', ExecutivePerformanceView.as_view()),

    # User management
    path('users/',                             AdminUserListView.as_view()),
    path('users/create/',                      AdminUserCreateView.as_view()),
    path('users/<int:pk>/',                    AdminUserDetailView.as_view()),
    path('users/<int:pk>/deactivate/',         AdminDeactivateView.as_view()),
    path('users/<int:pk>/reactivate/',         AdminReactivateView.as_view()),
    path('users/<int:pk>/force-logout/',       AdminForceLogoutView.as_view()),
    path('users/<int:pk>/reset-password/',     AdminResetPasswordView.as_view()),

    # Audit log
    path('audit/',        AuditLogView.as_view()),
    path('audit/export/', AuditExportView.as_view()),

    # ── Phase 2 / Phase 5: Role management (un-orphans admin portal Roles page) ──
    path('roles/',                              RoleListCreateView.as_view()),
    path('roles/<str:role_id>/',               RoleDetailView.as_view()),
    path('roles/<str:role_id>/permissions/',   RolePermissionsView.as_view()),

    # ── Phase 2 / Phase 5: Permission catalogue ────────────────────────────────
    path('permissions/', PermissionListView.as_view()),

    # ── Phase 2 / Phase 5: User permission overrides ───────────────────────────
    path('user-permissions/',          UserPermissionListCreateView.as_view()),
    path('user-permissions/<str:up_id>/', UserPermissionDetailView.as_view()),

    # ── Phase 3: Approval workflow — admin management endpoints ───────────────
    path('approvals/',                              AdminApprovalListView.as_view()),
    path('approvals/<uuid:pk>/',                    AdminApprovalDetailView.as_view()),
    path('approvals/<uuid:pk>/force-approve/',      AdminApprovalForceApproveView.as_view()),
    path('approvals/<uuid:pk>/reassign/',           AdminApprovalReassignView.as_view()),
]
