# Architecture — Frontend, Backend, Data & State

> Deliverables 6, 7, 8, 9, 10, 11, 12, 13. The structural blueprint. Phase files
> implement what is specified here.

---

## 1. Render engine decision (summary; full rationale in `TECH-DECISIONS.md`)

| Concern | Choice | Why |
|---|---|---|
| Basemap | **MapLibre GL JS** | Open-source, zero per-load fees, custom dark style we control. Mapbox GL is drop-in compatible if a paid style is ever wanted. |
| Data layers | **deck.gl** (`@deck.gl/react`, `@deck.gl/aggregation-layers`, `@deck.gl/geo-layers`) | GPU-accelerated heatmap/cluster/arc at India scale; interleaved with MapLibre via `MapboxOverlay`. |
| Clustering | **Supercluster** in a **Web Worker** + deck.gl `IconLayer` | Off-main-thread cluster math; smooth at 100k+ points. |
| Geo math | **Turf.js** (tree-shaken imports only) | Centroids, bbox, point-in-polygon for filtering. |
| Charts | **Recharts** (installed) + a few custom SVG/Canvas sparklines | Already in portal; good enough for panels. |
| Animation | **Framer Motion** (installed) + deck.gl transitions + targeted GSAP only if needed | Springs for chrome, interpolators for camera. |
| State | **Zustand** (installed) | Already the portal's store lib; perfect for transient map state. |
| Server state | **TanStack Query** (installed) | Caching, dedupe, background refetch for aggregation endpoints. |

**Interleaving model:** deck.gl renders *into* MapLibre's WebGL context via
`MapboxOverlay({ interleaved: true })`. One canvas, one depth buffer, perfect
sync between basemap labels and data layers. No double-canvas tearing.

---

## 2. Next.js architecture

Surface is the existing `admin-portal/` (Next 16 App Router, React 19).

### 2.1 Route group

```
src/app/(map)/
  layout.tsx          // map-root theme provider, no AppShell chrome, fullscreen
  map/
    page.tsx          // client boundary → <MapWorkspace/>
    loading.tsx       // cinematic skeleton (logo bloom + shimmer)
```

- The map is a **client island**. `page.tsx` is a thin server component that
  renders a `dynamic(() => import('@/features/map/MapWorkspace'), { ssr: false })`
  — MapLibre/deck.gl are browser-only.
- It deliberately sits **outside** the `(dashboard)` group so it can go fullscreen
  without the sidebar/topbar, while still inheriting auth.
- Auth: reuse `AuthGuard` + `authStore`; gate by an RBAC permission
  `analytics.map.view` (wire into existing `usePermissions`).

### 2.2 Rendering & data strategy

- **No SSR for the map itself** (WebGL). But the **shell** (skeleton, error
  boundary, permission gate) is server-rendered for instant paint.
- Aggregation data is fetched client-side via TanStack Query against the new
  `/api/geo/*` endpoints — cached, deduped, refetched on filter change with
  `keepPreviousData` so the map never blanks while recomputing.
- Heavy GeoJSON (district boundaries) is a **static asset** under
  `public/geo/` (or a route handler with long cache headers), loaded once.

### 2.3 Code splitting

```
MapWorkspace (dynamic, ssr:false)
 ├─ MapCanvas        — eager (core)
 ├─ FilterRail       — eager
 ├─ InsightPanel     — lazy (loads on first region select)
 ├─ TimelineDock     — lazy (loads when user opens playback)
 └─ CommandPalette   — lazy (loads on ⌘K)
```

deck.gl layer modules are imported per-layer so an admin who only uses Heatmap
never downloads the arc/flow shaders.

---

## 3. Component architecture

