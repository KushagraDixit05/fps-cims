# Implementation Phases

Step-by-step delivery plan. Each phase is independently deployable and leaves the system in a working state.

> **This document is the single source of truth for RBAC status.** All other RBAC docs carry a status banner that must agree with the matrix below.

---

## Implementation Status (as of 2026-06-25)

Audited against the active `feature/RBAC` branch (→ `main`). The unmerged `feature/rbac-implementation` branch is experimental/obsolete and is **not** counted.

| Phase | Status | % | Headline |
|-------|--------|---|----------|
| 0 — Prerequisites & Setup | ✅ Done | 100% | Redis (compose) + Celery app + `django-simple-history` + `token_blacklist` wired. `SIMPLE_JWT`: 12h access (deliberate), `BLACKLIST_AFTER_ROTATION=True`. |
| 1 — Database Schema | 🟡 Partial | ~15% | Only `User` field extensions + `approval_status` columns. No Role/Permission/Region/Device/workflow/audit tables. |
| 2 — Permission Engine | 🔄 Done differently | ~10% | Coarse `IsStaffUser` + per-view owner-filtering. JWT carries `role`, not a `perms` claim. No PermissionService/cache. |
| 3 — Approval Workflow | 🟡 Partial | ~10% | `approval_status`/`approved_at` fields only. No engine, no transition APIs, no escalation. `workflow/` app empty. |
| 4 — Audit Engine | 🔄 Done differently | ~15% | Read-time **synthesized** pseudo-audit in `admin_portal`. No `AuditLog` table, no async writes, no immutability. `audit/` app empty. |
| 5 — Admin Portal APIs | 🟡 Partial | ~40% | User-mgmt + analytics + pseudo-audit APIs done. No roles/permissions/regions/approvals APIs. No `aud`-scoped admin auth. |
| 6 — Mobile Integration | ⛔ Not started | ~5% | Base JWT login/refresh only. No perms consumption, gating, approval fields, or queue screen. Uses AsyncStorage (not WatermelonDB). |
| 7 — Admin Portal Frontend | 🟡 Mostly built | ~70% | Next.js 16 portal live. Dashboard/Users/Analytics/Audit wired; **Roles/Permissions/Approvals UIs are orphaned** (call missing endpoints). No region/sync pages, no RBAC route guards. |
| 8 — Hardening & Testing | ⛔ Not started | ~0% | No RBAC test suite, security review, perf testing, or Swagger. |

### Critical cross-cutting deviations
1. **No Role/Permission tables.** The "role" is still the original 3-value CharField (`field_executive`/`admin`/`viewer`) — the "seed, not architecture" starting point this plan set out to replace.
2. **Permissions are coarse role-based, not ABAC-lite.** JWT carries `role`, not `perms`.
3. **Audit is read-time synthesis**, not an append-only engine.
4. **Frontend is ahead of its backend.** The admin portal's Roles, Permissions, and Approvals pages call `/api/admin/roles|permissions|approvals` — endpoints that **do not exist** on this branch. These pages are non-functional against the live API.
5. **Redis/Celery infrastructure now exists (Phase 0 complete)** but nothing yet *uses* it — no Django cache layer is wired (Phase 2) and no async tasks are dispatched (Phases 3–4). The broker + worker boot cleanly; the consumers are still to come.
6. **Frontend assumes 6 roles** (super_admin/admin/regional_head/checker/field_executive/viewer); the backend can only ever issue 3.
7. **Stale build artifacts:** `backend/audit/__pycache__/*.pyc` and `backend/workflow/.../*.pyc` are leftovers from the obsolete branch. Recommend `git clean`-ing them; no source exists for them on this branch.

**Net critical path going forward:** build the backend RBAC engine (Phases 1–5) to match the already-built admin UI, rather than the original "backend-first" ordering.

---

## Phase 0 — Prerequisites & Setup
**Status: ✅ Done — 100% complete (verified 2026-06-25)**
**Duration: 2–3 days**

