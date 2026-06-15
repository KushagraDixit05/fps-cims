# Tech Decisions (ADR log)

> The "why this stack" record. Each decision lists what we chose, what we
> rejected, and the trigger that would make us revisit.

---

## ADR-01 · Basemap: MapLibre GL JS (not Mapbox GL)

**Chosen:** MapLibre GL JS + a custom dark style we author and host.

**Rejected:** Mapbox GL JS (per-map-load billing, ToS lock-in), Google Maps
(not WebGL-layer friendly, pricing), Leaflet (no GPU, raster-era).

**Why:** Zero per-load fees for an internal admin tool, full control of the dark
style, and **API-compatible** with Mapbox GL — deck.gl's `MapboxOverlay` works
with both. If leadership ever wants premium Mapbox satellite/streets styling, it
is a one-line provider swap, not a rewrite.

**Revisit if:** we need Mapbox-exclusive styles or traffic data.

---

## ADR-02 · Data layers: deck.gl (not raw WebGL / three.js / pure Mapbox layers)

**Chosen:** deck.gl 9, interleaved into MapLibre via `MapboxOverlay({ interleaved: true })`.

**Rejected:**
- *Mapbox native heatmap/circle layers* — fine for one layer, but no GPU
  aggregation, weak for 5 coordinated modes, awkward cross-fades.
- *three.js custom* — we'd rebuild deck.gl's layer/picking/transition system.
- *D3 + SVG/Canvas* — dies past a few thousand nodes; no GPU.

**Why:** deck.gl gives GPU heatmap, GPU aggregation, hardware picking, built-in
view-state transitions (`FlyToInterpolator`), and a clean `layer = f(state, data)`
model that matches our pure-factory architecture. One depth buffer shared with
MapLibre = perfect label/data sync.

**Revisit if:** we need WebGPU compute beyond deck's roadmap (unlikely at this scale).

---

## ADR-03 · Clustering: Supercluster in a Web Worker (not deck.gl GPUGridLayer alone)

**Chosen:** Supercluster (KD-tree) in a worker, feeding deck `IconLayer`; deck
aggregation layers (`HeatmapLayer`, `HexagonLayer`) used for density modes.

**Why:** Supercluster gives *expandable, spiderable* clusters with stable IDs and
counts — needed for the premium cluster interaction. Running it in a worker keeps
the main thread at 60fps while it indexes 100k+ points. Density modes use deck's
GPU aggregation where we want a field, not discrete bubbles.

**Revisit if:** point counts make even worker indexing slow → move to server-side
clustering or MVT.

---

## ADR-04 · Transport: bbox-bounded GeoJSON + server aggregation (not vector tiles yet)

**Chosen:** Static GeoJSON for boundaries; small JSON aggregates and
viewport-bounded point GeoJSON for data — all behind hooks.

**Rejected (for now):** full MVT vector-tile pipeline (`pg_tileserv`/Martin).

**Why:** At current volume, aggregation + bbox queries are simpler, fresher (no
tile cache invalidation), and fast. The frontend is built **tile-ready**: deck's
`MVTLayer` swaps in behind the same `useGeoPoints` hook with no chrome changes.

**Revisit if:** raw points cross ~500k or `/points/` latency exceeds ~250ms p95 →
flip the `/points/` transport to MVT in Phase 8. Decision is reversible by design.

---

## ADR-05 · Backend: new read-only `geo` Django app (not extending module views)

**Chosen:** Isolated `geo` app, read-only, that queries existing models and
masters; respects RBAC data scope.

**Why:** Keeps the map's aggregation/SQL concerns out of the modules' write
paths and serializers. Independent caching, permissions, and deploy risk. The
modules don't even know the map exists.

**Revisit if:** never — isolation is the point.

---

## ADR-06 · State: Zustand (UI) + TanStack Query (server) — keep them separate

**Chosen:** Three small Zustand stores for ephemeral view/filter/timeline state;
TanStack Query owns all server data.

**Rejected:** Redux (ceremony), putting fetched data in Zustand (stale-cache hell,
re-implements Query).

**Why:** Both libs already ship in the portal. Clean split: stores = "what the
user is doing," Query = "what the server said." `filterStore.queryKey()` is the
single bridge.

---

## ADR-07 · Animation: Framer Motion + deck transitions (+ GSAP only if forced)

**Chosen:** Framer Motion (installed) for chrome; deck.gl interpolators for
camera/layers. GSAP held in reserve for any timeline-orchestrated sequence Framer
can't express ergonomically.

**Why:** Framer's spring + `layoutId` + `AnimatePresence` cover 95% of the chrome
motion spec. deck owns the GPU/camera side. Adding GSAP up front would be weight
we likely don't need.

**Revisit if:** the timeline playback needs a master timeline with scrubbing of
many tweens → introduce GSAP for that subsystem only.

---

## ADR-08 · Mandi geometry: add `Mandi.location` PointField + centroid backfill

**Chosen:** Migration adds nullable `location` to `Mandi`; backfill from a
district-centroid table so flow mode has origins. Forward path: capture real GPS
when mandi master is next edited.

**Why:** `MandiArrival` has no geometry today (only a `Mandi` FK with text
district/state). Flows need points. Centroid backfill is good enough for
district-level flow visualization now; precise later.
