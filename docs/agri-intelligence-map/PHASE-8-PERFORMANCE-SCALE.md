# Phase 8 — Performance, Mobile & Scale

> **Goal:** make it fast, make it fit a phone, make it survive growth. Web
> workers, viewport querying hardening, render budgets, mobile adaptation, and the
> scalability path to MVT tiles. Deliverables 11, 22, 24.
>
> **Exit demo:** 60fps on a 2021 MacBook Air with all layers; the map is usable on
> a phone with a redesigned touch UI; a load test at 10× data shows the tile path
> ready to flip.

---

## 8.1 Tasks

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

## 8.2 Render budget & instrumentation

```ts
// lib/perf.ts — dev HUD + telemetry
// tracks: fps (rAF delta), deck draw time, main-thread long tasks,
// layer count, point count, tooltip churn. Surfaced via ?perf=1 overlay.
```

**Budgets (enforced):**
| Metric | Target | Hard ceiling |
|---|---|---|
| Interaction FPS | 60 | ≥ 50 |
| Timeline playback FPS | 45 | ≥ 30 |
| First map paint | < 1.5s | 2.5s |
| Interaction ready | < 2.5s | 4s |
| Aggregate API p95 | < 150ms | 300ms |
| Points API p95 | < 250ms | 400ms |
| Map JS chunk (gz) | < 280KB | 350KB |

CI: a Playwright run opens `/map`, drives a scripted pan/zoom/mode-switch, and a
Lighthouse + custom FPS probe fail the build if budgets regress.

---

## 8.3 Frontend performance hardening

1. **Workers:** Supercluster indexing (Phase 3) + any heavy GeoJSON parse moved
   to `cluster.worker.ts`; main thread only renders. Transferable objects for
   point arrays (no structured-clone cost).
2. **Viewport querying:** `useGeoPoints` debounces on pan **settle** (350ms),
   aborts in-flight requests on new bbox (`AbortController`), dedupes via Query,
   and only runs in village/record bands.
3. **`updateTriggers` discipline:** every accessor that depends on state lists its
   exact triggers; layers never rebuild on unrelated renders. Audited per layer.
4. **`keepPreviousData` everywhere** so recompute never blanks.
5. **Backdrop-filter cap:** ≤ 4 blurred surfaces; the map canvas never sits behind
   a blur. Panels that overlap collapse their blur when stacked.
6. **Memoized layer factories** + stable callback identities (`useCallback`).
7. **Point cap + sampling** server-side (Phase 2 §2.8) keeps payloads bounded.
8. **Geometry caching:** boundary GeoJSON immutable-cached; parsed once, reused.
9. **No React on the hot path:** view state and timeline cursor drive deck via
   refs/uniforms, not per-frame React renders.

---

## 8.4 Backend performance & scale

- **Caching:** aggregate/timeline responses `stale-while-revalidate`; add a Redis
  layer keyed by `(filters, scope)` for hot regions (TTL 60s).
- **Connection pooling:** PgBouncer in front of PostGIS for the read endpoints.
- **Materialized views:** for the heaviest macro aggregates (state/district daily
  rollups), a nightly + incremental `MATERIALIZED VIEW geo_district_daily` that
  the aggregate endpoint reads instead of scanning raw tables. Refreshed by a
  Celery beat job (Celery already in the stack).
- **Query budget:** every endpoint `EXPLAIN ANALYZE`'d; GIST/partial indexes
  confirmed on the hot path (Phase 2 §2.3).

```sql
-- example rollup the macro heat/choropleth read from at scale
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

## 8.5 Scalability path — MVT flip (ADR-04)

The frontend is **tile-ready**. When raw points cross ~500k or `/points/` p95
exceeds budget:

1. Stand up `pg_tileserv` / Martin serving MVT from the source tables (or the
   rollup) — `/tiles/points/{z}/{x}/{y}.pbf`.
2. Swap `GeoJsonLayer`/`useGeoPoints` for deck `MVTLayer` pointed at the tile URL.
3. Chrome, stores, tooltips, filters — **unchanged**. The hook boundary absorbs it.

Clustering at extreme scale moves server-side (tile-time aggregation) or to
H3-indexed rollups. Documented as a reversible, isolated change — not a rewrite.

---

## 8.6 Mobile adaptation strategy (Deliverable 22)

The exec opens it on a phone in the field. It must not be a squished desktop.

**Layout transforms (≤ 768px):**
- Rails become a **bottom sheet** (drag-up): Modes as a horizontal segmented
  control; Filters in a sheet tab.
- InsightPanel becomes a **bottom sheet** that snaps to 35% / 90% heights.
- TimelineDock collapses to a slim scrubber; speed/loop behind a tap.
- TopBar shrinks to logo + ⌘K (search) + theme.
- Tooltips become **tap-to-pin** cards (no hover on touch); long-press for context.

**Gestures:** native pinch-zoom/rotate via deck controller; the trailing-window
timeline is swipe-scrubbable; bottom sheets use momentum.

**Performance on mobile:** auto `lite` motion profile (Phase 7), heat radius
reduced, parallax/grain/breathe off, point cap lowered, district LOD forced low.
deck `useDevicePixels` capped to 2 to spare the GPU.

**Responsive implementation:** a `useBreakpoint()` hook switches chrome
composition; the canvas + stores + data layer are identical across form factors —
only chrome composition changes. No separate codebase.

---

## 8.7 Accessibility fallback

A `DataFallback` view (toggle in TopBar / `?view=table`) renders the current
filtered aggregate as an accessible, sortable HTML table — for screen-reader
users and execs who want the raw numbers. Keyboard-navigable, same data, same
filters. Satisfies "show me the spreadsheet" without leaving the tool.

---

## 8.8 Scalability plan (Deliverable 24) — summary

| Dimension | Now | Next | At scale |
|---|---|---|---|
| Points transport | bbox GeoJSON | + Redis cache | MVT tiles |
| Aggregation | live SQL | materialized rollups | H3 rollups + tile-time agg |
| Clustering | worker Supercluster | — | server/tile-time |
| Geometry | static 2-LOD GeoJSON | — | vector-tile basemap |
| Caching | SWR + immutable | Redis | CDN-fronted tiles |
| Compute | main + 1 worker | worker pool | offload to backend |

Each step is isolated behind a hook or endpoint — growth is config + infra, not
re-architecture.

---

## 8.9 Acceptance criteria

- [ ] All Phase 8 budgets met on the reference machine; CI perf gate green.
- [ ] Workers confirmed off main thread; long tasks < 50ms during interaction.
- [ ] Viewport queries debounce, abort, dedupe; no request storms on fast pan.
- [ ] Materialized rollup + Redis cache live; aggregate p95 within budget at 10× data.
- [ ] MVT flip rehearsed in staging: `MVTLayer` swap works with no chrome changes.
- [ ] Mobile: bottom-sheet rails/panel, tap-to-pin tooltips, gestures, lite profile — usable one-handed.
- [ ] A11y data-table fallback reachable, keyboard-navigable, reflects filters.
- [ ] Bundle within budget; lazy chunks load only when their feature is used.
```

---

## Appendix · Cross-phase checklist (ship gate)

- [ ] All 24 deliverables demonstrably present (README §3 traceability).
- [ ] Dark + light themes both polished.
- [ ] RBAC data-scoping enforced server-side on every endpoint.
- [ ] No regressions to existing modules (geo app is read-only/isolated).
- [ ] Reduced-motion, lite, and full motion profiles all verified.
- [ ] Deep-link sharing reproduces exact views.
- [ ] Perf budgets enforced in CI.
- [ ] Executive walkthrough script rehearsed (the "wow" demo path).
