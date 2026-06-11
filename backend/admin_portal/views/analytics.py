from django.db.models import Avg, Count, F, ExpressionWrapper, DurationField
from django.utils import timezone
from datetime import timedelta
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from workflow.models import ApprovalInstance
from admin_portal.permissions import IsAdminPortalUser


class AdminProductivityView(APIView):
    """GET /api/admin/analytics/productivity/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        from crops.models import FarmerVisit
        from mandi.models import MandiArrival
        from product_demo.models import ProductDemo

        fes = User.objects.filter(
            primary_role__code='field_executive', is_active=True
        ).values('id', 'username', 'first_name', 'last_name')

        result = []
        for fe in fes:
            uid = fe['id']
            result.append({
                'user_id': str(uid),
                'username': fe['username'],
                'full_name': f"{fe['first_name']} {fe['last_name']}".strip(),
                'farmer_visits': FarmerVisit.objects.filter(executive_id=uid, submitted_at__gte=since).count(),
                'mandi_arrivals': MandiArrival.objects.filter(submitted_by_id=uid, created_at__gte=since).count(),
                'product_demos': ProductDemo.objects.filter(executive_id=uid, submitted_at__gte=since).count(),
            })

        return Response({'days': days, 'executives': result})


class AdminApprovalSLAView(APIView):
    """GET /api/admin/analytics/approval-sla/"""
    permission_classes = [IsAuthenticated, IsAdminPortalUser]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        approved = ApprovalInstance.objects.filter(
            status='approved',
            approved_at__gte=since,
        ).select_related('workflow')

        by_module = {}
        for inst in approved:
            module = inst.workflow.module
            if module not in by_module:
                by_module[module] = []
            if inst.approved_at and inst.submitted_at:
                hours = (inst.approved_at - inst.submitted_at).total_seconds() / 3600
                by_module[module].append(hours)

        result = {}
        for module, hours_list in by_module.items():
            result[module] = {
                'count': len(hours_list),
                'avg_hours': round(sum(hours_list) / len(hours_list), 1) if hours_list else 0,
                'min_hours': round(min(hours_list), 1) if hours_list else 0,
                'max_hours': round(max(hours_list), 1) if hours_list else 0,
            }

        return Response({'days': days, 'by_module': result})