Before any RBAC code is written, set up the infrastructure that everything depends on.

> **Implementation note:** The Phase 0 libraries were already present in `backend/venv`
> (celery 5.4.0, django-celery-beat 2.7.0, django-simple-history 3.7.0, django-redis 5.4.0,
> redis 5.2.1) but were **never wired into the project** — absent from `requirements.txt`,
> missing from `INSTALLED_APPS`, and there was no `fps_backend/celery.py`. Phase 0 wired
> them in: Redis service in compose, a Celery app bootstrapped in
> `fps_backend/celery.py` (loaded via `fps_backend/__init__.py`), the three apps registered,
> `SIMPLE_JWT` updated, and `requirements.txt` pinned. `manage.py check` is clean; the Celery
> worker boots against Redis and reports `ready`.

### Tasks

- [x] **Add Redis to docker-compose.yml** — `redis:7-alpine` service on `6379` with a
   `fps_redis_data` volume.

- [x] **Add Celery to the project** — `fps_backend/celery.py` (`Celery('fps_backend')`,
   `config_from_object(namespace='CELERY')`, `autodiscover_tasks()`), loaded from
   `fps_backend/__init__.py`. `django_celery_beat` registered with the DatabaseScheduler.

- [x] **Add django-simple-history** — `simple_history` added to `INSTALLED_APPS`
   (models get `HistoricalRecords` + `HistoryRequestMiddleware` in Phase 4).

- [x] **Add rest_framework_simplejwt token blacklist** — `rest_framework_simplejwt.token_blacklist`
   in `INSTALLED_APPS`; blacklist + outstanding-token tables migrated.

- [x] **Configure SIMPLE_JWT settings** — access **12h** (kept deliberately; see deviation
   below), refresh 30d, rotate=True, **`BLACKLIST_AFTER_ROTATION=True`** (real revocation now
   that `token_blacklist` is installed). Existing custom-serializer wiring in
   `fps_backend/urls.py` left untouched.

- [x] **Update requirements.txt** — `celery[redis]==5.4.0`, `django-celery-beat==2.7.0`,
   `django-simple-history==3.7.0`, `django-redis==5.4.0`, `redis==5.2.1` added.

### Deviations
- **Access-token lifetime stays 12h** (this plan recommends 8h). Kept as the established
  project setting by decision; documented here rather than changed.
- **No `CELERY_BEAT_SCHEDULE` entry yet.** The escalation beat task
  (`workflow.tasks.check_approval_escalations`) does not exist until Phase 3, so registering
  the schedule now would break beat. `django_celery_beat` + `DatabaseScheduler` are installed;
  the schedule entry lands in Phase 3.
- **No Django `CACHES`/Redis cache wiring** and **no `HistoryRequestMiddleware`** — both belong
  to later phases (permission cache → Phase 2; model history → Phase 4). Phase 0 only stands up
  the Redis container + Celery broker and registers the apps.

### Deliverable
Docker compose starts cleanly with Redis. Celery worker starts without errors.
*Status: **met** — `docker compose up -d db redis` brings up Redis; `celery -A fps_backend worker`
connects to `redis://127.0.0.1:6379/0` and reports `ready` with no errors; `manage.py check` and
`makemigrations --check` are clean; `token_blacklist` + `django_celery_beat` tables migrated.*

---

## Phase 1 — Database Schema
**Status: 🟡 Partial — ~15% complete**
**Duration: 3–4 days**

Create the new models. No logic yet — just the data structures.

> **Implementation note:** Only the `User` extensions and the per-module `approval_status`/`approved_at` columns landed. The relational core (Role, Permission, UserPermission, Region, Device, workflow, audit tables) was never created on this branch. Critically, `primary_role_id` exists on `User` as a **stub `UUIDField`** that does not point at any `Role` table — the serializer's `get_primary_role()` always returns `None`. The original `role` CharField remains the real role.

### Tasks

