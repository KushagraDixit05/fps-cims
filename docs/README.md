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

## RBAC (feature/rbac-implementation)

The [rbac/](rbac/) folder holds the 12-doc RBAC architecture (overview, database schema,
permission engine, preset roles, backend, approval workflow, admin panel, mobile
integration, audit, security, scalability, implementation phases). The backend engine
lives on the `feature/rbac-implementation` branch; the admin-portal Roles/Permissions/
Approvals/Audit pages exist on `main` as frontend.

## Production

| Doc | What it covers |
|---|---|
| [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) | Pre-rollout reliability/security audit — critical fixes, deferred findings, readiness. |

## Archive

[archive/](archive/) holds incomplete historical planning drafts, superseded by the
implemented modules and the phase docs above. See [archive/README.md](archive/README.md).