```
features/map/
  MapWorkspace.tsx            // composition root; mounts providers + stores
  ├─ providers/
  │   ├─ MapThemeProvider.tsx // next-themes (data-map-theme), grain/vignette
  │   └─ TooltipPortal.tsx    // single #map-tooltip-root
  │
  ├─ canvas/
  │   ├─ MapCanvas.tsx        // MapLibre + MapboxOverlay(deck) wiring, view state
  │   ├─ useDeckLayers.ts     // assembles active layers from store + data
  │   ├─ layers/
  │   │   ├─ heatLayer.ts     // HeatmapLayer factory
  │   │   ├─ clusterLayer.ts  // IconLayer + worker clusters
  │   │   ├─ pinLayer.ts      // IconLayer / ScatterplotLayer
  │   │   ├─ districtLayer.ts // GeoJsonLayer choropleth (extruded)
  │   │   └─ flowLayer.ts     // ArcLayer / TripsLayer (mandi/demo flows)
  │   └─ basemap/
  │       └─ style.dark.json  // MapLibre style spec (custom)
  │
  ├─ chrome/
  │   ├─ TopBar.tsx           // brand, ⌘K trigger, theme toggle, live clock
  │   ├─ ModeRail.tsx         // 5 viz modes (shared layoutId pill)
  │   ├─ FilterRail.tsx       // crops, advanced filters
  │   │   ├─ CropChips.tsx
  │   │   ├─ FilterSection.tsx
  │   │   └─ DateRange.tsx
  │   ├─ InsightPanel.tsx     // region analytics (lazy)
  │   │   ├─ MetricCounter.tsx
  │   │   ├─ CropDistribution.tsx
  │   │   └─ TrendSparkline.tsx
  │   ├─ TimelineDock.tsx     // playback (lazy)
  │   └─ CommandPalette.tsx   // ⌘K (lazy)
  │
  ├─ tooltips/
  │   ├─ TooltipRenderer.tsx  // switches on hovered.layerType
  │   └─ tips/*.tsx           // HeatTip, ClusterTip, RecordTip, ...
  │
  ├─ hooks/
  │   ├─ useGeoAggregate.ts   // TanStack Query → /api/geo/aggregate
  │   ├─ useGeoPoints.ts      // viewport-bounded point fetch
  │   ├─ useDistricts.ts      // boundary GeoJSON loader (once)
  │   ├─ useClusterWorker.ts  // supercluster worker bridge
  │   └─ useCameraBand.ts     // derives zoom-band → layer opacities
  │
  ├─ store/
  │   ├─ useMapStore.ts       // view, mode, selection, hovered
  │   ├─ useFilterStore.ts    // crops, district, block, date range, module...
  │   └─ useTimelineStore.ts  // playing, cursor, range, speed
  │
  └─ lib/
      ├─ palette.ts           // (see DESIGN-SYSTEM §2.3)
      ├─ motion.ts            // springs/easing/camera tokens
      ├─ format.ts            // Intl number/date, units (Qt, acre, ₹)
      └─ types.ts             // shared TS contracts (mirrors API schema)
```

**Rules:** layer factories are pure (`state → deck Layer`), never read the store
directly. Chrome components read/write stores; canvas reads stores + query data.
This keeps the GPU path testable and the React path declarative.

---

## 4. State management plan

Three Zustand stores, each tiny and single-purpose. Server data lives in
TanStack Query, **not** Zustand — stores hold only ephemeral UI/view state.

### 4.1 `useMapStore`

```ts
interface MapState {
  viewState: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number };
  mode: 'heat' | 'cluster' | 'pin' | 'district' | 'flow';
  selection: { kind: 'state'|'district'|'block'|'record'; id: string } | null;
  hovered: HoverTarget | null;          // drives tooltip; throttled set
  setViewState(v): void;
  setMode(m): void;                      // triggers cinematic crossfade
  flyTo(target: Bounds | LngLat, zoom?): void;
  select(sel): void;                     // opens InsightPanel
  setHovered(h): void;                   // RAF-throttled in canvas
}
```

### 4.2 `useFilterStore`

```ts
interface FilterState {
  crops: string[];                       // multi-select chips
  modules: ('crop_visit'|'mandi'|'product_demo')[];
  state?: string;
  district?: string;
  block?: string;
  village?: string;
  condition?: ('good'|'average'|'poor')[];
  executiveId?: number;                  // submitted_by / executive FK
  productName?: string;
  dateFrom: string; dateTo: string;      // ISO; default last 90d
  // derived query key for TanStack Query
  queryKey(): unknown[];
  reset(): void; toggleCrop(c): void; /* ... */
}
```

`queryKey()` is the bridge: every fetch hook keys off it, so any filter change
auto-invalidates and refetches with `keepPreviousData`. **One source of truth →
map, panel, and timeline all stay in lockstep.**

### 4.3 `useTimelineStore`

```ts
interface TimelineState {
  enabled: boolean;
  playing: boolean;
  cursor: number;          // current ms within [from,to]
  speed: 0.5|1|2|4;
  setCursor(ms): void;     // scrubbing; throttled re-render
  play(): void; pause(): void;
}
```

When `enabled`, the active layer is fed a time-windowed slice of data
(`getFilterValue`/`updateTriggers`) so playback animates without refetching.

### 4.4 URL sync

Map state is **shareable**. `mode`, `crops`, `district`, `dateFrom/To`, and
`viewState` (rounded) serialize to query params via a debounced
`useUrlSync(useMapStore, useFilterStore)` so an exec can paste a link to "Chilli
condition in Khargone, last 30 days" and land on the exact view.

---

## 5. Backend / PostGIS strategy

