# Farm Prosperity Solutions (FPS)

**An offline-first field-operations platform for agricultural field executives.**

Field executives travel village-to-village logging farmer visits, crop-health
observations, mandi (market) arrival data, and product-demonstration visits — often
outdoors, in direct sunlight, with unreliable or absent connectivity. FPS records
everything locally first and syncs automatically when the network returns, so **nothing
is ever lost, online or off**. Upstream, regional managers and analysts consume the data
through a web admin portal.

- **Repo:** `https://github.com/KushagraDixit05/fps-cims`
- **Branch:** `main` · **Mobile app:** v1.4 · **Backend:** live on Render

---

## Architecture

FPS is three subprojects in one repo:

| Subproject | Path | Stack | Role |
|---|---|---|---|
| **Backend API** | `backend/` | Django 6.0 + DRF, PostgreSQL 15 + PostGIS, SimpleJWT | REST API, auth, data store, CSV export |
| **Mobile app** | `mobile/FarmProsperity/` | React Native 0.85 (New Arch), TypeScript, WatermelonDB | Offline-first field data capture |
| **Admin portal** | `admin-portal/` | Next.js 16, Tailwind, shadcn/ui, TanStack Query, Recharts | Web dashboard, analytics, field-data review |

**Auth:** JWT (access 12h, refresh 30d, rotation enabled).
**Offline store:** WatermelonDB (SQLite), schema **v8**, additive migrations only.
**Media:** Cloudinary in production, local files in dev.

---

## Feature modules

| Module | Status | Notes |
|---|---|---|
| **Crop Monitoring** | ✅ Done | 3-step wizard → `FarmerVisit` / `CropRecord` / `VisitPhoto` |
| **Mandi Arrivals** | ✅ Done | 5-step wizard; market-arrival intelligence |
| **Product Demo** | ✅ Done | 4-step wizard; before/after split + multi-variety |
| **Offline Sync (Phase 3)** | ✅ Done | Local-first writes, auto-sync on reconnect, sync dashboard |
| **Admin Portal** | ✅ Done | Dashboard, Analytics, Users, Field Data (Visits/Mandi/Demos) + CSV export |
| **UI Redesign (Phase 4)** | 🔄 In progress | Design system, new auth flow, drawer nav (`screens-v2`, active) |
| **RBAC** | 🧪 On branch | Engine on `feature/rbac-implementation`; admin UI pages on `main` |
| **Agri Intelligence Map** | 🧪 On branch | Geospatial command-center on `feature/agri-intelligence-map` |

---

## Quick start

See **[docs/SETUP.md](docs/SETUP.md)** for the full local-dev guide (Docker, Python 3.12,
Node.js, Android Studio). In short:

```bash
# Backend
cd backend && docker compose up -d           # PostgreSQL + PostGIS
python manage.py migrate && python manage.py seed_crop_master
python manage.py runserver

# Mobile
cd mobile/FarmProsperity && npm install && npm run android

# Admin portal
cd admin-portal && npm install && npm run dev   # http://localhost:3000
```

Live backend: `https://fps-cims-backend.onrender.com` (Django admin at `/admin`).

---

## Documentation

All project docs live in **[docs/](docs/)** — start at **[docs/README.md](docs/README.md)** for the index.

- **[docs/CONTEXT.md](docs/CONTEXT.md)** — full project context; paste at the start of a new session.
- **[docs/SETUP.md](docs/SETUP.md)** — local development setup.
- **[docs/progress-report.md](docs/progress-report.md)** — current status across all layers.
- **[docs/design/](docs/design/)** — product vision, design system, UI/UX requirements.
- **[docs/rbac/](docs/rbac/)** — RBAC architecture (12 docs).
- **[docs/PRODUCTION_AUDIT.md](docs/PRODUCTION_AUDIT.md)** — production-readiness audit.
