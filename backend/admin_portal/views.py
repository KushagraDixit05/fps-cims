import csv
from datetime import date, datetime, timedelta

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from crops.models import FarmerVisit
from mandi.models import MandiArrival
from product_demo.models import ProductDemo

from .permissions import IsStaffUser
from .serializers import (
    FarmerVisitAdminSerializer,
    MandiArrivalAdminSerializer,
    ProductDemoAdminSerializer,
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
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        qs = _visits_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = FarmerVisitAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class FarmerVisitExportView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

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
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        qs = _mandi_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MandiArrivalAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class MandiArrivalExportView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

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
        qs = qs.filter(variety__icontains=params['variety'])
    if params.get('product'):
        qs = qs.filter(product_name__icontains=params['product'])
    if params.get('result'):
        qs = qs.filter(demo_result=params['result'])
    return qs


class ProductDemoListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        qs = _demos_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ProductDemoAdminSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class ProductDemoExportView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

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
                yield [
                    demo.demo_date.isoformat(),
                    demo.submitted_at.strftime('%Y-%m-%d %H:%M'),
                    demo.executive.get_full_name() or demo.executive.username if demo.executive else '',
                    demo.farmer_name, demo.mobile_number,
                    demo.village_name, demo.block_name, demo.district_name,
                    demo.total_land_acre or '',
                    demo.crop_name,
                    ', '.join(demo.varieties) if demo.varieties else demo.variety,
                    demo.crop_stage, demo.crop_stage_days,
                    demo.product_name, demo.dose, demo.dose_unit,
                    demo.demo_phase, demo.demo_result or '', demo.additional_observations, demo.remark,
                    demo.latitude or '', demo.longitude or '',
                    demo.before_photo_count, demo.after_photo_count,
                ]

        filename = f"fps-product-demos-{date.today().isoformat()}.csv"
        return _stream_csv(rows(), filename)
