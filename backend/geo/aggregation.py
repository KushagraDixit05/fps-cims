import json
from django.db.models import Count, Q
from django.contrib.gis.db.models.functions import Centroid
from django.contrib.gis.db.models.aggregates import Collect
from crops.models import FarmerVisit
from product_demo.models import ProductDemo
from mandi.models import MandiArrival


def _geojson(geom):
    """Convert a geometry object to a GeoJSON dict, or None."""
    if geom is None:
        return None
    return json.loads(geom.geojson)


def _feature(name, props, centroid_geom):
    geom = _geojson(centroid_geom)
    if geom is None:
        return None
    return {'type': 'Feature', 'properties': props, 'geometry': geom}


def build_district_aggregate(f, scope):
    data = {}  # district_name → aggregated dict

    # --- Farmer Visits ---
    if 'visit' in f.modules:
        qs = FarmerVisit.objects.filter(location__isnull=False)
        qs = scope.apply_to_visits(qs)
        qs = f.apply_to_visits(qs)
        rows = qs.values('district_name').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('location')),
            good=Count('crops', filter=Q(crops__crop_condition='good')),
            average=Count('crops', filter=Q(crops__crop_condition='average')),
            poor=Count('crops', filter=Q(crops__crop_condition='poor')),
        )
        for row in rows:
            n = row['district_name']
            d = data.setdefault(n, _empty_district(n))
            d['visit_count'] += row['count']
            d['good'] += row['good']
            d['average'] += row['average']
            d['poor'] += row['poor']
            if row['centroid'] and d['centroid'] is None:
                d['centroid'] = row['centroid']

    # --- Product Demos ---
    if 'demo' in f.modules:
        qs = ProductDemo.objects.filter(location__isnull=False)
        qs = scope.apply_to_demos(qs)
        qs = f.apply_to_demos(qs)
        rows = qs.values('district_name').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('location')),
        )
        for row in rows:
            n = row['district_name']
            d = data.setdefault(n, _empty_district(n))
            d['demo_count'] += row['count']
            if row['centroid'] and d['centroid'] is None:
                d['centroid'] = row['centroid']

    # --- Mandi Arrivals (uses mandi.location if available) ---
    if 'mandi' in f.modules:
        qs = MandiArrival.objects.filter(mandi__location__isnull=False)
        qs = scope.apply_to_arrivals(qs)
        qs = f.apply_to_arrivals(qs)
        rows = qs.values('mandi__district').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('mandi__location')),
        )
        for row in rows:
            n = row['mandi__district']
            d = data.setdefault(n, _empty_district(n))
            d['mandi_count'] += row['count']
            if row['centroid'] and d['centroid'] is None:
                d['centroid'] = row['centroid']

    features = []
    for n, d in data.items():
        if d['centroid'] is None:
            continue
        total = d['visit_count'] + d['demo_count'] + d['mandi_count']
        cond_total = d['good'] + d['average'] + d['poor']
        score = round((d['good'] * 1.0 + d['average'] * 0.5) / max(cond_total, 1), 3)
        feat = _feature(n, {
            'id': n,
            'name': n,
            'count': total,
            'visit_count': d['visit_count'],
            'demo_count': d['demo_count'],
            'mandi_count': d['mandi_count'],
            'good': d['good'],
            'average': d['average'],
            'poor': d['poor'],
            'score': score,
        }, d['centroid'])
        if feat:
            features.append(feat)

    return features


