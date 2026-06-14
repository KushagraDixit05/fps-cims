from django.urls import path
from .views import (
    FarmerVisitListView, FarmerVisitExportView,
    MandiArrivalListView, MandiArrivalExportView,
    ProductDemoListView, ProductDemoExportView,
    ProductivityView, ApprovalSLAView,
)

urlpatterns = [
    path('field-data/visits/',        FarmerVisitListView.as_view()),
    path('field-data/visits/export/', FarmerVisitExportView.as_view()),
    path('field-data/mandi/',         MandiArrivalListView.as_view()),
    path('field-data/mandi/export/',  MandiArrivalExportView.as_view()),
    path('field-data/demos/',         ProductDemoListView.as_view()),
    path('field-data/demos/export/',  ProductDemoExportView.as_view()),
    path('analytics/productivity/',   ProductivityView.as_view()),
    path('analytics/approval-sla/',   ApprovalSLAView.as_view()),
]
