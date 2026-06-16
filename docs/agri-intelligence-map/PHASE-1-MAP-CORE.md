# Phase 1 — Map Core & Basemap

> **Goal:** turn the static shell into a *living core*: store-driven view state,
> the camera choreography system, the zoom-band engine, the glass chrome wired to
> real state, and a beautiful idle ambient look — still with mock/sample data.
>
> **Exit demo:** the map breathes. Clicking a mode rail item smoothly cross-fades
> a placeholder layer. Searching a state flies the camera there cinematically.
> Hovering does a magnetic, spotlighted response. All at 60fps.

---

## 1.1 Tasks

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

## 1.2 `useMapStore`

```ts
// features/map/store/useMapStore.ts
import { create } from 'zustand';
import { FlyToInterpolator } from '@deck.gl/core';
import { CAMERA } from '../lib/motion';

export const INDIA_VIEW = { longitude: 80.9, latitude: 22.6, zoom: 4.2, pitch: 0, bearing: 0, transitionDuration: 0 };

type Mode = 'heat' | 'cluster' | 'pin' | 'district' | 'flow';

export const useMapStore = create<MapState>((set, get) => ({
  viewState: INDIA_VIEW,
  mode: 'heat',
  selection: null,
  hovered: null,

  setViewState: (viewState) => set({ viewState }),
  setMode: (mode) => set({ mode }),          // crossfade handled in useDeckLayers
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

## 1.3 Canvas bound to store + hover throttle

```ts
// canvas/MapCanvas.tsx (key changes from Phase 0)
const viewState = useMapStore((s) => s.viewState);
const setViewState = useMapStore((s) => s.setViewState);
const setHovered = useMapStore((s) => s.setHovered);
const layers = useDeckLayers();           // §1.6

