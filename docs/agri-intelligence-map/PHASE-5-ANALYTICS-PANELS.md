# Phase 5 — Analytics Panels

> **Goal:** when a region or record is selected, a floating glass insight panel
> slides in with animated counters, crop distribution, trends, mandi activity, and
> top executives — premium charts, microinteractions, growth indicators.
> Deliverable 19.
>
> **Exit demo:** click a district → panel springs in from the right; numbers
> count up; a crop-split donut draws; a 90-day trend sparkline animates; a Δ%
> badge shows growth vs the previous period.

---

## 5.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | `InsightPanel` shell (lazy, slide-in, contextual) | `chrome/InsightPanel.tsx` |
| 2 | `useRegionSummary` hook → `/region/.../summary/` | `hooks/useRegionSummary.ts` |
| 3 | `MetricCounter` (spring count-up, tabular) | `chrome/MetricCounter.tsx` |
| 4 | `CropDistribution` donut/bars | `chrome/CropDistribution.tsx` |
| 5 | `TrendSparkline` + `DeltaBadge` | `chrome/TrendSparkline.tsx` |
| 6 | `ConditionBar` (good/avg/poor stacked) | `chrome/ConditionBar.tsx` |
| 7 | `ExecutiveList` (top performers) | `chrome/ExecutiveList.tsx` |
| 8 | Record panel variant (single submission) | `chrome/RecordPanel.tsx` |
| 9 | Panel actions (share, export, drill) | within panel |

---

## 5.2 Panel shell

```tsx
// chrome/InsightPanel.tsx (lazy-loaded on first selection)
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

- Slides from the right; never covers the selected feature (map auto-pans the
  feature into the left two-thirds on select).
- Header: region/record name, level badge, breadcrumb (State ▸ District ▸ Block),
  close, share-view, export.
- Content staggers in (`staggerChildren: 0.05`) section by section.

---

## 5.3 Region panel content

```tsx
function RegionPanel({ sel }: { sel: Selection }) {
  const { data, isPlaceholderData } = useRegionSummary(sel);   // keepPreviousData
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

`isPlaceholderData` → render at 0.6 opacity with a subtle shimmer while the new
region loads, so switching regions never flashes empty.

---

## 5.4 Animated counter

```tsx
// chrome/MetricCounter.tsx
export function MetricCounter({ label, value, unit, delta, text }: Props) {
  const mv = useSpring(0, SPRING.counter);
  const shown = useTransform(mv, (v) => Math.round(v).toLocaleString('en-IN'));
  useEffect(() => { if (value != null) mv.set(value); }, [value]);
  return (
    <div className="glass hairline rounded-[14px] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-mid)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        {text ? <span className="text-xl font-semibold">{text}</span>
              : <motion.span className="text-[28px] font-semibold tabular-nums font-[var(--font-mono)]">{shown}</motion.span>}
        {unit && <span className="text-xs text-[var(--text-lo)]">{unit}</span>}
        {delta != null && <DeltaBadge value={delta} />}
      </div>
    </div>
  );
}
```

Tabular numerics so width never jitters during count-up (DESIGN-SYSTEM §3).

`DeltaBadge`: ▲ green / ▼ red vs previous equal-length period, with the % and a
tiny directional arrow that springs in.

---

## 5.5 Charts (Recharts + custom)

- **CropDistribution** — Recharts donut, slices colored by `CROP_COLORS`,
  animated `animationBegin` stagger, center shows total + top crop. Hover slice →
  cross-highlights the matching crop heat on the map (panel↔map linking).
- **TrendSparkline** — lightweight area/line (Recharts `AreaChart` or a custom
  SVG path with a `pathLength` draw-on animation), `--accent` gradient fill,
  hover scrubber shows value at date. Marks the selected timeline cursor (Phase 6).
- **ConditionBar** — a single stacked horizontal bar (good/avg/poor) with animated
  segment widths (`SPRING.panel`), labels on hover.

All charts: dark/light theme aware via the same tokens; no chart library default
styling leaks through.

---

## 5.6 Executive list

Top executives by activity in the region: avatar/initials, name, count bar
(animated width), and a sparkline trend. Click → scopes `filter.executiveId` to
that executive (map + panel refocus on their footprint). Ties the map back to the
RBAC people model.

---

## 5.7 Record panel variant

For a single pin selection (`kind:'record'`), `useRecord(id)` →
`/api/geo/record/{id}/`:
- Module-specific layout: Crop visit (farmer, crops table w/ stage+condition,
  photos), Mandi arrival (commodity, qty, min/avg/max rate, source), Product demo
  (product, dose, result, before/after photos).
- Approval status pill (reuses existing `StatusBadge`/approval colors).
- Mini-map locator + "open full record" deep link into the relevant module page.

---

## 5.8 Panel actions

- **Share view** → copies URL (filters+camera+selection, Phase 4 §4.9).
- **Export** → PNG of current map viewport (deck `device.readPixels`/canvas
  toBlob) + a CSV of the region's aggregate. For board decks.
- **Drill** → clicking a sub-region in the crop/exec lists flies + rescopes.

---

## 5.9 Acceptance criteria

- [ ] Selecting a region springs the panel in; map pans feature clear of the panel.
- [ ] Counters spring-count with tabular numerics; no width jitter.
- [ ] Δ% badges compute vs the correct previous period.
- [ ] Donut, sparkline, condition bar all animate in and are theme-aware.
- [ ] Panel↔map linking: hovering a crop slice highlights that crop on the map.
- [ ] Switching regions never flashes empty (placeholder + shimmer).
- [ ] Record panel renders the right layout per module with photos + status.
- [ ] Top-executive click rescopes the whole view to that executive.
- [ ] Share + PNG/CSV export produce correct artifacts.
