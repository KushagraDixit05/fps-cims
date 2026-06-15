# Design System — Visual, Motion & Interaction

> Deliverables 3, 4, 5, 15, 21. The single source of truth for how the map
> looks, moves, and responds. Every component in the phase files consumes the
> tokens defined here.

---

## 1. Design principles

1. **Obsidian canvas, bioluminescent data.** The basemap recedes into near-black; data is the only thing that glows. Contrast = attention.
2. **Glass over map, never card around map.** Chrome floats. The map is the world; panels are heads-up displays.
3. **Depth through light, not borders.** We separate layers with blur, shadow, and a 1px luminous hairline — almost never a hard box.
4. **Motion is physics, not decoration.** Springs and eased camera moves. No linear fades, no bounce-for-bounce's-sake.
5. **One accent does the talking.** FPS green is the system voice. Crops, conditions, and modules get their own hues, but green frames the experience.
6. **Calm at rest, alive on intent.** Idle = subtle ambient drift. Hover/focus = immediate, tactile response.

---

## 2. Color system

### 2.1 Base (dark / command-center default)

```css
/* admin-portal/src/app/(map)/map-theme.css  — :root[data-map-theme="dark"] */
--map-bg-0:        #05080A;  /* deepest — page void */
--map-bg-1:        #0A0F0D;  /* basemap land */
--map-bg-2:        #0E1512;  /* raised surfaces */
--map-water:       #070C12;  /* sea / out-of-country */
--map-grid:        rgba(120, 200, 150, 0.05); /* faint graticule */

/* Glass */
--glass-fill:      rgba(12, 20, 16, 0.55);
--glass-fill-2:    rgba(16, 26, 21, 0.72);   /* denser panels */
--glass-stroke:    rgba(140, 220, 170, 0.14); /* luminous hairline */
--glass-stroke-2:  rgba(140, 220, 170, 0.28); /* hover hairline */
--glass-blur:      22px;
--glass-shadow:    0 18px 60px -20px rgba(0,0,0,0.75);

/* Brand voice (extends existing --color-fps-primary #1a4a2e) */
--accent:          #34E08A;  /* FPS green, raised for dark bg */
--accent-soft:     #22C55E;
--accent-glow:     rgba(52, 224, 138, 0.55);
--accent-dim:      rgba(52, 224, 138, 0.12);
--accent-teal:     #2DD4BF;  /* secondary / links */

/* Text */
--text-hi:         #EAF4EE;  /* headlines */
--text-mid:        #9DB3A6;  /* labels */
--text-lo:         #5E7268;  /* captions, axis */
--text-on-accent:  #04120A;
```

### 2.2 Light / "daylight ops" theme

Same token *names*, remapped. Light is a first-class theme, not an afterthought —
it reuses the existing portal identity (`--color-fps-canvas #f8f6f1`,
`--color-fps-primary #1a4a2e`) so the map feels native when an exec toggles.

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
  /* data hues stay identical so muscle memory survives the toggle */
}
```

Theme is driven by `next-themes` (already a dependency) with `attribute="data-map-theme"`, persisted, and defaulting to `dark`. Heatmap color ramps swap; data category hues stay constant across themes.

### 2.3 Data hues (constant across themes)

```ts
// admin-portal/src/lib/map/palette.ts
export const CROP_COLORS = {
  Chilli:  '#FF4D4D', // also matches 'Chili' legacy spelling
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
  crop_visit:   '#34E08A', // FarmerVisit / CropRecord
  mandi:        '#FBBF24', // MandiArrival
  product_demo: '#22D3EE', // ProductDemo
} as const;

// Heatmap ramps (low → high density), dark theme
export const HEAT_RAMP_DARK = [
  [0.00, 'rgba(4,18,10,0)'],
  [0.15, 'rgba(20,83,45,0.55)'],
  [0.40, 'rgba(34,197,94,0.75)'],
  [0.65, 'rgba(132,225,138,0.88)'],
  [0.85, 'rgba(234,244,238,0.95)'],
  [1.00, 'rgba(255,255,255,1)'],
] as const;
```

### 2.4 Color usage rules

- **Glow is earned by magnitude.** Bloom intensity maps to value, never applied flat.
- **Never two saturated hues adjacent without a glass/ink gutter.**
- **Condition poor (`#FB6A6A`) is the only red** — reserve it for alarm so it stays meaningful.
- Color-blind safety: condition encoding is *always* paired with icon/position, never color alone.

