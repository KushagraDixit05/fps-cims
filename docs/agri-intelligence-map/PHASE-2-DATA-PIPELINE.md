# Phase 2 — Data Pipeline & PostGIS

> **Goal:** real data flows end-to-end. The `geo` Django app exposes aggregation,
> point, region-summary, flow, and timeline endpoints, all RBAC-scoped and
> indexed. The frontend consumes them via typed TanStack Query hooks keyed off the
> filter store. The mock layer is replaced by real (still-simple) rendering.
>
> **Exit demo:** the heatmap reflects *actual* approved field submissions. Pan to a
> region, zoom in, and viewport-bounded points load. Numbers are real.

---

## 2.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `Mandi.location` migration + centroid backfill (ADR-08) | `backend/mandi/migrations/*`, mgmt cmd |
| 2 | Spatial + partial indexes | migration in `geo` |
| 3 | Filter param validation/coercion | `geo/filters.py` |
| 4 | Aggregation SQL builders (hex/district/state) | `geo/aggregation.py` |
| 5 | Endpoints: aggregate, points, record, region summary, flows, timeline | `geo/views.py`, `geo/urls.py` |
| 6 | RBAC data-scoping helper | `geo/scope.py` |
| 7 | Static district boundary GeoJSON (2 LODs) | `public/geo/*.json` |
| 8 | Typed hooks keyed off `filterStore.queryKey()` | `hooks/useGeo*.ts` |
| 9 | Wire real data into heat + point rendering | `canvas/useDeckLayers.ts` |

---

## 2.2 Mandi geometry migration (ADR-08)

```python
# backend/mandi/migrations/00XX_mandi_location.py
operations = [
    migrations.AddField('Mandi', 'location',
        django.contrib.gis.db.models.fields.PointField(null=True, blank=True, srid=4326)),
]
```

```python
# management command: backfill_mandi_geom — set Mandi.location from a
# district-centroid lookup (crops_district / a bundled centroid CSV).
for m in Mandi.objects.filter(location__isnull=True):
    c = DISTRICT_CENTROIDS.get((m.district.lower(), m.state.lower()))
    if c: m.location = Point(c.lng, c.lat, srid=4326); m.save(update_fields=['location'])
```

---

## 2.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS visit_location_gix   ON crops_farmervisit       USING GIST (location);
CREATE INDEX IF NOT EXISTS demo_location_gix    ON product_demo_productdemo USING GIST (location);
CREATE INDEX IF NOT EXISTS mandi_location_gix   ON mandi_mandi             USING GIST (location);

CREATE INDEX IF NOT EXISTS visit_submitted_idx  ON crops_farmervisit (submitted_at);
CREATE INDEX IF NOT EXISTS demo_submitted_idx   ON product_demo_productdemo (submitted_at);
CREATE INDEX IF NOT EXISTS arrival_date_idx     ON mandi_mandiarrival (date);

-- the dominant admin filter is "approved only" → partial indexes keep it hot
CREATE INDEX IF NOT EXISTS visit_approved_idx ON crops_farmervisit (submitted_at)
  WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS demo_approved_idx  ON product_demo_productdemo (submitted_at)
  WHERE approval_status = 'approved';

-- crop join is by free-text name on CropRecord
CREATE INDEX IF NOT EXISTS croprecord_crop_idx ON crops_croprecord (crop_name);
```

---

## 2.4 Filter coercion

```python
# geo/filters.py
@dataclass
class AggregateFilters:
    level: str            # 'hex' | 'district' | 'state' | 'block'
    date_from: date
    date_to: date
    crops: list[str] | None
    modules: list[str]    # subset of crop_visit/mandi/product_demo
    district: str | None
    block: str | None
    condition: list[str] | None
    executive: int | None
    product: str | None
    bbox: tuple[float,float,float,float] | None

    @classmethod
    def parse(cls, qp) -> 'AggregateFilters':
        # validate enums, clamp date range (max 366d), cap bbox, default last 90d
        ...
```

Hard rules: unknown `level` → 400; date range > 366d → clamp; missing dates →
last 90 days; `modules` empty → all three.

---

## 2.5 Aggregation builders

Each module contributes points; the builder unions them per requested modules.
Crop-condition counts only apply to `crop_visit`. Example (district level):

```python
# geo/aggregation.py  (ORM-first; raw SQL where window/hex needed)
def district_aggregate(f: AggregateFilters, scope: DataScope) -> list[dict]:
    qs = (FarmerVisit.objects
          .filter(approval_status='approved',
                  submitted_at__date__range=(f.date_from, f.date_to))
          .filter(scope.visit_q())                      # RBAC §2.6
          )
    if f.crops:     qs = qs.filter(crops__crop_name__in=f.crops)
    if f.condition: qs = qs.filter(crops__crop_condition__in=f.condition)
    if f.executive: qs = qs.filter(executive_id=f.executive)
    return (qs.values('district_name')
              .annotate(
                 activity=Count('id', distinct=True),
                 good=Count('crops', filter=Q(crops__crop_condition='good')),
                 average=Count('crops', filter=Q(crops__crop_condition='average')),
                 poor=Count('crops', filter=Q(crops__crop_condition='poor')),
                 centroid=Centroid(Collect('location')),
              ))