New Django app **`geo`** (read-only). Zero changes to existing module write
paths. It reads `FarmerVisit`, `CropRecord`, `MandiArrival`, `ProductDemo` and
the `District`/`Block`/`VillageMaster` masters.

### 5.1 Spatial indexes & prerequisites

```sql
-- All source tables already use PostGIS PointField `location`.
CREATE INDEX IF NOT EXISTS crops_visit_location_gix    ON crops_farmervisit USING GIST (location);
CREATE INDEX IF NOT EXISTS product_demo_location_gix   ON product_demo_productdemo USING GIST (location);
-- MandiArrival has no point; join to Mandi → needs a Mandi.location (migration adds PointField).

-- Time + status partial indexes for the common admin filter (approved only):
CREATE INDEX IF NOT EXISTS visit_submitted_approved_idx
  ON crops_farmervisit (submitted_at)
  WHERE approval_status = 'approved';
```

> **Migration note:** `Mandi` currently stores `district`/`state` as text with no
> geometry. Phase 2 adds a nullable `location PointField` + a one-time geocode
> backfill from a district-centroid lookup, so mandi flows have origin points.

### 5.2 Aggregation endpoint (the workhorse)

`GET /api/geo/aggregate/` — returns server-side spatial aggregation so the
client never downloads raw rows for macro views.

Query params mirror `useFilterStore`: `crops`, `modules`, `district`, `block`,
`condition`, `executive`, `product`, `date_from`, `date_to`, plus `level`
(`state|district|block|hex`) and `bbox`.

```sql
-- level=district example (parametrized via Django ORM / raw)
SELECT
  d.id,
  d.name,
  d.state,
  COUNT(*)                                   AS activity,
  COUNT(*) FILTER (WHERE cr.crop_condition='good')    AS good,
  COUNT(*) FILTER (WHERE cr.crop_condition='average') AS avg,
  COUNT(*) FILTER (WHERE cr.crop_condition='poor')    AS poor,
  ST_AsGeoJSON(ST_Centroid(ST_Collect(fv.location)))  AS centroid
FROM crops_farmervisit fv
JOIN crops_croprecord cr ON cr.visit_id = fv.id
JOIN crops_district  d   ON d.name = fv.district_name
WHERE fv.approval_status = 'approved'
  AND fv.submitted_at BETWEEN %(from)s AND %(to)s
  AND (%(crops)s IS NULL OR cr.crop_name = ANY(%(crops)s))
GROUP BY d.id, d.name, d.state;
```

For the **heatmap macro level** we use a **hex bin** (`ST_SnapToGrid` or
H3 via `h3-pg` if available, else PostGIS hexgrid) so the payload is bounded
regardless of row count:

```sql
-- level=hex : ~2-5k cells max for all-India, cheap to transfer
SELECT ST_AsGeoJSON(ST_Centroid(cell.geom)) AS center, SUM(weight) AS w
FROM ST_HexagonGrid(0.25, ST_SetSRID(ST_MakeEnvelope(68,6,98,38),4326)) AS cell
JOIN points p ON ST_Intersects(p.location, cell.geom)
GROUP BY cell.geom;
```

### 5.3 Endpoint catalogue

| Endpoint | Returns | Used by |
|---|---|---|
| `GET /api/geo/aggregate/?level=hex` | weighted hex centroids | Heatmap macro |
| `GET /api/geo/aggregate/?level=district` | per-district stats + centroid | Choropleth, state heat |
| `GET /api/geo/points/?bbox=&zoom=` | viewport-bounded GeoJSON points (capped, sampled) | Cluster / pin deep zoom |
| `GET /api/geo/record/{id}/` | full record for a pin | Tooltip lock / panel |
| `GET /api/geo/region/{level}/{id}/summary/` | KPIs, crop split, trend series, top executives | InsightPanel |
| `GET /api/geo/flows/?type=mandi\|demo` | origin→dest weighted pairs | Flow mode |
| `GET /api/geo/timeline/?bucket=day` | activity series for scrubber | TimelineDock |
| `GET /geo/districts.json` (static) | India district boundary GeoJSON (simplified) | Choropleth geometry |

All responses: `Cache-Control` tuned (static geometry long, aggregates ~60s),
JSON, and gzip/brotli. Aggregation queries respect the requesting admin's RBAC
data scope (district/state restrictions from existing permission system).

### 5.4 DRF view shape

```python
# backend/geo/views.py
class AggregateView(APIView):
    permission_classes = [IsAuthenticated, HasMapAccess]
    def get(self, request):
        f = AggregateFilters(request.query_params)      # validates + coerces
        qs = build_aggregate_queryset(f, scope=request.user.data_scope)
        return Response(serialize_aggregate(qs, level=f.level))
```

