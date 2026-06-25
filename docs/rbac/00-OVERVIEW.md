# FPS RBAC & Admin Management System — Architecture Overview

**Version:** 1.0  
**Date:** 2026-06-07  
**Audience:** Engineering leads, backend architects, mobile engineers  

---

## 1. Why This Exists

The current FPS system has a single `role` CharField on the User model with three values: `field_executive`, `admin`, `viewer`. This is a seed — not an architecture.

As FPS scales to multiple states, regional teams, verification workflows, and eventually SaaS, we need:

- Fine-grained, composable permissions (not role strings)
- Maker-checker approval pipelines with audit trails
- Region-scoped data visibility
- A dedicated admin portal (not just Django Admin)
- Offline-compatible permission delivery to mobile clients
- Permission revocation that propagates to devices

This document is the top-level architecture overview. Detailed implementation lives in numbered sibling documents.

> **Status (2026-06-25):** This document describes the **target architecture**. Most of it is **not yet built**. See §1a below and the status banners on each sibling doc; the authoritative status matrix lives in `11-IMPLEMENTATION-PHASES.md`.

---

## 1a. Implementation Status (2026-06-25)

Audited against the active `feature/RBAC` branch (→ `main`). The unmerged `feature/rbac-implementation` branch is experimental/obsolete and is **not** counted.

**What exists today is essentially the "seed, not architecture" starting point this plan set out to replace**, plus a largely-complete admin UI:

- **Roles/permissions:** Phase 1 complete — `Role`/`Permission`/`RolePermission`/`UserPermission`/`Region`/`UserRegion`/`DeviceRegistration`/`RefreshTokenBlacklist` tables all exist and are seeded (48 permissions, 7 roles, 5 regions). `User.primary_role` is a real FK to `accounts_role`. Authorization **logic** is still coarse (`IsStaffUser` + per-view owner-filtered querysets) — that is Phase 2.
- **JWT:** carries `role`/`is_staff`/`is_superuser`, **not** a `perms` claim. Mobile reads role for display only.
- **Approval workflow:** only `approval_status`/`approved_at` fields exist; no engine, no maker-checker, no APIs.
- **Audit:** **synthesized on read** from submission tables — no persistent, immutable audit log.
- **Infrastructure:** **Phase 0 complete** — Redis (docker-compose), a Celery app (`fps_backend/celery.py`), `django-simple-history`, and the JWT `token_blacklist` app are now wired in. Nothing yet *consumes* them (no cache layer or async tasks until Phases 2–4), but the broker + worker boot cleanly.
- **Admin portal (Next.js 16):** largely built. Users, Analytics, and (pseudo-)Audit are wired to real APIs. **Roles, Permissions, and Approvals pages are orphaned** — they call `/api/admin/roles|permissions|approvals`, which do not exist on this branch.

**Net:** Phase 0 and Phase 1 (DB schema) are complete. The next priority is building the backend RBAC engine (permission engine → approval workflow → admin APIs) to match the existing UI.

---

## 2. System Architecture Diagram

> ⚠️ **Target architecture.** The Permission Engine, Approval Engine, Audit Engine, and Redis cache shown below are **not yet implemented** (see §1a).

