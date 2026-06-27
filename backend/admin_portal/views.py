import csv
import logging
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, ExpressionWrapper, DurationField, Max, Min, Q, Sum
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from audit.engine import AuditEngine

logger = logging.getLogger(__name__)

from crops.models import FarmerVisit, CropRecord
from mandi.models import MandiArrival
from product_demo.models import ProductDemo

from .permissions import IsAdminPortalUser, IsStaffUser  # IsStaffUser kept for tests/fallback
from .serializers import (
    FarmerVisitAdminSerializer,
    MandiArrivalAdminSerializer,
    ProductDemoAdminSerializer,
    AdminUserSerializer,
    AdminUserCreateSerializer,
)


# ── Shared helpers ────────────────────────────────────────────────────────────

class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        return None


class _EchoBuffer:
    """Minimal writable pseudo-file for StreamingHttpResponse CSV rows."""
    def write(self, value):
        return value


def _stream_csv(rows_iter, filename):
    pseudo_buffer = _EchoBuffer()
    writer = csv.writer(pseudo_buffer)

    def row_generator():
        # Leading UTF-8 BOM so Excel detects the encoding and renders ₹ /
        # Devanagari text correctly instead of mojibake.
        yield '\ufeff'
        for row in rows_iter:
            yield writer.writerow(row)

    response = StreamingHttpResponse(
        row_generator(),
        content_type='text/csv; charset=utf-8',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── User Management ───────────────────────────────────────────────────────────

class AdminUserListView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        User = get_user_model()
        qs = User.objects.select_related('reporting_to').order_by('-date_joined')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        role = request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        serializer = AdminUserSerializer(qs[:500], many=True)
        return Response(serializer.data)


class AdminUserCreateView(APIView):
    permission_classes = [IsAdminPortalUser]

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(created_by=request.user)
        try:
            AuditEngine.log(
                request, event_type='user', action='created', module='accounts',
                obj=user, changes={'role': getattr(user, 'role', ''), 'username': user.username},
            )
        except Exception:
            logger.exception('AdminUserCreateView: audit log failed')
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminPortalUser]

    def _get_user(self, pk):
        User = get_user_model()
        try:
            return User.objects.select_related('reporting_to').get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        old_role = getattr(user, 'primary_role_id', None)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        try:
            AuditEngine.log(
                request, event_type='user', action='updated', module='accounts',
                obj=user, changes={k: request.data[k] for k in request.data},
            )
            # Log role change separately when primary_role is being updated.
            if 'primary_role' in request.data and str(old_role) != str(user.primary_role_id):
                AuditEngine.log(
                    request, event_type='permission', action='role_changed', module='rbac',
                    obj=user,
                    changes={'old_role': str(old_role), 'new_role': str(user.primary_role_id)},
                )
        except Exception:
            logger.exception('AdminUserDetailView.patch: audit log failed')
        return Response(serializer.data)


class AdminDeactivateView(APIView):
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        User = get_user_model()
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = False
        user.deactivated_at = timezone.now()
        user.deactivation_reason = request.data.get('reason', '')
        user.deactivated_by = request.user
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivation_reason', 'deactivated_by'])
        try:
            AuditEngine.log(
                request, event_type='user', action='deactivated', module='accounts',
                obj=user, changes={'reason': user.deactivation_reason},
            )
        except Exception:
            logger.exception('AdminDeactivateView: audit log failed')
        return Response({'detail': 'User deactivated.'})


class AdminReactivateView(APIView):
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        User = get_user_model()
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = True
        user.deactivated_at = None
        user.deactivation_reason = ''
        user.save(update_fields=['is_active', 'deactivated_at', 'deactivation_reason'])
        try:
            AuditEngine.log(
                request, event_type='user', action='reactivated', module='accounts', obj=user,
            )
        except Exception:
            logger.exception('AdminReactivateView: audit log failed')
        return Response({'detail': 'User reactivated.'})


class AdminForceLogoutView(APIView):
    """
    Blacklists all outstanding refresh tokens for a user, forcing them to
    re-authenticate on their next API call.
    POST /api/admin/users/<pk>/force-logout/

    Phase 2: now a real implementation using the simplejwt token_blacklist app.
    The user's existing access tokens will continue to work until they expire
    (max 12h), but no new access tokens can be obtained without re-login.
    """
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken
        )

        User = get_user_model()
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        outstanding = OutstandingToken.objects.filter(user_id=pk)
        blacklisted_count = 0
        for token in outstanding:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            if created:
                blacklisted_count += 1

        try:
            AuditEngine.log(
                request, event_type='user', action='force_logout', module='accounts',
                obj=target_user, changes={'tokens_blacklisted': blacklisted_count},
            )
        except Exception:
            logger.exception('AdminForceLogoutView: audit log failed')

        return Response({
            'detail': f'Force logout complete. {blacklisted_count} token(s) blacklisted.',
        })


# ── Farmer Visits ─────────────────────────────────────────────────────────────

