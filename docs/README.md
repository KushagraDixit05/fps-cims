# FPS Documentation Index

Documentation for **Farm Prosperity Solutions**. For a high-level project overview, see
the repo-root [README.md](../README.md). Start here to find a specific doc.

## Overview & status

| Doc | What it covers |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Full project context — tech stack, repo structure, API reference, models, mobile/offline architecture. Paste at the start of a new session. |
| [progress-report.md](progress-report.md) | Current status across backend, mobile, admin portal, and deployment; recent changes; remaining backlog. |

## Setup & testing

| Doc | What it covers |
|---|---|
| [SETUP.md](SETUP.md) | Local development setup — prerequisites, backend, mobile, release APK, troubleshooting. |
| [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md) | Offline-sync test cases and verification steps. |

## Design

| Doc | What it covers |
|---|---|
| [design/PRODUCT.md](design/PRODUCT.md) | Product vision, users, usage context, brand personality, design principles. |
| [design/DESIGN.md](design/DESIGN.md) | Design system — color, typography, elevation, components, do's/don'ts, tokens. |
| [design/requirements.md](design/requirements.md) | UI/UX redesign requirements (Phase 4). |

## Build phases

| Doc | What it covers |
|---|---|
| [PHASE-0-Foundation-Setup.md](PHASE-0-Foundation-Setup.md) | Machine/tooling setup, repo init, Docker, Android SDK. |
| [PHASE-1-Backend-Models-API.md](PHASE-1-Backend-Models-API.md) | Django apps, models, serializers, JWT auth, API. |
| [PHASE-2-Mobile-App-Core.md](PHASE-2-Mobile-App-Core.md) | Navigation, screens, form patterns. |
| [PHASE-3-Offline-Sync.md](PHASE-3-Offline-Sync.md) | WatermelonDB offline-first store, sync engine, migrations. |

## Agri Intelligence Map

| Doc | What it covers |
|---|---|
| [agri-intelligence-map/FULL-SPEC.md](agri-intelligence-map/FULL-SPEC.md) | Complete spec — architecture, layers, API design, PostGIS queries, frontend components, deployment. Merged to `main` on 19 June 2026. |

## RBAC (feature/RBAC)

The [rbac/](rbac/) folder holds the 12-doc RBAC architecture (overview, database schema,
permission engine, preset roles, backend, approval workflow, admin panel, mobile
integration, audit, security, scalability, implementation phases).

**Current status (26 June 2026):**
- **Phase 0** ✅ — Redis, Celery, `django-simple-history`, `token_blacklist` wired
- **Phase 1** ✅ — DB schema complete and applied; 7 roles / 48 permissions / 5 regions / 3 workflows seeded; all migrations `[X]`
- **Phase 2** ⛔ — Permission engine (`PermissionService`, ABAC resolution, `perms` JWT claim) — **next up**
- **Phases 3–5** ⛔ — Approval workflow engine, Audit engine, Admin APIs — not started

The active branch is **`feature/RBAC`**. The `feature/rbac-implementation` branch is **obsolete — do not use it**.
The admin-portal Roles/Permissions/Approvals/Audit pages exist on `main` as frontend but are currently **orphaned** (the backend APIs they call do not yet exist).

## Enhancement Phases (feature roadmap)

The [enhancement-phases/](enhancement-phases/) folder contains the phased implementation plan
for new platform features (future dates, activity feed, farmer identity, crop-wise
market intelligence, editable submissions, master data admin, expanded reports).
Start at [enhancement-phases/README.md](enhancement-phases/README.md) for the full
traceability matrix and dependency graph.

| Phase | What it covers |
|---|---|
| [Phase 0 — Quick Wins](enhancement-phases/PHASE-0-Quick-Wins.md) | Future dates, activity feed, module renaming, share button, step merge, remarks |
| [Phase 1 — Additive Fields](enhancement-phases/PHASE-1-Additive-Fields.md) | Market trend, self source, market insight, before/after GPS |
| [Phase 2 — Farmer Identity](enhancement-phases/PHASE-2-Farmer-Identity-Profiling.md) | Phone-based unique farmer, auto-fill, visit grouping |
| [Phase 3 — Crop-Wise Market Intel](enhancement-phases/PHASE-3-CropWise-Market-Intelligence.md) | Per-crop arrivals, filtered Step 2, crop-wise review |
| [Phase 4 — Editable Submissions](enhancement-phases/PHASE-4-Editable-Submissions-Audit.md) | Time-boxed edits, role-based permissions, audit trail |
| [Phase 5 — Master Data & Reports](enhancement-phases/PHASE-5-Master-Data-Reports.md) | Admin CRUD for master data, analytics dashboard |

## Production

| Doc | What it covers |
|---|---|
| [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) | Pre-rollout reliability/security audit — critical fixes, deferred findings, readiness. |

## Archive

[archive/](archive/) holds incomplete historical planning drafts, superseded by the
implemented modules and the phase docs above. See [archive/README.md](archive/README.md).
