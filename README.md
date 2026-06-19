# Farm Prosperity Solutions (FPS)

**An offline-first field-operations platform for agricultural field executives.**

![Django](https://img.shields.io/badge/Django-6.0-092E20?style=flat&logo=django&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?style=flat&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)
![Deployed on Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=flat&logo=render&logoColor=black)

---

## Overview

Field executives at agri-input companies travel village-to-village logging farmer visits, crop-health observations, mandi (market) arrival data, and product-demonstration outcomes — often outdoors, in direct sunlight, with unreliable or absent connectivity. **FPS records everything locally first and syncs automatically when the network returns**, so no data is ever lost regardless of network conditions.

Upstream, regional managers and analysts consume the synced data through a web admin portal with analytics dashboards, field-data review tools, and CSV exports. The entire platform is deployed on Render and ships a production APK (v1.4) distributed to active testers.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌─────────────────────────┐
│   Mobile App            │        │   Backend API             │        │   Admin Portal          │
│   React Native 0.85     │◄──────►│   Django 6.0 + DRF        │◄──────►│   Next.js 16            │
│   TypeScript            │  sync  │   SimpleJWT               │  REST  │   Tailwind + shadcn/ui  │
│                         │        │                           │        │                         │
│  WatermelonDB (SQLite)  │        │  PostgreSQL 15 + PostGIS  │        │  TanStack Query         │
│  offline-first writes   │        │  Cloudinary (media)       │        │  Recharts               │
└─────────────────────────┘        └──────────────────────────┘        └─────────────────────────┘
```

| Subproject | Path | Stack | Role |
|---|---|---|---|
| **Backend API** | `backend/` | Django 6.0, DRF, PostgreSQL 15 + PostGIS, SimpleJWT, Gunicorn | REST API, JWT auth, data store, Cloudinary media, CSV export |
| **Mobile App** | `mobile/FarmProsperity/` | React Native 0.85 (New Arch), TypeScript, WatermelonDB v8 | Offline-first field data capture & sync |
| **Admin Portal** | `admin-portal/` | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query, Recharts | Web dashboard, analytics, user management, field-data review |

**Auth:** JWT with 12h access tokens, 30d refresh tokens, and rotation enabled.  
**Offline store:** WatermelonDB (SQLite), schema v8, additive-only migrations.  
**Media:** Cloudinary in production, local filesystem in development.

---

## Feature Modules

### Shipped

| Module | Status | Details |
|---|---|---|
| **Crop Monitoring** | ✅ Done | 3-step wizard — `FarmerVisit` + `CropRecord` + `VisitPhoto`; full offline support |
| **Mandi Arrivals** | ✅ Done | 5-step wizard — market arrival intelligence with YoY comparison |
| **Product Demo** | ✅ Done | 4-step wizard — before/after photo split + multi-variety support |
| **Offline Sync** | ✅ Done | WatermelonDB local-first writes; auto-sync on reconnect; sync dashboard |
| **Admin Portal** | ✅ Done | Dashboard, analytics, users, field-data review (visits / mandi / demos), CSV export |
| **Authentication** | ✅ Done | Self-registration (locked to `field_executive` role), JWT, offline session restore |

### In Progress / Planned

| Module | Status | Branch | Details |
|---|---|---|---|
| **UI Redesign (Phase 4)** | 🔄 Active | `main` | New design system, auth flow v2, drawer nav — screens-v2 active; remaining screens in progress |
| **RBAC** | 🧪 Feature branch | `feature/rbac-implementation` | Full permission engine (ABAC-lite), 6 preset roles, maker-checker approval workflow, 12-doc architecture |
| **Agri Intelligence Map** | 🧪 Feature branch | `feature/agri-intelligence-map` | Geospatial command-center (MapLibre + deck.gl), PostGIS backend, India-only geographic confinement |

---

## Tech Stack

### Backend (`backend/`)

| Technology | Version | Purpose |
|---|---|---|
| Django | 6.0 | Web framework |
| Django REST Framework | 3.17 | REST serializers & views |
| djangorestframework-simplejwt | 5.5 | JWT authentication |
| PostgreSQL | 15 | Primary database |
| PostGIS | — | Geospatial extension |
| Gunicorn | 23.0 | WSGI production server |
| Cloudinary | 1.41 | Media storage (production) |
| WhiteNoise | 6.9 | Static file serving |
| django-cors-headers | 4.9 | CORS policy |
| psycopg2 | 2.9 | PostgreSQL driver |

### Mobile (`mobile/FarmProsperity/`)

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.85 | Cross-platform mobile (New Architecture) |
| TypeScript | 5.8 | Type safety |
| WatermelonDB | 0.28 | Offline-first SQLite database |
| React Navigation | 7.x | Stack, drawer, tab navigation |
| Axios | 1.16 | HTTP client |
| react-hook-form | 7.76 | Multi-step form management |
| react-native-image-picker | 8.2 | Camera & gallery access |
| @react-native-community/netinfo | — | Network connectivity detection |
| Lucide React Native | 1.17 | Icon library |

### Admin Portal (`admin-portal/`)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | React framework with SSR |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui + Radix UI | — | Accessible component library |
| TanStack Query | 5.x | Server state & caching |
| TanStack Table | 8.x | Data table primitives |
| Recharts | 3.8 | Charts and analytics visualizations |
| Zustand | 5.0 | Client-side state management |
| Framer Motion | 12.x | Animations |
| next-themes | 0.4 | Light/dark mode |

---

## Project Structure

```
fps/
├── backend/                    # Django REST API
│   ├── accounts/               # Custom User model, JWT auth
│   ├── crops/                  # Farmer visits, crop records, photos
│   ├── mandi/                  # Market master data & arrivals
│   ├── product_demo/           # Product demo visits & photos
│   ├── farmers/                # Farmer profiles
│   ├── geo/                    # Geospatial (PostGIS)
│   ├── audit/                  # Audit trail
│   ├── workflow/               # Approval workflow
│   ├── admin_portal/           # Field data & analytics APIs
│   ├── Dockerfile              # Production container
│   ├── docker-compose.yml      # Local PostgreSQL + PostGIS
│   └── requirements.txt
│
├── mobile/FarmProsperity/      # React Native app
│   └── src/
│       ├── api/                # Axios client + per-module API functions
│       ├── database/           # WatermelonDB schema, migrations, operations
│       ├── sync/               # Sync engine, auto-sync hooks, reference seeder
│       ├── screens/            # v1 production screens
│       ├── screens-v2/         # v2 redesigned screens (active)
│       ├── navigation/         # AppNavigatorV2 (current)
│       ├── components/         # Shared UI components
│       └── types/ utils/       # Type definitions, helpers, colors
│
├── admin-portal/               # Next.js web dashboard
│   └── src/app/
│       ├── (dashboard)/        # Protected pages (analytics, users, field-data, roles)
│       ├── login/              # Auth page
│       └── map/                # Agri Intelligence Map (feature branch)
│
├── docs/                       # Full documentation suite
│   ├── CONTEXT.md              # Session context — paste at start of new Claude session
│   ├── SETUP.md                # Local dev setup guide
│   ├── progress-report.md      # Current status across all layers
│   ├── design/                 # Product vision, design system, UI/UX specs
│   ├── rbac/                   # RBAC architecture (12 docs)
│   └── PRODUCTION_AUDIT.md     # Pre-rollout security & reliability audit
│
├── render.yaml                 # Render deployment blueprint (Docker)
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.12+, Docker & Docker Compose
- Node.js 20+, npm
- Android Studio + Android SDK (for mobile development)

### Backend

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env: set SECRET_KEY, and optionally CLOUDINARY_URL

# Start PostgreSQL + PostGIS
docker compose up -d

# Run migrations and seed crop master data
python manage.py migrate
python manage.py seed_crop_master

# Start development server
python manage.py runserver
# API available at http://localhost:8000
```

### Mobile App

```bash
cd mobile/FarmProsperity

npm install

# For Android (start emulator or connect device first)
npm run android
```

The app points to `localhost:8000` in debug builds and `https://fps-cims-backend.onrender.com` in release builds.

### Admin Portal

```bash
cd admin-portal

npm install
npm run dev
# Dashboard at http://localhost:3000
```

---

## Environment Variables

The backend reads from a `.env` file (see `backend/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key — use a long random string in production |
| `DEBUG` | No | `True` for dev, `False` in production |
| `ALLOWED_HOSTS` | Yes (prod) | Comma-separated hostnames |
| `DATABASE_URL` | Yes (prod) | Full PostgreSQL connection string (Render sets this automatically) |
| `DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT` | Dev only | Local PostgreSQL credentials |
| `CLOUDINARY_URL` | Yes (prod) | Cloudinary connection URL for media storage |
| `CORS_ALLOWED_ORIGINS` | Yes (prod) | Comma-separated frontend origins |

---

## Deployment

FPS uses a **Render deployment blueprint** (`render.yaml`) targeting the Singapore region:

- **Runtime:** Docker (`backend/Dockerfile`)
- **On boot:** runs `migrate`, `collectstatic`, and `seed_crop_master` before Gunicorn starts
- **Database:** PostgreSQL 15 with PostGIS extension (`CREATE EXTENSION postgis` required on first provision)
- **Media:** Cloudinary (set `CLOUDINARY_URL` in Render environment)
- **Secrets:** Set `SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_URL`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` in the Render dashboard — never commit these

**Live URLs:**
- API base: `https://fps-cims-backend.onrender.com`
- Django admin: `https://fps-cims-backend.onrender.com/admin`

---

## Roadmap

| Version | Status | Scope |
|---|---|---|
| **v1.0 – v1.4** | ✅ Shipped | Core field-data modules (crop, mandi, demo), offline sync engine, admin portal, production hardening |
| **v1.5** | 🔄 In progress | Phase 4 UI redesign — new design system, redesigned auth flow and all module screens |
| **v2.0** | 🧪 Planned | Full RBAC engine — 6 preset roles, ABAC-lite permissions in JWT, maker-checker approval workflow |
| **v2.1** | 🧪 Planned | Agri Intelligence geospatial map — district/village heat maps, crop coverage overlays (MapLibre + deck.gl) |

---

## Documentation

All project docs live in **[docs/](docs/)** — start at **[docs/README.md](docs/README.md)**.

| Doc | Description |
|---|---|
| [docs/CONTEXT.md](docs/CONTEXT.md) | Full project context — paste at the start of a new Claude Code session |
| [docs/SETUP.md](docs/SETUP.md) | Local development setup (Docker, Android Studio, env vars) |
| [docs/progress-report.md](docs/progress-report.md) | Current status across all three layers |
| [docs/PRODUCTION_AUDIT.md](docs/PRODUCTION_AUDIT.md) | Pre-rollout security and reliability audit findings |
| [docs/TESTING_INSTRUCTIONS.md](docs/TESTING_INSTRUCTIONS.md) | Offline-sync test cases |
| [docs/design/](docs/design/) | Product vision, design system tokens, UI/UX Phase 4 requirements |
| [docs/rbac/](docs/rbac/) | RBAC architecture — 12-doc deep dive |

---

*Built for the last mile of Indian agriculture.*
