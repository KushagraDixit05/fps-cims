from django.urls import path
from . import views

urlpatterns = [
    path('queue/', views.ApprovalQueueView.as_view(), name='approval-queue'),
    path('<uuid:pk>/', views.ApprovalDetailView.as_view(), name='approval-detail'),
    path('<uuid:pk>/approve/', views.ApproveView.as_view(), name='approval-approve'),
    path('<uuid:pk>/reject/', views.RejectView.as_view(), name='approval-reject'),
    path('<uuid:pk>/request-revision/', views.RequestRevisionView.as_view(), name='approval-request-revision'),
    path('<uuid:pk>/resubmit/', views.ResubmitView.as_view(), name='approval-resubmit'),
]
