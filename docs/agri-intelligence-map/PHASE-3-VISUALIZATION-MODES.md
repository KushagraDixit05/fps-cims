# Phase 3 — Visualization Modes & Tooltips

> **Goal:** the five signature modes, each beautiful and interactive, plus the
> typed tooltip system. This is where the map earns the "wow." Deliverables 17, 18.
>
> **Exit demo:** switch between Heatmap, Cluster, Pin, District, Flow — each
> cross-fades cinematically, each has tailored hover, each is 60fps. Hover any
> element and a typed glass tooltip tracks the cursor with spring lag.

---

## 3.1 Layer factory contract

Every factory is **pure**: `(input) → deck Layer`. No store reads inside. Inputs
are data + the band opacity + palette + callbacks. This keeps the GPU path
testable and lets `useDeckLayers` compose freely.

```ts
// canvas/layers/types.ts
type LayerInput<T> = {
  data: T;
  opacity: number;            // from useCameraBand
  onHover: (info: PickingInfo) => void;
  onClick: (info: PickingInfo) => void;
  theme: 'dark' | 'light';
};
```

---

## 3.2 Heatmap mode

```ts
// canvas/layers/heatLayer.ts
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { HEAT_RAMP_DARK } from '../../lib/palette';

export function heatLayer({ data, opacity, theme }: LayerInput<HexCell[]>) {
  return new HeatmapLayer({
    id: 'heat',
    data,
    getPosition: (d) => d.center,
    getWeight: (d) => d.w,
    radiusPixels: 60,                 // zoom-reactive via updateTriggers below
    intensity: 1.2,
    threshold: 0.04,
    colorRange: rampToColors(theme === 'dark' ? HEAT_RAMP_DARK : HEAT_RAMP_LIGHT),
    opacity,
    aggregation: 'SUM',
    updateTriggers: { radiusPixels: [/* zoom band */], colorRange: [theme] },
  });
}
```

Premium touches:
- **Zoom-reactive radius:** `radiusPixels` interpolates 40→90 across the heat→state
  band so hotspots tighten as you zoom (handled via `updateTriggers`).
- **Glowing hotspots:** top decile cells get a secondary additive `ScatterplotLayer`
  bloom (soft radial, `--accent-glow`) under the heat for the "ember" look.
- **Breathe:** idle ±4% radius sine (Phase 7 shader uniform; CPU fallback here).
- **Blend:** additive blending so overlapping crop heat *layers* (multi-select)
  combine into brighter cores — intelligent visual layering for free.

Multi-crop blending: when N crops are selected, render N weighted heat layers with
per-crop tinted ramps at reduced individual intensity; additive blend produces the
"elegant layering" the brief asks for, with shared hotspots reading hottest.

**India clip:** the `HeatmapLayer` aggregates a Gaussian field, so the glow can
bleed past the national border near coastal/edge cells. It is **visually clipped
to India by the top-most inverse-polygon mask** (PHASE-1 §1.10a) — no per-layer
clipping shader needed. Heat reads only inside India; spillover is covered by the
fog. The same mask clips clusters/pins/flows at the border for free.

---

## 3.3 Cluster mode

```ts
// hooks/useClusterWorker.ts — supercluster off main thread
const worker = new Worker(new URL('@/workers/cluster.worker.ts', import.meta.url));
// post {points, bbox, zoom} → receive {clusters:[{id,count,lng,lat,expansionZoom}]}
```

```ts
// canvas/layers/clusterLayer.ts
import { IconLayer } from '@deck.gl/layers';
export function clusterLayer({ data, opacity, onHover, onClick }: LayerInput<Cluster[]>) {
  return new IconLayer({
    id: 'clusters', data,
    getPosition: (d) => [d.lng, d.lat],
    getSize: (d) => 28 + Math.min(36, Math.log2(d.count) * 7),  // density-aware scale
    getIcon: (d) => clusterGlyph(d.count),     // canvas-drawn ring + count
    pickable: true, onHover, onClick, opacity,
    sizeUnits: 'pixels',
    transitions: { getPosition: 400, getSize: { duration: 300, easing: easeOut } },
  });
}
```

