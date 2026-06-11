import csv
from django.http import HttpResponse
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from audit.models import AuditLog
from admin_portal.permissions import IsAdminPortalUser, IsSuperAdmin
from admin_portal.serializers import AuditLogSerializer


class AdminAuditLogView(generics.ListAPIView):
    """GET /api/admin/audit/ — paginated audit log"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['module', 'event_type', 'actor_username']
    search_fields = ['actor_username', 'event_type', 'object_repr']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = AuditLog.objects.all()
        since = self.request.query_params.get('since')
        until = self.request.query_params.get('until')
        if since:
            qs = qs.filter(created_at__gte=since)
        if until:
            qs = qs.filter(created_at__lte=until)
        return qs


class AdminAuditExportView(APIView):
    """GET /api/admin/audit/export/ — CSV export (super_admin only)"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        qs = AuditLog.objects.all().order_by('-created_at')[:10000]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="fps_audit_log.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'id', 'actor_username', 'actor_role', 'actor_ip',
            'event_type', 'module', 'action', 'object_repr',
            'changes', 'request_id', 'created_at',
        ])
        for log in qs:
            writer.writerow([
                str(log.id), log.actor_username, log.actor_role, log.actor_ip or '',
                log.event_type, log.module, log.action, log.object_repr,
                str(log.changes), str(log.request_id or ''), log.created_at.isoformat(),
            ])
        return response