def _visits_queryset(params):
    qs = (FarmerVisit.objects
          .select_related('executive')
          .prefetch_related('crops', 'photos')
          .order_by('-submitted_at'))

    date_from = _parse_date(params.get('date_from'))
    date_to   = _parse_date(params.get('date_to'))
    if date_from:
        qs = qs.filter(submitted_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(submitted_at__date__lte=date_to)
    if params.get('executive'):
        qs = qs.filter(executive_id=params['executive'])
    if params.get('district'):
        qs = qs.filter(district_name__icontains=params['district'])
    if params.get('crop'):
        qs = qs.filter(crops__crop_name__icontains=params['crop']).distinct()
    if params.get('variety'):
        qs = qs.filter(crops__variety__icontains=params['variety']).distinct()
    if params.get('condition'):
        qs = qs.filter(crops__crop_condition=params['condition']).distinct()
    return qs


class FarmerVisitListView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _visits_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = FarmerVisitAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class FarmerVisitExportView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _visits_queryset(request.query_params)

        def rows():
            yield [
                'Date', 'Executive', 'Farmer', 'Mobile',
                'Village', 'Block', 'District',
                'Total Land (Acre)', 'Crop Count',
                'Crop Name', 'Variety', 'Stage', 'Condition',
                'This Year Area', 'Last Year Area', 'Sowing Date', 'Problems',
                'Latitude', 'Longitude', 'Remark',
            ]
            for visit in qs.iterator(chunk_size=500):
                crops = list(visit.crops.all())
                if crops:
                    for crop in crops:
                        yield [
                            visit.submitted_at.strftime('%Y-%m-%d %H:%M'),
                            visit.executive.get_full_name() or visit.executive.username if visit.executive else '',
                            visit.farmer_name, visit.mobile_number,
                            visit.village_name, visit.block_name, visit.district_name,
                            visit.total_land_acre, len(crops),
                            crop.crop_name, crop.variety, crop.crop_stage, crop.crop_condition,
                            crop.this_year_area_acre, crop.last_year_area_acre or '',
                            crop.date_of_sowing, ', '.join(crop.problems or []),
                            visit.latitude or '', visit.longitude or '',
                            visit.remark,
                        ]
                else:
                    yield [
                        visit.submitted_at.strftime('%Y-%m-%d %H:%M'),
                        visit.executive.get_full_name() or visit.executive.username if visit.executive else '',
                        visit.farmer_name, visit.mobile_number,
                        visit.village_name, visit.block_name, visit.district_name,
                        visit.total_land_acre, 0,
                        '', '', '', '', '', '', '', '',
                        visit.latitude or '', visit.longitude or '',
                        visit.remark,
                    ]

        filename = f"fps-farmer-visits-{date.today().isoformat()}.csv"
        return _stream_csv(rows(), filename)


# ── Mandi Arrivals ────────────────────────────────────────────────────────────

def _mandi_queryset(params):
    qs = (MandiArrival.objects
          .select_related('mandi', 'submitted_by')
          .order_by('-date'))

    date_from = _parse_date(params.get('date_from'))
    date_to   = _parse_date(params.get('date_to'))
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    if params.get('executive'):
        qs = qs.filter(submitted_by_id=params['executive'])
    if params.get('district'):
        qs = qs.filter(mandi__district__icontains=params['district'])
    if params.get('commodity'):
        qs = qs.filter(commodity__icontains=params['commodity'])
    if params.get('mandi'):
        qs = qs.filter(mandi_id=params['mandi'])
    return qs


class MandiArrivalListView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _mandi_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MandiArrivalAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class MandiArrivalExportView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _mandi_queryset(request.query_params)

        def rows():
            yield [
                'Date', 'Created At', 'Executive',
                'Mandi', 'District', 'State',
                'Commodity', 'Quantity (Qt)',
                'Avg Rate (₹)', 'Min Rate (₹)', 'Max Rate (₹)',
                'Source', 'Remark',
            ]
            for a in qs.iterator(chunk_size=500):
                yield [
                    a.date.isoformat(),
                    a.created_at.strftime('%Y-%m-%d %H:%M'),
                    a.submitted_by.get_full_name() or a.submitted_by.username if a.submitted_by else '',
                    a.mandi.name, a.mandi.district, a.mandi.state,
                    a.commodity, a.arrival_quantity,
                    a.avg_rate or '', a.min_rate or '', a.max_rate or '',
                    a.source, a.remark,
                ]

        filename = f"fps-mandi-arrivals-{date.today().isoformat()}.csv"
        return _stream_csv(rows(), filename)


# ── Product Demos ─────────────────────────────────────────────────────────────

def _demos_queryset(params):
    qs = (ProductDemo.objects
          .select_related('executive')
          .prefetch_related('photos')
          .order_by('-submitted_at'))

    date_from = _parse_date(params.get('date_from'))
    date_to   = _parse_date(params.get('date_to'))
    if date_from:
        qs = qs.filter(submitted_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(submitted_at__date__lte=date_to)
    if params.get('executive'):
        qs = qs.filter(executive_id=params['executive'])
    if params.get('district'):
        qs = qs.filter(district_name__icontains=params['district'])
    if params.get('crop'):
        qs = qs.filter(crop_name__icontains=params['crop'])
    if params.get('variety'):
        v = params['variety']
        qs = qs.filter(Q(variety__icontains=v) | Q(varieties__icontains=v))
    if params.get('product'):
        qs = qs.filter(product_name__icontains=params['product'])
    if params.get('result'):
        qs = qs.filter(demo_result=params['result'])
    return qs


class ProductDemoListView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _demos_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ProductDemoAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class ProductDemoExportView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        qs = _demos_queryset(request.query_params)

        def rows():
            yield [
                'Demo Date', 'Submitted At', 'Executive',
                'Farmer', 'Mobile', 'Village', 'Block', 'District',
                'Total Land (Acre)',
                'Crop', 'Variety', 'Crop Stage', 'Stage Days',
                'Product', 'Dose', 'Dose Unit',
                'Phase', 'Result', 'Observations', 'Remark',
                'Latitude', 'Longitude',
                'Before Photos', 'After Photos',
            ]
            for demo in qs.iterator(chunk_size=500):
                varieties = demo.varieties if demo.varieties else ([demo.variety] if demo.variety else [''])
                base = [
                    demo.demo_date.isoformat(),
                    demo.submitted_at.strftime('%Y-%m-%d %H:%M'),
                    demo.executive.get_full_name() or demo.executive.username if demo.executive else '',
                    demo.farmer_name, demo.mobile_number,
                    demo.village_name, demo.block_name, demo.district_name,
                    demo.total_land_acre or '',
                    demo.crop_name,
                ]
                suffix = [
                    demo.crop_stage, demo.crop_stage_days,
                    demo.product_name, demo.dose, demo.dose_unit,
                    demo.demo_phase, demo.demo_result or '', demo.additional_observations, demo.remark,
                    demo.latitude or '', demo.longitude or '',
                    demo.before_photo_count, demo.after_photo_count,
                ]
                for variety in varieties:
                    yield base + [variety] + suffix

        filename = f"fps-product-demos-{date.today().isoformat()}.csv"
        return _stream_csv(rows(), filename)


# ── Analytics ─────────────────────────────────────────────────────────────────

class ProductivityView(APIView):
    """Per-executive submission counts across all three modules within a date window."""
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)

        User = get_user_model()
        users = (
            User.objects
            .filter(
                Q(farmer_visits__submitted_at__gte=since) |
                Q(mandi_submissions__created_at__gte=since) |
                Q(product_demos__submitted_at__gte=since)
            )
            .distinct()
            .annotate(
                visits_count=Count(
                    'farmer_visits',
                    filter=Q(farmer_visits__submitted_at__gte=since),
                    distinct=True,
                ),
                mandi_count=Count(
                    'mandi_submissions',
                    filter=Q(mandi_submissions__created_at__gte=since),
                    distinct=True,
                ),
                demos_count=Count(
                    'product_demos',
                    filter=Q(product_demos__submitted_at__gte=since),
                    distinct=True,
                ),
            )
            .order_by('-visits_count')
        )

        executives = [
            {
                'user_id': u.pk,
                'username': u.username,
                'full_name': u.get_full_name() or u.username,
                'farmer_visits': u.visits_count,
                'mandi_arrivals': u.mandi_count,
                'product_demos': u.demos_count,
            }
            for u in users
        ]
        return Response({'days': days, 'executives': executives})


class ApprovalSLAView(APIView):
    """Approval turnaround stats by module from the ApprovalInstance table (Phase 3+)."""
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from workflow.models import ApprovalInstance

        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)
        by_module = {}

        def _sla_stats(module):
            approved = ApprovalInstance.objects.filter(
                workflow__module=module,
                status='approved',
                approved_at__isnull=False,
                approved_at__gte=since,
            )
            count = approved.count()
            if count == 0:
                return None
            durations = [
                (r.approved_at - r.submitted_at).total_seconds() / 3600
                for r in approved.only('approved_at', 'submitted_at')
            ]
            return {
                'count': count,
                'avg_hours': round(sum(durations) / len(durations), 2),
                'min_hours': round(min(durations), 2),
                'max_hours': round(max(durations), 2),
            }

        for module in ('crop_monitoring', 'mandi', 'product_demo'):
            stats = _sla_stats(module)
            if stats:
                by_module[module] = stats

        return Response({'days': days, 'by_module': by_module})


# ── Audit Log ─────────────────────────────────────────────────────────────────

