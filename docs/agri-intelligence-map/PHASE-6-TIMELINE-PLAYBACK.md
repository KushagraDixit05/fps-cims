# Phase 6 — Timeline Playback System

> **Goal:** a cinematic temporal dimension. A glass timeline dock at the bottom
> lets the admin scrub and play activity over time — heat blooms and fades, pins
> appear, flows travel — turning the map into a story of the season. Deliverable 20.
>
> **Exit demo:** press play → watch Chilli activity sweep across districts week by
> week; scrub to any date and the map reflects that instant; speed control 0.5–4×.

---

## 6.1 Tasks

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

## 6.2 Timeline store

```ts
// store/useTimelineStore.ts
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

The `[from, to]` bounds come from `useFilterStore` (`dateFrom/dateTo`) — the date
range *is* the timeline domain. Single source of truth (Phase 4 §4.5).

---

## 6.3 Playback clock

```ts
// hooks/usePlaybackClock.ts
export function usePlaybackClock() {
  const { playing, speed, cursor, setCursorRaw, span } = useTimelineSelectors();
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const step = 7 * 864e5;                    // advance ~1 week per second at 1×
    const tick = (now: number) => {
      const dt = now - last; last = now;
      let next = cursor.current + (dt / 1000) * step * speed;
      if (next > span) next = 0;               // loop
      setCursorRaw(next);                       // ref write; commit to store throttled
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, span]);
}
```

Cursor advances on a ref each frame; the store commit is **throttled to ~20Hz**
so React/layer updates stay cheap while the visual stays smooth (the layer reads
the ref-backed time uniform every frame).

---

## 6.4 Time-windowed layers (no refetch)

Data for the full range is already loaded (Phase 2). Playback **filters in place**
via deck accessors + `updateTriggers` on the cursor — zero network during play:

```ts
// inside layer factories when timeline.enabled
const t = timeline.cursorMs;
const win = timeline.windowMs;
new HeatmapLayer({
  ...,
  getWeight: (d) => withinWindow(d.t, t, win) ? d.w * fade(d.t, t, win) : 0,
  updateTriggers: { getWeight: [tBucket(t)] },   // bucket to ~20Hz to limit GPU re-agg
});
```

- `fade()` ramps a point's contribution up as it enters the trailing window and
  down as it ages out → heat *blooms and decays* like a live feed.
- Pins use opacity fade; flows upgrade to `TripsLayer` so dashes travel along arcs
  in sync with the clock.
- Bucketing the trigger to the histogram resolution prevents per-frame GPU
  re-aggregation (perf).

> Requires points/aggregates to carry a timestamp. Phase 2 endpoints include `t`
> (epoch ms) per cell/point for exactly this. Macro hex cells carry a per-bucket
> weight series when `timeline=1` is requested.

---

## 6.5 Timeline dock UI

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▶  ┃▁▂▃▅▇█▆▄▃▂▁▂▄▆█▇▅▃▂  (activity histogram track)         ◷ 18 Mar 2026 │
│    └────────●───────────────────────────────────────┘   0.5× 1× 2× 4×  ⟳  │
│      1 Jan                                      30 Jun 2026                 │
└──────────────────────────────────────────────────────────────────────────┘
```

```tsx
// chrome/TimelineDock.tsx (lazy)
export default function TimelineDock() {
  const hist = useTimelineHistogram();          // /api/geo/timeline/?bucket=day
  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING.panel}
      className="glass-2 hairline absolute bottom-4 left-4 right-4 z-40 h-20 rounded-[18px] flex items-center gap-4 px-4">
      <PlayButton />
      <HistogramTrack data={hist} />     {/* bars colored by dominant crop, cursor scrubber over it */}
      <TimeReadout />                    {/* font-mono, current date, springs on change */}
      <SpeedControl />                   {/* 0.5/1/2/4× segmented */}
      <LoopToggle />
    </motion.div>
  );
}
```

- **Histogram track** doubles as the date-range picker shape used in Phase 4 §4.5
  — same component, same data.
- **Scrub:** drag the thumb → `setCursor`, pauses play, map updates live
  (throttled). Bars under the cursor brighten.
- **Time readout** in `--font-mono`, IST, springs when it changes.
- Bars colored by dominant crop per bucket → you *see* seasonality before pressing play.

---

## 6.6 Timeline endpoint

```python
# GET /api/geo/timeline/?bucket=day → activity per bucket, RBAC + filter scoped
SELECT date_trunc(%(bucket)s, submitted_at) AS t,
       COUNT(*) AS activity,
       mode() WITHIN GROUP (ORDER BY cr.crop_name) AS top_crop
FROM crops_farmervisit fv JOIN crops_croprecord cr ON cr.visit_id = fv.id
WHERE fv.approval_status='approved' AND <filters> AND <scope>
GROUP BY 1 ORDER BY 1;
```

Returns `{ t, activity, topCrop }[]` for the histogram. Cached 60s, keyed by
filter — same `queryKey` family.

---

## 6.7 Acceptance criteria

- [ ] Play sweeps activity over the date range; heat blooms and decays smoothly.
- [ ] Scrubbing updates the map live to any instant; play pauses on scrub.
- [ ] Speed 0.5–4× and loop work; no network requests fire during playback.
- [ ] Histogram track shows real per-bucket activity, colored by dominant crop.
- [ ] Time readout is tabular/mono and springs on change.
- [ ] Timeline domain follows the filter date range (single source of truth).
- [ ] ≥ 30fps during playback on the reference machine; cursor commit throttled.
- [ ] Reduced-motion: playback steps discretely per bucket instead of continuous.