- [ ] **Create `accounts/models/role.py`** — `Role`, `RolePermission` — not created.
- [ ] **Create `accounts/models/permission.py`** — `Permission` catalogue — not created.
- [ ] **Create `accounts/models/user_permission.py`** — `UserPermission` — not created.
- [ ] **Create `accounts/models/region.py`** — `Region`, `UserRegion` — not created.
- [~] **Extend `accounts/models/user.py`** — *Partial.* `accounts` still uses a single `models.py` (not a models package). Added via `0003`/`0004`: `employee_id`, `profile_photo`, `state`, `districts` (JSON), `reporting_to` (self-FK), `deactivated_at`/`deactivated_by`, `created_by`, `last_login_device`/`last_login_ip`. **`primary_role` is a stub UUID, not an FK to `Role`.** Old `role` CharField retained as the live role.
- [ ] **Create `workflow/` app models** — `ApprovalWorkflow`, `ApprovalInstance`, `ApprovalAction` — app dir exists but is empty (no `models.py`).
- [ ] **Create `audit/` app** — `AuditLog` — app dir exists but is empty (no `models.py`).
- [ ] **Create `accounts/models/device.py`** — `DeviceRegistration`, `RefreshTokenBlacklist` — not created.
- [~] **Write and run migrations** — only `accounts` (0003/0004) and the `approval_status`/`approved_at` additions on crops/mandi/product_demo exist.
- [ ] **Write data migration** — seed preset `Role` objects and `Permission` catalogue — not done (no tables to seed).
- [ ] **Backfill** — set `primary_role_id` from old `role` CharField — not done.
- [ ] **Add all indexes** as defined in schema doc — not done.
- [ ] **Register all new models in `admin.py`** — no new models to register.

### Deliverable
`python manage.py migrate` runs cleanly. All preset roles and permissions exist in the DB. Existing users have `primary_role_id` set.
*Status: not met — no Role/Permission tables exist.*

---

## Phase 2 — Permission Engine
**Status: 🔄 Done differently — ~10% complete**
**Duration: 3–4 days**

Wire up permission resolution, caching, and JWT embedding.

> **Implementation note:** Authorization exists but in a much simpler form than designed. There is **no** `PermissionService`, ABAC resolution, override layer, or Redis cache. Instead: a single coarse `IsStaffUser` DRF class (`admin_portal/permissions.py`) gates admin endpoints, and each field-data view filters by owner in `get_queryset()` (defence-in-depth at the query layer). The JWT (`accounts/token_serializers.py`, `CustomTokenObtainPairSerializer`) embeds `role`, `is_staff`, `is_superuser`, `email`, `full_name` — **not** a `perms` list.

### Tasks

- [ ] **Create `accounts/services/permission_service.py`** — `PermissionService` — not created.
- [~] **Create `accounts/tokens.py`** — *Done differently.* Equivalent is `accounts/token_serializers.py::CustomTokenObtainPairSerializer`, but it adds `role`/flags, **not** a `perms` claim.
- [x] **Update `accounts/views.py`** — login uses the custom serializer (wired in `fps_backend/urls.py`).
- [~] **Create `accounts/permissions.py`** — *Done differently.* Only `admin_portal/permissions.py::IsStaffUser` exists. No `HasFPSPermission`, `OwnEntryOrCheckerPermission`, or `RegionEnforcedPermission`.
- [ ] **Create `accounts/signals.py`** — cache invalidation — not created (no cache).
- [ ] **Create `accounts/mixins.py`** — `RegionScopedQuerysetMixin` — not created.
- [~] **Add permission checks to existing views** — *Done differently.* `crops`/`mandi`/`product_demo` views use `IsAuthenticated` + owner-scoped `get_queryset()`, not declarative `required_permission`.
- [ ] **Add `AuditContextMiddleware`** — not added.
- [ ] **Test:** JWT with `perms` list; 403 on missing permission — not applicable (no `perms`/permission gating).