```
┌─────────────────────────────────────────────────────────────────┐
│                        FPS Platform                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  Mobile App  │    │   Admin Portal   │    │  Django API  │  │
│  │ (React Native│    │  (Next.js Web)   │    │   Backend    │  │
│  │ WatermelonDB)│    │                  │    │              │  │
│  └──────┬───────┘    └────────┬─────────┘    └──────┬───────┘  │
│         │                    │                      │          │
│         │  JWT + Permissions │  JWT (admin scope)   │          │
│         └────────────────────┴──────────────────────┘          │
│                                      │                         │
│                         ┌────────────▼────────────┐            │
│                         │     Permission Engine    │            │
│                         │  (Django + Redis cache)  │            │
│                         └────────────┬─────────────┘           │
│                                      │                         │
│         ┌─────────────┬──────────────┼──────────────┐          │
│         ▼             ▼              ▼               ▼          │
│  ┌─────────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────┐    │
│  │  PostgreSQL  │ │  Redis  │ │ Approval     │ │ Audit    │    │
│  │  + PostGIS   │ │  Cache  │ │ Engine       │ │ Engine   │    │
│  └─────────────┘ └─────────┘ └──────────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Design Principles

### 3.1 Attribute-Based Permission Model (ABAC-lite)

Pure RBAC breaks down when you need "FE can edit own entries but not others" or "Regional Head sees only Nanded district data." We use a hybrid:

- **Roles** define a baseline permission bundle
- **User-level overrides** extend or restrict those defaults
- **Attribute conditions** (owns record, in region, in reporting chain) gate data access

This is sometimes called ReBAC (Relationship-Based Access Control) at the data layer.

### 3.2 Permission Evaluation Order

```
1. Is the user active? → No → 403
2. Is the endpoint admin-only? → Is user admin/superadmin? → No → 403
3. Does the user's role have the required permission?
4. Does the user have a personal DENY override? → Yes → 403
5. Does the user have a personal ALLOW override? → Yes → 200
6. Role permission = final answer
```

### 3.3 Offline-First Compatibility

Permissions are embedded into the JWT access token as a compact claims object. The mobile app reads permissions from the token without a network call. When the token expires (recommended: 8h for field use), a refresh is required — this is the sync window where permission changes propagate.

For permission revocations that must be immediate (e.g., user terminated), the refresh token is blacklisted server-side. The next sync attempt fails, forcing re-login.

### 3.4 Defence-in-Depth

Permissions are enforced at three layers:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Mobile UI | Navigation guards, hidden buttons | UX — prevent confusion |
| API middleware | DRF permission classes | Primary enforcement |
| DB queries | Filtered querysets per user | Defence against API bypass |

---

## 4. Document Index

| File | Contents | Status (2026-06-25) |
|------|----------|---------------------|
| `01-DATABASE-SCHEMA.md` | All tables, fields, indexes, relationships | ✅ Built (Phase 1 complete) |
| `02-PERMISSION-ENGINE.md` | How permissions are stored, resolved, cached | 🔄 Done differently — coarse role/owner gating |
| `03-PRESET-ROLES.md` | Recommended roles with full permission sets | ✅ Built (Phase 1 — 7 roles seeded with permission matrix) |
| `04-BACKEND-ARCHITECTURE.md` | Django apps, DRF classes, middleware, services | 🟡 Partial — `accounts`/`admin_portal` real; `workflow`/`audit` empty |
| `05-APPROVAL-WORKFLOW.md` | Maker-checker lifecycle, state machine, engine | 🟡 Partial — status fields only, no engine |
| `06-ADMIN-PANEL.md` | Admin portal pages, flows, API strategy, stack | 🟡 Mostly built — roles/perms/approvals orphaned |
| `07-MOBILE-INTEGRATION.md` | Permission sync, navigation guards, offline handling | ⛔ Not started (RBAC) — uses AsyncStorage, not WatermelonDB |
| `08-AUDIT-SYSTEM.md` | Audit tables, immutable logs, compliance | 🔄 Done differently — synthesized pseudo-audit |
| `09-SECURITY.md` | JWT strategy, token management, attack mitigations | 🟡 Partial — JWT/refresh real; aud-scope/blacklist/CSP absent |
| `10-SCALABILITY.md` | Query optimization, caching, async processing | ⛔ Not started — no Redis/Celery/partitioning |
| `11-IMPLEMENTATION-PHASES.md` | Step-by-step delivery plan **+ authoritative status matrix** | — (source of truth) |

---

## 5. Key Technology Decisions

> **Adoption status (2026-06-25)** is annotated inline below. Several planned libraries were **never adopted**.

### Backend
- **Django + DRF** — ✅ adopted (existing, extended in place).
- **`django-guardian`** — ⛔ not adopted (not installed).
- **Redis** — ✅ adopted (Phase 0): docker-compose service + Celery broker. Django cache layer still pending (Phase 2).
- **Celery** — ✅ adopted (Phase 0): app bootstrapped in `fps_backend/celery.py`, worker boots against Redis. No tasks dispatched yet (Phases 3–4).
- **`django-simple-history`** — ✅ adopted (Phase 0): app registered. `HistoricalRecords` on models still pending (Phase 4).

### Admin Portal
- **Next.js 15** — 🔄 adopted as **Next.js 16** (SSR/App Router).
- **Separate authentication scope** (`aud: fps-admin`) — ⛔ not adopted; the portal reuses the standard user JWT via a coarse `IsStaffUser` check.
- **Deployed internally** — planned; no Docker/Nginx config yet.

### Mobile
- **Permission claims in JWT** — ⛔ not adopted; JWT carries `role` only, consumed for display.
- **WatermelonDB** — 🔄 deviation: the app uses **AsyncStorage** for auth/cache (no WatermelonDB in the audited code).
- **React Navigation guards** — ⛔ not adopted; navigation is binary logged-in/out.

### Rationale for NOT using django.contrib.auth permissions directly

Django's built-in permission system is model-scoped and binary. It cannot express:
- "can edit own entries but not others"
- "can view analytics for Nanded but not Pune"
- "module-level access gating"

We will define our own permission codenames and resolution engine, and optionally map them to Django's system for Django Admin compatibility.

---

## 6. Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Stale permissions on offline device | High | Medium | 8h JWT expiry + revocation blacklist |
| Permission cache inconsistency | Medium | High | Cache invalidation on every permission write |
| Approval queue growth under high volume | Medium | Medium | Async processing + pagination |
| Admin portal XSS/auth bypass | Low | Critical | Separate auth scope, CSP headers |
| Maker-checker deadlock (no approver available) | Medium | Medium | Escalation path + admin override |
| Schema migration on live data | Low | High | Additive-only migrations, feature flags |