def _build_audit_events(module_filter=None, event_type_filter=None,
                         actor_filter=None, since=None, until=None):
    """
    Synthesises audit events from existing submission tables.
    Returns a list of dicts sorted by created_at descending.
    """
    User = get_user_model()
    events = []

    def _ts(dt):
        return dt.isoformat() if dt else ''

    # -- User registrations (module: accounts) ---------------------------------
    if not module_filter or module_filter == 'accounts':
        if not event_type_filter or event_type_filter == 'create':
            qs = User.objects.select_related('created_by').order_by('-date_joined')[:500]
            for u in qs:
                actor = u.created_by
                actor_username = actor.username if actor else 'system'
                actor_role = actor.role if actor else 'system'
                if actor_filter and actor_filter.lower() not in actor_username.lower():
                    continue
                ts = _ts(u.date_joined)
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                events.append({
                    'id': f'acc-{u.pk}',
                    'actor_username': actor_username,
                    'actor_role': actor_role,
                    'actor_ip': '',
                    'actor_device': '',
                    'event_type': 'create',
                    'module': 'accounts',
                    'action': 'user_registered',
                    'object_repr': u.username,
                    'changes': {},
                    'request_id': '',
                    'created_at': ts,
                })

    # -- Farmer visits (module: crops) ----------------------------------------
    if not module_filter or module_filter == 'crops':
        if not event_type_filter or event_type_filter == 'create':
            qs = FarmerVisit.objects.select_related('executive').order_by('-submitted_at')[:500]
            for v in qs:
                actor_username = v.executive.username if v.executive else 'unknown'
                actor_role = v.executive.role if v.executive else ''
                if actor_filter and actor_filter.lower() not in actor_username.lower():
                    continue
                ts = _ts(v.submitted_at)
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                events.append({
                    'id': f'visit-{v.pk}',
                    'actor_username': actor_username,
                    'actor_role': actor_role,
                    'actor_ip': '',
                    'actor_device': '',
                    'event_type': 'create',
                    'module': 'crops',
                    'action': 'submitted_farmer_visit',
                    'object_repr': f'{v.farmer_name} ({v.district_name})',
                    'changes': {},
                    'request_id': '',
                    'created_at': ts,
                })

    # -- Mandi arrivals (module: mandi) ----------------------------------------
    if not module_filter or module_filter == 'mandi':
        if not event_type_filter or event_type_filter == 'create':
            qs = MandiArrival.objects.select_related('submitted_by').order_by('-created_at')[:500]
            for m in qs:
                actor_username = m.submitted_by.username if m.submitted_by else 'unknown'
                actor_role = m.submitted_by.role if m.submitted_by else ''
                if actor_filter and actor_filter.lower() not in actor_username.lower():
                    continue
                ts = _ts(m.created_at)
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                events.append({
                    'id': f'mandi-{m.pk}',
                    'actor_username': actor_username,
                    'actor_role': actor_role,
                    'actor_ip': '',
                    'actor_device': '',
                    'event_type': 'create',
                    'module': 'mandi',
                    'action': 'submitted_mandi_arrival',
                    'object_repr': f'{m.commodity} ({getattr(m, "mandi_id", "")})',
                    'changes': {},
                    'request_id': '',
                    'created_at': ts,
                })

    # -- Product demos (module: product_demo) ----------------------------------
    if not module_filter or module_filter == 'product_demo':
        if not event_type_filter or event_type_filter == 'create':
            qs = ProductDemo.objects.select_related('executive').order_by('-submitted_at')[:500]
            for d in qs:
                actor_username = d.executive.username if d.executive else 'unknown'
                actor_role = d.executive.role if d.executive else ''
                if actor_filter and actor_filter.lower() not in actor_username.lower():
                    continue
                ts = _ts(d.submitted_at)
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                events.append({
                    'id': f'demo-{d.pk}',
                    'actor_username': actor_username,
                    'actor_role': actor_role,
                    'actor_ip': '',
                    'actor_device': '',
                    'event_type': 'create',
                    'module': 'product_demo',
                    'action': 'submitted_product_demo',
                    'object_repr': f'{d.product_name} — {d.farmer_name}',
                    'changes': {},
                    'request_id': '',
                    'created_at': ts,
                })

    events.sort(key=lambda e: e['created_at'], reverse=True)
    return events


class AuditLogView(APIView):
    """
    GET /api/admin/audit/
    Phase 4: queries the real AuditLog table (replaces synthesized view).
    Supports filters: module, event_type, actor_username, since, until.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from audit.services.query_service import AuditQueryService

        qs = AuditQueryService.get_queryset(
            module=request.query_params.get('module') or None,
            event_type=request.query_params.get('event_type') or None,
            actor_username=request.query_params.get('actor_username') or None,
            since=request.query_params.get('since') or None,
            until=request.query_params.get('until') or None,
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        results = [AuditQueryService.to_api_dict(log) for log in page]
        return paginator.get_paginated_response(results)


class AuditExportView(APIView):
    """
    GET /api/admin/audit/export/
    Phase 4: streams CSV from real AuditLog table.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from audit.services.query_service import AuditQueryService

        qs = AuditQueryService.get_queryset(
            module=request.query_params.get('module') or None,
            event_type=request.query_params.get('event_type') or None,
            actor_username=request.query_params.get('actor_username') or None,
            since=request.query_params.get('since') or None,
            until=request.query_params.get('until') or None,
        )
        filename = f"fps-audit-{date.today().isoformat()}.csv"
        return _stream_csv(AuditQueryService.export_rows(qs), filename)


# ── Agricultural Intelligence Analytics ───────────────────────────────────────

def _period_bounds(period: str):
    """Return (current_start, current_end, previous_start, previous_end) for a named period."""
    now = timezone.now()
    today = now.date()
    if period == 'today':
        cur_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        cur_end = now
        prev_start = cur_start - timedelta(days=1)
        prev_end = cur_start
    elif period == 'week':
        cur_start = timezone.make_aware(datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time()))
        cur_end = now
        prev_start = cur_start - timedelta(weeks=1)
        prev_end = cur_start
    else:  # month
        cur_start = timezone.make_aware(datetime.combine(today.replace(day=1), datetime.min.time()))
        cur_end = now
        days_in_period = (cur_start - timedelta(days=1)).day
        prev_start = (cur_start - timedelta(days=days_in_period)).replace(day=1)
        prev_start = timezone.make_aware(datetime.combine(prev_start, datetime.min.time()))
        prev_end = cur_start
    return cur_start, cur_end, prev_start, prev_end


def _summary_for_range(start, end):
    User = get_user_model()
    visits = FarmerVisit.objects.filter(submitted_at__gte=start, submitted_at__lt=end)
    mandi = MandiArrival.objects.filter(created_at__gte=start, created_at__lt=end)
    demos = ProductDemo.objects.filter(submitted_at__gte=start, submitted_at__lt=end)

    exec_ids = set(
        list(visits.values_list('executive_id', flat=True)) +
        list(mandi.values_list('submitted_by_id', flat=True)) +
        list(demos.values_list('executive_id', flat=True))
    )
    exec_ids.discard(None)

    farmers = set(visits.values_list('farmer_name', flat=True))
    villages = set(
        list(visits.values_list('village_name', flat=True)) +
        list(demos.values_list('village_name', flat=True))
    )
    return {
        'crop_entries': visits.count(),
        'market_entries': mandi.count(),
        'product_demos': demos.count(),
        'active_executives': len(exec_ids),
        'farmers_covered': len(farmers),
        'villages_covered': len(villages),
    }