### Deliverable
All existing API endpoints are permission-gated. JWT contains `perms` claim. Cache invalidation works on permission changes.
*Status: not met as specified — gating is role/owner-based; no `perms` claim or cache.*

---

## Phase 3 — Approval Workflow Engine
**Status: 🟡 Partial — ~10% complete**
**Duration: 4–5 days**

Build the state machine and approval APIs.

> **Implementation note:** Only the *data shape* exists — an `approval_status` CharField (default `'draft'`) and `approved_at` on each submission model. There is no engine, no `ApprovalInstance`/`ApprovalAction`, no transition endpoints, no signals, and no escalation. Nothing transitions a record out of `draft` via API. The only approval-aware code is the read-only `ApprovalSLAView` analytics endpoint in `admin_portal`. The admin portal frontend's Approvals queue calls `/api/admin/approvals/*`, which **does not exist** (orphaned UI — see Phase 7).

### Tasks

- [ ] **Create `workflow/services/approval_engine.py`** — `ApprovalEngine` — not created (empty app).
- [ ] **Create `workflow/services/escalation_service.py`** — not created.
- [ ] **Create `workflow/tasks.py`** — Celery beat task — not created (no Celery).
- [x] **Add `approval_status` field to `FarmerVisit`, `MandiArrival`, `ProductDemo`** — done (plus `approved_at`).
- [ ] **Create `crops/signals.py`** — auto-create `ApprovalInstance` — not created.
- [ ] **Create approval API endpoints** (`/api/approvals/queue|approve|reject|...`) — none exist.
- [ ] **Add data locking logic** to edit endpoints — not done.
- [ ] **Seed `ApprovalWorkflow` records** — not done (no model).
- [ ] **Configure Celery beat** for escalation — not done.

### Deliverable
Full maker-checker flow works end-to-end via API. FE submits → checker approves/rejects → audit log written. Escalation runs on schedule.
*Status: not met — only status fields exist; no working flow.*

---

## Phase 4 — Audit Engine
**Status: 🔄 Done differently — ~15% complete**
**Duration: 2–3 days**

> **Implementation note:** There is no persistent audit trail. Instead, `admin_portal/views.py::_build_audit_events()` **synthesizes** audit events at read time by scanning the submission tables (`User.date_joined`, `FarmerVisit.submitted_at`, `MandiArrival.created_at`, `ProductDemo.submitted_at`). Consequences: only `create`-type events appear; `actor_ip`, `actor_device`, `changes`, and `request_id` are always empty; nothing is logged for logins, permission changes, approvals, updates, or deletes; and there is no immutability. The `audit/` app is empty.

### Tasks

- [ ] **Create `audit/engine.py`** — `AuditEngine` — not created (empty app).
- [ ] **Create `audit/tasks.py`** — async write task — not created (no Celery).
- [ ] **Create `audit/middleware.py`** — `AuditContextMiddleware` — not created.
- [~] **Instrument all significant actions** — *Done differently / minimal.* Only on-read synthesis of `create` events for user registration and the three submission types. No login/role/permission/approval/update/delete logging.
- [ ] **Add `django-simple-history`** to models — not installed.
- [ ] **Add DB immutability rules** — not done (no audit table).

### Deliverable
Every significant system action writes an audit log entry asynchronously. The audit table is append-only at the DB level.
*Status: not met — audit is synthesized on read, not written or immutable.*

---

## Phase 5 — Admin Portal APIs
**Status: 🟡 Partial — ~40% complete**
**Duration: 4–5 days**

Build the Django backend APIs that the admin portal will call. No frontend yet.

> **Implementation note:** User-management, analytics, and (pseudo-)audit APIs exist and are wired to the live admin portal. The roles, permissions, regions, and approvals APIs were **never built** — yet the frontend for them was (Phase 7), so those pages are orphaned. Admin auth is the coarse `IsStaffUser`, **not** a dedicated `aud: fps-admin`-scoped login. See `admin_portal/urls.py` for the live endpoint list.

### Tasks

