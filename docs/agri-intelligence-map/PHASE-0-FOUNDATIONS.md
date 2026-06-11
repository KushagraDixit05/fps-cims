# Phase 0 — Foundations & Scaffolding

> **Goal:** every dependency installed, the route exists, the theme tokens are
> live, and a *single empty glass-framed map shell renders fullscreen* — no data
> yet. This phase de-risks the stack before any feature work.
>
> **Exit demo:** open `/map`, see a dark vignetted India basemap with a floating
> glass top bar and a placeholder mode rail. 60fps pan/zoom. Theme toggle works.

---

## 0.1 Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Add frontend deps (ADR-02/03, ARCHITECTURE §9) | `admin-portal/package.json` |
| 2 | Create `(map)` route group + dynamic client island | `app/(map)/...` |
| 3 | Declare map theme tokens + glass utilities | `app/(map)/map-theme.css` |
| 4 | Author MapLibre dark style | `features/map/canvas/basemap/style.dark.json` |
| 5 | Render `MapCanvas` shell (MapLibre + deck overlay, no layers) | `features/map/canvas/MapCanvas.tsx` |
| 6 | Glass `TopBar` + placeholder `ModeRail` | `features/map/chrome/*` |
| 7 | Permission gate `analytics.map.view` + sidebar link | `usePermissions`, `Sidebar.tsx` |
| 8 | Scaffold empty `geo` Django app (no endpoints yet) | `backend/geo/*` |
| 9 | Env vars + style asset hosting | `.env`, `next.config.ts` |

---

## 0.2 Install dependencies

```bash
cd admin-portal
npm i maplibre-gl @deck.gl/core @deck.gl/react @deck.gl/layers \
      @deck.gl/aggregation-layers @deck.gl/geo-layers @deck.gl/mapbox \
      supercluster @turf/bbox @turf/centroid @turf/boolean-point-in-polygon cmdk
npm i -D @types/supercluster
```

> framer-motion, recharts, zustand, @tanstack/react-query, next-themes,
> lucide-react are already present — do not re-add.

---

## 0.3 Route group & client island

```tsx
// src/app/(map)/map/page.tsx   (server component — thin)
import dynamic from 'next/dynamic';
const MapWorkspace = dynamic(
  () => import('@/features/map/MapWorkspace'),
  { ssr: false, loading: () => null }   // real skeleton lives in loading.tsx
);
export const metadata = { title: 'Intelligence Map · FPS' };
export default function MapPage() {
  return <MapWorkspace />;
}
```

```tsx
// src/app/(map)/layout.tsx
import './map-theme.css';
import { AuthGuard } from '@/components/layout/AuthGuard';
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="map-root fixed inset-0 overflow-hidden">{children}</div>
    </AuthGuard>
  );
}
```

```tsx
// src/app/(map)/map/loading.tsx — cinematic skeleton (logo bloom + shimmer)
export default function Loading() {
  return (
    <div className="map-root fixed inset-0 grid place-items-center">
      <div className="animate-pulse text-[var(--accent)] tracking-widest text-sm">
        INITIALIZING INTELLIGENCE MAP…
      </div>
    </div>
  );
}
```

---

## 0.4 Theme tokens & glass utilities

Create `app/(map)/map-theme.css` containing **all** tokens from
`DESIGN-SYSTEM.md` §2 + §4 (dark default + light override), plus:

```css
.map-root {
  position: relative;
  background: var(--map-bg-0);
  color: var(--text-hi);
  font-family: var(--font-display);
}
/* film grain + vignette over the void (DESIGN-SYSTEM §7) */
.map-root::after {
  content:""; position:absolute; inset:0; pointer-events:none; z-index:50;
  background:
    radial-gradient(120% 120% at 50% 40%, transparent 55%, var(--map-bg-0) 100%);
  mix-blend-mode: normal;
}
.glass   { /* recipe from DESIGN-SYSTEM §4 */ }
.glass-2 { background: var(--glass-fill-2); }
.hairline{ box-shadow: inset 0 0 0 1px var(--glass-stroke); }
```

Wire `next-themes` with `attribute="data-map-theme"` and `defaultTheme="dark"`
in `MapThemeProvider`.

---

## 0.5 MapLibre dark style

Author `style.dark.json` (MapLibre style spec). Minimal, no external tiles for
the basemap fills — India land/water from our own `india-states.json`:

