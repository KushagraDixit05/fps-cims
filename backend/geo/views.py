from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDay, TruncWeek
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .filters import GeoFilters
from .scope import DataScope
from .aggregation import build_district_aggregate, build_state_aggregate, build_points
from .serializers import VisitRecordSerializer, DemoRecordSerializer, MandiRecordSerializer
from crops.models import FarmerVisit
from product_demo.models import ProductDemo
from mandi.models import MandiArrival


class AggregateView(APIView):
    """GET /api/geo/aggregate/ — district/state aggregates as GeoJSON FeatureCollection."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get('level', 'district')
        f = GeoFilters.parse(request.query_params)
        scope = DataScope(request.user)

        if level == 'state':
            features = build_state_aggregate(f, scope)
        else:
            features = build_district_aggregate(f, scope)

        return Response({'type': 'FeatureCollection', 'features': features})


class PointsView(APIView):
    """GET /api/geo/points/ — viewport-bounded individual points (cap 8k)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bbox_str = request.query_params.get('bbox', '')
        if not bbox_str:
            return Response({'error': 'bbox required: west,south,east,north'}, status=400)
        try:
            parts = [float(x) for x in bbox_str.split(',')]
            if len(parts) != 4:
                raise ValueError
            bbox = tuple(parts)
        except ValueError:
            return Response({'error': 'invalid bbox'}, status=400)

        f = GeoFilters.parse(request.query_params)
        scope = DataScope(request.user)
        points = build_points(f, scope, bbox)
        return Response({'type': 'FeatureCollection', 'features': points})