No raw row exposure: even `/points/` caps at `min(N, 8000)` with deterministic
sampling (`TABLESAMPLE` or `ORDER BY hashtext(id) LIMIT`) above the cap, because
beyond a few thousand on-screen points the heatmap/cluster modes take over.

---

## 6. GeoJSON & vector-tile strategy

### 6.1 Three data shapes, three transports

| Data | Shape | Transport | Cadence |
|---|---|---|---|
| District/state boundaries | Polygon GeoJSON, simplified (`mapshaper -simplify 8%`) | static `public/geo/*.json`, immutable cache | load once |
| Aggregates (hex / district stats) | small JSON (not full GeoJSON — `{center,w}`) | TanStack Query, 60s | per filter change |
| Raw points (deep zoom) | GeoJSON FeatureCollection, viewport-bounded | TanStack Query keyed by bbox+filters | per pan settle |

### 6.2 Why not vector tiles (yet)

At current data volume (thousands–low-tens-of-thousands of submissions),
**bbox-bounded GeoJSON + server aggregation beats a tile pipeline** on
simplicity and freshness. The architecture is tile-*ready*: if volume crosses
~500k rows, Phase 8 swaps `/points/` for a `pg_tileserv` / Martin MVT endpoint
behind the same `useGeoPoints` hook — the deck.gl `MVTLayer` is a drop-in for the
`GeoJsonLayer`. **No frontend rewrite, just a transport swap.** (See `TECH-DECISIONS`.)

### 6.3 Boundary geometry sourcing

District boundaries from a public India admin-boundary dataset (e.g. GADM /
Survey-of-India-derived open set), simplified to two LODs:
`districts.low.json` (z<6) and `districts.med.json` (z≥6), chosen by zoom band.

---

## 7. Performance architecture (overview; hardened in Phase 8)

1. **Off-main-thread clustering** — Supercluster in a Web Worker; main thread only renders.
2. **Server-side aggregation** — macro views never ship raw rows.
3. **Viewport querying** — `/points/` bounded by `bbox`; refetch on pan *settle* (debounced 350ms), not per frame.
4. **Zoom-band layer gating** — only the layers relevant to the current zoom are instantiated (`useCameraBand`).
5. **`keepPreviousData`** — map shows stale data during recompute; new data crossfades in.
6. **Memoized layer factories** — deck layers rebuilt only when their `updateTriggers` change.
7. **RAF-throttled hover** — `setHovered` coalesced to one update per frame.
8. **Single tooltip node** — portal reuse, no per-marker DOM.
9. **Brotli + immutable caching** for geometry; `stale-while-revalidate` for aggregates.
10. **Budget gate in CI** — bundle-size and a Playwright FPS probe (Phase 8).

Target: **60fps** interaction, first meaningful map paint **< 1.5s** on broadband,
interaction-ready **< 2.5s**.

---

## 8. Folder structure (full)

```
admin-portal/
├─ public/
│  └─ geo/
│     ├─ districts.low.json
│     ├─ districts.med.json
│     └─ india-states.json
├─ src/
│  ├─ app/(map)/                      # new route group (§2.1)
│  │  ├─ layout.tsx
│  │  ├─ map-theme.css
│  │  └─ map/{page,loading}.tsx
│  ├─ features/map/                   # all map code (§3)
│  └─ workers/
│     └─ cluster.worker.ts            # supercluster
backend/
└─ geo/                               # new Django app (§5)
   ├─ apps.py  models.py  views.py  urls.py
   ├─ filters.py        # query-param validation/coercion
   ├─ aggregation.py    # SQL builders
   ├─ serializers.py
   └─ migrations/
```

---

## 9. Dependencies to add (Phase 0)

```jsonc
// admin-portal — runtime
"maplibre-gl": "^4.x",
"@deck.gl/core": "^9.x",
"@deck.gl/react": "^9.x",
"@deck.gl/layers": "^9.x",
"@deck.gl/aggregation-layers": "^9.x",
"@deck.gl/geo-layers": "^9.x",
"@deck.gl/mapbox": "^9.x",          // MapboxOverlay for MapLibre interleave
"supercluster": "^8.x",
"@turf/bbox": "^7.x", "@turf/centroid": "^7.x", "@turf/boolean-point-in-polygon": "^7.x",
"cmdk": "^1.x"                        // command palette
// (framer-motion, recharts, zustand, @tanstack/react-query already present)
```

```python
# backend — requirements (PostGIS/GeoDjango already in use)
# optional, only if hex via H3: "h3-pg" extension; else native ST_HexagonGrid (PostGIS ≥ 3.1)
```

No new state lib, no new chart lib, no new animation lib — we lean on what the
portal already ships to keep the bundle and the team's mental model lean.