class SummaryView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('today', 'week', 'month'):
            period = 'week'

        cur_start, cur_end, prev_start, prev_end = _period_bounds(period)

        all_time_end = timezone.now()
        all_time_start = timezone.make_aware(datetime(2000, 1, 1))

        return Response({
            'period': period,
            'current': _summary_for_range(cur_start, cur_end),
            'previous': _summary_for_range(prev_start, prev_end),
            'all_time': _summary_for_range(all_time_start, all_time_end),
        })


class CropIntelligenceView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)

        visits = FarmerVisit.objects.filter(submitted_at__gte=since)
        crop_records = CropRecord.objects.filter(visit__submitted_at__gte=since)

        total_entries = visits.count()
        farmers = set(visits.values_list('farmer_name', flat=True))
        villages = set(visits.values_list('village_name', flat=True))

        # Top crops
        crop_counts = {}
        for row in crop_records.values('crop_name').annotate(count=Count('id')).order_by('-count')[:15]:
            crop_counts[row['crop_name']] = row['count']
        top_crops = [{'crop': k, 'count': v} for k, v in crop_counts.items()]

        # Variety distribution
        variety_counts = {}
        for row in crop_records.values('variety').annotate(count=Count('id')).order_by('-count')[:10]:
            variety_counts[row['variety']] = row['count']
        top_varieties = [{'variety': k, 'count': v} for k, v in variety_counts.items()]

        # Condition distribution
        condition_dist = {'good': 0, 'average': 0, 'poor': 0}
        for row in crop_records.values('crop_condition').annotate(count=Count('id')):
            cond = row['crop_condition']
            if cond in condition_dist:
                condition_dist[cond] = row['count']

        # Problem distribution (JSONField list — aggregate in Python)
        problem_dist = {'pest': 0, 'disease': 0, 'weather': 0, 'labour': 0, 'price': 0, 'other': 0}
        for problems_list in crop_records.values_list('problems', flat=True):
            if not problems_list:
                continue
            for p in problems_list:
                key = p.lower().strip()
                if key in problem_dist:
                    problem_dist[key] += 1
                else:
                    problem_dist['other'] += 1

        # District coverage (top 10)
        district_data = {}
        for row in visits.values('district_name').annotate(entries=Count('id')):
            d = row['district_name']
            district_data[d] = {'district': d, 'entries': row['entries'], 'villages': 0}
        for row in visits.values('district_name', 'village_name').distinct():
            d = row['district_name']
            if d in district_data:
                district_data[d]['villages'] += 1
        district_coverage = sorted(district_data.values(), key=lambda x: x['entries'], reverse=True)[:10]

        # Block coverage (top 10)
        block_data = {}
        for row in visits.values('block_name', 'district_name').annotate(entries=Count('id')):
            k = (row['block_name'], row['district_name'])
            block_data[k] = {'block': row['block_name'], 'district': row['district_name'], 'entries': row['entries'], 'villages': 0}
        for row in visits.values('block_name', 'district_name', 'village_name').distinct():
            k = (row['block_name'], row['district_name'])
            if k in block_data:
                block_data[k]['villages'] += 1
        block_coverage = sorted(block_data.values(), key=lambda x: x['entries'], reverse=True)[:10]

        # Village coverage (top 20)
        village_data = {}
        for row in visits.values('village_name', 'block_name', 'district_name').annotate(entries=Count('id')):
            village_data[row['village_name']] = {
                'village': row['village_name'],
                'block': row['block_name'],
                'district': row['district_name'],
                'entries': row['entries'],
            }
        village_coverage = sorted(village_data.values(), key=lambda x: x['entries'], reverse=True)[:20]

        return Response({
            'total_entries': total_entries,
            'total_farmers': len(farmers),
            'total_villages': len(villages),
            'top_crops': top_crops,
            'top_varieties': top_varieties,
            'condition_distribution': condition_dist,
            'problem_distribution': problem_dist,
            'district_coverage': district_coverage,
            'block_coverage': block_coverage,
            'village_coverage': village_coverage,
        })


class MarketIntelligenceView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)

        arrivals = MandiArrival.objects.filter(created_at__gte=since).select_related('mandi')
        total_entries = arrivals.count()

        # Commodity arrivals (top 10)
        commodity_arrivals = []
        for row in (arrivals.values('commodity')
                    .annotate(quantity=Sum('arrival_quantity'), entries=Count('id'))
                    .order_by('-quantity')[:10]):
            commodity_arrivals.append({
                'commodity': row['commodity'],
                'quantity': float(row['quantity'] or 0),
                'entries': row['entries'],
            })

        # Source distribution
        source_dist = {s: 0 for s in ('trader', 'farmer', 'fps_staff', 'mandi', 'official', 'other')}
        for row in arrivals.values('source').annotate(count=Count('id')):
            src = row['source']
            if src in source_dist:
                source_dist[src] = row['count']
            else:
                source_dist['other'] += row['count']

        # Top mandis (top 10)
        mandi_data = {}
        for row in (arrivals.values('mandi__id', 'mandi__name', 'mandi__district')
                    .annotate(entries=Count('id'), total_qty=Sum('arrival_quantity'))
                    .order_by('-entries')[:10]):
            mandi_data[row['mandi__id']] = {
                'mandi': row['mandi__name'],
                'district': row['mandi__district'],
                'entries': row['entries'],
                'total_qty': float(row['total_qty'] or 0),
                'commodities': 0,
            }
        for row in (arrivals.values('mandi__id', 'commodity').distinct()):
            mid = row['mandi__id']
            if mid in mandi_data:
                mandi_data[mid]['commodities'] += 1
        top_mandis = sorted(mandi_data.values(), key=lambda x: x['entries'], reverse=True)

        # District activity (top 10)
        district_activity = []
        for row in (arrivals.values('mandi__district')
                    .annotate(entries=Count('id'))
                    .order_by('-entries')[:10]):
            district_activity.append({'district': row['mandi__district'], 'entries': row['entries']})

        # Commodity trends (compare first half vs second half of window)
        mid_point = timezone.now() - timedelta(days=days // 2)
        commodity_trends = []
        commodities = arrivals.values_list('commodity', flat=True).distinct()
        for commodity in commodities:
            curr_avg = (MandiArrival.objects
                        .filter(created_at__gte=mid_point, commodity=commodity, avg_rate__isnull=False)
                        .aggregate(avg=Avg('avg_rate'))['avg'])
            prev_avg = (MandiArrival.objects
                        .filter(created_at__gte=since, created_at__lt=mid_point, commodity=commodity, avg_rate__isnull=False)
                        .aggregate(avg=Avg('avg_rate'))['avg'])
            if curr_avg is not None and prev_avg is not None and prev_avg > 0:
                delta_pct = ((curr_avg - prev_avg) / prev_avg) * 100
                trend = 'up' if delta_pct > 2 else ('down' if delta_pct < -2 else 'steady')
            else:
                trend = 'steady'
            commodity_trends.append({
                'commodity': commodity,
                'trend': trend,
                'current_avg_rate': round(float(curr_avg), 2) if curr_avg else None,
                'previous_avg_rate': round(float(prev_avg), 2) if prev_avg else None,
            })

        return Response({
            'total_entries': total_entries,
            'commodity_arrivals': commodity_arrivals,
            'source_distribution': source_dist,
            'top_mandis': top_mandis,
            'district_activity': district_activity,
            'commodity_trends': commodity_trends,
        })


class ProductPerformanceView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)

        demos = ProductDemo.objects.filter(submitted_at__gte=since)
        total = demos.count()
        active = demos.filter(demo_phase='before').count()
        completed = demos.filter(demo_phase='completed').count()

        # Product rankings (top 15)
        product_rankings = []
        for row in demos.values('product_name').annotate(total=Count('id')).order_by('-total')[:15]:
            product = row['product_name']
            comp = demos.filter(product_name=product, demo_phase='completed').count()
            rate = round((comp / row['total']) * 100, 1) if row['total'] > 0 else 0
            product_rankings.append({
                'product': product,
                'demos': row['total'],
                'completed': comp,
                'completion_rate': rate,
            })

        # Crop-product combinations (top 15)
        crop_product_combos = []
        for row in (demos.values('crop_name', 'product_name')
                    .annotate(count=Count('id'))
                    .order_by('-count')[:15]):
            crop_product_combos.append({
                'crop': row['crop_name'],
                'product': row['product_name'],
                'count': row['count'],
            })

        # Result distribution
        result_dist = {r: 0 for r in ('excellent', 'good', 'average', 'poor', 'no_effect')}
        for row in demos.filter(demo_result__isnull=False).values('demo_result').annotate(count=Count('id')):
            r = row['demo_result']
            if r in result_dist:
                result_dist[r] = row['count']

        # Executive-wise (top 10 by demo count)
        exec_demos = []
        for row in (demos.values('executive__id', 'executive__username', 'executive__first_name', 'executive__last_name')
                    .annotate(total=Count('id'), completed_count=Count('id', filter=Q(demo_phase='completed')))
                    .order_by('-total')[:10]):
            full = f"{row['executive__first_name']} {row['executive__last_name']}".strip() or row['executive__username']
            exec_demos.append({
                'user_id': row['executive__id'],
                'name': full,
                'demos': row['total'],
                'completed': row['completed_count'],
            })

        return Response({
            'total_demos': total,
            'active_demos': active,
            'completed_demos': completed,
            'funnel': {'started': total, 'after_pending': active, 'completed': completed},
            'product_rankings': product_rankings,
            'crop_product_combinations': crop_product_combos,
            'result_distribution': result_dist,
            'executive_demos': exec_demos,
        })