---

## 3. Typography

```css
--font-display: "Inter", ui-sans-serif, system-ui;   /* already loaded */
--font-mono:    "Geist Mono", ui-monospace;            /* numerics, coords */

/* Scale (fluid, clamp-based) */
--t-hero:   clamp(22px, 2.2vw, 30px);  /* panel titles */  600
--t-h2:     18px / 600
--t-body:   14px / 450
--t-label:  12px / 500  letter-spacing: 0.02em  uppercase
--t-caption:11px / 500  --text-lo
--t-metric: clamp(28px, 3vw, 44px) / 650  --font-mono  tabular-nums
```

- All metric/coordinate/count text uses `font-variant-numeric: tabular-nums` so animated counters don't jitter width.
- Labels (`--t-label`) are uppercase, tracked, `--text-mid` — the Palantir tell.

---

## 4. Spacing, radius, elevation

```css
--space: 4px;            /* base unit; use multiples (8/12/16/20/24) */
--r-chip:   999px;
--r-panel:  18px;
--r-card:   14px;
--r-control:12px;

/* Elevation = blur + shadow + hairline, never a flat border */
--elev-1: var(--glass-shadow), inset 0 0 0 1px var(--glass-stroke);
--elev-2: 0 28px 80px -24px rgba(0,0,0,0.85), inset 0 0 0 1px var(--glass-stroke-2);
```

### Glass surface recipe (the core look)

