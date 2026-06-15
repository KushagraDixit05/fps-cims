# Phase 7 — Motion & Interaction Polish

> **Goal:** the cinematic finishing pass. Spring physics everywhere, parallax
> depth, magnetic hover refinement, custom shaders for hotspot breathe and flow
> animation, staggered orchestration, and the "first open" reveal sequence.
> Deliverables 23 (animation implementation) + the §5/§6 polish of the design system.
>
> **Exit demo:** opening the map plays a 1.2s cinematic reveal. Everything
> responds with physical weight. The map feels *expensive*.

---

## 7.1 Tasks

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

## 7.2 First-open reveal sequence (the moment that sells it)

A scripted ~1.2s sequence on first mount (once per session):

```
t=0.0s  void → vignette fades in, logo bloom at center
t=0.2s  basemap fades up from black (opacity + slight scale 1.04→1.0)
t=0.4s  camera eases from zoom 3.4 → 4.2 (gentle "descent into India")
t=0.5s  heat layer ramps 0 → full, hotspots ignite in a staggered ripple
t=0.7s  TopBar slides down, ModeRail slides in from left (stagger)
t=0.9s  FilterRail chips stagger in
t=1.2s  live-pulse dot starts breathing; idle systems arm
```

```ts
// hooks/useIntroSequence.ts — orchestrates via framer timeline + camera tokens
// Honors prefers-reduced-motion (collapses to a 200ms fade) and
// sessionStorage flag (don't replay on client nav back to /map).
```

The heat "ignite ripple": hotspots fade in ordered by distance from screen
center, `staggerChildren`-style but driven on the GPU via a per-cell delay
attribute.

---

## 7.3 Hotspot breathe shader

Upgrade the Phase 3 CPU breathe to a GPU uniform via a deck `LayerExtension`:

```ts
// a small shader injection: radius *= 1 + 0.04 * sin(uTime + aPhase)
class BreatheExtension extends LayerExtension {
  getShaders() { return { inject: { 'vs:#decl': 'uniform float uTime;',
    'vs:DECKGL_FILTER_SIZE': 'size *= 1.0 + 0.04 * sin(uTime + instancePhase);' } }; }
  draw(ctx) { ctx.uniforms.uTime = performance.now() / 1000; }
}
```

Zero per-frame JS work, perfectly smooth, disabled under reduced-motion/low-power.

---

## 7.4 Animated flows

Swap `ArcLayer` for `TripsLayer` in flow mode so directional dashes travel along
arcs, synced to either a free-running clock or the timeline cursor (Phase 6).
Trail length and speed scale with flow weight → busy corridors *pulse* faster.

---

## 7.5 Parallax depth

Subtle pointer-driven parallax separates the glass chrome from the map plane:

```ts
// useParallax.ts — translate chrome layers by ≤ 6px against pointer, depth-scaled
// TopBar depth 0.3, rails 0.5, tooltip 0.8 — closer = more motion.
// transform-only, SPRING.cinema, disabled on touch + reduced-motion.
```

Gives the HUD a sense of floating *above* the world without distracting. Capped
tiny so it reads as depth, not wobble.

---

## 7.6 Marker hover physics

- **Magnetic attraction** (Phase 4 §4.6) refined: easing curve tuned, release
  springs back, never overshoots into neighbors.
- **Pickable bump:** hovered marker scales 1.12 via a transitioned `getSize`;
  a soft ring pulse emanates once on hover-enter.
- **Sibling spotlight:** non-hovered markers ease to 0.4 opacity over 150ms; on
  leave they ease back — the Bloomberg focus effect, now buttery.

---

## 7.7 Selection choreography

On select:
1. Map flies the feature into the left two-thirds (avoids the incoming panel).
2. Selected feature gets a persistent halo / extrude.
3. Panel springs in (Phase 5) with staggered sections.
4. Other features dim to 0.5 until deselect.

On deselect (Escape / click-away / close): reverse order, dim restores, halo
fades, camera holds (doesn't yank back) — respecting the user's place.

---

## 7.8 Orchestration audit

Pass over every animated surface to ensure:
- Consistent spring tokens (no ad-hoc durations).
- Entrances stagger, exits are quicker than entrances (feels responsive).
- No two animations fighting the same property.
- `layout` animations use `layoutId` where elements morph (mode pill, chips).
- Everything interruptible — re-triggering mid-animation springs from current
  value, never restarts.

---

## 7.9 Reduced-motion & low-power

```ts
// lib/motion.ts
export const motionProfile = () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';
  if (navigator.hardwareConcurrency <= 4 || lowPowerHint()) return 'lite';
  return 'full';
};
```

- **reduced:** springs → 120ms fades, no parallax/breathe/idle-drift, discrete timeline.
- **lite:** keep springs, drop breathe shader + parallax + grain, cap heat radius.
- **full:** everything.

A dev overlay (`?motion=reduced|lite|full`) forces a profile for QA.

---

## 7.10 Acceptance criteria

- [ ] First-open reveal plays once/session, ~1.2s, honors reduced-motion, doesn't replay on nav.
- [ ] Hotspot breathe runs on GPU with zero per-frame JS; off in reduced/lite.
- [ ] Flow dashes travel directionally; speed scales with weight; sync to timeline.
- [ ] Parallax reads as depth (≤6px), disabled on touch/reduced-motion.
- [ ] Magnetic + bump + spotlight hover all spring naturally, no overshoot/strobe.
- [ ] Selection choreography sequences correctly; deselect reverses cleanly.
- [ ] All motion uses shared tokens; animations are interruptible.
- [ ] Three motion profiles verified; `?motion=` override works.
- [ ] Still 60fps with all effects on (reference machine, profiler capture).
