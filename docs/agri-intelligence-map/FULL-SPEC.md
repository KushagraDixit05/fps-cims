# FPS · Agri Intelligence Map — Full Specification

> Single-file compilation of all 13 planning documents.
> Source files in this directory are the authoritative versions; this file is for
> quick reference. Generated 2026-06-18.

---

## Table of Contents

1. [README — Overview & UX Strategy](#1-readme--overview--ux-strategy)
2. [Architecture — Frontend, Backend, Data & State](#2-architecture--frontend-backend-data--state)
3. [Design System — Visual, Motion & Interaction](#3-design-system--visual-motion--interaction)
4. [Tech Decisions (ADR log)](#4-tech-decisions-adr-log)
5. [Phase 0 — Foundations & Scaffolding](#5-phase-0--foundations--scaffolding)
6. [Phase 1 — Map Core & Basemap](#6-phase-1--map-core--basemap)
7. [Phase 2 — Data Pipeline & PostGIS](#7-phase-2--data-pipeline--postgis)
8. [Phase 3 — Visualization Modes & Tooltips](#8-phase-3--visualization-modes--tooltips)
9. [Phase 4 — Premium Filter System](#9-phase-4--premium-filter-system)
10. [Phase 5 — Analytics Panels](#10-phase-5--analytics-panels)
11. [Phase 6 — Timeline Playback System](#11-phase-6--timeline-playback-system)
12. [Phase 7 — Motion & Interaction Polish](#12-phase-7--motion--interaction-polish)
13. [Phase 8 — Performance, Mobile & Scale](#13-phase-8--performance-mobile--scale)

---

## 1. README — Overview & UX Strategy

> A geospatial command center for Farm Prosperity Solutions.
> Not a dashboard. An operational intelligence surface.

This folder is the **complete implementation plan** for the next-generation
admin map. Read the three foundation documents first, then execute the phase
files in order. No code ships before Phase 0 is approved.

---

### 1.1 What we are building

A fullscreen, dark-by-default, GPU-rendered map of India that turns the four
existing field modules — **Crop Monitoring**, **Mandi Arrivals**,
**Product Demos**, **Farmer Visits** — into a live spatial decision system.

The admin opens it and instantly sees *where* the organization is active, *what*
is happening on the ground, and *which* regions are heating up or going cold —
rendered as glowing density fields, animated clusters, choropleth states, and
directional flows, all reacting in real time to a premium filter rail.

Reference feel: **Uber Movement · Palantir Gotham · ArcGIS (modernized) ·
Tesla fleet view · Bloomberg terminal**. Design language: **Linear · Stripe ·
Vercel · Figma**.

### 1.2 Why it matters (product thinking)

| Stakeholder | Question the map answers in < 5 seconds |
|---|---|
| Leadership | "Where is our coverage strong vs. blind?" |
| Regional managers | "Which districts are my executives neglecting this week?" |
| Agronomy team | "Where is crop condition deteriorating for Chilli?" |
| Market intelligence | "Which mandis are surging in arrivals and price?" |
| Product / sales | "Where did the last product demo wave land, and did it work?" |

Every existing field submission already carries `latitude`, `longitude`, `crop`,
`district`, `block`, `village`, `crop_condition`, `timestamps`, mandi activity,
and demo results. **We are not collecting new data — we are revealing the data
we already own.** That is the entire pitch to an executive.

### 1.3 The 24 deliverables → where they live

| # | Deliverable | Document |
|---|---|---|
| 1 | Full UX strategy | `README` + `DESIGN-SYSTEM` |
| 2 | Complete product thinking | `README` |
| 3 | Visual design system | `DESIGN-SYSTEM` |
| 4 | Motion design system | `DESIGN-SYSTEM` |
| 5 | Interaction design | `DESIGN-SYSTEM` |
| 6 | Component architecture | `ARCHITECTURE` |
| 7 | Next.js architecture | `ARCHITECTURE` |
| 8 | Mapbox/Deck.gl architecture | `ARCHITECTURE` · `PHASE-1` |
| 9 | GeoJSON strategy | `ARCHITECTURE` · `PHASE-2` |
| 10 | PostGIS query strategy | `ARCHITECTURE` · `PHASE-2` |
| 11 | Performance architecture | `ARCHITECTURE` · `PHASE-8` |
| 12 | State management plan | `ARCHITECTURE` |
| 13 | Folder structure | `ARCHITECTURE` |
| 14 | Production-ready code | every `PHASE-*` |
| 15 | Glassmorphic UI components | `DESIGN-SYSTEM` · `PHASE-1` |
| 16 | Premium filter system | `PHASE-4` |
| 17 | Map layer system | `PHASE-3` |
| 18 | Tooltip system | `PHASE-3` |
| 19 | Analytics panel | `PHASE-5` |
| 20 | Timeline playback system | `PHASE-6` |
| 21 | Dark/light theming | `DESIGN-SYSTEM` |
| 22 | Mobile adaptation strategy | `PHASE-8` |
| 23 | Animation implementation | `PHASE-7` |
| 24 | Scalability plan | `PHASE-8` |

### 1.4 Document map

**Foundations (read first):**
- `DESIGN-SYSTEM.md` — visual tokens, glassmorphism, motion physics, theming, interaction laws.
- `ARCHITECTURE.md` — Next.js app structure, render engine choice, component tree, Zustand stores, folder layout, PostGIS + GeoJSON + vector-tile strategy.
- `TECH-DECISIONS.md` — the "why this stack" record, with rejected alternatives.

**Phases (execute in order):**

| Phase | Title | Outcome |
|---|---|---|
| 0 | Foundations & Scaffolding | Deps, route, env, theme tokens, empty map shell renders. |
| 1 | Map Core & Basemap | India basemap, deck.gl overlay, camera system, glass chrome. |
| 2 | Data Pipeline & PostGIS | Aggregation API, GeoJSON/tile endpoints, spatial indexes, hooks. |
| 3 | Visualization Modes | Heatmap, cluster, pin, choropleth, flow layers + tooltips. |
| 4 | Premium Filter System | Floating command rail, crop chips, command palette, live recompute. |
| 5 | Analytics Panels | Region drill-down, animated counters, charts, trends. |
| 6 | Timeline Playback | Scrubber, play/pause, temporal animation of activity. |
| 7 | Motion & Interaction Polish | Spring physics, parallax, magnetic hover, cinematic transitions. |
| 8 | Performance, Mobile & Scale | Web workers, tiling, viewport querying, mobile adaptation, load plan. |

### 1.5 UX strategy in one screen

```
┌────────────────────────────────────────────────────────────────────────┐
│  ◐ FPS Intelligence            ⌘K  Search region / crop / executive   ◉ │  ← top glass bar
│                                                                          │
│ ┌──────────┐                                                  ┌────────┐ │
│ │ MODES    │            (fullscreen India map,                │ INSIGHT│ │
│ │ ◉ Heat   │             dark, glowing density,               │ PANEL  │ │
│ │ ○ Cluster│             ambient gradient vignette)           │        │ │  ← right glass
│ │ ○ Pins   │                                                  │ ▣ KPIs │ │     panel
│ │ ○ States │                  ✦ hotspot glow                  │ ▲ chart│ │     (on select)
│ │ ○ Flows  │                                                  │ ◷ trend│ │
│ ├──────────┤                                                  └────────┘ │
│ │ CROPS    │                                                             │
│ │ ●Chilli  │                                                             │  ← left glass rail
│ │ ○Cotton  │                                                             │     (filters)
│ │ ●Soybean │                                                             │
│ └──────────┘                                                             │
│                                                                          │
│  ◀━━━━━━━●━━━━━━━━━━━━━━━▶   Jan ──────── Jun 2026   ▶ play   1×        │  ← timeline dock
└────────────────────────────────────────────────────────────────────────┘
```

Three laws govern every interaction (full detail in `DESIGN-SYSTEM`):

1. **Nothing teleports.** Camera, opacity, color, and layout all interpolate. No hard cuts.
2. **The map leads, chrome follows.** Panels are glass floating *over* the map; the map is never boxed inside a card.
3. **Zoom is a story.** Macro → state heat. Mid → district clusters. Deep → village activity → individual records. Detail emerges, it is never dumped.

### 1.6 Status & ownership

- **Status:** Planning. No code written yet (per request).
- **Surface:** `admin-portal/` (Next.js 16). New route group `(map)`.
- **Backend:** new `geo` Django app + read-only aggregation endpoints; no changes to existing module write paths.
- **Branch:** build on a feature branch off `main` once Phase 0 is approved.

---

## 2. Architecture — Frontend, Backend, Data & State

> Deliverables 6, 7, 8, 9, 10, 11, 12, 13. The structural blueprint. Phase files
> implement what is specified here.

---

### 2.1 Render engine decision (summary; full rationale in `TECH-DECISIONS.md`)

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

### 2.2 Next.js architecture

Surface is the existing `admin-portal/` (Next 16 App Router, React 19).

#### Route group

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

#### Rendering & data strategy

- **No SSR for the map itself** (WebGL). But the **shell** (skeleton, error
  boundary, permission gate) is server-rendered for instant paint.
- Aggregation data is fetched client-side via TanStack Query against the new
  `/api/geo/*` endpoints — cached, deduped, refetched on filter change with
  `keepPreviousData` so the map never blanks while recomputing.
- Heavy GeoJSON (district boundaries) is a **static asset** under
  `public/geo/` (or a route handler with long cache headers), loaded once.

#### Code splitting

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

### 2.3 Component architecture

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

### 2.4 State management plan

Three Zustand stores, each tiny and single-purpose. Server data lives in
TanStack Query, **not** Zustand — stores hold only ephemeral UI/view state.

#### `useMapStore`

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

#### `useFilterStore`

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

#### `useTimelineStore`

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

#### URL sync

Map state is **shareable**. `mode`, `crops`, `district`, `dateFrom/To`, and
`viewState` (rounded) serialize to query params via a debounced
`useUrlSync(useMapStore, useFilterStore)` so an exec can paste a link to "Chilli
condition in Khargone, last 30 days" and land on the exact view.

---

### 2.5 Backend / PostGIS strategy

New Django app **`geo`** (read-only). Zero changes to existing module write
paths. It reads `FarmerVisit`, `CropRecord`, `MandiArrival`, `ProductDemo` and
the `District`/`Block`/`VillageMaster` masters.

#### Spatial indexes & prerequisites

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

#### Aggregation endpoint (the workhorse)

`GET /api/geo/aggregate/` — returns server-side spatial aggregation so the
client never downloads raw rows for macro views.

```sql
-- level=district example (parametrized via Django ORM / raw)
SELECT
  d.id, d.name, d.state,
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

#### Endpoint catalogue

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

---

### 2.6 GeoJSON & vector-tile strategy

#### Three data shapes, three transports

| Data | Shape | Transport | Cadence |
|---|---|---|---|
| District/state boundaries | Polygon GeoJSON, simplified | static `public/geo/*.json`, immutable cache | load once |
| Aggregates (hex / district stats) | small JSON | TanStack Query, 60s | per filter change |
| Raw points (deep zoom) | GeoJSON FeatureCollection, viewport-bounded | TanStack Query keyed by bbox+filters | per pan settle |

#### Why not vector tiles (yet)

At current data volume, **bbox-bounded GeoJSON + server aggregation beats a tile
pipeline** on simplicity and freshness. The architecture is tile-*ready*: if
volume crosses ~500k rows, Phase 8 swaps `/points/` for a `pg_tileserv` / Martin
MVT endpoint behind the same `useGeoPoints` hook. **No frontend rewrite, just a
transport swap.**

---

### 2.7 Performance architecture (overview)

1. **Off-main-thread clustering** — Supercluster in a Web Worker; main thread only renders.
2. **Server-side aggregation** — macro views never ship raw rows.
3. **Viewport querying** — `/points/` bounded by `bbox`; refetch on pan *settle* (debounced 350ms).
4. **Zoom-band layer gating** — only layers relevant to the current zoom are instantiated.
5. **`keepPreviousData`** — map shows stale data during recompute; new data crossfades in.
6. **Memoized layer factories** — deck layers rebuilt only when their `updateTriggers` change.
7. **RAF-throttled hover** — `setHovered` coalesced to one update per frame.
8. **Single tooltip node** — portal reuse, no per-marker DOM.
9. **Brotli + immutable caching** for geometry; `stale-while-revalidate` for aggregates.

Target: **60fps** interaction, first meaningful map paint **< 1.5s**, interaction-ready **< 2.5s**.

---

### 2.8 Folder structure (full)

```
admin-portal/
├─ public/
│  └─ geo/
│     ├─ districts.low.json
│     ├─ districts.med.json
│     └─ india-states.json
├─ src/
│  ├─ app/(map)/
│  │  ├─ layout.tsx
│  │  ├─ map-theme.css
│  │  └─ map/{page,loading}.tsx
│  ├─ features/map/
│  └─ workers/
│     └─ cluster.worker.ts
backend/
└─ geo/
   ├─ apps.py  models.py  views.py  urls.py
   ├─ filters.py
   ├─ aggregation.py
   ├─ serializers.py
   └─ migrations/
```

---

### 2.9 Dependencies to add (Phase 0)

```jsonc
// admin-portal — runtime
"maplibre-gl": "^4.x",
"@deck.gl/core": "^9.x",
"@deck.gl/react": "^9.x",
"@deck.gl/layers": "^9.x",
"@deck.gl/aggregation-layers": "^9.x",
"@deck.gl/geo-layers": "^9.x",
"@deck.gl/mapbox": "^9.x",
"supercluster": "^8.x",
"@turf/bbox": "^7.x", "@turf/centroid": "^7.x", "@turf/boolean-point-in-polygon": "^7.x",
"cmdk": "^1.x"
// (framer-motion, recharts, zustand, @tanstack/react-query already present)
```

---

## 3. Design System — Visual, Motion & Interaction

> Deliverables 3, 4, 5, 15, 21. The single source of truth for how the map
> looks, moves, and responds.

---

### 3.1 Design principles

1. **Obsidian canvas, bioluminescent data.** The basemap recedes into near-black; data is the only thing that glows.
2. **Glass over map, never card around map.** Chrome floats. The map is the world; panels are heads-up displays.
3. **Depth through light, not borders.** We separate layers with blur, shadow, and a 1px luminous hairline.
4. **Motion is physics, not decoration.** Springs and eased camera moves. No linear fades.
5. **One accent does the talking.** FPS green is the system voice.
6. **Calm at rest, alive on intent.** Idle = subtle ambient drift. Hover/focus = immediate, tactile response.

---

### 3.2 Color system

#### Base (dark / command-center default)

```css
/* admin-portal/src/app/(map)/map-theme.css  — :root[data-map-theme="dark"] */
--map-bg-0:        #05080A;  /* deepest — page void */
--map-bg-1:        #0A0F0D;  /* basemap land */
--map-bg-2:        #0E1512;  /* raised surfaces */
--map-water:       #070C12;  /* sea / out-of-country */
--map-grid:        rgba(120, 200, 150, 0.05);

/* Glass */
--glass-fill:      rgba(12, 20, 16, 0.55);
--glass-fill-2:    rgba(16, 26, 21, 0.72);
--glass-stroke:    rgba(140, 220, 170, 0.14);
--glass-stroke-2:  rgba(140, 220, 170, 0.28);
--glass-blur:      22px;
--glass-shadow:    0 18px 60px -20px rgba(0,0,0,0.75);

/* Brand voice */
--accent:          #34E08A;
--accent-soft:     #22C55E;
--accent-glow:     rgba(52, 224, 138, 0.55);
--accent-dim:      rgba(52, 224, 138, 0.12);
--accent-teal:     #2DD4BF;

/* Text */
--text-hi:         #EAF4EE;
--text-mid:        #9DB3A6;
--text-lo:         #5E7268;
--text-on-accent:  #04120A;
```

#### Light / "daylight ops" theme

```css
:root[data-map-theme="light"] {
  --map-bg-0:    #F4F2EC;
  --map-bg-1:    #FBFAF6;
  --map-water:   #E7EDF0;
  --glass-fill:  rgba(255,255,255,0.66);
  --glass-stroke:rgba(26,74,46,0.12);
  --accent:      #1A8A3A;
  --text-hi:     #15281C;
  --text-mid:    #4B5C50;
  --text-lo:     #8A8A7A;
}
```

#### Data hues (constant across themes)

```ts
export const CROP_COLORS = {
  Chilli:  '#FF4D4D',
  Cotton:  '#E6ECF2',
  Soybean: '#F5C542',
  Wheat:   '#E0A82E',
  Onion:   '#C084FC',
  _other:  '#38BDF8',
} as const;

export const CONDITION_COLORS = {
  good:    '#34E08A',
  average: '#F5C542',
  poor:    '#FB6A6A',
} as const;

export const MODULE_COLORS = {
  crop_visit:   '#34E08A',
  mandi:        '#FBBF24',
  product_demo: '#22D3EE',
} as const;
```

#### Color usage rules

- **Glow is earned by magnitude.** Bloom intensity maps to value, never applied flat.
- **Condition poor (`#FB6A6A`) is the only red** — reserve it for alarm.
- Color-blind safety: condition encoding is *always* paired with icon/position, never color alone.

---

### 3.3 Typography

```css
--font-display: "Inter", ui-sans-serif, system-ui;
--font-mono:    "Geist Mono", ui-monospace;

--t-hero:   clamp(22px, 2.2vw, 30px);  600
--t-h2:     18px / 600
--t-body:   14px / 450
--t-label:  12px / 500  letter-spacing: 0.02em  uppercase
--t-caption:11px / 500  --text-lo
--t-metric: clamp(28px, 3vw, 44px) / 650  --font-mono  tabular-nums
```

All metric/coordinate/count text uses `font-variant-numeric: tabular-nums`.

---

### 3.4 Spacing, radius, elevation

```css
--space: 4px;
--r-chip:   999px;
--r-panel:  18px;
--r-card:   14px;
--r-control:12px;

--elev-1: var(--glass-shadow), inset 0 0 0 1px var(--glass-stroke);
--elev-2: 0 28px 80px -24px rgba(0,0,0,0.85), inset 0 0 0 1px var(--glass-stroke-2);
```

#### Glass surface recipe

```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border-radius: var(--r-panel);
  box-shadow: var(--elev-1);
  position: relative;
}
.glass::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 32%);
  pointer-events: none;
}
```

---

### 3.5 Motion design system

#### Spring & easing tokens

```ts
export const SPRING = {
  tactile:  { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 },
  panel:    { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  cinema:   { type: 'spring', stiffness: 170, damping: 26, mass: 1.1 },
  counter:  { type: 'spring', stiffness: 90,  damping: 20 },
} as const;

export const EASE = {
  out:    [0.16, 1, 0.3, 1],
  inOut:  [0.65, 0, 0.35, 1],
  swift:  [0.4, 0, 0, 1],
} as const;

export const CAMERA = {
  flyDuration: 1400,
  flyCurve: 1.42,
  easeStep: 650,
} as const;
```

#### Motion patterns

| Pattern | Where | Spec |
|---|---|---|
| **Staggered reveal** | Filter chips, KPI cards | `staggerChildren: 0.04`, child `y: 8→0, opacity 0→1`, `SPRING.tactile` |
| **Glass slide-in** | Left rail, right panel | from `x: ±24, opacity 0`, `SPRING.panel` |
| **Mode crossfade** | Switching viz layers | outgoing layer opacity→0 over 400ms while incoming ramps 0→target |
| **Count-up** | Metrics | `useSpring` on number, `SPRING.counter`, formatted with `Intl.NumberFormat` |
| **Magnetic hover** | Markers, chips | pointer attraction within 60px radius, translate ≤ 6px toward cursor |
| **Heat breathe** | Idle hotspots | radius ±4% sine, 6s loop, GPU shader uniform (Phase 7) |
| **Camera fly** | Region select / search | `FlyToInterpolator` with `CAMERA` tokens; pitch eases 0→35° on deep zoom |

#### Camera choreography

```
zoom < 5.0   →  HEAT macro     pitch 0°   states glow by density
5.0–6.5      →  STATE→DISTRICT clusters fade in, heat dims to 40%
6.5–8.5      →  DISTRICT       choropleth fills + cluster bubbles
8.5–10.5     →  VILLAGE        clusters spider, condition dots appear
> 10.5       →  RECORD         exact pins, pitch eases to 35°, labels on
```

#### Reduced motion

`prefers-reduced-motion: reduce` → springs collapse to 120ms eased opacity,
camera uses `LinearInterpolator` with no pitch, heat-breathe disabled.

---

### 3.6 Interaction design

#### Interaction inventory

| Surface | Rest | Hover | Active / Selected |
|---|---|---|---|
| Crop chip | dim hue ring, `--text-mid` | hue ring brightens, lift `y:-2`, magnetic | filled hue, inner glow, check icon morphs in |
| Mode toggle | icon `--text-mid` | icon `--accent`, hairline brightens | pill slides under active (shared `layoutId`) |
| Marker / cluster | base glow | scale 1.12, tooltip after 120ms, ring pulse | locks tooltip, dims siblings to 0.4 |
| District polygon | fill by value | stroke `--accent`, fill +12% lum | extrudes 1.5px, opens analytics panel |
| Timeline scrubber | thin track | thumb grows, time bubble | drag scrubs data live |

#### Interaction laws

1. **120ms intent delay** before tooltips.
2. **Hover dims the rest.** Focusing one element drops siblings to 0.4 opacity.
3. **Selection is sticky, hover is transient.**
4. **Escape & click-away** always dismiss the top-most transient layer.
5. **Pointer + keyboard parity.** Arrow keys nudge camera; `+/-` zoom; `1–5` switch modes.
6. **Inertia respected.** Map pan/zoom uses native deck.gl inertia.

#### Tooltip system

- Glass card, `--r-card`, max-width 280px, follows cursor with 8px offset and `SPRING.tactile` lag.
- Auto-flips to stay in viewport.
- Content is **typed per layer** (`HeatTip`, `ClusterTip`, `RecordTip`, `DistrictTip`, `FlowTip`).
- Renders in a single portal (`#map-tooltip-root`), one instance reused across all hovers.

---

### 3.7 Accessibility & quality bar

- Contrast ≥ 4.5:1 for `--text-hi` on glass; ≥ 3:1 for labels.
- Focus-visible ring (`--accent`, 2px, 2px offset) on every interactive element.
- All map controls reachable by keyboard; off-screen data-table fallback (Phase 8).
- Target frame budget: **60fps interaction, 30fps minimum during timeline playback**.

---

## 4. Tech Decisions (ADR log)

> The "why this stack" record. Each decision lists what we chose, what we
> rejected, and the trigger that would make us revisit.

---

### ADR-01 · Basemap: MapLibre GL JS (not Mapbox GL)

**Chosen:** MapLibre GL JS + a custom dark style we author and host.

**Rejected:** Mapbox GL JS (per-map-load billing, ToS lock-in), Google Maps
(not WebGL-layer friendly, pricing), Leaflet (no GPU, raster-era).

**Why:** Zero per-load fees for an internal admin tool, full control of the dark
style, and **API-compatible** with Mapbox GL. If leadership ever wants premium
Mapbox satellite/streets styling, it is a one-line provider swap, not a rewrite.

**Revisit if:** we need Mapbox-exclusive styles or traffic data.

---

### ADR-02 · Data layers: deck.gl

**Chosen:** deck.gl 9, interleaved into MapLibre via `MapboxOverlay({ interleaved: true })`.

**Rejected:**
- *Mapbox native heatmap/circle layers* — weak for 5 coordinated modes, awkward cross-fades.
- *three.js custom* — we'd rebuild deck.gl's layer/picking/transition system.
- *D3 + SVG/Canvas* — dies past a few thousand nodes; no GPU.

**Why:** deck.gl gives GPU heatmap, GPU aggregation, hardware picking, built-in
view-state transitions, and a clean `layer = f(state, data)` model.

**Revisit if:** we need WebGPU compute beyond deck's roadmap.

---

### ADR-03 · Clustering: Supercluster in a Web Worker

**Chosen:** Supercluster (KD-tree) in a worker, feeding deck `IconLayer`.

**Why:** Supercluster gives *expandable, spiderable* clusters with stable IDs.
Running it in a worker keeps the main thread at 60fps while it indexes 100k+ points.

**Revisit if:** point counts make even worker indexing slow → move to server-side clustering or MVT.

---

### ADR-04 · Transport: bbox-bounded GeoJSON + server aggregation (not vector tiles yet)

**Chosen:** Static GeoJSON for boundaries; small JSON aggregates and viewport-bounded point GeoJSON.

**Why:** At current volume, aggregation + bbox queries are simpler, fresher, and fast.
The frontend is **tile-ready**: deck's `MVTLayer` swaps in behind the same hook with no chrome changes.

**Revisit if:** raw points cross ~500k or `/points/` latency exceeds ~250ms p95.

---

### ADR-05 · Backend: new read-only `geo` Django app

**Chosen:** Isolated `geo` app, read-only, that queries existing models and masters.

**Why:** Keeps the map's aggregation/SQL concerns out of the modules' write paths. The modules don't even know the map exists.

---

### ADR-06 · State: Zustand (UI) + TanStack Query (server)

**Chosen:** Three small Zustand stores for ephemeral view/filter/timeline state; TanStack Query owns all server data.

**Why:** Both libs already ship in the portal. Clean split: stores = "what the user is doing," Query = "what the server said."

---

### ADR-07 · Animation: Framer Motion + deck transitions

**Chosen:** Framer Motion (installed) for chrome; deck.gl interpolators for camera/layers.

**Why:** Framer's spring + `layoutId` + `AnimatePresence` cover 95% of the chrome motion spec.

**Revisit if:** the timeline playback needs a master timeline with scrubbing of many tweens → introduce GSAP for that subsystem only.

---

### ADR-08 · Mandi geometry: add `Mandi.location` PointField + centroid backfill

**Chosen:** Migration adds nullable `location` to `Mandi`; backfill from a district-centroid table so flow mode has origins.

**Why:** `MandiArrival` has no geometry today. Flows need points. Centroid backfill is good enough for district-level flow visualization now; precise later.

---

### ADR-09 · India confinement: deck.gl inverse-polygon mask + bundled local boundary

**Chosen:** Lock the camera to India (`maxBounds` + `minZoom` + `fitBounds` on load) and hide everything outside India with a **top-most deck.gl inverse-polygon fog mask**. National + district geometry is **bundled locally** under `public/geo/`.

**Rejected:**
- *MapLibre `fill` mask layer* — z-order between mask and deck data layers is fragile.
- *Clipping the basemap style to India* — would require authoring a custom tile source.
- *External GitHub TopoJSON URL* — runtime dependency on GitHub uptime; doesn't match India's official stance.

**Why:** The mask is one deterministic layer, engine-agnostic, and doubles as the border clip for the heatmap.

---

## 5. Phase 0 — Foundations & Scaffolding

> **Goal:** every dependency installed, the route exists, the theme tokens are
> live, and a *single empty glass-framed map shell renders fullscreen* — no data
> yet.
>
> **Exit demo:** open `/map`, see a dark vignetted India basemap with a floating
> glass top bar and a placeholder mode rail. 60fps pan/zoom. Theme toggle works.

---

### 5.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Add frontend deps | `admin-portal/package.json` |
| 2 | Create `(map)` route group + dynamic client island | `app/(map)/...` |
| 3 | Declare map theme tokens + glass utilities | `app/(map)/map-theme.css` |
| 4 | Author MapLibre dark style | `features/map/canvas/basemap/style.dark.json` |
| 5 | Render `MapCanvas` shell (MapLibre + deck overlay, no layers) | `features/map/canvas/MapCanvas.tsx` |
| 6 | Glass `TopBar` + placeholder `ModeRail` | `features/map/chrome/*` |
| 7 | Permission gate `analytics.map.view` + sidebar link | `usePermissions`, `Sidebar.tsx` |
| 8 | Scaffold empty `geo` Django app (no endpoints yet) | `backend/geo/*` |
| 9 | Env vars + style asset hosting | `.env`, `next.config.ts` |

---

### 5.2 Install dependencies

```bash
cd admin-portal
npm i maplibre-gl @deck.gl/core @deck.gl/react @deck.gl/layers \
      @deck.gl/aggregation-layers @deck.gl/geo-layers @deck.gl/mapbox \
      supercluster @turf/bbox @turf/centroid @turf/boolean-point-in-polygon cmdk
npm i -D @types/supercluster
```

---

### 5.3 Route group & client island

```tsx
// src/app/(map)/map/page.tsx
import dynamic from 'next/dynamic';
const MapWorkspace = dynamic(
  () => import('@/features/map/MapWorkspace'),
  { ssr: false, loading: () => null }
);
export default function MapPage() { return <MapWorkspace />; }
```

```tsx
// src/app/(map)/layout.tsx
import './map-theme.css';
import { AuthGuard } from '@/components/layout/AuthGuard';
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="map-root fixed inset-0 overflow-hidden">{children}</div>
    </AuthGuard>
  );
}
```

---

### 5.4 Theme tokens & glass utilities

Create `app/(map)/map-theme.css` containing **all** tokens from DESIGN-SYSTEM §2 + §4, plus:

```css
.map-root {
  position: relative;
  background: var(--map-bg-0);
  color: var(--text-hi);
  font-family: var(--font-display);
}
.map-root::after {
  content:""; position:absolute; inset:0; pointer-events:none; z-index:50;
  background: radial-gradient(120% 120% at 50% 40%, transparent 55%, var(--map-bg-0) 100%);
}
.glass   { /* recipe from DESIGN-SYSTEM §4 */ }
.glass-2 { background: var(--glass-fill-2); }
.hairline{ box-shadow: inset 0 0 0 1px var(--glass-stroke); }
```

---

### 5.5 MapCanvas shell

```tsx
// features/map/canvas/MapCanvas.tsx
'use client';
import { useState, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useControl } from 'react-map-gl/maplibre';
import styleDark from './basemap/style.dark.json';

const INDIA_VIEW = { longitude: 80.9, latitude: 22.6, zoom: 4.2, pitch: 0, bearing: 0 };

function DeckOverlay(props: { layers: unknown[] }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true, ...props }));
  overlay.setProps(props);
  return null;
}

export function MapCanvas() {
  const [view, setView] = useState(INDIA_VIEW);
  const onMove = useCallback((e: any) => setView(e.viewState), []);
  return (
    <Map initialViewState={INDIA_VIEW} mapStyle={styleDark as any}
      onMove={onMove} attributionControl={false} reuseMaps>
      <DeckOverlay layers={[]} />
    </Map>
  );
}
```

---

### 5.6 Chrome shell

```tsx
// features/map/chrome/TopBar.tsx
export function TopBar() {
  return (
    <header className="glass hairline absolute top-4 left-4 right-4 z-40
                       flex items-center gap-4 px-4 h-14">
      <span className="text-[var(--accent)] font-semibold tracking-tight">FPS Intelligence</span>
      <button className="ml-auto glass-2 px-3 h-9 rounded-[12px] text-[var(--text-mid)]">⌘K</button>
    </header>
  );
}
```

---

### 5.7 Permission gate & navigation

- Add RBAC permission key `analytics.map.view` to Admin, Regional Manager presets.
- In `MapWorkspace`, short-circuit to a "no access" glass card if `usePermissions().can('analytics.map.view')` is false.
- Add sidebar entry "Intelligence Map" (lucide `Map` icon) linking to `/map`.

---

### 5.8 Backend scaffold (no endpoints)

```python
# backend/geo/apps.py
from django.apps import AppConfig
class GeoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'geo'
```

Register `geo` in `INSTALLED_APPS`. Create empty `views.py`, `urls.py`, `aggregation.py`, `filters.py`. No models yet.

---

### 5.9 Acceptance criteria

- [ ] `/map` renders fullscreen, dark, vignetted, no sidebar/topbar from dashboard.
- [ ] India basemap visible; pan/zoom at 60fps; no console errors.
- [ ] deck overlay mounts (empty) and is confirmed interleaved (no second canvas).
- [ ] Glass TopBar + ModeRail float over map with correct blur/hairline in both themes.
- [ ] Theme toggle switches dark/light, persists across reload.
- [ ] Permission gate blocks users without `analytics.map.view`.
- [ ] `geo` app boots; `python manage.py check` clean.
- [ ] Bundle delta recorded.

---

## 6. Phase 1 — Map Core & Basemap

> **Goal:** store-driven view state, camera choreography, zoom-band engine,
> glass chrome wired to real state, beautiful idle ambient look — still with mock data.
>
> **Exit demo:** the map breathes. Clicking a mode rail item smoothly cross-fades
> a placeholder layer. Searching a state flies the camera cinematically.

---

### 6.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `useMapStore` (view, mode, selection, hovered) | `store/useMapStore.ts` |
| 2 | Bind `MapCanvas` to store + RAF-throttled hover | `canvas/MapCanvas.tsx` |
| 3 | Camera system: `flyTo`, fly interpolator tokens | `canvas/useCamera.ts` |
| 4 | Zoom-band engine → per-layer opacity | `hooks/useCameraBand.ts` |
| 5 | `useDeckLayers` assembler (1 mock layer) | `canvas/useDeckLayers.ts` |
| 6 | `ModeRail` interactive (shared `layoutId` pill) | `chrome/ModeRail.tsx` |
| 7 | `TopBar` live: clock, theme toggle, ⌘K trigger | `chrome/TopBar.tsx` |
| 8 | Ambient look: vignette, grain, idle drift | css + `useAmbient.ts` |
| 9 | Single `TooltipPortal` + renderer skeleton | `tooltips/*` |

---

### 6.2 `useMapStore`

```ts
export const useMapStore = create<MapState>((set, get) => ({
  viewState: INDIA_VIEW,
  mode: 'heat',
  selection: null,
  hovered: null,

  setViewState: (viewState) => set({ viewState }),
  setMode: (mode) => set({ mode }),
  setHovered: (hovered) => set({ hovered }),
  select: (selection) => set({ selection }),

  flyTo: ({ longitude, latitude }, zoom) => set((s) => ({
    viewState: {
      ...s.viewState, longitude, latitude,
      zoom: zoom ?? s.viewState.zoom,
      pitch: (zoom ?? s.viewState.zoom) > 10.5 ? 35 : 0,
      transitionInterpolator: new FlyToInterpolator({ speed: CAMERA.flyCurve }),
      transitionDuration: CAMERA.flyDuration,
    },
  })),
}));
```

---

### 6.3 Zoom-band engine

```ts
// hooks/useCameraBand.ts
export function useCameraBand() {
  const zoom = useMapStore((s) => s.viewState.zoom);
  return useMemo(() => {
    const ramp = (a: number, b: number) => clamp((zoom - a) / (b - a), 0, 1);
    return {
      band:
        zoom < 5    ? 'heat'
      : zoom < 6.5  ? 'state'
      : zoom < 8.5  ? 'district'
      : zoom < 10.5 ? 'village'
      :               'record',
      opacity: {
        heat:     1 - ramp(5, 6.5),
        district: ramp(6, 8.5) * (1 - ramp(9.5, 11)),
        cluster:  ramp(6.5, 8.5) * (1 - ramp(10, 11)),
        pin:      ramp(10, 11),
      },
    };
  }, [zoom]);
}
```

---

### 6.4 ModeRail interactive

```tsx
const MODES = [
  { id: 'heat',     icon: Flame,    label: 'Heatmap' },
  { id: 'cluster',  icon: Boxes,    label: 'Clusters' },
  { id: 'pin',      icon: MapPin,   label: 'Pins' },
  { id: 'district', icon: Hexagon,  label: 'Districts' },
  { id: 'flow',     icon: Wind,     label: 'Flows' },
] as const;

export function ModeRail() {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);
  return (
    <nav className="glass hairline absolute left-4 top-24 z-40 p-1.5 flex flex-col gap-1">
      {MODES.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => setMode(id)}
          className="relative px-3 h-11 rounded-[12px] flex items-center gap-2.5">
          {mode === id && (
            <motion.span layoutId="mode-pill" transition={SPRING.tactile}
              className="absolute inset-0 rounded-[12px] bg-[var(--accent-dim)]" />
          )}
          <Icon size={18} className={mode===id ? 'text-[var(--accent)]' : 'text-[var(--text-mid)]'} />
          <span className="relative text-sm">{label}</span>
        </button>
      ))}
    </nav>
  );
}
```

---

### 6.5 India-Only Confinement

> **Problem:** the map opened to a whole-world view. The map must immediately read
> as "India Agricultural Intelligence Map."

#### 1. Bounds & zoom lock

```ts
export const INDIA_BOUNDS:     [[number, number], [number, number]] = [[67.0, 6.0], [98.0, 38.0]];
export const INDIA_MAX_BOUNDS: [[number, number], [number, number]] = [[63.0, 3.0], [101.0, 40.5]];
export const INDIA_MIN_ZOOM = 3.6;
export const INDIA_MAX_ZOOM = 16;
```

MapLibre constructor gets `maxBounds: INDIA_MAX_BOUNDS`, `minZoom`, `maxZoom`.
On `map.on('load')` we `fitBounds(INDIA_BOUNDS, { padding: 40, duration: 0 })`.

#### 2. Inverse-polygon fog mask

`lib/indiaMask.ts` loads the bundled national outline and builds a polygon whose
**outer ring is a world-spanning rectangle** and whose **holes are India's
boundary rings**. Rendered as the **top-most deck.gl layer** (`SolidPolygonLayer`,
fill `#05080A`, opacity ~0.96, `pickable:false`).

#### 3. Luminous India outline

A `GeoJsonLayer` (`stroked:true filled:false`, `[140,220,170,90]`, hairline width)
traces only India's edge.

#### Boundaries are bundled locally

District + national geometry loads from `public/geo/india-districts.geojson` and
`public/geo/india-outline.geojson` (full J&K / Ladakh / Aksai Chin per India's
official stance) — offline, fast, politically correct.

---

### 6.6 Acceptance criteria

- [ ] On load India fills the frame; no other countries / oceans visible.
- [ ] Camera cannot pan beyond India or zoom out to the globe.
- [ ] National outline includes full J&K + Ladakh; boundaries load from `public/geo/`.
- [ ] View state lives in `useMapStore`; camera `flyTo` is cinematic.
- [ ] Zoom-band opacities visibly cross-fade across zoom levels.
- [ ] Mode rail pill slides between modes; `1–5` hotkeys work.
- [ ] Single tooltip node confirmed in DOM during rapid hover sweep.
- [ ] Idle drift engages after inactivity, cancels on input, off under reduced-motion.
- [ ] Sustained 60fps on pan/zoom/mode-switch.

---

## 7. Phase 2 — Data Pipeline & PostGIS

> **Goal:** real data flows end-to-end. The `geo` Django app exposes aggregation,
> point, region-summary, flow, and timeline endpoints, all RBAC-scoped and
> indexed.
>
> **Exit demo:** the heatmap reflects *actual* approved field submissions. Pan to a
> region, zoom in, and viewport-bounded points load. Numbers are real.

---

### 7.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `Mandi.location` migration + centroid backfill | `backend/mandi/migrations/*`, mgmt cmd |
| 2 | Spatial + partial indexes | migration in `geo` |
| 3 | Filter param validation/coercion | `geo/filters.py` |
| 4 | Aggregation SQL builders (hex/district/state) | `geo/aggregation.py` |
| 5 | Endpoints: aggregate, points, record, region summary, flows, timeline | `geo/views.py`, `geo/urls.py` |
| 6 | RBAC data-scoping helper | `geo/scope.py` |
| 7 | Static district boundary GeoJSON (2 LODs) | `public/geo/*.json` |
| 8 | Typed hooks keyed off `filterStore.queryKey()` | `hooks/useGeo*.ts` |
| 9 | Wire real data into heat + point rendering | `canvas/useDeckLayers.ts` |

---

### 7.2 Mandi geometry migration

```python
operations = [
    migrations.AddField('Mandi', 'location',
        django.contrib.gis.db.models.fields.PointField(null=True, blank=True, srid=4326)),
]
```

```python
# management command: backfill_mandi_geom
for m in Mandi.objects.filter(location__isnull=True):
    c = DISTRICT_CENTROIDS.get((m.district.lower(), m.state.lower()))
    if c: m.location = Point(c.lng, c.lat, srid=4326); m.save(update_fields=['location'])
```

---

### 7.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS visit_location_gix   ON crops_farmervisit       USING GIST (location);
CREATE INDEX IF NOT EXISTS demo_location_gix    ON product_demo_productdemo USING GIST (location);
CREATE INDEX IF NOT EXISTS mandi_location_gix   ON mandi_mandi             USING GIST (location);

CREATE INDEX IF NOT EXISTS visit_approved_idx ON crops_farmervisit (submitted_at)
  WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS demo_approved_idx  ON product_demo_productdemo (submitted_at)
  WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS croprecord_crop_idx ON crops_croprecord (crop_name);
```

---

### 7.4 Filter coercion

```python
# geo/filters.py
@dataclass
class AggregateFilters:
    level: str            # 'hex' | 'district' | 'state' | 'block'
    date_from: date
    date_to: date
    crops: list[str] | None
    modules: list[str]
    district: str | None
    block: str | None
    condition: list[str] | None
    executive: int | None
    product: str | None
    bbox: tuple[float,float,float,float] | None
```

Hard rules: unknown `level` → 400; date range > 366d → clamp; missing dates → last 90 days.

---

### 7.5 RBAC data scoping

```python
# geo/scope.py
class DataScope:
    def __init__(self, user): self.user = user; self.regions = user_allowed_regions(user)
    def visit_q(self) -> Q:
        if self.regions is None: return Q()
        return Q(district_name__in=self.regions)
```

Every endpoint passes `DataScope(request.user)` into the builder.

---

### 7.6 Endpoint catalogue

```python
# geo/urls.py
urlpatterns = [
  path('aggregate/',          AggregateView.as_view()),
  path('points/',             PointsView.as_view()),
  path('record/<uuid:id>/',   RecordView.as_view()),
  path('region/<str:level>/<str:id>/summary/', RegionSummaryView.as_view()),
  path('flows/',              FlowsView.as_view()),
  path('timeline/',           TimelineView.as_view()),
]
```

---

### 7.7 Points endpoint — bounded & sampled

```python
class PointsView(APIView):
    CAP = 8000
    def get(self, request):
        f = PointFilters.parse(request.query_params)
        qs = points_in_bbox(f, DataScope(request.user))
        n = qs.count()
        if n > self.CAP:
            qs = qs.extra(where=["hashtext(id::text) %% 100 < %s"],
                          params=[int(self.CAP / n * 100)])
        return Response(as_geojson_points(qs))
```

---

### 7.8 Frontend hooks

```ts
// hooks/useGeoAggregate.ts
export function useGeoAggregate(level: AggLevel) {
  const key = useFilterStore((s) => s.queryKey());
  return useQuery({
    queryKey: ['geo', 'aggregate', level, ...key],
    queryFn: ({ signal }) => api.get('/api/geo/aggregate/', {
      params: { level, ...useFilterStore.getState().toParams() }, signal,
    }).then(r => r.data),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
```

---

### 7.9 Acceptance criteria

- [ ] All six endpoints return correct, RBAC-scoped data.
- [ ] `Mandi.location` backfilled; flows endpoint returns origin points.
- [ ] Spatial/partial indexes present; `EXPLAIN ANALYZE` shows index usage.
- [ ] Aggregate p95 < 150ms; points p95 < 250ms.
- [ ] Points only fetch in village/record bands (network tab confirms).
- [ ] Heatmap visibly reflects real approved submissions.
- [ ] A restricted regional-manager token cannot read outside its districts.

---

## 8. Phase 3 — Visualization Modes & Tooltips

> **Goal:** the five signature modes, each beautiful and interactive, plus the
> typed tooltip system. Deliverables 17, 18.
>
> **Exit demo:** switch between Heatmap, Cluster, Pin, District, Flow — each
> cross-fades cinematically, each has tailored hover, each is 60fps.

---

### 8.1 Layer factory contract

Every factory is **pure**: `(input) → deck Layer`. No store reads inside.

```ts
type LayerInput<T> = {
  data: T;
  opacity: number;
  onHover: (info: PickingInfo) => void;
  onClick: (info: PickingInfo) => void;
  theme: 'dark' | 'light';
};
```

---

### 8.2 Heatmap mode

```ts
export function heatLayer({ data, opacity, theme }: LayerInput<HexCell[]>) {
  return new HeatmapLayer({
    id: 'heat', data,
    getPosition: (d) => d.center,
    getWeight: (d) => d.w,
    radiusPixels: 60,
    intensity: 1.2, threshold: 0.04,
    colorRange: rampToColors(theme === 'dark' ? HEAT_RAMP_DARK : HEAT_RAMP_LIGHT),
    opacity,
    aggregation: 'SUM',
  });
}
```

**Premium touches:** zoom-reactive radius (40→90px), secondary bloom `ScatterplotLayer` for ember look, additive multi-crop blending.

**India clip:** heat-radius spillover clipped by the top-most inverse-polygon mask — no per-layer clipping needed.

---

### 8.3 Cluster mode

```ts
// hooks/useClusterWorker.ts — supercluster off main thread
const worker = new Worker(new URL('@/workers/cluster.worker.ts', import.meta.url));
// post {points, bbox, zoom} → receive {clusters:[{id,count,lng,lat,expansionZoom}]}
```

Interactions: animated expansion (`flyTo(cluster, expansionZoom)`), spidering at max zoom, premium canvas-drawn concentric ring markers.

---

### 8.4 Pin mode

```ts
export function pinLayer({ data, opacity, onHover, onClick }: LayerInput<GeoPoint[]>) {
  return new IconLayer({
    id: 'pins', data,
    getPosition: (d) => [d.lng, d.lat],
    getIcon: (d) => moduleGlyph(d.module, d.condition),
    getSize: 26, sizeUnits: 'pixels',
    pickable: true, onHover, onClick, opacity,
  });
}
```

Glyph encodes **module** (shape) + **condition** (ring color). Hover: target scales 1.12, siblings drop to 0.4 opacity.

---

### 8.5 District (choropleth) mode

```ts
export function districtLayer({ data, opacity, onHover, onClick }: LayerInput<DistrictFC>) {
  return new GeoJsonLayer({
    id: 'districts', data, pickable: true, onHover, onClick, opacity,
    getFillColor: (f) => valueToFill(f.properties.activity, theme),
    getLineColor: [140, 220, 170, 60], getLineWidth: 1,
    transitions: { getFillColor: 500 },
  });
}
```

**Animated fills:** `getFillColor` transitions 500ms on data/filter change. Hover: stroke → `--accent`, fill +12% luminance, slight extrude.

---

### 8.6 Flow mode

```ts
export function flowLayer({ data, opacity }: LayerInput<Flow[]>) {
  return new ArcLayer({
    id: 'flows', data,
    getSourcePosition: (d) => d.from,
    getTargetPosition: (d) => d.to,
    getSourceColor: [251, 191, 36, 180],
    getTargetColor: [34, 211, 238, 180],
    getWidth: (d) => 1 + Math.log2(d.w + 1),
    getHeight: 0.4, greatCircle: true, opacity,
  });
}
```

---

### 8.7 Tooltip system

Single portal node; `TooltipRenderer` switches on `hovered.layerType`:

```tsx
function TooltipRenderer() {
  const hovered = useDelayedHover(120);
  if (!hovered) return null;
  const Tip = { heat: HeatTip, clusters: ClusterTip, pins: RecordTip,
                districts: DistrictTip, flows: FlowTip }[hovered.layerType];
  return <FloatingCard x={hovered.x} y={hovered.y}><Tip data={hovered.object} /></FloatingCard>;
}
```

`FloatingCard` follows cursor with `SPRING.tactile` lag, auto-flips at viewport edges, renders once, reused.

---

### 8.8 Acceptance criteria

- [ ] All five modes render real data, each visually distinct and on-brand.
- [ ] Mode switches cross-fade (no pop); 60fps during switch.
- [ ] Heatmap hotspots glow; multi-crop selection blends additively.
- [ ] Clusters expand/spider smoothly; counts correct; worker keeps main thread free.
- [ ] Pins encode module+condition without relying on color alone.
- [ ] Choropleth fills animate on filter change; hover highlights + slight extrude.
- [ ] Typed tooltips appear after 120ms, track cursor with spring lag, single DOM node.

---

## 9. Phase 4 — Premium Filter System

> **Goal:** the filter experience itself becomes a product. No HTML selects.
> Floating glass rail, animated crop chips, expandable advanced sections, ⌘K
> command palette, and instant live recompute. Deliverable 16.
>
> **Exit demo:** toggle Chilli + Soybean chips → heat recalculates with a smooth
> recolor. Open ⌘K, type "Khargone" → camera flies there and scopes data.

---

### 9.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `useFilterStore` complete (+ `queryKey`, `toParams`) | `store/useFilterStore.ts` |
| 2 | Crop chips (multi-select, glowing active, magnetic) | `chrome/CropChips.tsx` |
| 3 | Expandable advanced filter sections | `chrome/FilterRail.tsx`, `FilterSection.tsx` |
| 4 | Date range (premium, presets + custom) | `chrome/DateRange.tsx` |
| 5 | Command palette (⌘K, cmdk) | `chrome/CommandPalette.tsx` |
| 6 | Live recompute orchestration | hooks + store wiring |
| 7 | Active-filter summary bar / clear-all | `chrome/FilterSummary.tsx` |
| 8 | URL sync of filters | `hooks/useUrlSync.ts` |

---

### 9.2 Filter store (complete)

```ts
export const useFilterStore = create<FilterState>((set, get) => ({
  crops: [], modules: ['crop_visit', 'mandi', 'product_demo'],
  condition: [], dateFrom: last90().from, dateTo: last90().to,
  district: undefined, block: undefined, village: undefined,
  executiveId: undefined, productName: undefined,

  toggleCrop: (c) => set((s) => ({
    crops: s.crops.includes(c) ? s.crops.filter(x => x !== c) : [...s.crops, c],
  })),
  reset: () => set({ crops: [], condition: [], district: undefined, ...last90Mapped() }),

  toParams: () => { /* serialize all fields to API params */ },
  queryKey: () => {
    const s = get();
    return [s.crops, s.modules, s.condition, s.district, s.block, s.village,
            s.executiveId, s.productName, s.dateFrom, s.dateTo];
  },
}));
```

---

### 9.3 Crop chips

```tsx
export function CropChips() {
  const crops = useFilterStore((s) => s.crops);
  const toggle = useFilterStore((s) => s.toggleCrop);
  return (
    <motion.div className="flex flex-wrap gap-2"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }} initial="hide" animate="show">
      {CROPS.map((c) => {
        const on = crops.includes(c);
        const hue = CROP_COLORS[c] ?? CROP_COLORS._other;
        return (
          <motion.button key={c} layout onClick={() => toggle(c)}
            variants={{ hide: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={SPRING.tactile} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
            style={{
              background: on ? hue : 'transparent',
              boxShadow: on ? `0 0 0 1px ${hue}, 0 0 22px -4px ${hue}` : `inset 0 0 0 1px ${hue}55`,
            }}>
            {c}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
```

Active chip glows in its crop hue. Toggling recolors the heat via deck `getFillColor`/ramp transition — no reload.

---

### 9.4 Advanced filter sections

```
CROPS            (chips, always open)
MODULES          [Crop] [Mandi] [Demo]
CONDITION        [Good] [Average] [Poor]
GEOGRAPHY        State ▸ District ▸ Block ▸ Village (cascading typeahead)
EXECUTIVE        searchable combobox
PRODUCT          searchable combobox
DATE RANGE       presets + custom
```

Height-spring animated expand/collapse using `AnimatePresence`. No native `<select>` anywhere.

---

### 9.5 Command palette (⌘K)

```tsx
<Command.Dialog open={open} onOpenChange={setOpen} className="glass-2 …">
  <Command.Input placeholder="Search region, crop, executive, or action…" />
  <Command.List>
    <Command.Group heading="Regions">{regions.map(...)}</Command.Group>
    <Command.Group heading="Crops">{...}</Command.Group>
    <Command.Group heading="Executives">{...}</Command.Group>
    <Command.Group heading="Actions">
      <Command.Item onSelect={() => setMode('heat')}>Switch to Heatmap</Command.Item>
      <Command.Item onSelect={resetFilters}>Clear all filters</Command.Item>
      <Command.Item onSelect={togglePlayback}>Play timeline</Command.Item>
      <Command.Item onSelect={exportView}>Export current view (PNG)</Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

Every map capability has a palette equivalent. Opens on `⌘K`/`Ctrl+K`, fuzzy search, keyboard-only operable.

---

### 9.6 Acceptance criteria

- [ ] Zero native `<select>` in the map; all filters are custom glass controls.
- [ ] Crop chips: staggered entrance, glowing active, magnetic hover, instant toggle.
- [ ] Toggling crops recolors the heat smoothly (no reload, no blank frame).
- [ ] Advanced sections expand/collapse with height spring; geography cascade works.
- [ ] Date presets + custom range functional.
- [ ] ⌘K palette covers regions, crops, executives, and all actions; keyboard-only usable.
- [ ] URL reflects filters + view; pasting a link reproduces the exact view.
- [ ] Changing any filter recomputes map + panel + timeline in lockstep.

---

## 10. Phase 5 — Analytics Panels

> **Goal:** when a region or record is selected, a floating glass insight panel
> slides in with animated counters, crop distribution, trends, mandi activity,
> and top executives. Deliverable 19.
>
> **Exit demo:** click a district → panel springs in; numbers count up; crop-split
> donut draws; 90-day trend sparkline animates; Δ% badge shows growth.

---

### 10.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `InsightPanel` shell (lazy, slide-in, contextual) | `chrome/InsightPanel.tsx` |
| 2 | `useRegionSummary` hook | `hooks/useRegionSummary.ts` |
| 3 | `MetricCounter` (spring count-up, tabular) | `chrome/MetricCounter.tsx` |
| 4 | `CropDistribution` donut/bars | `chrome/CropDistribution.tsx` |
| 5 | `TrendSparkline` + `DeltaBadge` | `chrome/TrendSparkline.tsx` |
| 6 | `ConditionBar` (good/avg/poor stacked) | `chrome/ConditionBar.tsx` |
| 7 | `ExecutiveList` (top performers) | `chrome/ExecutiveList.tsx` |
| 8 | Record panel variant (single submission) | `chrome/RecordPanel.tsx` |
| 9 | Panel actions (share, export, drill) | within panel |

---

### 10.2 Panel shell

```tsx
export default function InsightPanel() {
  const sel = useMapStore((s) => s.selection);
  return (
    <AnimatePresence>
      {sel && (
        <motion.aside
          initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }} transition={SPRING.panel}
          className="glass-2 hairline absolute top-20 right-4 bottom-24 w-[380px] z-40
                     rounded-[18px] flex flex-col overflow-hidden">
          <PanelHeader sel={sel} />
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
            {sel.kind === 'record' ? <RecordPanel id={sel.id} /> : <RegionPanel sel={sel} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
```

Slides from the right; never covers the selected feature (map auto-pans feature into left two-thirds on select).

---

### 10.3 Region panel content

```tsx
function RegionPanel({ sel }) {
  const { data, isPlaceholderData } = useRegionSummary(sel);
  if (!data) return <PanelSkeleton />;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MetricCounter label="Total activity" value={data.activity} delta={data.deltaPct} />
        <MetricCounter label="Mandi arrivals" value={data.mandiArrivals} unit="Qt" />
        <MetricCounter label="Product demos" value={data.demoCount} />
        <MetricCounter label="Top crop" text={data.topCrop} />
      </div>
      <ConditionBar good={data.good} average={data.average} poor={data.poor} />
      <Section title="Crop distribution"><CropDistribution data={data.cropSplit} /></Section>
      <Section title="90-day trend"><TrendSparkline series={data.trend} /></Section>
      <Section title="Top executives"><ExecutiveList items={data.topExecutives} /></Section>
    </>
  );
}
```

`isPlaceholderData` → render at 0.6 opacity with shimmer while new region loads.

---

### 10.4 Animated counter

```tsx
export function MetricCounter({ label, value, unit, delta, text }: Props) {
  const mv = useSpring(0, SPRING.counter);
  const shown = useTransform(mv, (v) => Math.round(v).toLocaleString('en-IN'));
  useEffect(() => { if (value != null) mv.set(value); }, [value]);
  return (
    <div className="glass hairline rounded-[14px] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-mid)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <motion.span className="text-[28px] font-semibold tabular-nums font-[var(--font-mono)]">{shown}</motion.span>
        {unit && <span className="text-xs text-[var(--text-lo)]">{unit}</span>}
        {delta != null && <DeltaBadge value={delta} />}
      </div>
    </div>
  );
}
```

---

### 10.5 Record panel variant

For a single pin selection (`kind:'record'`):
- **Visit:** farmer, crops table w/ stage+condition, photos
- **Mandi:** commodity, qty, min/avg/max rate, source
- **Demo:** product, dose, result, before/after photos

Approval status pill, mini-map locator, "open full record" deep link.

---

### 10.6 Panel actions

- **Share view** → copies URL (filters+camera+selection).
- **Export** → PNG of current map viewport + CSV of region aggregate.
- **Drill** → clicking a sub-region in crop/exec lists flies + rescopes.

---

### 10.7 Acceptance criteria

- [ ] Selecting a region springs the panel in; map pans feature clear of the panel.
- [ ] Counters spring-count with tabular numerics; no width jitter.
- [ ] Δ% badges compute vs the correct previous period.
- [ ] Donut, sparkline, condition bar all animate in and are theme-aware.
- [ ] Panel↔map linking: hovering a crop slice highlights that crop on the map.
- [ ] Switching regions never flashes empty.
- [ ] Record panel renders the right layout per module with photos + status.
- [ ] Top-executive click rescopes the whole view to that executive.

---

## 11. Phase 6 — Timeline Playback System

> **Goal:** a cinematic temporal dimension. A glass timeline dock at the bottom
> lets the admin scrub and play activity over time. Deliverable 20.
>
> **Exit demo:** press play → watch Chilli activity sweep across districts week by
> week; scrub to any date; speed control 0.5–4×.

---

### 11.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `useTimelineStore` (enabled, playing, cursor, speed) | `store/useTimelineStore.ts` |
| 2 | `TimelineDock` glass UI (lazy) | `chrome/TimelineDock.tsx` |
| 3 | `/api/geo/timeline/` histogram + buckets | `geo/views.py` |
| 4 | Time-windowed layer feeding (no refetch) | `canvas/useDeckLayers.ts` |
| 5 | Playback engine (RAF clock, speed, loop) | `hooks/usePlaybackClock.ts` |
| 6 | Scrub interaction + activity histogram track | `chrome/TimelineDock.tsx` |
| 7 | Temporal layer animation (bloom/fade/trips) | `canvas/layers/*` |
| 8 | Reduced-motion + perf throttle | clock + layers |

---

### 11.2 Timeline store

```ts
export const useTimelineStore = create<TimelineState>((set, get) => ({
  enabled: false, playing: false, speed: 1,
  cursor: 0,                                  // ms offset within [from, to]
  windowMs: 7 * 864e5,                        // trailing 7-day visibility window
  toggle: () => set((s) => ({ enabled: !s.enabled, playing: false })),
  play:   () => set({ playing: true }),
  pause:  () => set({ playing: false }),
  setCursor: (cursor) => set({ cursor, playing: false }),
  setSpeed: (speed) => set({ speed }),
}));
```

The `[from, to]` bounds come from `useFilterStore` — the date range *is* the timeline domain.

---

### 11.3 Playback clock

```ts
export function usePlaybackClock() {
  const { playing, speed, cursor, setCursorRaw, span } = useTimelineSelectors();
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const step = 7 * 864e5;                    // ~1 week per second at 1×
    const tick = (now: number) => {
      const dt = now - last; last = now;
      let next = cursor.current + (dt / 1000) * step * speed;
      if (next > span) next = 0;               // loop
      setCursorRaw(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, span]);
}
```

Cursor advances on a ref each frame; store commit **throttled to ~20Hz**.

---

### 11.4 Time-windowed layers (no refetch)

Data for the full range is already loaded. Playback **filters in place** via deck accessors + `updateTriggers`:

```ts
const t = timeline.cursorMs;
const win = timeline.windowMs;
new HeatmapLayer({
  ...,
  getWeight: (d) => withinWindow(d.t, t, win) ? d.w * fade(d.t, t, win) : 0,
  updateTriggers: { getWeight: [tBucket(t)] },
});
```

`fade()` ramps a point's contribution up as it enters the window and down as it ages out → heat *blooms and decays*.

---

### 11.5 Timeline dock UI

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▶  ┃▁▂▃▅▇█▆▄▃▂▁▂▄▆█▇▅▃▂                              ◷ 18 Mar 2026      │
│    └────────●───────────────────────────────┘   0.5× 1× 2× 4×  ⟳        │
│      1 Jan                                      30 Jun 2026               │
└──────────────────────────────────────────────────────────────────────────┘
```

Bars colored by dominant crop per bucket; histogram track doubles as the Phase 4 date-range picker shape.

---

### 11.6 Acceptance criteria

- [ ] Play sweeps activity over the date range; heat blooms and decays smoothly.
- [ ] Scrubbing updates the map live; play pauses on scrub.
- [ ] Speed 0.5–4× and loop work; no network requests fire during playback.
- [ ] Histogram shows real per-bucket activity, colored by dominant crop.
- [ ] Timeline domain follows the filter date range.
- [ ] ≥ 30fps during playback; cursor commit throttled.
- [ ] Reduced-motion: playback steps discretely per bucket instead of continuous.

---

## 12. Phase 7 — Motion & Interaction Polish

> **Goal:** the cinematic finishing pass. Spring physics everywhere, parallax
> depth, magnetic hover refinement, custom shaders, staggered orchestration,
> and the "first open" reveal sequence. Deliverables 23.
>
> **Exit demo:** opening the map plays a 1.2s cinematic reveal. Everything
> responds with physical weight. The map feels *expensive*.

---

### 12.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | First-open reveal sequence | `MapWorkspace.tsx`, `useIntroSequence.ts` |
| 2 | Hotspot breathe shader (custom layer extension) | `canvas/layers/heatLayer.ts` |
| 3 | Animated flow dashes (TripsLayer) | `canvas/layers/flowLayer.ts` |
| 4 | Parallax depth on chrome | `chrome/*`, `useParallax.ts` |
| 5 | Magnetic hover refinement + marker physics | `lib/magnetic.ts` |
| 6 | Staggered orchestration audit (all panels) | all chrome |
| 7 | Selection/deselection choreography | `useMapStore`, panel |
| 8 | Reduced-motion + low-power fallbacks | `lib/motion.ts` |

---

### 12.2 First-open reveal sequence

A scripted ~1.2s sequence on first mount (once per session):

```
t=0.0s  void → vignette fades in, logo bloom at center
t=0.2s  basemap fades up from black (opacity + slight scale 1.04→1.0)
t=0.4s  camera eases from zoom 3.4 → 4.2 ("descent into India")
t=0.5s  heat layer ramps 0 → full, hotspots ignite in a staggered ripple
t=0.7s  TopBar slides down, ModeRail slides in from left (stagger)
t=0.9s  FilterRail chips stagger in
t=1.2s  live-pulse dot starts breathing; idle systems arm
```

Honors `prefers-reduced-motion` (collapses to a 200ms fade) and `sessionStorage` flag (don't replay on nav back).

---

### 12.3 Hotspot breathe shader

GPU uniform via a deck `LayerExtension`:

```ts
class BreatheExtension extends LayerExtension {
  getShaders() { return { inject: { 'vs:#decl': 'uniform float uTime;',
    'vs:DECKGL_FILTER_SIZE': 'size *= 1.0 + 0.04 * sin(uTime + instancePhase);' } }; }
  draw(ctx) { ctx.uniforms.uTime = performance.now() / 1000; }
}
```

Zero per-frame JS work; disabled under reduced-motion/low-power.

---

### 12.4 Parallax depth

```ts
// useParallax.ts
// translate chrome layers by ≤ 6px against pointer, depth-scaled
// TopBar depth 0.3, rails 0.5, tooltip 0.8
// transform-only, SPRING.cinema, disabled on touch + reduced-motion
```

---

### 12.5 Selection choreography

On select:
1. Map flies the feature into the left two-thirds.
2. Selected feature gets a persistent halo / extrude.
3. Panel springs in with staggered sections.
4. Other features dim to 0.5.

On deselect: reverse order; camera holds (doesn't yank back).

---

### 12.6 Motion profiles

```ts
export const motionProfile = () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';
  if (navigator.hardwareConcurrency <= 4 || lowPowerHint()) return 'lite';
  return 'full';
};
```

- **reduced:** springs → 120ms fades, no parallax/breathe/idle-drift, discrete timeline.
- **lite:** keep springs, drop breathe shader + parallax + grain, cap heat radius.
- **full:** everything.

---

### 12.7 Acceptance criteria

- [ ] First-open reveal plays once/session, ~1.2s, honors reduced-motion.
- [ ] Hotspot breathe runs on GPU with zero per-frame JS; off in reduced/lite.
- [ ] Flow dashes travel directionally; speed scales with weight.
- [ ] Parallax reads as depth (≤6px), disabled on touch/reduced-motion.
- [ ] Selection choreography sequences correctly; deselect reverses cleanly.
- [ ] All motion uses shared tokens; animations are interruptible.
- [ ] Three motion profiles verified; `?motion=` override works.
- [ ] Still 60fps with all effects on.

---

## 13. Phase 8 — Performance, Mobile & Scale

> **Goal:** make it fast, make it fit a phone, make it survive growth. Web
> workers, viewport querying hardening, render budgets, mobile adaptation, and the
> scalability path to MVT tiles. Deliverables 11, 22, 24.
>
> **Exit demo:** 60fps on a 2021 MacBook Air with all layers; usable on a phone;
> a load test at 10× data shows the tile path ready to flip.

---

### 13.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Render budget instrumentation + CI gate | `lib/perf.ts`, Playwright probe |
| 2 | Worker hardening (cluster + heavy transforms) | `workers/*` |
| 3 | Viewport query tuning (debounce, abort, dedupe) | `hooks/useGeoPoints.ts` |
| 4 | Layer memo + updateTriggers audit | `canvas/*` |
| 5 | Backend: caching, connection pooling, query budget | `geo/*` |
| 6 | MVT tile path (flip-ready) | `geo/tiles`, `MVTLayer` swap |
| 7 | Mobile adaptation (touch UI, layout, gestures) | responsive chrome |
| 8 | A11y data-table fallback | `chrome/DataFallback.tsx` |
| 9 | Bundle splitting + lazy audit | route + dynamic imports |

---

### 13.2 Render budgets

| Metric | Target | Hard ceiling |
|---|---|---|
| Interaction FPS | 60 | ≥ 50 |
| Timeline playback FPS | 45 | ≥ 30 |
| First map paint | < 1.5s | 2.5s |
| Interaction ready | < 2.5s | 4s |
| Aggregate API p95 | < 150ms | 300ms |
| Points API p95 | < 250ms | 400ms |
| Map JS chunk (gz) | < 280KB | 350KB |

CI: Playwright runs a scripted pan/zoom/mode-switch and a Lighthouse + custom FPS probe.

---

### 13.3 Frontend performance hardening

1. **Workers:** Supercluster indexing + heavy GeoJSON parse in `cluster.worker.ts`. Transferable objects for point arrays.
2. **Viewport querying:** debounce pan settle (350ms), abort in-flight requests, dedupe via Query, only run in village/record bands.
3. **`updateTriggers` discipline:** every accessor lists its exact triggers; layers never rebuild on unrelated renders.
4. **`keepPreviousData` everywhere** so recompute never blanks.
5. **Backdrop-filter cap:** ≤ 4 blurred surfaces.
6. **Memoized layer factories** + stable callback identities.
7. **Point cap + sampling** server-side.
8. **Geometry caching:** boundary GeoJSON immutable-cached; parsed once.
9. **No React on the hot path:** view state and timeline cursor drive deck via refs/uniforms.

---

### 13.4 Backend performance & scale

- **Caching:** Redis layer keyed by `(filters, scope)`, TTL 60s.
- **Connection pooling:** PgBouncer in front of PostGIS.
- **Materialized views:** nightly + incremental `geo_district_daily` rollup.

```sql
CREATE MATERIALIZED VIEW geo_district_daily AS
SELECT date_trunc('day', fv.submitted_at) d, fv.district_name,
       cr.crop_name, cr.crop_condition, COUNT(*) n,
       ST_Centroid(ST_Collect(fv.location)) centroid
FROM crops_farmervisit fv JOIN crops_croprecord cr ON cr.visit_id=fv.id
WHERE fv.approval_status='approved'
GROUP BY 1,2,3,4;
CREATE INDEX ON geo_district_daily (d, district_name, crop_name);
```

---

### 13.5 Scalability path — MVT flip

When raw points cross ~500k or `/points/` p95 exceeds budget:

1. Stand up `pg_tileserv` / Martin serving MVT — `/tiles/points/{z}/{x}/{y}.pbf`.
2. Swap `GeoJsonLayer`/`useGeoPoints` for deck `MVTLayer` pointed at the tile URL.
3. Chrome, stores, tooltips, filters — **unchanged**. The hook boundary absorbs it.

---

### 13.6 Mobile adaptation strategy (≤ 768px)

- Rails → **bottom sheet**: Modes as horizontal segmented control; Filters in a sheet tab.
- InsightPanel → **bottom sheet** that snaps to 35% / 90% heights.
- TimelineDock → slim scrubber; speed/loop behind a tap.
- TopBar → logo + ⌘K + theme.
- Tooltips → **tap-to-pin** cards (no hover on touch).
- Auto `lite` motion profile; heat radius reduced; point cap lowered.
- `useDevicePixels` capped to 2.

Only chrome composition changes — canvas + stores + data layer are identical across form factors.

---

### 13.7 Scalability plan (Deliverable 24)

| Dimension | Now | Next | At scale |
|---|---|---|---|
| Points transport | bbox GeoJSON | + Redis cache | MVT tiles |
| Aggregation | live SQL | materialized rollups | H3 rollups + tile-time agg |
| Clustering | worker Supercluster | — | server/tile-time |
| Geometry | static 2-LOD GeoJSON | — | vector-tile basemap |
| Caching | SWR + immutable | Redis | CDN-fronted tiles |
| Compute | main + 1 worker | worker pool | offload to backend |

Each step is isolated behind a hook or endpoint — growth is config + infra, not re-architecture.

---

### 13.8 Acceptance criteria

- [ ] All Phase 8 budgets met on the reference machine; CI perf gate green.
- [ ] Workers confirmed off main thread; long tasks < 50ms during interaction.
- [ ] Viewport queries debounce, abort, dedupe; no request storms on fast pan.
- [ ] Materialized rollup + Redis cache live; aggregate p95 within budget at 10× data.
- [ ] MVT flip rehearsed in staging: `MVTLayer` swap works with no chrome changes.
- [ ] Mobile: bottom-sheet rails/panel, tap-to-pin tooltips, gestures, lite profile — usable one-handed.
- [ ] A11y data-table fallback reachable, keyboard-navigable, reflects filters.
- [ ] Bundle within budget; lazy chunks load only when their feature is used.

---

## Appendix · Cross-phase ship gate

- [ ] All 24 deliverables demonstrably present (README §3 traceability).
- [ ] Dark + light themes both polished.
- [ ] RBAC data-scoping enforced server-side on every endpoint.
- [ ] No regressions to existing modules (geo app is read-only/isolated).
- [ ] Reduced-motion, lite, and full motion profiles all verified.
- [ ] Deep-link sharing reproduces exact views.
- [ ] Perf budgets enforced in CI.
- [ ] Executive walkthrough script rehearsed (the "wow" demo path).
