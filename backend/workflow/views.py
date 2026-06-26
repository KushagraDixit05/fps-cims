"""
Checker / mobile-facing approval workflow API.

GET  /api/approvals/queue/                → pending queue for the authenticated checker
GET  /api/approvals/history/              → completed approvals (approved/rejected/cancelled)
GET  /api/approvals/<pk>/                 → instance detail + full action log
POST /api/approvals/<pk>/start-review/    → claimed by checker; status → under_review
POST /api/approvals/<pk>/approve/         → approve (comment optional)
POST /api/approvals/<pk>/reject/          → reject (comment required)
POST /api/approvals/<pk>/request-revision/ → send back for correction (comment required)
POST /api/approvals/<pk>/resubmit/        → field executive resubmits after revision
POST /api/approvals/<pk>/cancel/          → field executive cancels (draft only)
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ApprovalInstance
from .serializers import (
    ApprovalCommentSerializer,
    ApprovalInstanceDetailSerializer,
    ApprovalInstanceListSerializer,
    ApprovalReassignSerializer,
)
from .services.approval_engine import ApprovalEngine

User = get_user_model()

_ACTIVE_STATUSES = ['submitted', 'under_review', 'resubmitted', 'escalated']
_DONE_STATUSES = ['approved', 'rejected', 'cancelled']


def _approver_queryset(user):
    """Return ApprovalInstances that the given user is eligible to action."""
    role_code = getattr(getattr(user, 'primary_role', None), 'code', None) or getattr(user, 'role', '')

    if user.is_staff or user.is_superuser or role_code in ('admin', 'super_admin'):
        return ApprovalInstance.objects.select_related(
            'workflow', 'submitted_by', 'current_approver'
        ).all()

    # Filter to workflows where this user's role is an allowed approver
    return ApprovalInstance.objects.filter(
        workflow__approver_role_codes__contains=[role_code],
    ).select_related('workflow', 'submitted_by', 'current_approver')


class ApprovalsQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _approver_queryset(request.user).filter(
            status__in=_ACTIVE_STATUSES
        ).order_by('submitted_at')

        module = request.query_params.get('module')
        if module:
            qs = qs.filter(workflow__module=module)

        serializer = ApprovalInstanceListSerializer(qs, many=True)
        return Response(serializer.data)


class ApprovalHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _approver_queryset(request.user).filter(
            status__in=_DONE_STATUSES
        ).order_by('-updated_at')[:200]

        module = request.query_params.get('module')
        if module:
            qs = qs.filter(workflow__module=module)

        serializer = ApprovalInstanceListSerializer(qs, many=True)
        return Response(serializer.data)


class ApprovalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        instance = get_object_or_404(
            ApprovalInstance.objects.prefetch_related('actions__actor'), pk=pk
        )
        return Response(ApprovalInstanceDetailSerializer(instance).data)


class _ApprovalActionBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_instance(self, pk):
        return get_object_or_404(ApprovalInstance, pk=pk)

    def _run(self, request, pk, engine_method, requires_comment=False):
        instance = self._get_instance(pk)
        ser = ApprovalCommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = ser.validated_data.get('comment', '')
        if requires_comment and not comment.strip():
            return Response({'comment': 'This field is required.'}, status=400)
        try:
            if requires_comment:
                engine_method(instance, request.user, comment)
            else:
                engine_method(instance, request.user, comment)
        except ValidationError as exc:
            return Response({'detail': exc.message}, status=400)
        return Response(ApprovalInstanceDetailSerializer(instance).data)


class ApprovalStartReviewView(_ApprovalActionBaseView):
    def post(self, request, pk):
        instance = self._get_instance(pk)
        try:
            ApprovalEngine.start_review(instance, request.user)
        except ValidationError as exc:
            return Response({'detail': exc.message}, status=400)
        return Response(ApprovalInstanceDetailSerializer(instance).data)


class ApprovalApproveView(_ApprovalActionBaseView):
    def post(self, request, pk):
        return self._run(request, pk, ApprovalEngine.approve)


class ApprovalRejectView(_ApprovalActionBaseView):
    def post(self, request, pk):
        return self._run(request, pk, ApprovalEngine.reject, requires_comment=True)


class ApprovalRequestRevisionView(_ApprovalActionBaseView):
    def post(self, request, pk):
        return self._run(request, pk, ApprovalEngine.request_revision, requires_comment=True)


class ApprovalResubmitView(_ApprovalActionBaseView):
    def post(self, request, pk):
        instance = self._get_instance(pk)
        try:
            ApprovalEngine.resubmit(instance, request.user)
        except ValidationError as exc:
            return Response({'detail': exc.message}, status=400)
        return Response(ApprovalInstanceDetailSerializer(instance).data)


class ApprovalCancelView(_ApprovalActionBaseView):
    def post(self, request, pk):
        instance = self._get_instance(pk)
        try:
            ApprovalEngine.cancel(instance, request.user)
        except ValidationError as exc:
            return Response({'detail': exc.message}, status=400)
        return Response(ApprovalInstanceDetailSerializer(instance).data)
