# FPS · India Agri Intelligence Map

> A geospatial command center for Farm Prosperity Solutions.
> Not a dashboard. An operational intelligence surface.

This folder is the **complete implementation plan** for the next-generation
admin map. Read the three foundation documents first, then execute the phase
files in order. No code ships before Phase 0 is approved.

---

## 1. What we are building

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

## 2. Why it matters (product thinking)

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

## 3. The 24 deliverables → where they live

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

## 4. Document map

**Foundations (read first):**
- [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — visual tokens, glassmorphism, motion physics, theming, interaction laws.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Next.js app structure, render engine choice, component tree, Zustand stores, folder layout, PostGIS + GeoJSON + vector-tile strategy.
- [`TECH-DECISIONS.md`](./TECH-DECISIONS.md) — the "why this stack" record, with rejected alternatives.

**Phases (execute in order):**
| Phase | Title | Outcome |
|---|---|---|
| 0 | [Foundations & Scaffolding](./PHASE-0-FOUNDATIONS.md) | Deps, route, env, theme tokens, empty map shell renders. |
| 1 | [Map Core & Basemap](./PHASE-1-MAP-CORE.md) | India basemap, deck.gl overlay, camera system, glass chrome. |
| 2 | [Data Pipeline & PostGIS](./PHASE-2-DATA-PIPELINE.md) | Aggregation API, GeoJSON/tile endpoints, spatial indexes, hooks. |
| 3 | [Visualization Modes](./PHASE-3-VISUALIZATION-MODES.md) | Heatmap, cluster, pin, choropleth, flow layers + tooltips. |
| 4 | [Premium Filter System](./PHASE-4-FILTER-SYSTEM.md) | Floating command rail, crop chips, command palette, live recompute. |
| 5 | [Analytics Panels](./PHASE-5-ANALYTICS-PANELS.md) | Region drill-down, animated counters, charts, trends. |
| 6 | [Timeline Playback](./PHASE-6-TIMELINE-PLAYBACK.md) | Scrubber, play/pause, temporal animation of activity. |
| 7 | [Motion & Interaction Polish](./PHASE-7-MOTION-POLISH.md) | Spring physics, parallax, magnetic hover, cinematic transitions. |
| 8 | [Performance, Mobile & Scale](./PHASE-8-PERFORMANCE-SCALE.md) | Web workers, tiling, viewport querying, mobile adaptation, load plan. |

## 5. UX strategy in one screen

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

## 6. Status & ownership

- **Status:** Planning. No code written yet (per request).
- **Surface:** `admin-portal/` (Next.js 16). New route group `(map)`.
- **Backend:** new `geo` Django app + read-only aggregation endpoints; no changes to existing module write paths.
- **Branch:** build on a feature branch off `main` once Phase 0 is approved.
```