```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border-radius: var(--r-panel);
  box-shadow: var(--elev-1);
  /* top-edge sheen */
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

> **Performance note:** `backdrop-filter` is GPU-cheap on a handful of panels but
> expensive if stacked. Cap to ≤ 4 simultaneous blurred surfaces; the map canvas
> itself never sits behind a blur (Phase 8).

---

## 5. Motion design system

### 5.1 Spring & easing tokens

```ts
// admin-portal/src/lib/map/motion.ts  (framer-motion 12 is installed)
export const SPRING = {
  // tactile UI (chips, toggles, hover)
  tactile:  { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 },
  // panels entering / leaving
  panel:    { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  // big layout / mode switches
  cinema:   { type: 'spring', stiffness: 170, damping: 26, mass: 1.1 },
  // numbers / counters
  counter:  { type: 'spring', stiffness: 90,  damping: 20 },
} as const;

export const EASE = {
  out:    [0.16, 1, 0.3, 1],   // standard exit/settle
  inOut:  [0.65, 0, 0.35, 1],
  swift:  [0.4, 0, 0, 1],
} as const;

// Camera (deck.gl / maplibre) uses its own easing — see §5.3
export const CAMERA = {
  flyDuration: 1400,           // ms, India→state
  flyCurve: 1.42,              // FlyToInterpolator speed curve
  easeStep: 650,               // ms, zoom nudge
} as const;
```

### 5.2 Motion patterns

| Pattern | Where | Spec |
|---|---|---|
| **Staggered reveal** | Filter chips, KPI cards | `staggerChildren: 0.04`, child `y: 8→0, opacity 0→1`, `SPRING.tactile` |
| **Glass slide-in** | Left rail, right panel | from `x: ±24, opacity 0`, `SPRING.panel` |
| **Mode crossfade** | Switching viz layers | outgoing layer opacity→0 over 400ms while incoming ramps 0→target; data interpolated, never popped |
| **Count-up** | Metrics | `useSpring` on number, `SPRING.counter`, formatted with `Intl.NumberFormat` |
| **Magnetic hover** | Markers, chips | pointer attraction within 60px radius, translate ≤ 6px toward cursor, `SPRING.tactile` |
| **Heat breathe** | Idle hotspots | radius ±4% sine, 6s loop, GPU shader uniform (Phase 7) |
| **Camera fly** | Region select / search | `FlyToInterpolator` with `CAMERA` tokens; pitch eases 0→35° on deep zoom |

### 5.3 Camera choreography (the "zoom is a story" law)

```
zoom < 5.0   →  HEAT macro     pitch 0°   states glow by density
5.0–6.5      →  STATE→DISTRICT clusters fade in, heat dims to 40%
6.5–8.5      →  DISTRICT       choropleth fills + cluster bubbles
8.5–10.5     →  VILLAGE        clusters spider, condition dots appear
> 10.5       →  RECORD         exact pins, pitch eases to 35°, labels on
```

Transitions between bands are **opacity-interpolated over zoom**, computed in a
single `useMemo` from `viewState.zoom` so there is never a hard layer swap.

### 5.4 Reduced motion

`prefers-reduced-motion: reduce` → springs collapse to 120ms eased opacity,
camera uses `LinearInterpolator` with no pitch, heat-breathe disabled. One guard
in `motion.ts` returns the reduced token set.

---

## 6. Interaction design

### 6.1 Interaction inventory

| Surface | Rest | Hover | Active / Selected |
|---|---|---|---|
| Crop chip | dim hue ring, `--text-mid` | hue ring brightens, lift `y:-2`, magnetic | filled hue, inner glow, check icon morphs in |
| Mode toggle | icon `--text-mid` | icon `--accent`, hairline brightens | pill slides under active (shared `layoutId`) |
| Marker / cluster | base glow | scale 1.12, tooltip after 120ms, ring pulse | locks tooltip, dims siblings to 0.4 |
| District polygon | fill by value | stroke `--accent`, fill +12% lum | extrudes 1.5px, opens analytics panel |
| Timeline scrubber | thin track | thumb grows, time bubble | drag scrubs data live, map re-renders per frame (throttled) |

### 6.2 Interaction laws

1. **120ms intent delay** before tooltips, so a sweep across markers doesn't strobe.
2. **Hover dims the rest.** Focusing one element drops siblings to 0.4 opacity — the Bloomberg "spotlight."
3. **Selection is sticky, hover is transient.** Click locks state + panel; moving away keeps it.
4. **Escape & click-away** always dismiss the top-most transient layer, never the whole view.
5. **Pointer + keyboard parity.** Every map action has a `⌘K` palette equivalent (Phase 4). Arrow keys nudge camera; `+/-` zoom; `1–5` switch modes.
6. **Inertia respected.** Map pan/zoom uses native deck.gl inertia; chrome scroll uses momentum; nothing fights the user's flick.

### 6.3 Tooltip system (spec; built in Phase 3)

- Glass card, `--r-card`, max-width 280px, follows cursor with 8px offset and `SPRING.tactile` lag.
- Auto-flips to stay in viewport; arrow omitted (floating HUD, not a callout).
- Content is **typed per layer** (`HeatTip`, `ClusterTip`, `RecordTip`, `DistrictTip`, `FlowTip`) — see Phase 3 §tooltips.
- Renders in a single portal (`#map-tooltip-root`), one instance reused across all hovers — never N tooltip nodes.

---

## 7. Iconography & texture

- **Icons:** `lucide-react` (installed), 1.5px stroke, sized 16/18/20. Custom map glyphs (mandi, demo, crop) as inline SVG with `currentColor`.
- **Noise:** a 2% film-grain `::after` overlay on the page void kills banding in the dark gradient. Single tiled PNG, `mix-blend-mode: overlay`.
- **Vignette:** radial `--map-bg-0` at corners → transparent center, focuses the eye and hides tile edges.

---

## 8. Component design tokens → Tailwind v4

Tailwind v4 `@theme` already drives the portal. Map tokens extend it in a scoped
layer so they never leak into existing pages:

```css
/* app/(map)/map-theme.css */
@layer map {
  .map-root { /* all --map-* / --glass-* / --accent vars declared here */ }
}
```

Components use the vars directly (`bg-[var(--glass-fill)]`) or via small utility
classes (`.glass`, `.glass-2`, `.hairline`). No new Tailwind config plugin needed.

---

## 9. Accessibility & quality bar

- Contrast ≥ 4.5:1 for `--text-hi` on glass; ≥ 3:1 for labels. Verified per theme.
- Focus-visible ring (`--accent`, 2px, 2px offset) on every interactive element.
- All map controls reachable by keyboard; map has an off-screen data-table fallback (Phase 8) for screen readers and "show me the numbers" execs.
- Target frame budget: **60fps interaction, 30fps minimum during timeline playback** on a 2021 MacBook Air. Measured, not assumed (Phase 8).