def build_state_aggregate(f, scope):
    data = {}

    if 'visit' in f.modules:
        from crops.models import District as DistrictMaster
        # Map district_name → state via master
        district_to_state = {
            d.name: d.state for d in DistrictMaster.objects.values_list('name', 'state').iterator()
        }
        district_to_state = {
            row[0]: row[1]
            for row in DistrictMaster.objects.values_list('name', 'state')
        }

        qs = FarmerVisit.objects.filter(location__isnull=False)
        qs = scope.apply_to_visits(qs)
        qs = f.apply_to_visits(qs)
        rows = qs.values('district_name').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('location')),
            good=Count('crops', filter=Q(crops__crop_condition='good')),
            average=Count('crops', filter=Q(crops__crop_condition='average')),
            poor=Count('crops', filter=Q(crops__crop_condition='poor')),
        )
        for row in rows:
            state = district_to_state.get(row['district_name'], 'Unknown')
            d = data.setdefault(state, _empty_district(state))
            d['visit_count'] += row['count']
            d['good'] += row['good']
            d['average'] += row['average']
            d['poor'] += row['poor']
            if row['centroid'] and d['centroid'] is None:
                d['centroid'] = row['centroid']

    if 'demo' in f.modules:
        qs = ProductDemo.objects.filter(location__isnull=False)
        qs = scope.apply_to_demos(qs)
        qs = f.apply_to_demos(qs)
        rows = qs.values('district_name').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('location')),
        )
        for row in rows:
            state = 'Unknown'
            d = data.setdefault(state, _empty_district(state))
            d['demo_count'] += row['count']

    if 'mandi' in f.modules:
        qs = MandiArrival.objects.filter(mandi__location__isnull=False)
        qs = scope.apply_to_arrivals(qs)
        qs = f.apply_to_arrivals(qs)
        rows = qs.values('mandi__state').annotate(
            count=Count('id', distinct=True),
            centroid=Centroid(Collect('mandi__location')),
        )
        for row in rows:
            state = row['mandi__state'] or 'Unknown'
            d = data.setdefault(state, _empty_district(state))
            d['mandi_count'] += row['count']
            if row['centroid'] and d['centroid'] is None:
                d['centroid'] = row['centroid']

    features = []
    for state, d in data.items():
        if d['centroid'] is None:
            continue
        total = d['visit_count'] + d['demo_count'] + d['mandi_count']
        feat = _feature(state, {
            'id': state,
            'name': state,
            'count': total,
            'visit_count': d['visit_count'],
            'demo_count': d['demo_count'],
            'mandi_count': d['mandi_count'],
            'good': d['good'],
            'average': d['average'],
            'poor': d['poor'],
        }, d['centroid'])
        if feat:
            features.append(feat)

    return features


def build_points(f, scope, bbox):
    """Returns up to 8000 raw points across all modules."""
    points = []
    xmin, ymin, xmax, ymax = bbox

    if 'visit' in f.modules:
        from django.contrib.gis.geos import Polygon
        envelope = Polygon.from_bbox((xmin, ymin, xmax, ymax))
        qs = FarmerVisit.objects.filter(location__isnull=False, location__within=envelope)
        qs = scope.apply_to_visits(qs)
        qs = f.apply_to_visits(qs)
        for v in qs.select_related('executive').prefetch_related('crops')[:4000]:
            crops = list(v.crops.all())
            dominant_condition = crops[0].crop_condition if crops else None
            dominant_crop = crops[0].crop_name if crops else None
            points.append({
                'type': 'Feature',
                'properties': {
                    'id': str(v.id),
                    'module': 'visit',
                    'farmer': v.farmer_name,
                    'village': v.village_name,
                    'district': v.district_name,
                    'block': v.block_name,
                    'condition': dominant_condition,
                    'crop': dominant_crop,
                    'executive_id': v.executive_id,
                    'date': v.submitted_at.date().isoformat(),
                },
                'geometry': _geojson(v.location),
            })

    if 'demo' in f.modules:
        from django.contrib.gis.geos import Polygon
        envelope = Polygon.from_bbox((xmin, ymin, xmax, ymax))
        qs = ProductDemo.objects.filter(location__isnull=False, location__within=envelope)
        qs = scope.apply_to_demos(qs)
        qs = f.apply_to_demos(qs)
        for d in qs[:2000]:
            points.append({
                'type': 'Feature',
                'properties': {
                    'id': str(d.id),
                    'module': 'demo',
                    'farmer': d.farmer_name,
                    'village': d.village_name,
                    'district': d.district_name,
                    'block': d.block_name,
                    'crop': d.crop_name,
                    'product': d.product_name,
                    'result': d.demo_result,
                    'date': d.submitted_at.date().isoformat(),
                },
                'geometry': _geojson(d.location),
            })

    if 'mandi' in f.modules:
        from django.contrib.gis.geos import Polygon
        envelope = Polygon.from_bbox((xmin, ymin, xmax, ymax))
        qs = MandiArrival.objects.filter(
            mandi__location__isnull=False,
            mandi__location__within=envelope,
        )
        qs = scope.apply_to_arrivals(qs)
        qs = f.apply_to_arrivals(qs)
        for a in qs.select_related('mandi')[:2000]:
            points.append({
                'type': 'Feature',
                'properties': {
                    'id': str(a.id),
                    'module': 'mandi',
                    'mandi': a.mandi.name,
                    'district': a.mandi.district,
                    'commodity': a.commodity,
                    'quantity': float(a.arrival_quantity),
                    'avg_rate': float(a.avg_rate) if a.avg_rate else None,
                    'date': a.date.isoformat(),
                },
                'geometry': _geojson(a.mandi.location),
            })

    return points[:8000]


def _empty_district(name):
    return {
        'name': name,
        'visit_count': 0,
        'demo_count': 0,
        'mandi_count': 0,
        'good': 0,
        'average': 0,
        'poor': 0,
        'centroid': None,
    }