Interactions:
- **Animated expansion:** click a cluster → `flyTo(cluster, expansionZoom)`; the
  cluster dissolves into children with a staggered `getPosition` transition
  (deck transition + supercluster `getLeaves`).
- **Spidering:** at max zoom where points overlap, fan colliding points on a small
  spiral (computed in worker) so each is individually hoverable.
- **Premium marker:** canvas-drawn concentric ring, count in `--font-mono`, hue =
  dominant module/crop in the cluster, soft outer glow scaled by count.

---

## 3.4 Pin mode

```ts
// canvas/layers/pinLayer.ts
export function pinLayer({ data, opacity, onHover, onClick, theme }: LayerInput<GeoPoint[]>) {
  return new IconLayer({
    id: 'pins', data,
    getPosition: (d) => [d.lng, d.lat],
    getIcon: (d) => moduleGlyph(d.module, d.condition),  // crop/mandi/demo glyph
    getSize: 26, sizeUnits: 'pixels',
    pickable: true, onHover, onClick, opacity,
    // hover physics handled in useDeckLayers via hovered id → size bump + sibling dim
  });
}
```

- Exact records. Glyph encodes **module** (shape) + **condition** (ring color) so
  it's readable without color alone (a11y, DESIGN-SYSTEM §9).
- Hover: target scales 1.12, siblings drop to 0.4 opacity (Bloomberg spotlight),
  tooltip appears after 120ms.
- Click: locks `selection={kind:'record'}`, opens InsightPanel (Phase 5), keeps
  the pin haloed.

---

## 3.5 District (choropleth) mode

```ts
// canvas/layers/districtLayer.ts
import { GeoJsonLayer } from '@deck.gl/layers';
export function districtLayer({ data, opacity, onHover, onClick, theme }: LayerInput<DistrictFC>) {
  return new GeoJsonLayer({
    id: 'districts', data, pickable: true, onHover, onClick, opacity,
    stroked: true, filled: true, extruded: false,
    getFillColor: (f) => valueToFill(f.properties.activity, theme),  // ramp by activity
    getLineColor: [140, 220, 170, 60],
    getLineWidth: 1, lineWidthUnits: 'pixels',
    transitions: { getFillColor: 500 },          // animated fills
    updateTriggers: { getFillColor: [theme, /* data version */] },
  });
}
```

- **Animated fills:** `getFillColor` transitions 500ms when data/filters change —
  districts "recolor" smoothly, never snap.
- **Highlight:** hovered district stroke → `--accent`, fill +12% luminance, and a
  thin 1.5px pseudo-extrude (raise `getElevation` slightly) for tactile depth.
- **Condition coloring option:** a sub-toggle recolors by dominant condition
  (good/avg/poor) instead of raw activity — same layer, different accessor.
- Click → `flyTo(district)` + InsightPanel for that district.

---

## 3.6 Flow mode

```ts
// canvas/layers/flowLayer.ts
import { ArcLayer } from '@deck.gl/layers';
export function flowLayer({ data, opacity }: LayerInput<Flow[]>) {
  return new ArcLayer({
    id: 'flows', data,
    getSourcePosition: (d) => d.from,
    getTargetPosition: (d) => d.to,
    getSourceColor: [251, 191, 36, 180],   // mandi amber
    getTargetColor: [34, 211, 238, 180],   // demo cyan
    getWidth: (d) => 1 + Math.log2(d.w + 1),
    getHeight: 0.4, greatCircle: true, opacity,
  });
}
```

- **Mandi flows:** arrivals → consuming districts (or surplus → deficit), weighted.
- **Product spread:** demo origin → subsequent activity nearby (temporal lead/lag).
- **Animated direction:** optional `TripsLayer` upgrade animates dashes traveling
  along arcs (Phase 7) for directional read.