```

Hex/macro uses raw `ST_HexagonGrid` (ARCHITECTURE §5.2) for a bounded payload.
Mandi/demo modules contribute via parallel querysets unioned on `district_name`.

---

## 2.6 RBAC data scoping

```python
# geo/scope.py — reuse existing permission/role data restrictions
class DataScope:
    def __init__(self, user): self.user = user; self.regions = user_allowed_regions(user)
    def visit_q(self) -> Q:
        if self.regions is None: return Q()                 # full access
        return Q(district_name__in=self.regions)            # restricted manager
```

Every endpoint passes `DataScope(request.user)` into the builder. A regional
manager only ever aggregates their districts — enforced server-side, not in UI.

---

## 2.7 Endpoint catalogue (implements ARCHITECTURE §5.3)

```python
# geo/urls.py
urlpatterns = [
  path('aggregate/',          AggregateView.as_view()),     # ?level=&filters
  path('points/',             PointsView.as_view()),        # ?bbox=&zoom=&filters (capped 8k)
  path('record/<uuid:id>/',   RecordView.as_view()),
  path('region/<str:level>/<str:id>/summary/', RegionSummaryView.as_view()),
  path('flows/',              FlowsView.as_view()),         # ?type=mandi|demo
  path('timeline/',           TimelineView.as_view()),      # ?bucket=day|week
]
```

Response contracts (mirrored in `lib/types.ts`):

```ts
type HexCell      = { center: [number, number]; w: number };
type DistrictStat = { id: string; name: string; state: string;
                      activity: number; good: number; average: number; poor: number;
                      centroid: [number, number] };
type GeoPoint     = { id: string; lng: number; lat: number; module: ModuleKey;
                      crop?: string; condition?: Condition; date: string };
type RegionSummary= { activity: number; topCrop: string;
                      cropSplit: { crop: string; n: number }[];
                      mandiArrivals: number; demoCount: number;
                      trend: { t: string; v: number }[];
                      topExecutives: { id: number; name: string; n: number }[];
                      deltaPct: number };
type Flow         = { from: [number,number]; to: [number,number]; w: number; label: string };
```

Caching: aggregate/timeline `Cache-Control: private, max-age=60,
stale-while-revalidate=120`; static geometry immutable.

---

## 2.8 Points endpoint — bounded & sampled

```python
class PointsView(APIView):
    CAP = 8000
    def get(self, request):
        f = PointFilters.parse(request.query_params)        # requires bbox
        qs = points_in_bbox(f, DataScope(request.user))
        n = qs.count()
        if n > self.CAP:                                     # deterministic sample
            qs = qs.extra(where=["hashtext(id::text) %% 100 < %s"],
                          params=[int(self.CAP / n * 100)])
        return Response(as_geojson_points(qs))
```

Above the cap the heatmap/cluster modes already tell the story; raw pins only
matter near deep zoom where bbox is small and `n` is naturally low.

---

## 2.9 Static boundaries

- Source India district polygons (open admin-boundary dataset).
- `mapshaper`: produce `districts.med.json` (z≥6) and `districts.low.json` (z<6)
  via `-simplify 8%` / `-simplify 3%`; keep `{id,name,state}` props only.
- Also `india-states.json` for the basemap fill (already used in Phase 0).
- Serve from `public/geo/` with immutable cache headers.

---

## 2.10 Frontend hooks

```ts
// hooks/useGeoAggregate.ts
export function useGeoAggregate(level: AggLevel) {
  const key = useFilterStore((s) => s.queryKey());
  return useQuery({
    queryKey: ['geo', 'aggregate', level, ...key],
    queryFn: ({ signal }) => api.get('/api/geo/aggregate/', {
      params: { level, ...useFilterStore.getState().toParams() }, signal,
    }).then(r => r.data),
    placeholderData: keepPreviousData,        // map never blanks on refilter
    staleTime: 60_000,
  });
}
```

```ts
// hooks/useGeoPoints.ts — bbox-bounded, refetch on pan settle
export function useGeoPoints() {
  const bbox = useDebouncedBbox(350);
  const key  = useFilterStore((s) => s.queryKey());
  const band = useCameraBand();
  return useQuery({
    queryKey: ['geo', 'points', bbox, ...key],
    queryFn: ({ signal }) => api.get('/api/geo/points/', { params: { bbox, ...params }, signal }).then(r=>r.data),
    enabled: band.band === 'village' || band.band === 'record',   // only fetch when needed
    placeholderData: keepPreviousData,
  });
}
```

`useDistricts` loads the boundary GeoJSON once (`staleTime: Infinity`).

---

## 2.11 Wire real data into rendering

Replace the Phase 1 mock layer:
- `band heat/state` → real `HeatmapLayer` fed by `useGeoAggregate('hex')`.
- `band district` → `GeoJsonLayer` choropleth joined to `useGeoAggregate('district')`.
- `band village/record` → points from `useGeoPoints` (clustered in Phase 3).

(Full per-mode polish, icons, and tooltips are Phase 3; Phase 2 proves the data
binds and renders correctly.)

---

## 2.12 Acceptance criteria

- [ ] All six endpoints return correct, RBAC-scoped data; verified against DB counts.
- [ ] `Mandi.location` backfilled; flows endpoint returns origin points.
- [ ] Spatial/partial indexes present; `EXPLAIN ANALYZE` shows index usage on the hot path.
- [ ] Aggregate p95 < 150ms on representative data; points p95 < 250ms.
- [ ] Hooks key off `filterStore.queryKey()`; changing any filter refetches without blanking.
- [ ] Points only fetch in village/record bands (network tab confirms).
- [ ] Heatmap visibly reflects real approved submissions; numbers match admin tables.
- [ ] A restricted regional-manager token cannot read outside its districts.
