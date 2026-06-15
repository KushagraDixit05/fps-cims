# Phase 4 — Premium Filter System

> **Goal:** the filter experience itself becomes a product. No HTML selects.
> Floating glass rail, animated crop chips, expandable advanced sections, a ⌘K
> command palette, and instant live recompute that re-heats the map. Deliverable 16.
>
> **Exit demo:** toggle Chilli + Soybean chips → heat recalculates with a smooth
> recolor. Open ⌘K, type "Khargone" → camera flies there and scopes data. Set a
> date range → everything updates without a blank frame.

---

## 4.1 Tasks

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

## 4.2 Filter store (complete)

```ts
// store/useFilterStore.ts
const last90 = () => ({ from: isoDaysAgo(90), to: isoToday() });

export const useFilterStore = create<FilterState>((set, get) => ({
  crops: [], modules: ['crop_visit', 'mandi', 'product_demo'],
  condition: [], dateFrom: last90().from, dateTo: last90().to,
  district: undefined, block: undefined, village: undefined,
  executiveId: undefined, productName: undefined,

  toggleCrop: (c) => set((s) => ({
    crops: s.crops.includes(c) ? s.crops.filter(x => x !== c) : [...s.crops, c],
  })),
  toggleModule: (m) => set((s) => ({ /* same pattern */ })),
  setRegion: (patch) => set(patch),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  reset: () => set({ crops: [], condition: [], district: undefined, ...last90Mapped() }),

  toParams: () => {
    const s = get();
    return clean({ crops: s.crops.join(','), modules: s.modules.join(','),
      district: s.district, block: s.block, condition: s.condition.join(','),
      executive: s.executiveId, product: s.productName,
      date_from: s.dateFrom, date_to: s.dateTo });
  },
  queryKey: () => {
    const s = get();
    return [s.crops, s.modules, s.condition, s.district, s.block, s.village,
            s.executiveId, s.productName, s.dateFrom, s.dateTo];
  },
}));
```

Every data hook keys off `queryKey()` (Phase 2 §2.10). One mutation → map, panel,
timeline all recompute in lockstep. `keepPreviousData` guarantees no blank frame.

---

## 4.3 Crop chips (the signature filter)

```tsx
// chrome/CropChips.tsx
const CROPS = ['Chilli', 'Cotton', 'Soybean', 'Wheat', 'Onion'];   // + dynamic from CropMaster

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
          <motion.button key={c} layout
            variants={{ hide: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={SPRING.tactile}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
            onClick={() => toggle(c)}
            data-magnetic                                  // §4.6 magnetic hover
            className="relative px-3.5 h-9 rounded-full text-sm flex items-center gap-2"
            style={{
              color: on ? 'var(--text-on-accent)' : 'var(--text-mid)',
              background: on ? hue : 'transparent',
              boxShadow: on
                ? `0 0 0 1px ${hue}, 0 0 22px -4px ${hue}`   // glowing active state
                : `inset 0 0 0 1px ${hue}55`,
            }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? 'var(--text-on-accent)' : hue }} />
            {c}
            <AnimatePresence>
              {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check size={14} /></motion.span>}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
```

Behavior: instant toggle → store → heat recolors via deck `getFillColor`/ramp
transition (animated recalculation, not a reload). Multiple selected → additive
heat blending (Phase 3 §3.2). Active chip glows in its crop hue.

> Crop list is seeded from the static array but **hydrated from `CropMaster`** via a
> lightweight `/api/crops/masters/` call so new crops appear automatically.

---

## 4.4 Advanced filters — expandable sections

`FilterRail` is a left glass column with collapsible `FilterSection`s:

```
CROPS            (chips, always open)
─────────────────
MODULES          [Crop] [Mandi] [Demo]   (segmented multi-toggle)
CONDITION        [Good] [Average] [Poor] (pills, only relevant to crop module)
GEOGRAPHY        State ▸ District ▸ Block ▸ Village  (cascading, typeahead)
EXECUTIVE        searchable combobox (submitted_by / executive)
PRODUCT          searchable combobox (ProductMaster)
DATE RANGE       presets + custom (§4.5)
```