class RecentActivitiesView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        limit = max(1, min(100, int(request.query_params.get('limit', 20))))

        activities = []

        for v in (FarmerVisit.objects
                  .select_related('executive')
                  .prefetch_related('crops')
                  .order_by('-submitted_at')[:limit]):
            crop = v.crops.first()
            activities.append({
                'id': str(v.pk),
                'module': 'crops',
                'user': v.executive.get_full_name() or v.executive.username if v.executive else '—',
                'farmer': v.farmer_name,
                'crop': crop.crop_name if crop else '—',
                'location': f"{v.village_name}, {v.district_name}",
                'timestamp': v.submitted_at.isoformat(),
            })

        for m in (MandiArrival.objects
                  .select_related('mandi', 'submitted_by')
                  .order_by('-created_at')[:limit]):
            activities.append({
                'id': str(m.pk),
                'module': 'mandi',
                'user': m.submitted_by.get_full_name() or m.submitted_by.username if m.submitted_by else '—',
                'farmer': '—',
                'crop': m.commodity,
                'location': f"{m.mandi.name}, {m.mandi.district}",
                'timestamp': m.created_at.isoformat(),
            })

        for d in (ProductDemo.objects
                  .select_related('executive')
                  .order_by('-submitted_at')[:limit]):
            activities.append({
                'id': str(d.pk),
                'module': 'product_demo',
                'user': d.executive.get_full_name() or d.executive.username if d.executive else '—',
                'farmer': d.farmer_name,
                'crop': d.crop_name,
                'location': f"{d.village_name}, {d.district_name}",
                'timestamp': d.submitted_at.isoformat(),
            })

        activities.sort(key=lambda a: a['timestamp'], reverse=True)
        return Response({'activities': activities[:limit]})


class ExecutivePerformanceView(APIView):
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        days = max(1, int(request.query_params.get('days', 30)))
        since = timezone.now() - timedelta(days=days)
        search = request.query_params.get('search', '').strip().lower()

        User = get_user_model()
        users = (
            User.objects
            .filter(
                Q(farmer_visits__submitted_at__gte=since) |
                Q(mandi_submissions__created_at__gte=since) |
                Q(product_demos__submitted_at__gte=since)
            )
            .distinct()
            .annotate(
                visits_count=Count('farmer_visits', filter=Q(farmer_visits__submitted_at__gte=since), distinct=True),
                mandi_count=Count('mandi_submissions', filter=Q(mandi_submissions__created_at__gte=since), distinct=True),
                demos_count=Count('product_demos', filter=Q(product_demos__submitted_at__gte=since), distinct=True),
            )
            .order_by('-visits_count')
        )

        executives = []
        for u in users:
            full_name = u.get_full_name() or u.username
            if search and search not in full_name.lower() and search not in u.username.lower():
                continue

            visit_qs = FarmerVisit.objects.filter(executive=u, submitted_at__gte=since)
            demo_qs = ProductDemo.objects.filter(executive=u, submitted_at__gte=since)

            farmers = set(visit_qs.values_list('farmer_name', flat=True))
            villages = set(
                list(visit_qs.values_list('village_name', flat=True)) +
                list(demo_qs.values_list('village_name', flat=True))
            )

            mandi_qs = MandiArrival.objects.filter(submitted_by=u, created_at__gte=since)
            timestamps = []
            if visit_qs.exists():
                ts = visit_qs.aggregate(m=Max('submitted_at'))['m']
                if ts:
                    timestamps.append(ts)
            if mandi_qs.exists():
                ts = mandi_qs.aggregate(m=Max('created_at'))['m']
                if ts:
                    timestamps.append(ts)
            if demo_qs.exists():
                ts = demo_qs.aggregate(m=Max('submitted_at'))['m']
                if ts:
                    timestamps.append(ts)
            last_activity = max(timestamps).isoformat() if timestamps else None

            executives.append({
                'user_id': u.pk,
                'username': u.username,
                'full_name': full_name,
                'farmer_visits': u.visits_count,
                'mandi_arrivals': u.mandi_count,
                'product_demos': u.demos_count,
                'farmers_covered': len(farmers),
                'villages_covered': len(villages),
                'last_activity': last_activity,
                'total_activities': u.visits_count + u.mandi_count + u.demos_count,
            })

        return Response({'days': days, 'executives': executives})


# ── Role Management APIs ──────────────────────────────────────────────────────
# Phase 2 + Phase 5: these endpoints un-orphan the admin portal's Roles page.
# Requires: IsStaffUser (is_staff or is_superuser).

