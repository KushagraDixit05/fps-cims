from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters

from workflow.models import ApprovalInstance
from workflow.services import ApprovalEngine
from admin_portal.permissions import IsAdminPortalUser
from admin_portal.serializers import AdminApprovalSerializer, ReassignSerializer


class AdminApprovalListView(generics.ListAPIView):
    """GET /api/admin/approvals/ — all pending approvals across modules"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = AdminApprovalSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['submitted_at', 'status']
    ordering = ['-submitted_at']

    def get_queryset(self):
        qs = ApprovalInstance.objects.select_related(
            'workflow', 'submitted_by'
        ).prefetch_related('actions')
        status_filter = self.request.query_params.get('status')
        module_filter = self.request.query_params.get('module')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(status__in=['submitted', 'under_review', 'resubmitted', 'escalated'])
        if module_filter:
            qs = qs.filter(workflow__module=module_filter)
        return qs


class AdminForceApproveView(APIView):
    """POST /api/admin/approvals/{id}/force-approve/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def post(self, request, pk):
        try:
            instance = ApprovalInstance.objects.select_related('workflow').get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment = request.data.get('comment', 'Force-approved by admin.')
        # Bypass role check — admin can always approve
        instance.status = 'approved'
        from django.utils import timezone
        instance.approved_at = timezone.now()
        instance.approved_by = request.user
        instance.save(update_fields=['status', 'approved_at', 'approved_by', 'updated_at'])
        from workflow.models import ApprovalAction
        ApprovalAction.objects.create(instance=instance, actor=request.user, action='approved', comment=comment)
        return Response(AdminApprovalSerializer(instance).data)


class AdminReassignView(APIView):
    """POST /api/admin/approvals/{id}/reassign/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def post(self, request, pk):
        try:
            instance = ApprovalInstance.objects.get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        s = ReassignSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        from accounts.models import User
        try:
            new_approver = User.objects.get(pk=s.validated_data['approver_id'])
        except User.DoesNotExist:
            return Response({'detail': 'Approver not found.'}, status=status.HTTP_400_BAD_REQUEST)

        instance.current_approver = new_approver
        instance.save(update_fields=['current_approver', 'updated_at'])

        from workflow.models import ApprovalAction
        ApprovalAction.objects.create(
            instance=instance, actor=request.user, action='commented',
            comment=f"Reassigned to {new_approver.username}. {s.validated_data.get('comment', '')}"
        )
        return Response(AdminApprovalSerializer(instance).data)