- Flows fade in over heat at mid zoom; at macro they aggregate to state-pairs to
  avoid hairball.

---

## 3.7 `useDeckLayers` composition + crossfade

```ts
export function useDeckLayers() {
  const mode  = useMapStore((s) => s.mode);
  const band  = useCameraBand();
  const theme = useMapTheme();
  const hovered = useMapStore((s) => s.hovered);

  const hex      = useGeoAggregate('hex');
  const district = useGeoAggregate('district');
  const points   = useGeoPoints();
  const clusters = useClusterWorker(points.data);
  const flows    = useFlows(mode === 'flow');

  return useMemo(() => {
    const cb = { onHover, onClick };
    const layers = [];
    // band-gated base (always-available context)
    if (band.opacity.heat > 0.01)
      layers.push(heatLayer({ data: hex.data ?? [], opacity: modeOpacity(mode,'heat',band.opacity.heat), ...cb }));
    if (band.opacity.district > 0.01)
      layers.push(districtLayer({ data: district.fc, opacity: modeOpacity(mode,'district',band.opacity.district), ...cb }));
    if (mode === 'cluster' && band.opacity.cluster > 0.01)
      layers.push(clusterLayer({ data: clusters, opacity: band.opacity.cluster, ...cb }));
    if (mode === 'pin' && band.opacity.pin > 0.01)
      layers.push(pinLayer({ data: points.data ?? [], opacity: band.opacity.pin, ...cb }));
    if (mode === 'flow')
      layers.push(flowLayer({ data: flows.data ?? [], opacity: 1, ...cb }));
    return layers;
  }, [mode, band, hex.data, district.fc, clusters, points.data, flows.data, hovered, theme]);
}
```

`modeOpacity()` ramps the *selected* mode's primary layer to full while letting
adjacent representations linger at low opacity during the 400ms switch — the
"nothing teleports" law. The active mode also biases band gating (e.g. choosing
Heatmap keeps heat visible a bit deeper).

---

## 3.8 Tooltip system (Deliverable 18)

Single portal node (DESIGN-SYSTEM §6.3); `TooltipRenderer` switches on
`hovered.layerType`:

```tsx
function TooltipRenderer() {
  const hovered = useDelayedHover(120);   // 120ms intent delay
  if (!hovered) return null;
  const Tip = { heat: HeatTip, clusters: ClusterTip, pins: RecordTip,
                districts: DistrictTip, flows: FlowTip }[hovered.layerType];
  return <FloatingCard x={hovered.x} y={hovered.y}><Tip data={hovered.object} /></FloatingCard>;
}
```

Typed tips:
- **HeatTip** — hex weight, dominant crop, approx activity.
- **ClusterTip** — count, module breakdown bar, "click to expand."
- **RecordTip** — farmer/mandi/demo name, crop+variety, condition pill, date,
  executive, mini "open" affordance.
- **DistrictTip** — district, activity, good/avg/poor stacked bar, Δ vs prev period.
- **FlowTip** — origin → dest, weight, commodity/product.

`FloatingCard` follows cursor with `SPRING.tactile` lag, auto-flips at viewport
edges, renders once, reused. Locked on click (sticky) until Escape/click-away.

---

## 3.9 Acceptance criteria

- [ ] All five modes render real data, each visually distinct and on-brand.
- [ ] Mode switches cross-fade (no pop); 60fps during switch.
- [ ] Heatmap hotspots glow; multi-crop selection blends additively.
- [ ] Clusters expand/spider smoothly; counts correct vs DB; worker keeps main thread free.
- [ ] Pins encode module+condition without relying on color alone.
- [ ] Choropleth fills animate on filter change; hover highlights + slight extrude.
- [ ] Flows render origin→dest with sensible weighting; no macro hairball.
- [ ] Typed tooltips appear after 120ms, track cursor with spring lag, single DOM node, auto-flip.
- [ ] Hover spotlight dims siblings to 0.4; click locks selection.