- `background` layer → `--map-bg-1`.
- `fill` layer from a `geojson` source (states) → land color, subtle.
- `line` layer → faint state borders (`--map-grid`).
- No labels at this phase (added with data later).

> Keeping the basemap as our own GeoJSON (not a tile provider) means **no API
> keys, fully offline-capable, and total color control** — the obsidian look is
> guaranteed. A raster/vector provider can be layered later if terrain is wanted.

---

## 0.6 MapCanvas shell

```tsx
// features/map/canvas/MapCanvas.tsx  (no data layers in Phase 0)
'use client';
import { useState, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';     // or maplibre-gl directly
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useControl } from 'react-map-gl/maplibre';
import styleDark from './basemap/style.dark.json';

const INDIA_VIEW = { longitude: 80.9, latitude: 22.6, zoom: 4.2, pitch: 0, bearing: 0 };

function DeckOverlay(props: { layers: unknown[] }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true, ...props }));
  overlay.setProps(props);
  return null;
}

export function MapCanvas() {
  const [view, setView] = useState(INDIA_VIEW);
  const onMove = useCallback((e: any) => setView(e.viewState), []);
  return (
    <Map
      initialViewState={INDIA_VIEW}
      mapStyle={styleDark as any}
      onMove={onMove}
      attributionControl={false}
      reuseMaps
    >
      <DeckOverlay layers={[]} />
    </Map>
  );
}
```

> In later phases `view` and `layers` come from `useMapStore` + `useDeckLayers`.
> Phase 0 keeps it local to prove the render path.

---

## 0.7 Chrome shell (visual only)

```tsx
// features/map/chrome/TopBar.tsx
export function TopBar() {
  return (
    <header className="glass hairline absolute top-4 left-4 right-4 z-40
                       flex items-center gap-4 px-4 h-14">
      <span className="text-[var(--accent)] font-semibold tracking-tight">FPS Intelligence</span>
      <button className="ml-auto glass-2 px-3 h-9 rounded-[12px] text-[var(--text-mid)]">⌘K</button>
      {/* theme toggle, live clock added here */}
    </header>
  );
}
```

`ModeRail` renders the 5 mode buttons as a static glass column (no behavior yet)
to validate layout, blur stacking, and the hairline look against the live map.

```tsx
// features/map/MapWorkspace.tsx (Phase 0 composition)
export default function MapWorkspace() {
  return (
    <>
      <MapCanvas />
      <TopBar />
      <ModeRail />   {/* static */}
    </>
  );
}
```

---

## 0.8 Permission gate & navigation

- Add RBAC permission key `analytics.map.view` to the preset roles that should
  see it (Admin, Regional Manager) via the existing RBAC seed.
- In `MapWorkspace`, short-circuit to a "no access" glass card if
  `usePermissions().can('analytics.map.view')` is false.
- Add a sidebar entry "Intelligence Map" (lucide `Map` icon) in `Sidebar.tsx`
  linking to `/map`, guarded by the same permission.

---

## 0.9 Backend scaffold (no endpoints)

```python
# backend/geo/apps.py
from django.apps import AppConfig
class GeoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'geo'
```

- Register `geo` in `INSTALLED_APPS`.
- Create empty `views.py`, `urls.py` (router stub), `aggregation.py`,
  `filters.py`. Endpoints land in Phase 2.
- No models yet (it reads existing ones); the `Mandi.location` migration is
  Phase 2.

---

## 0.10 Env & config

```bash
# admin-portal/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
# (no map provider key needed — self-hosted style)
```

`next.config.ts`: ensure `maplibre-gl` CSS is imported once
(`import 'maplibre-gl/dist/maplibre-gl.css'` in `map-theme.css` or layout), and
that the `(map)` route is excluded from any global `AppShell` wrapper.

---

## 0.11 Acceptance criteria

- [ ] `/map` renders fullscreen, dark, vignetted, no sidebar/topbar from dashboard.
- [ ] India basemap visible; pan/zoom at 60fps; no console errors.
- [ ] deck overlay mounts (empty) and is confirmed interleaved (no second canvas).
- [ ] Glass TopBar + ModeRail float over map with correct blur/hairline in both themes.
- [ ] Theme toggle switches dark/light, persists across reload.
- [ ] Permission gate blocks users without `analytics.map.view`.
- [ ] `geo` app boots; `python manage.py check` clean.
- [ ] Bundle delta recorded (baseline for Phase 8 budget).

**Do not proceed to Phase 1 until every box is checked and demoed.**