- [x] **Create `admin_portal/` app** — exists.
- [~] **Create `admin_portal/permissions.py`** — *Done differently.* Has `IsStaffUser` only; no `IsAdminPortalUser`/`IsSuperAdmin`.
- [ ] **Add admin login endpoint** (`/api/admin/auth/login/` with `aud: fps-admin`) — not built; portal reuses the standard `/api/auth/login/`.
- [~] **Admin user management APIs** — *Mostly done.* `users/`, `users/create/`, `users/<id>/`, `deactivate/`, `reactivate/`, `force-logout/` exist. **`force-logout` is a no-op stub** (no token blacklist); **`reset-password/` not implemented.**
- [ ] **Admin role management APIs** (`/api/admin/roles/...`) — **not built.** Frontend calls these → 404.
- [ ] **Admin permission management APIs** (`/api/admin/permissions/`, `/api/admin/user-permissions/`) — **not built.** Frontend calls these → 404.
- [ ] **Admin region management APIs** — not built.
- [ ] **Admin approval management APIs** (`/api/admin/approvals/...`) — **not built.** Frontend calls these → 404. Only the read-only `analytics/approval-sla/` exists.
- [~] **Audit log APIs** — *Done differently.* `audit/` and `audit/export/` exist but serve **synthesized** events (see Phase 4).
- [x] **Analytics APIs** — done, and broader than planned: `productivity/`, `approval-sla/`, `summary/`, `crop-intelligence/`, `market-intelligence/`, `product-performance/`, `recent-activities/`, `executive-performance/`. (`/api/admin/sync/` not built.)

### Deliverable
All admin APIs working, tested via Postman/Django tests. Swagger/OpenAPI docs generated.
*Status: partially met — user/analytics/pseudo-audit live; roles/permissions/regions/approvals absent; no Swagger.*

---

## Phase 6 — Mobile App Integration
**Status: ⛔ Not started (RBAC) — ~5% complete**
**Duration: 3–4 days**

Update the React Native app to use permissions.

> **Implementation note:** The mobile app has solid JWT auth — login, token refresh, and offline-first session restore (`src/store/authStore.tsx`, `src/api/client.ts`) — but **none of the RBAC layer**. Role is stored for display only; no perms consumption, no gating, no approval fields, no checker queue. **Deviation:** this plan assumes WatermelonDB; the app actually uses **AsyncStorage** for tokens/cached profile, so the WatermelonDB-specific steps below do not apply as written.

### Tasks

- [~] **Update auth store** — *Partial.* `authStore.tsx` stores the decoded user, but no `perms`.
- [ ] **Create `src/hooks/usePermissions.ts`** — not created.
- [ ] **Create `src/components/PermissionGate.tsx`** — not created.
- [x] **Update `src/api/client.ts`** — 401 interceptor with token refresh + forced logout exists.
- [ ] **Update `AppNavigatorV2.tsx`** — module tab gating — not done (binary logged-in/out only).
- [ ] **Update `HomeScreen.tsx`** — dynamic tiles by permission — not done.
- [ ] **Add `approval_status` columns to WatermelonDB** — N/A (uses AsyncStorage; not done).
- [ ] **Update WatermelonDB models with approval fields** — N/A; not done.
- [ ] **Update sync pull logic** for approval fields — not done.
- [ ] **Add edit-lock UI** — not done.
- [ ] **Create `ApprovalQueueScreen.tsx`** — not created.
- [ ] **Integrate secure token storage** (`react-native-keychain`) — not done (tokens in AsyncStorage).
- [ ] **Update device registration** (`X-Device-ID`) — not done.

### Deliverable
Mobile app hides/shows modules based on permissions from JWT. Field Executives see edit-lock on submitted entries. Checkers see the approval queue.
*Status: not met — no RBAC behaviour in the mobile app.*

---

## Phase 7 — Admin Portal Frontend
**Status: 🟡 Mostly built — ~70% complete (UIs ahead of backend)**
**Duration: 7–10 days**

Build the Next.js admin panel.