// RAF-throttle hover so picking can't exceed one store write per frame
const pending = useRef<HoverTarget | null>(null);
const raf = useRef(0);
const onHover = useCallback((info: PickingInfo) => {
  pending.current = info.object ? toHoverTarget(info) : null;
  if (!raf.current) raf.current = requestAnimationFrame(() => {
    raf.current = 0; setHovered(pending.current);
  });
}, [setHovered]);
```

deck overlay now receives `layers`, `viewState`, `onViewStateChange`, `onHover`,
`controller: { inertia: 320, dragRotate: true }`.

---

## 1.4 Camera choreography

`useCamera.ts` exposes intent-level helpers consumed by chrome/search/select:

```ts
export function useCamera() {
  const flyTo = useMapStore((s) => s.flyTo);
  return {
    toIndia:   () => flyTo({ longitude: 80.9, latitude: 22.6 }, 4.2),
    toState:   (b: Bounds) => flyTo(centroidOf(b), 5.6),
    toDistrict:(b: Bounds) => flyTo(centroidOf(b), 7.4),
    toRecord:  (p: LngLat) => flyTo(p, 12),     // pitch auto-eases via store
  };
}
```

All camera moves use the `FlyToInterpolator` tokens from `DESIGN-SYSTEM` §5.2/§5.3.
Pitch eases to 35° only past the record band — the "lean in" moment.

---

## 1.5 Zoom-band engine (the "zoom is a story" law)

```ts
// hooks/useCameraBand.ts
export function useCameraBand() {
  const zoom = useMapStore((s) => s.viewState.zoom);
  return useMemo(() => {
    // smooth opacity ramps so layers cross-fade across zoom, never pop
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

> This object is the conductor. Layer factories read these opacities so the *same*
> data dissolves between representations as the admin zooms — the cinematic core.

---

## 1.6 Layer assembler (mock layer in Phase 1)

```ts
// canvas/useDeckLayers.ts
export function useDeckLayers() {
  const mode = useMapStore((s) => s.mode);
  const band = useCameraBand();
  // Phase 1: a single mock ScatterplotLayer driven by sample points,
  // its opacity wired to band, to prove crossfade + band gating end-to-end.
  return useMemo(() => buildMockLayers({ mode, band }), [mode, band]);
}
```

Real heat/cluster/pin/district/flow factories land in Phase 3. Phase 1 only
proves the *plumbing*: mode switch → crossfade, zoom → band opacity.

---

## 1.7 ModeRail interactive

```tsx
// chrome/ModeRail.tsx
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
          className="relative px-3 h-11 rounded-[12px] flex items-center gap-2.5 group">
          {mode === id && (
            <motion.span layoutId="mode-pill" transition={SPRING.tactile}
              className="absolute inset-0 rounded-[12px] bg-[var(--accent-dim)]
                         shadow-[inset_0_0_0_1px_var(--glass-stroke-2)]" />
          )}
          <Icon size={18} className={mode===id ? 'text-[var(--accent)]' : 'text-[var(--text-mid)]'} />
          <span className="relative text-sm">{label}</span>
        </button>
      ))}
    </nav>
  );
}
```

The active pill slides between modes via shared `layoutId` — the signature Linear/
Vercel motion. Keyboard `1–5` selects modes (wire in `useHotkeys`).

---

## 1.8 TopBar live

- **Live clock** (`Intl.DateTimeFormat`, IST), `--font-mono`, ticks each minute.
- **Theme toggle** → `next-themes` `setTheme`, animated sun/moon morph (Framer).
- **⌘K** button + global hotkey opens CommandPalette (built Phase 4; stub now).
- **Live-data pulse dot** (placeholder) — a soft breathing `--accent` dot signaling "live."

---

## 1.9 Ambient & idle life

`useAmbient.ts` adds restrained, GPU-cheap life so the map feels alive at rest:

- **Idle camera drift:** after 12s of no interaction, a near-imperceptible bearing
  oscillation (±0.4°, 30s sine), cancelled on any input. Off under reduced-motion.
- **Vignette + grain:** from `DESIGN-SYSTEM` §7, already in `map-theme.css`.
- **Hotspot breathe:** placeholder uniform (real shader in Phase 7).

---

## 1.10 Tooltip portal skeleton

```tsx
// tooltips/TooltipRenderer.tsx
export function TooltipRenderer() {
  const hovered = useMapStore((s) => s.hovered);
  return createPortal(
    <AnimatePresence>
      {hovered && (
        <motion.div className="glass-2 hairline fixed z-[60] px-3 py-2 rounded-[14px] pointer-events-none"
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }} transition={SPRING.tactile}
          style={{ left: hovered.x + 8, top: hovered.y + 8 }}>
          {/* Phase 3: switch on hovered.layerType → typed tip */}
          <span className="text-xs text-[var(--text-mid)]">{hovered.label}</span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById('map-tooltip-root')!
  );
}
```

One node, reused for every hover (DESIGN-SYSTEM §6.3). 120ms intent delay added
in Phase 3 with the typed tips.

---

## 1.10a India-Only Confinement (the "India is the world" law)

> **Problem this fixes:** the map opened to a *whole-world view* — Africa, Europe,
> the USA, and oceans were visible, and the camera could pan anywhere on Earth.
> The map must immediately read as **"India Agricultural Intelligence Map."**
> Confinement is achieved with three additive, deterministic mechanisms — no
> basemap swap, no engine change.

### 1. Bounds & zoom lock (camera can't leave India)

```ts
// lib/mapStyle.ts
export const INDIA_BOUNDS:     [[number, number], [number, number]] = [[67.0, 6.0], [98.0, 38.0]]; // fitBounds target (SW, NE)
export const INDIA_MAX_BOUNDS: [[number, number], [number, number]] = [[63.0, 3.0], [101.0, 40.5]]; // hard pan limit (padded)
export const INDIA_MIN_ZOOM = 3.6;
export const INDIA_MAX_ZOOM = 16;
```

The MapLibre constructor gets `maxBounds: INDIA_MAX_BOUNDS`, `minZoom`, `maxZoom`.
On `map.on('load')` we `fitBounds(INDIA_BOUNDS, { padding: 40, duration: 0 })` so
India fills the viewport on the very first paint instead of relying on a raw
center/zoom guess. The user physically cannot drag past India or zoom out to the
globe.

### 2. Inverse-polygon fog mask (everything outside India is hidden)

`lib/indiaMask.ts` loads the bundled national outline and builds a single polygon
whose **outer ring is a world-spanning rectangle** and whose **holes are India's
boundary rings** — i.e. "fill everywhere *except* India." Rendered as the
**top-most deck.gl layer** (`SolidPolygonLayer`, fill `#05080A`, opacity ~0.96,
`pickable:false`), it covers the basemap of neighbouring countries *and* any
heat-radius spillover past the border, while India shows through the hole.

### 3. Luminous India outline (premium border)

A `GeoJsonLayer` (`stroked:true filled:false`, `[140,220,170,90]`, hairline width)
traces only India's edge — the subtle glowing frame that makes the surface feel
like a dedicated command surface, not a generic map.

### Boundaries are bundled locally

District + national geometry now load from `public/geo/india-districts.geojson`
and `public/geo/india-outline.geojson` (full J&K / Ladakh / Aksai Chin per India's
official stance) instead of an external GitHub TopoJSON URL — offline, fast, and
politically correct. The files are swappable with a Survey-of-India-certified set
(or Mappls) without code changes. See `TECH-DECISIONS` ADR on India masking.

---

## 1.11 Acceptance criteria

- [ ] On load India fills the frame, centered; no other countries / oceans visible.
- [ ] Camera cannot pan beyond India (`maxBounds`) or zoom out to the globe (`minZoom`).
- [ ] National outline includes full J&K + Ladakh; boundaries load from `public/geo/`.
- [ ] View state lives in `useMapStore`; camera `flyTo` is cinematic (no jump).
- [ ] Zoom-band opacities visibly cross-fade the mock layer across zoom levels.
- [ ] Mode rail pill slides between modes; `1–5` hotkeys work; crossfade smooth.
- [ ] Hover is RAF-throttled (verify ≤ 1 store write/frame in profiler).
- [ ] Single tooltip node confirmed in DOM during rapid hover sweep.
- [ ] Idle drift engages after inactivity, cancels on input, off under reduced-motion.
- [ ] Theme toggle + live clock + ⌘K stub all functional.
- [ ] Sustained 60fps on pan/zoom/mode-switch (profiler capture attached).