```tsx
// chrome/FilterSection.tsx — animated expand/collapse with height spring
<motion.section layout className="glass-2 hairline rounded-[14px] overflow-hidden">
  <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 h-11">
    <span className="text-[11px] tracking-wider uppercase text-[var(--text-mid)]">{title}</span>
    <ChevronDown className={cn('transition-transform', open && 'rotate-180')} size={14} />
  </button>
  <AnimatePresence initial={false}>
    {open && <motion.div key="b" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={SPRING.panel}>
      <div className="px-3.5 pb-3.5">{children}</div>
    </motion.div>}
  </AnimatePresence>
</motion.section>
```

Geography cascade: selecting a State filters District options (from
`District`/`Block`/`VillageMaster` masters via a cached `/api/geo/regions/`
tree), each level a typeahead combobox — no native selects anywhere.

---

## 4.5 Date range

- **Presets:** Today, 7d, 30d, 90d, This season, YTD, Custom.
- **Custom:** dual-thumb range on a mini activity sparkline (reuses timeline data,
  Phase 6) so the admin picks dates *against the shape of activity*.
- Changing range updates `dateFrom/To` → global recompute. Also drives the
  timeline dock window (Phase 6) — single source of truth.

---

## 4.6 Magnetic hover (shared utility)

```ts
// lib/magnetic.ts — attach to [data-magnetic] elements
// within 60px, translate ≤6px toward cursor via SPRING.tactile; release on leave.
useMagnetic({ radius: 60, max: 6 });   // pointermove on a rAF, transform only (GPU)
```

Applied to chips, mode buttons, and markers. Pure transform, compositor-only, no
layout — safe for 60fps.

---

## 4.7 Command palette (⌘K)

```tsx
// chrome/CommandPalette.tsx (cmdk)
<Command.Dialog open={open} onOpenChange={setOpen} className="glass-2 …">
  <Command.Input placeholder="Search region, crop, executive, or action…" />
  <Command.List>
    <Command.Group heading="Regions">
      {regions.map(r => <Command.Item onSelect={() => { camera.toRegion(r); filter.setRegion(r); }}>
        {r.name}<Badge>{r.level}</Badge></Command.Item>)}
    </Command.Group>
    <Command.Group heading="Crops">…toggleCrop…</Command.Group>
    <Command.Group heading="Executives">…scope to executive…</Command.Group>
    <Command.Group heading="Actions">
      <Command.Item onSelect={() => setMode('heat')}>Switch to Heatmap</Command.Item>
      <Command.Item onSelect={resetFilters}>Clear all filters</Command.Item>
      <Command.Item onSelect={togglePlayback}>Play timeline</Command.Item>
      <Command.Item onSelect={exportView}>Export current view (PNG)</Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

Every map capability has a palette equivalent (interaction law §6.2). Opens on
`⌘K`/`Ctrl+K`, fuzzy search, keyboard-only operable, glass styled, spring entrance.

---

## 4.8 Filter summary + clear

A slim glass bar (top, under TopBar) shows active filters as removable chips:
`Chilli ✕  ·  Khargone ✕  ·  Last 30d ✕  ·  Good ✕  →  Clear all`. Each removal
animates out (layout) and recomputes. Gives execs an at-a-glance "what am I
looking at" and one-tap escape.

---

## 4.9 URL sync

```ts
// hooks/useUrlSync.ts — debounced 400ms, two-way
// serialize: mode, crops, district, dateFrom/To, rounded viewState → searchParams
// hydrate on mount from searchParams → stores
```

Shareable deep links (ARCHITECTURE §4.4): paste a URL, land on the exact scoped
view. Powers "share this view" in the palette/panel.

---

## 4.10 Acceptance criteria

- [ ] Zero native `<select>` in the map; all filters are custom glass controls.
- [ ] Crop chips: staggered entrance, glowing active, magnetic hover, instant toggle.
- [ ] Toggling crops recolors the heat smoothly (no reload, no blank frame).
- [ ] Advanced sections expand/collapse with height spring; geography cascade works.
- [ ] Date presets + custom range against activity sparkline functional.
- [ ] ⌘K palette covers regions, crops, executives, and all actions; keyboard-only usable.
- [ ] Filter summary bar reflects state; clear-all resets and recomputes.
- [ ] URL reflects filters + view; pasting a link reproduces the exact view.
- [ ] Changing any filter recomputes map + panel + timeline in lockstep.