> **Implementation note:** The portal is the most-complete part of the system, but several pages were built **ahead of their backend** and are therefore non-functional against the live API. Dashboard, Users, Analytics, and Audit are fully wired. Roles, Permissions, and Approvals UIs are fully built but call endpoints that do not exist (Phase 5) — **orphaned**.
> **Deviations:** Next.js **16** (not 15). Auth uses a localStorage Zustand store with client-side JWT decode (`store/authStore.ts`, `lib/api.ts`) — **not** an httpOnly-cookie session or `aud`-scoped token. `AuthGuard` enforces *logged-in only*; there are **no permission-based route guards** (any authenticated user can reach every admin page). Only the audit-CSV export is role-gated (`role === "super_admin"`). The portal also assumes 6 roles the backend can't issue.

### Tasks

- [x] **Initialize Next.js project** in `admin-portal/` — done (Next.js 16).
- [x] **Set up shadcn/ui + Tailwind + TanStack Query** — done.
- [~] **Implement admin auth** — *Done differently.* Login page + protected routes via `AuthGuard`, but localStorage tokens (not httpOnly cookie), no `aud` scope, no per-permission guards.
- [x] **Build Dashboard page** — done.
- [x] **Build User Management** (list/filter, create, detail, edit, deactivate/reactivate/force-logout) — done, wired to real APIs.
- [~] **Build Role Management** (list, detail+permission breakdown, create/edit) — *UI built but orphaned* (calls missing `/api/admin/roles/`).
- [~] **Build Permission Management** (catalogue, per-user overrides) — *UI built but orphaned* (calls missing `/api/admin/permissions/`, `/api/admin/user-permissions/`).
- [~] **Build Approval Queue** (pending/completed, force-approve/reassign) — *UI built but orphaned* (calls missing `/api/admin/approvals/`).
- [ ] **Build Region Management** — not built.
- [x] **Build Analytics Dashboard** — done, wired.
- [~] **Build Audit Log Viewer** (table, filters, CSV export) — done, but reads **synthesized** audit (Phase 4).
- [ ] **Build Sync Monitor** — not built.
- [ ] **Add Docker configuration** for admin portal — not done.
- [ ] **Configure Nginx** to route `/admin` — not done.

### Deliverable
Full admin portal operational. Admins can create users, assign roles, manage permissions, view approval queues, and read audit logs.
*Status: partially met — user/analytics/audit usable; role/permission/approval management is UI-only pending its backend.*

---

## Phase 8 — Hardening & Testing
**Status: ⛔ Not started — ~0% complete**
**Duration: 3–5 days**

> **Implementation note:** No RBAC test suite, security review, performance testing, monitoring, or OpenAPI docs exist on this branch. This phase depends on Phases 1–5 landing first.

### Tasks

1. **Write Django test suite:**
   - Permission resolution tests — verify role + override combinations
   - Approval state machine tests — every valid and invalid transition
   - API authorization tests — verify 403 for unauthorized access
   - Audit log tests — verify events are written correctly
2. **Security review:**
   - Verify no endpoint is accessible without correct `aud` claim
   - Verify object-level permissions work correctly
   - Verify brute-force protection works
3. **Performance testing:**
   - Permission resolution under load (use `locust`)
   - Approval queue at 10,000 pending items
   - Audit log writes don't block request cycle
4. **Add DB immutability rules** to production DB (PostgreSQL CREATE RULE)
5. **Set up monitoring alerts:**
   - Escalated approvals not actioned within 24h
   - FE hasn't synced in 48h
   - Failed login bursts (brute force detection)
6. **Document all API endpoints** (update Swagger/OpenAPI)

### Deliverable
System is production-ready. Test coverage ≥ 80% on permission engine and approval workflow. Security review complete.

---

## Dependency Map

The original plan was backend-first. **In practice the order inverted:** Phase 7 (admin frontend) shipped before the Phase 1–5 backend it depends on. The critical path is now "build the backend engine to match the existing UI."