class RecordView(APIView):
    """GET /api/geo/record/<id>/?module=visit|demo|mandi"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        module = request.query_params.get('module', 'visit')
        scope = DataScope(request.user)

        if module == 'demo':
            qs = ProductDemo.objects.filter(id=pk)
            qs = scope.apply_to_demos(qs)
            obj = qs.first()
            if not obj:
                return Response({'error': 'not found'}, status=404)
            return Response({'module': 'demo', 'data': DemoRecordSerializer(obj).data})

        if module == 'mandi':
            qs = MandiArrival.objects.filter(id=pk).select_related('mandi')
            qs = scope.apply_to_arrivals(qs)
            obj = qs.first()
            if not obj:
                return Response({'error': 'not found'}, status=404)
            return Response({'module': 'mandi', 'data': MandiRecordSerializer(obj).data})

        # default: visit
        qs = FarmerVisit.objects.filter(id=pk).select_related('executive').prefetch_related('crops', 'photos')
        qs = scope.apply_to_visits(qs)
        obj = qs.first()
        if not obj:
            return Response({'error': 'not found'}, status=404)
        return Response({'module': 'visit', 'data': VisitRecordSerializer(obj).data})


class RegionSummaryView(APIView):
    """GET /api/geo/region/<level>/<id>/summary/ — KPIs, crop split, trend, execs."""
    permission_classes = [IsAuthenticated]

    def get(self, request, level, region_id):
        scope = DataScope(request.user)
        f = GeoFilters.parse(request.query_params)

        visit_qs = scope.apply_to_visits(f.apply_to_visits(FarmerVisit.objects.all()))
        demo_qs = scope.apply_to_demos(f.apply_to_demos(ProductDemo.objects.all()))

        if level == 'district':
            visit_qs = visit_qs.filter(district_name__iexact=region_id)
            demo_qs = demo_qs.filter(district_name__iexact=region_id)
        elif level == 'state':
            from crops.models import District
            district_names = list(District.objects.filter(state__iexact=region_id).values_list('name', flat=True))
            visit_qs = visit_qs.filter(district_name__in=district_names)
            demo_qs = demo_qs.filter(district_name__in=district_names)
        elif level == 'block':
            visit_qs = visit_qs.filter(block_name__iexact=region_id)
            demo_qs = demo_qs.filter(block_name__iexact=region_id)

        total_visits = visit_qs.count()
        total_demos = demo_qs.count()

        # Condition breakdown
        from crops.models import CropRecord
        crop_qs = CropRecord.objects.filter(visit__in=visit_qs)
        good = crop_qs.filter(crop_condition='good').count()
        average = crop_qs.filter(crop_condition='average').count()
        poor = crop_qs.filter(crop_condition='poor').count()
        cond_total = good + average + poor
        score = round((good * 1.0 + average * 0.5) / max(cond_total, 1), 3)

        # Crop split
        crop_split = list(
            crop_qs.values('crop_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        # 30-day trend
        from datetime import date, timedelta
        thirty_days_ago = date.today() - timedelta(days=30)
        trend = list(
            visit_qs.filter(submitted_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDay('submitted_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        trend_data = [
            {'date': t['day'].date().isoformat(), 'count': t['count']}
            for t in trend
        ]

        # Top execs
        top_execs = list(
            visit_qs.values('executive__id', 'executive__username', 'executive__full_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        execs_data = [
            {
                'id': e['executive__id'],
                'name': e['executive__full_name'] or e['executive__username'] or '',
                'count': e['count'],
            }
            for e in top_execs
        ]

        return Response({
            'region': region_id,
            'level': level,
            'kpis': {
                'total_visits': total_visits,
                'total_demos': total_demos,
                'score': score,
                'good': good,
                'average': average,
                'poor': poor,
            },
            'crop_split': crop_split,
            'trend': trend_data,
            'top_execs': execs_data,
        })


class FlowsView(APIView):
    """GET /api/geo/flows/ — directional arcs for flow mode."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        flow_type = request.query_params.get('type', 'mandi')
        f = GeoFilters.parse(request.query_params)
        scope = DataScope(request.user)
        arcs = []

        if flow_type == 'mandi':
            qs = MandiArrival.objects.filter(mandi__location__isnull=False)
            qs = scope.apply_to_arrivals(qs)
            qs = f.apply_to_arrivals(qs)
            # Aggregate by commodity → mandi, show top commodity flows
            rows = (
                qs.values('mandi__name', 'mandi__district', 'commodity')
                .annotate(
                    count=Count('id'),
                    centroid_x=Avg('mandi__location__x') if hasattr(MandiArrival, 'location') else None,
                )
                .order_by('-count')[:50]
            )
            # Since mandi location is a PointField, use raw values
            for row in qs.values(
                'mandi__name', 'mandi__district', 'commodity',
                'mandi__location',
            ).annotate(count=Count('id')).order_by('-count')[:50]:
                loc = row.get('mandi__location')
                if loc:
                    arcs.append({
                        'from': [float(loc.x), float(loc.y)],
                        'to': [float(loc.x) + 0.1, float(loc.y) + 0.1],
                        'weight': row['count'],
                        'label': f"{row['commodity']} → {row['mandi__name']}",
                    })

        elif flow_type == 'demo':
            qs = ProductDemo.objects.filter(location__isnull=False)
            qs = scope.apply_to_demos(qs)
            qs = f.apply_to_demos(qs)
            rows = (
                qs.values('district_name', 'product_name')
                .annotate(count=Count('id'), centroid=Avg('latitude'))
                .order_by('-count')[:50]
            )
            for d in qs.values('district_name', 'product_name', 'location').annotate(
                count=Count('id')
            ).order_by('-count')[:30]:
                loc = d.get('location')
                if loc:
                    arcs.append({
                        'from': [float(loc.x), float(loc.y)],
                        'to': [float(loc.x) + 0.05, float(loc.y) + 0.05],
                        'weight': d['count'],
                        'label': f"{d['product_name']} in {d['district_name']}",
                    })

        return Response({'arcs': arcs})


class TimelineView(APIView):
    """GET /api/geo/timeline/ — activity per day/week for histogram."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bucket = request.query_params.get('bucket', 'day')
        f = GeoFilters.parse(request.query_params)
        scope = DataScope(request.user)

        trunc_fn = TruncWeek if bucket == 'week' else TruncDay

        visit_qs = scope.apply_to_visits(f.apply_to_visits(FarmerVisit.objects.all()))
        demo_qs = scope.apply_to_demos(f.apply_to_demos(ProductDemo.objects.all()))

        visit_by_day = {
            row['bucket'].date().isoformat(): row['count']
            for row in visit_qs.annotate(bucket=trunc_fn('submitted_at'))
            .values('bucket')
            .annotate(count=Count('id'))
        }
        demo_by_day = {
            row['bucket'].date().isoformat(): row['count']
            for row in demo_qs.annotate(bucket=trunc_fn('submitted_at'))
            .values('bucket')
            .annotate(count=Count('id'))
        }

        all_dates = sorted(set(list(visit_by_day.keys()) + list(demo_by_day.keys())))
        buckets = [
            {
                'date': d,
                'visit_count': visit_by_day.get(d, 0),
                'demo_count': demo_by_day.get(d, 0),
                'count': visit_by_day.get(d, 0) + demo_by_day.get(d, 0),
            }
            for d in all_dates
        ]

        return Response({'buckets': buckets, 'bucket': bucket})
