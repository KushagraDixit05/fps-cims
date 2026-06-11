from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

from .models import ApprovalInstance
from .serializers import ApprovalInstanceSerializer, ApprovalActionRequestSerializer
from .services import ApprovalEngine
from accounts.permissions import HasFPSPermission
from accounts.services.permission_service import PermissionService


def _get_jwt_perms(request):
    if request.auth and hasattr(request.auth, 'payload'):
        return request.auth.payload.get('perms', [])
    return list(PermissionService.get_user_permissions(request.user))


class ApprovalQueueView(generics.ListAPIView):
    """
    GET /api/approvals/queue/
    Returns pending approvals the current user can act on.
    Raises 403 if the user has no can_approve_* permissions.
    """
    serializer_class = ApprovalInstanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        perms = _get_jwt_perms(self.request)
        approval_perms = [p for p in perms if p.startswith('can_approve_')]
        if not approval_perms:
            raise PermissionDenied('You do not have approval permissions.')

        return ApprovalInstance.objects.filter(
            status__in=['submitted', 'under_review', 'resubmitted']
        ).select_related('workflow', 'submitted_by').order_by('-submitted_at')


class ApprovalDetailView(generics.RetrieveAPIView):
    """GET /api/approvals/{id}/"""
    serializer_class = ApprovalInstanceSerializer
    permission_classes = [IsAuthenticated]
    queryset = ApprovalInstance.objects.select_related(
        'workflow', 'submitted_by', 'content_type'
    ).prefetch_related('actions__actor')


class ApprovalActionView(APIView):
    """Base view for approval state transitions."""
    permission_classes = [IsAuthenticated]

    def _get_instance(self, pk):
        try:
            return ApprovalInstance.objects.select_related('workflow', 'submitted_by').get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return None

    def _respond(self, instance):
        return Response(ApprovalInstanceSerializer(instance).data)


class ApproveView(ApprovalActionView):
    """POST /api/approvals/{pk}/approve/"""
    def post(self, request, pk):
        instance = self._get_instance(pk)
        if not instance:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        s = ApprovalActionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updated = ApprovalEngine.approve(instance, request.user, s.validated_data['comment'])
        return self._respond(updated)


class RejectView(ApprovalActionView):
    """POST /api/approvals/{pk}/reject/"""
    def post(self, request, pk):
        instance = self._get_instance(pk)
        if not instance:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        s = ApprovalActionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updated = ApprovalEngine.reject(instance, request.user, s.validated_data['comment'])
        return self._respond(updated)


class RequestRevisionView(ApprovalActionView):
    """POST /api/approvals/{pk}/request-revision/"""
    def post(self, request, pk):
        instance = self._get_instance(pk)
        if not instance:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        s = ApprovalActionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updated = ApprovalEngine.request_revision(instance, request.user, s.validated_data['comment'])
        return self._respond(updated)


class ResubmitView(ApprovalActionView):
    """POST /api/approvals/{pk}/resubmit/"""
    def post(self, request, pk):
        instance = self._get_instance(pk)
        if not instance:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        s = ApprovalActionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updated = ApprovalEngine.resubmit(instance, request.user, s.validated_data['comment'])
        return self._respond(updated)