class RoleListCreateView(APIView):
    """
    GET  /api/admin/roles/        — list all roles (with permission/user counts)
    POST /api/admin/roles/        — create a custom role
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from accounts.models.role import Role
        from accounts.models.user_permission import UserPermission

        roles = Role.objects.prefetch_related('role_permissions__permission').order_by('name')
        data = []
        User = get_user_model()
        for role in roles:
            user_count = User.objects.filter(primary_role=role).count()
            perm_count = role.role_permissions.count()
            data.append({
                'id': str(role.id),
                'name': role.name,
                'code': role.code,
                'description': role.description,
                'is_preset': role.is_preset,
                'is_active': role.is_active,
                'created_at': role.created_at.isoformat(),
                'updated_at': role.updated_at.isoformat(),
                'permission_count': perm_count,
                'user_count': user_count,
            })
        return Response(data)

    def post(self, request):
        from accounts.models.role import Role

        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip()
        description = request.data.get('description', '')

        if not name or not code:
            return Response(
                {'detail': 'name and code are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Role.objects.filter(code=code).exists():
            return Response(
                {'detail': f'Role with code "{code}" already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role = Role.objects.create(
            name=name, code=code, description=description, is_preset=False,
        )
        return Response({
            'id': str(role.id),
            'name': role.name,
            'code': role.code,
            'description': role.description,
            'is_preset': role.is_preset,
            'is_active': role.is_active,
            'created_at': role.created_at.isoformat(),
            'updated_at': role.updated_at.isoformat(),
            'permission_count': 0,
            'user_count': 0,
        }, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    """
    GET    /api/admin/roles/<id>/  — retrieve a single role
    PATCH  /api/admin/roles/<id>/  — update a role (non-preset only for code changes)
    DELETE /api/admin/roles/<id>/  — delete a custom role (preset roles are protected)
    """
    permission_classes = [IsAdminPortalUser]

    def _get_role(self, role_id):
        from accounts.models.role import Role
        try:
            return Role.objects.get(pk=role_id)
        except (Role.DoesNotExist, Exception):
            return None

    def get(self, request, role_id):
        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        User = get_user_model()
        return Response({
            'id': str(role.id),
            'name': role.name,
            'code': role.code,
            'description': role.description,
            'is_preset': role.is_preset,
            'is_active': role.is_active,
            'created_at': role.created_at.isoformat(),
            'updated_at': role.updated_at.isoformat(),
            'permission_count': role.role_permissions.count(),
            'user_count': User.objects.filter(primary_role=role).count(),
        })

    def patch(self, request, role_id):
        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            role.name = request.data['name']
        if 'description' in request.data:
            role.description = request.data['description']
        if 'is_active' in request.data:
            role.is_active = request.data['is_active']
        # Preset roles cannot have their code changed
        if 'code' in request.data and not role.is_preset:
            from accounts.models.role import Role
            new_code = request.data['code']
            if Role.objects.filter(code=new_code).exclude(pk=role.pk).exists():
                return Response({'detail': 'Code already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            role.code = new_code
        role.save()
        return Response({'detail': 'Role updated.', 'id': str(role.id)})

    def delete(self, request, role_id):
        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if role.is_preset:
            return Response(
                {'detail': 'Preset roles cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RolePermissionsView(APIView):
    """
    GET    /api/admin/roles/<id>/permissions/  — list permissions assigned to role
    POST   /api/admin/roles/<id>/permissions/  — assign permissions to role
                                                 body: { "permission_ids": ["uuid", ...] }
    DELETE /api/admin/roles/<id>/permissions/  — remove permissions from role
                                                 body: { "permission_ids": ["uuid", ...] }
    """
    permission_classes = [IsAdminPortalUser]

    def _get_role(self, role_id):
        from accounts.models.role import Role
        try:
            return Role.objects.get(pk=role_id)
        except (Role.DoesNotExist, Exception):
            return None

    def get(self, request, role_id):
        from accounts.models.role import RolePermission
        from accounts.models.permission import Permission

        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        perm_ids = RolePermission.objects.filter(role=role).values_list('permission_id', flat=True)
        perms = Permission.objects.filter(id__in=perm_ids).order_by('module', 'codename')
        data = [
            {
                'id': str(p.id),
                'codename': p.codename,
                'label': p.label,
                'module': p.module,
                'category': p.category,
                'description': p.description,
                'is_active': p.is_active,
            }
            for p in perms
        ]
        return Response(data)

    def post(self, request, role_id):
        from accounts.models.role import Role, RolePermission
        from accounts.models.permission import Permission
        from accounts.services.permission_service import PermissionService

        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        permission_ids = request.data.get('permission_ids', [])
        if not permission_ids:
            return Response({'detail': 'permission_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

        perms = Permission.objects.filter(id__in=permission_ids, is_active=True)
        created = 0
        for perm in perms:
            _, was_created = RolePermission.objects.get_or_create(
                role=role, permission=perm,
                defaults={'granted_by': request.user},
            )
            if was_created:
                created += 1

        # Invalidate cache for all users with this role
        PermissionService.invalidate_cache_for_role(role.id)

        try:
            AuditEngine.log(
                request, event_type='permission', action='role_permission_added', module='rbac',
                obj=role, changes={'permission_ids': list(permission_ids), 'added_count': created},
            )
        except Exception:
            logger.exception('RolePermissionsView.post: audit log failed')

        return Response({'detail': f'{created} permission(s) added to role.'})

    def delete(self, request, role_id):
        from accounts.models.role import RolePermission
        from accounts.services.permission_service import PermissionService

        role = self._get_role(role_id)
        if not role:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        permission_ids = request.data.get('permission_ids', [])
        if not permission_ids:
            return Response({'detail': 'permission_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = RolePermission.objects.filter(
            role=role, permission_id__in=permission_ids
        ).delete()

        # Invalidate cache for all users with this role
        PermissionService.invalidate_cache_for_role(role.id)

        try:
            AuditEngine.log(
                request, event_type='permission', action='role_permission_removed', module='rbac',
                obj=role, changes={'permission_ids': list(permission_ids), 'removed_count': deleted},
            )
        except Exception:
            logger.exception('RolePermissionsView.delete: audit log failed')

        return Response({'detail': f'{deleted} permission(s) removed from role.'})


# ── Permission Catalogue APIs ─────────────────────────────────────────────────

class PermissionListView(APIView):
    """
    GET /api/admin/permissions/  — list all active permissions in the catalogue.
    Grouped by module. Used by the admin portal's Permission Catalogue page.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from accounts.models.permission import Permission

        module_filter = request.query_params.get('module')
        qs = Permission.objects.filter(is_active=True).order_by('module', 'codename')
        if module_filter:
            qs = qs.filter(module=module_filter)

        data = [
            {
                'id': str(p.id),
                'codename': p.codename,
                'label': p.label,
                'module': p.module,
                'category': p.category,
                'description': p.description,
                'is_active': p.is_active,
            }
            for p in qs
        ]
        return Response(data)


# ── User Permission Override APIs ─────────────────────────────────────────────

