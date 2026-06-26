from django.urls import path
from .views import (
    ApprovalsQueueView,
    ApprovalHistoryView,
    ApprovalDetailView,
    ApprovalStartReviewView,
    ApprovalApproveView,
    ApprovalRejectView,
    ApprovalRequestRevisionView,
    ApprovalResubmitView,
    ApprovalCancelView,
)

urlpatterns = [
    path('queue/',                              ApprovalsQueueView.as_view()),
    path('history/',                            ApprovalHistoryView.as_view()),
    path('<uuid:pk>/',                          ApprovalDetailView.as_view()),
    path('<uuid:pk>/start-review/',             ApprovalStartReviewView.as_view()),
    path('<uuid:pk>/approve/',                  ApprovalApproveView.as_view()),
    path('<uuid:pk>/reject/',                   ApprovalRejectView.as_view()),
    path('<uuid:pk>/request-revision/',         ApprovalRequestRevisionView.as_view()),
    path('<uuid:pk>/resubmit/',                 ApprovalResubmitView.as_view()),
    path('<uuid:pk>/cancel/',                   ApprovalCancelView.as_view()),
]