### Original planned order (unchanged, for reference)
```
Phase 0 (Infrastructure)
    └── Phase 1 (DB Schema)
            ├── Phase 2 (Permission Engine) ──────────────── Phase 6 (Mobile)
            │                                                      │
            ├── Phase 3 (Approval Workflow) ─────────────────────┤
            │                                                      │
            └── Phase 4 (Audit Engine)                            │
                    └── Phase 5 (Admin APIs) ──── Phase 7 (Admin Portal)
                                                        └── Phase 8 (Hardening)
```

### Actual state & remaining critical path
```
Phase 7 (Admin Portal UI) ── DONE (Roles/Permissions/Approvals pages ORPHANED) ┐
                                                                                │ unblocks
Phase 0 (Infra)  ── DONE ──► Phase 1 (DB Schema) ── TODO ──► Phase 2 (Engine) ──┤
                                       │                                        │
                                       ├──► Phase 3 (Approval) ── TODO ─────────┤
                                       ├──► Phase 4 (Audit)    ── TODO          │
                                       └──► Phase 5 (Admin APIs: roles/perms/   │
                                            regions/approvals) ── TODO ◄────────┘ (un-orphans Phase 7)
                                                                  │
                                                                  └──► Phase 6 (Mobile RBAC) ── TODO
                                                                  └──► Phase 8 (Hardening)    ── TODO
```

Completing the **Phase 5 roles/permissions/approvals APIs** (which requires Phase 1 tables + Phase 2/3 logic) is the highest-leverage work: it turns the already-built Phase 7 pages from orphaned shells into working features.

---

## Progress & Remaining Work

| Phase | Status | % | Primary remaining work |
|-------|--------|---|------------------------|
| 0 — Prerequisites | ✅ Done | 100% | Complete. (JWT kept at 12h by decision; beat schedule deferred to Phase 3.) |
| 1 — DB Schema | 🟡 Partial | ~15% | Create Role/Permission/UserPermission/Region/Device + workflow + audit tables; real `primary_role` FK; seed + backfill. |
| 2 — Permission Engine | 🔄 Differently | ~10% | PermissionService, ABAC resolution, `perms` JWT claim, `HasFPSPermission`, cache invalidation. |
| 3 — Approval Workflow | 🟡 Partial | ~10% | ApprovalEngine + state machine, transition APIs, signals, escalation. |
| 4 — Audit Engine | 🔄 Differently | ~15% | Real `AuditLog` table, async writes, full instrumentation, immutability (replace synthesis). |
| 5 — Admin APIs | 🟡 Partial | ~40% | roles/permissions/regions/approvals APIs; `aud`-scoped admin auth; real force-logout; reset-password. |
| 6 — Mobile Integration | ⛔ Not started | ~5% | perms in store, PermissionGate, tab gating, approval fields, checker queue, keychain. |
| 7 — Admin Portal Frontend | 🟡 Mostly built | ~70% | Region + Sync pages; permission-based route guards; un-orphan roles/perms/approvals (needs Phase 5); httpOnly/`aud` auth; Docker/Nginx. |
| 8 — Hardening | ⛔ Not started | ~0% | Test suite, security review, perf, monitoring, Swagger. |

<details>
<summary>Original effort estimates (pre-implementation, for reference)</summary>

| Phase | Days |
|-------|------|
| 0 — Prerequisites | 2–3 |
| 1 — DB Schema | 3–4 |
| 2 — Permission Engine | 3–4 |
| 3 — Approval Workflow | 4–5 |
| 4 — Audit Engine | 2–3 |
| 5 — Admin APIs | 4–5 |
| 6 — Mobile Integration | 3–4 |
| 7 — Admin Portal Frontend | 7–10 |
| 8 — Hardening | 3–5 |
| **Total** | **31–43 days** |

With 2 developers in parallel: **~20–28 working days.** Phase 7 is now largely complete; the bulk of the remaining estimate lives in Phases 0–6 and 8.
</details>