class UserPermissionListCreateView(APIView):
    """
    GET  /api/admin/user-permissions/?user_id=<id>  — list overrides for a user
    POST /api/admin/user-permissions/               — create an override
         body: { user, permission (UUID), effect, reason, expires_at? }
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from accounts.models.user_permission import UserPermission

        qs = UserPermission.objects.select_related('user', 'permission', 'granted_by')

        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        data = [
            {
                'id': str(up.id),
                'user': up.user_id,
                'user_username': up.user.username,
                'permission': str(up.permission_id),
                'permission_codename': up.permission.codename,
                'permission_label': up.permission.label,
                'effect': up.effect,
                'reason': up.reason,
                'expires_at': up.expires_at.isoformat() if up.expires_at else None,
                'granted_by': up.granted_by_id,
                'created_at': up.created_at.isoformat(),
            }
            for up in qs
        ]
        return Response(data)

    def post(self, request):
        from accounts.models.user_permission import UserPermission
        from accounts.models.permission import Permission
        from accounts.services.permission_service import PermissionService
        from django.utils.dateparse import parse_datetime

        User = get_user_model()

        user_id = request.data.get('user')
        permission_id = request.data.get('permission')
        effect = request.data.get('effect', '')
        reason = request.data.get('reason', '')
        expires_at_raw = request.data.get('expires_at')

        if not user_id or not permission_id:
            return Response({'detail': 'user and permission are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if effect not in ('allow', 'deny'):
            return Response({'detail': 'effect must be "allow" or "deny".'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            permission = Permission.objects.get(pk=permission_id, is_active=True)
        except Permission.DoesNotExist:
            return Response({'detail': 'Permission not found.'}, status=status.HTTP_404_NOT_FOUND)

        expires_at = None
        if expires_at_raw:
            expires_at = parse_datetime(expires_at_raw)

        up, created = UserPermission.objects.update_or_create(
            user=target_user,
            permission=permission,
            defaults={
                'effect': effect,
                'reason': reason,
                'granted_by': request.user,
                'expires_at': expires_at,
            },
        )

        # Immediately invalidate the user's permission cache
        PermissionService.invalidate_cache(target_user.id)

        try:
            perm_action = 'override_granted' if effect == 'allow' else 'override_denied'
            AuditEngine.log(
                request, event_type='permission', action=perm_action, module='rbac',
                obj=target_user,
                changes={
                    'permission': permission.codename,
                    'effect': effect,
                    'reason': reason,
                    'expires_at': str(expires_at) if expires_at else None,
                },
            )
        except Exception:
            logger.exception('UserPermissionListCreateView.post: audit log failed')

        return Response({
            'id': str(up.id),
            'user': up.user_id,
            'user_username': up.user.username,
            'permission': str(up.permission_id),
            'permission_codename': up.permission.codename,
            'permission_label': up.permission.label,
            'effect': up.effect,
            'reason': up.reason,
            'expires_at': up.expires_at.isoformat() if up.expires_at else None,
            'granted_by': up.granted_by_id,
            'created_at': up.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UserPermissionDetailView(APIView):
    """
    DELETE /api/admin/user-permissions/<id>/  — remove a user permission override
    """
    permission_classes = [IsAdminPortalUser]

    def delete(self, request, up_id):
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        try:
            up = UserPermission.objects.select_related('user', 'permission').get(pk=up_id)
        except UserPermission.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Capture details before delete for the audit entry.
        target_user = up.user
        codename = up.permission.codename
        old_effect = up.effect
        user_id = up.user_id

        up.delete()
        PermissionService.invalidate_cache(user_id)

        try:
            AuditEngine.log(
                request, event_type='permission', action='override_removed', module='rbac',
                obj=target_user,
                changes={'permission': codename, 'effect': old_effect},
            )
        except Exception:
            logger.exception('UserPermissionDetailView.delete: audit log failed')

        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin Password Reset API ──────────────────────────────────────────────────

class AdminResetPasswordView(APIView):
    """
    POST /api/admin/users/<pk>/reset-password/
    Resets a user's password and blacklists all their outstanding tokens.
    body: { "password": "new_password" }
    """
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken
        )

        User = get_user_model()
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_password = request.data.get('password', '')
        if len(str(new_password)) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.set_password(new_password)
        target.save(update_fields=['password'])

        # Blacklist all outstanding refresh tokens
        outstanding = OutstandingToken.objects.filter(user=target)
        for token in outstanding:
            BlacklistedToken.objects.get_or_create(token=token)

        try:
            AuditEngine.log(
                request, event_type='user', action='password_reset', module='accounts',
                obj=target, changes={'reset_by': request.user.username},
            )
        except Exception:
            logger.exception('AdminResetPasswordView: audit log failed')

        return Response({'detail': f'Password reset for {target.username}. All sessions invalidated.'})


# ── Phase 3: Approval Workflow — Admin portal endpoints ───────────────────────

class AdminApprovalListView(APIView):
    """
    GET /api/admin/approvals/
    Returns all ApprovalInstances, filterable by status and module.
    Used by the admin portal Approvals queue page.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from workflow.models import ApprovalInstance
        from workflow.serializers import ApprovalInstanceListSerializer

        qs = ApprovalInstance.objects.select_related(
            'workflow', 'submitted_by', 'current_approver'
        ).order_by('-submitted_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        module = request.query_params.get('module')
        if module:
            qs = qs.filter(workflow__module=module)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(
                ApprovalInstanceListSerializer(page, many=True).data
            )
        return Response(ApprovalInstanceListSerializer(qs, many=True).data)


class AdminApprovalDetailView(APIView):
    """
    GET /api/admin/approvals/<pk>/
    Returns full detail of an ApprovalInstance including its action log.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request, pk):
        from workflow.models import ApprovalInstance
        from workflow.serializers import ApprovalInstanceDetailSerializer

        try:
            instance = ApprovalInstance.objects.prefetch_related(
                'actions__actor'
            ).select_related(
                'workflow', 'submitted_by', 'current_approver',
                'approved_by', 'rejected_by'
            ).get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(ApprovalInstanceDetailSerializer(instance).data)


class AdminApprovalForceApproveView(APIView):
    """
    POST /api/admin/approvals/<pk>/force-approve/
    Body: {"comment": "..."}
    Allows admin to override the approval flow and approve any active instance.
    """
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from workflow.models import ApprovalInstance
        from workflow.serializers import ApprovalInstanceDetailSerializer
        from workflow.services.approval_engine import ApprovalEngine

        try:
            instance = ApprovalInstance.objects.select_related('workflow').get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment = request.data.get('comment', '')
        try:
            ApprovalEngine.force_approve(instance, request.user, comment)
        except DjangoValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ApprovalInstanceDetailSerializer(instance).data)


class AdminApprovalReassignView(APIView):
    """
    POST /api/admin/approvals/<pk>/reassign/
    Body: {"approver_id": <int>, "comment": "..."}
    Assigns a new current_approver without changing status.
    """
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        from workflow.models import ApprovalInstance
        from workflow.serializers import ApprovalInstanceDetailSerializer, ApprovalReassignSerializer
        from workflow.services.approval_engine import ApprovalEngine

        try:
            instance = ApprovalInstance.objects.select_related('workflow').get(pk=pk)
        except ApprovalInstance.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        ser = ApprovalReassignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        User = get_user_model()
        try:
            new_approver = User.objects.get(pk=ser.validated_data['approver_id'])
        except User.DoesNotExist:
            return Response({'detail': 'Approver user not found.'}, status=status.HTTP_400_BAD_REQUEST)

        ApprovalEngine.reassign(instance, request.user, new_approver)
        return Response(ApprovalInstanceDetailSerializer(instance).data)


# ── Phase 5: Region Management APIs ──────────────────────────────────────────

class RegionListCreateView(APIView):
    """
    GET  /api/admin/regions/   — paginated list with optional filters
    POST /api/admin/regions/   — create a new region
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from accounts.models.region import Region
        from .serializers import RegionSerializer

        qs = (
            Region.objects
            .select_related('parent')
            .prefetch_related('region_users', 'children')
            .order_by('state', 'district', 'taluka')
        )

        state = request.query_params.get('state')
        if state:
            qs = qs.filter(state__icontains=state)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        parent = request.query_params.get('parent')
        if parent:
            qs = qs.filter(parent__id=parent)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(RegionSerializer(page, many=True).data)

    def post(self, request):
        from accounts.models.region import Region
        from .serializers import RegionSerializer, RegionWriteSerializer

        ser = RegionWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        region = ser.save()

        try:
            AuditEngine.log(
                request, event_type='region', action='created',
                module='accounts', obj=region,
                changes={'code': [None, region.code]},
            )
        except Exception:
            logger.exception('RegionListCreateView.post: audit log failed')

        return Response(RegionSerializer(region).data, status=status.HTTP_201_CREATED)


class RegionDetailView(APIView):
    """
    GET    /api/admin/regions/<pk>/
    PATCH  /api/admin/regions/<pk>/
    DELETE /api/admin/regions/<pk>/   — blocked if region has children or assigned users
    """
    permission_classes = [IsAdminPortalUser]

    def _get_region(self, pk):
        from accounts.models.region import Region
        try:
            return Region.objects.select_related('parent').prefetch_related('region_users', 'children').get(pk=pk)
        except Region.DoesNotExist:
            return None

    def get(self, request, pk):
        from .serializers import RegionDetailSerializer
        region = self._get_region(pk)
        if region is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(RegionDetailSerializer(region).data)

    def patch(self, request, pk):
        from .serializers import RegionSerializer, RegionWriteSerializer
        region = self._get_region(pk)
        if region is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_code = region.code
        ser = RegionWriteSerializer(region, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        region = ser.save()

        try:
            changes = {}
            if region.code != old_code:
                changes['code'] = [old_code, region.code]
            AuditEngine.log(
                request, event_type='region', action='updated',
                module='accounts', obj=region, changes=changes or None,
            )
        except Exception:
            logger.exception('RegionDetailView.patch: audit log failed')

        return Response(RegionSerializer(region).data)

    def delete(self, request, pk):
        from accounts.models.region import Region
        from .serializers import RegionSerializer
        region = self._get_region(pk)
        if region is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if region.children.exists():
            return Response(
                {'detail': 'Cannot delete a region that has child regions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if region.region_users.exists():
            return Response(
                {'detail': 'Cannot delete a region that has assigned users.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            AuditEngine.log(
                request, event_type='region', action='deleted',
                module='accounts', obj=region,
                changes={'code': [region.code, None]},
            )
        except Exception:
            logger.exception('RegionDetailView.delete: audit log failed')

        region.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegionUsersView(APIView):
    """
    GET /api/admin/regions/<pk>/users/
    Paginated list of users assigned to this region.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request, pk):
        from accounts.models.region import Region, UserRegion
        from .serializers import RegionUserSerializer

        try:
            region = Region.objects.get(pk=pk)
        except Region.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = UserRegion.objects.filter(region=region).select_related('user')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(RegionUserSerializer(page, many=True).data)


class RegionAssignUserView(APIView):
    """
    POST   /api/admin/regions/<pk>/assign-user/
           Body: {"user_id": <int>, "role": "assigned"}
           Creates or updates a UserRegion record.

    DELETE /api/admin/regions/<pk>/assign-user/
           Body: {"user_id": <int>}
           Removes a UserRegion record.
    """
    permission_classes = [IsAdminPortalUser]

    def post(self, request, pk):
        from accounts.models.region import Region, UserRegion
        from accounts.services.permission_service import PermissionService
        from .serializers import RegionUserSerializer

        try:
            region = Region.objects.get(pk=pk)
        except Region.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

        role = request.data.get('role', 'assigned')
        user_region, created = UserRegion.objects.update_or_create(
            user=user, region=region,
            defaults={'role': role},
        )

        try:
            PermissionService.invalidate_cache(user.id)
        except Exception:
            logger.exception('RegionAssignUserView.post: cache invalidation failed')

        try:
            AuditEngine.log(
                request, event_type='region', action='user_assigned',
                module='accounts', obj=region,
                changes={'user_id': [None, user.id], 'role': [None, role]},
            )
        except Exception:
            logger.exception('RegionAssignUserView.post: audit log failed')

        return Response(
            RegionUserSerializer(user_region).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        from accounts.models.region import Region, UserRegion
        from accounts.services.permission_service import PermissionService

        try:
            region = Region.objects.get(pk=pk)
        except Region.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = UserRegion.objects.filter(user_id=user_id, region=region).delete()
        if not deleted:
            return Response({'detail': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            PermissionService.invalidate_cache(user_id)
        except Exception:
            logger.exception('RegionAssignUserView.delete: cache invalidation failed')

        try:
            AuditEngine.log(
                request, event_type='region', action='user_removed',
                module='accounts', obj=region,
                changes={'user_id': [user_id, None]},
            )
        except Exception:
            logger.exception('RegionAssignUserView.delete: audit log failed')

        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Phase 5: Sync Monitor APIs ────────────────────────────────────────────────

class SyncMonitorListView(APIView):
    """
    GET /api/admin/sync/
    Paginated list of device sync events across all devices.
    Query params: user_id, device_id (DeviceRegistration.device_id string),
                  status, date_from (ISO date), date_to (ISO date).

    Returns an empty paginated list until Phase 6 instruments the mobile sync
    endpoint to write DeviceSyncLog entries.
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request):
        from accounts.models.device import DeviceSyncLog
        from .serializers import DeviceSyncLogSerializer

        qs = DeviceSyncLog.objects.select_related('device', 'user').order_by('-synced_at')

        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        device_id = request.query_params.get('device_id')
        if device_id:
            qs = qs.filter(device__device_id=device_id)

        sync_status = request.query_params.get('status')
        if sync_status:
            qs = qs.filter(status=sync_status)

        date_from = request.query_params.get('date_from')
        if date_from:
            try:
                qs = qs.filter(synced_at__date__gte=date_from)
            except Exception:
                pass

        date_to = request.query_params.get('date_to')
        if date_to:
            try:
                qs = qs.filter(synced_at__date__lte=date_to)
            except Exception:
                pass

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(DeviceSyncLogSerializer(page, many=True).data)


class SyncMonitorDeviceView(APIView):
    """
    GET /api/admin/sync/<device_id>/
    Paginated sync history for a single device, identified by its
    DeviceRegistration.device_id string (not UUID PK).
    """
    permission_classes = [IsAdminPortalUser]

    def get(self, request, device_id):
        from accounts.models.device import DeviceRegistration, DeviceSyncLog
        from .serializers import DeviceSyncLogSerializer

        try:
            device = DeviceRegistration.objects.get(device_id=device_id)
        except DeviceRegistration.DoesNotExist:
            return Response({'detail': 'Device not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = DeviceSyncLog.objects.filter(device=device).select_related('user').order_by('-synced_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(DeviceSyncLogSerializer(page, many=True).data)
