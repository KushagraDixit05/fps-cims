# Implementation Phases

Step-by-step delivery plan. Each phase is independently deployable and leaves the system in a working state.

> **This document is the single source of truth for RBAC status.** All other RBAC docs carry a status banner that must agree with the matrix below.

---

## Implementation Status (as of 2026-06-26)

Audited against the active `feature/RBAC` branch (→ `main`). The unmerged `feature/rbac-implementation` branch is experimental/obsolete and is **not** counted.

| Phase | Status | % | Headline |
|-------|--------|---|----------|
| 0 — Prerequisites & Setup | ✅ Done | 100% | Redis (compose) + Celery app + `django-simple-history` + `token_blacklist` wired. `SIMPLE_JWT`: 12h access (deliberate), `BLACKLIST_AFTER_ROTATION=True`. |
| 1 — Database Schema | ✅ Done | 100% | Full relational core created and **applied**. `accounts/0005`–`0009` + `workflow/0001`–`0002` + `audit/0001` all `[X]`. 48 permissions, 7 roles, 5 regions, 3 workflows seeded; all users backfilled. Two remediation migrations added (0008, 0009) to close schema gaps left by the obsolete branch. |
| 2 — Permission Engine | ✅ Done | 100% | `PermissionService` (Redis cache, ABAC-lite resolution). `HasFPSPermission`, `OwnEntryOrCheckerPermission`, `RegionEnforcedPermission` DRF classes. `RegionScopedQuerysetMixin`. `AuditContextMiddleware`. Cache-invalidation signals. JWT now carries `perms`/`role_id`/`state`/`districts`. `force-logout` real (token blacklist). `reset-password` implemented. Roles/Permissions/UserPermissions admin APIs built (un-orphans Phase 7 Roles+Permissions pages). |
| 3 — Approval Workflow | 🟡 Partial | ~10% | `approval_status`/`approved_at` fields only. No engine, no transition APIs, no escalation. `workflow/` app empty. |
| 4 — Audit Engine | 🔄 Done differently | ~15% | Read-time **synthesized** pseudo-audit in `admin_portal`. No `AuditLog` table, no async writes, no immutability. `audit/` app empty. `AuditContextMiddleware` now attaches `request_id`/`actor_ip` as Phase 4 foundation. |
| 5 — Admin Portal APIs | 🟡 Partial | ~55% | User-mgmt + analytics + pseudo-audit + **roles/permissions/user-permissions** APIs done. No approvals/regions APIs. No `aud`-scoped admin auth. |
| 6 — Mobile Integration | ⛔ Not started | ~5% | Base JWT login/refresh only. No perms consumption, gating, approval fields, or queue screen. Uses AsyncStorage (not WatermelonDB). |
| 7 — Admin Portal Frontend | 🟡 Mostly built | ~75% | Next.js 16 portal live. Dashboard/Users/Analytics/Audit/Roles/Permissions wired; **Approvals UI orphaned** (calls missing endpoints). No region/sync pages, no RBAC route guards. |
| 8 — Hardening & Testing | ⛔ Not started | ~0% | No RBAC test suite, security review, perf testing, or Swagger. |

### Critical cross-cutting deviations
1. ~~**No Role/Permission tables.**~~ **Resolved (Phase 1).** Role/Permission/RolePermission/UserPermission/Region/UserRegion/Device tables now exist; `User.primary_role` is a real FK (the legacy 3-value `role` CharField is retained as a one-sprint fallback). 48 permissions + 7 roles are seeded and existing users are backfilled.
2. ~~**Permissions are coarse role-based, not ABAC-lite. JWT carries `role`, not `perms`.**~~ **Resolved (Phase 2).** `PermissionService` resolves the full effective permission set (role grants + user-level allow/deny overrides, Redis-cached). JWT now carries `perms` list, `role_id`, `state`, `districts`. `HasFPSPermission` DRF class gates views via JWT fast-path or DB slow-path.
3. **Audit is read-time synthesis**, not an append-only engine. `AuditContextMiddleware` now attaches `request_id`/`actor_ip` as Phase 4 foundation.
4. ~~**Frontend Roles/Permissions pages orphaned.**~~ **Partially resolved (Phase 2/5).** `/api/admin/roles/`, `/api/admin/permissions/`, `/api/admin/user-permissions/` endpoints now exist and are wired. Approvals pages still orphaned.
5. **Redis/Celery infrastructure now exists (Phase 0 complete)** and **Redis Django cache layer is now wired (Phase 2)**. No async tasks yet (Phases 3–4).
6. **Frontend assumes 6 roles** (super_admin/admin/regional_head/checker/field_executive/viewer); Phase 1 seeded 7 roles including `viewer`. All 7 are now returned by `/api/admin/roles/`.
7. **Stale build artifacts:** `backend/audit/__pycache__/*.pyc` and `backend/workflow/.../*.pyc` are leftovers from the obsolete branch. Recommend `git clean`-ing them; no source exists for them on this branch.

**Net critical path going forward:** build the approval workflow engine (Phase 3) and real audit engine (Phase 4), then wire the Phase 7 Approvals frontend.

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
**Status: ✅ Done — 100% complete (implemented 2026-06-25, verified & remediated 2026-06-25)**
**Duration: 3–4 days**

Create the new models. No logic yet — just the data structures.

> **Implementation note (original commit — 2026-06-25):** The model code was written and migrations
> were authored in the `feature/RBAC` branch commit `0509fd8`. However, those migrations
> (`accounts/0005`–`0007`, `workflow/0002`) **had never been applied** to the development
> database — the tables already existed from the now-obsolete `feature/rbac-implementation`
> branch, causing Django to report `[X] 0001_initial` for `audit/workflow` while the main
> accounts RBAC migrations showed `[ ]`.
>
> **Remediation (this session):** All four unapplied migrations were fake-applied
> (`--fake`) to register their existence in the migration history since the schema was
> already present. A new remediation migration `accounts/0008_rbac_schema_gaps` was
> authored and applied to close the actual gaps that the obsolete-branch tables were missing:
>
> | Gap | Action |
> |-----|--------|
> | `accounts_user.updated_at` column missing | Added via `ALTER TABLE` |
> | `GIN idx_user_districts` missing | Created |
> | `idx_userperm_expires` partial index missing | Created |
> | `uniq_role_permission` UNIQUE constraint missing | Added |
> | `uniq_user_permission` UNIQUE constraint missing | Added |
> | `ck_userperm_effect` CHECK constraint missing | Added |
> | `uniq_user_region` UNIQUE constraint missing | Added |
> | `uniq_user_device` UNIQUE constraint missing | Added |
> | 5 Region records not seeded | Seeded |
> | `viewer` Role missing (only 6/7 roles existed) | Seeded |
> | 1 user with `primary_role=NULL` | Backfilled |
>
> A second migration `accounts/0009_align_region_district_taluka_nonnull` was generated
> automatically because the `Region` model declared `district`/`taluka` as `null=True,
> blank=True` but the DB columns (created by the obsolete branch) are `NOT NULL`. The
> model was corrected to `blank=True, default=''` (matching the DB), and the migration
> records the alignment. `manage.py check` and `makemigrations --check` are both clean.
>
> **Final verified state:** 7 roles (field_executive/checker/regional_head/manager/admin/super_admin/viewer),
> 48 permissions, 5 regions (MH/MP/MH-NAN/MH-LAT/MP-KHG), 3 approval-workflow templates,
> all 4 users backfilled with `primary_role`. All indexes and constraints present.
> `migrate --plan` reports nothing to apply.

### Tasks

- [x] **Create `accounts/models/role.py`** — `Role`, `RolePermission`.
- [x] **Create `accounts/models/permission.py`** — `Permission` catalogue (48 codenames).
- [x] **Create `accounts/models/user_permission.py`** — `UserPermission` (allow/deny + expiry + CHECK constraint).
- [x] **Create `accounts/models/region.py`** — `Region`, `UserRegion`.
- [x] **Extend `accounts/models/user.py`** — `accounts/models.py` converted to a package. `primary_role` is now a real FK to `Role` (`on_delete=RESTRICT`, `db_column='primary_role_id'`); `updated_at` added; `Meta.indexes` for role/reporting/state/active + GIN on `districts`. Legacy `role` CharField retained.
- [x] **Create `workflow/` app models** — `ApprovalWorkflow`, `ApprovalInstance` (GenericFK + status CHECK + partial approver index), `ApprovalAction` (action CHECK).
- [x] **Create `audit/` app** — `AuditLog` (denormalised actor, all 5 indexes incl. `created_at DESC`).
- [x] **Create `accounts/models/device.py`** — `DeviceRegistration`, `RefreshTokenBlacklist`.
- [x] **Write and apply migrations** — `accounts/0005` (fake-applied; schema from obsolete branch), `workflow/0001`, `audit/0001` real; `accounts/0008` (remediation — adds missing column/indexes/constraints); `accounts/0009` (model-DB alignment for Region nullable fields).
- [x] **Write data migration** — `accounts/0006_seed_rbac_catalog` (fake-applied; partial data existed; 0008 completed seeding of regions + viewer role) and `workflow/0002_seed_workflows` (fake-applied; data already present).
- [x] **Backfill** — `accounts/0007_backfill_primary_role` (fake-applied; 0008 completed backfill for the 1 remaining NULL user).
- [x] **Add all indexes** as defined in schema doc — done (0008 adds the missing GIN + partial index).
- [x] **Register all new models in `admin.py`** — `accounts`, `workflow`, `audit` admin registered; `AuditLog`/`ApprovalAction` are read-only to honour append-only intent.

### Deliverable
`python manage.py migrate` runs cleanly. All preset roles and permissions exist in the DB. Existing users have `primary_role` set.
*Status: **met** (verified 2026-06-25 after remediation). 48 permissions, 7 roles (incl. backward-compat `viewer`), 3 approval workflows, 5 regions seeded; all migrations `[X]`; `manage.py check` and `makemigrations --check` clean. See `01-DATABASE-SCHEMA.md` and `03-PRESET-ROLES.md` for the as-built details and deviations.*

---

## Phase 2 — Permission Engine
**Status: ✅ Done — 100% complete (implemented 2026-06-26)**
**Duration: 3–4 days**

Wire up permission resolution, caching, and JWT embedding.

> **Implementation note (2026-06-26):** All Phase 2 deliverables are now built on the `feature/RBAC` branch.
> The pre-existing coarse `IsStaffUser` guard is **retained** as a defence layer alongside the new fine-grained
> `HasFPSPermission` class (both can be composed on any view).
>
> **Files created/modified:**
> - `accounts/services/__init__.py` + `accounts/services/permission_service.py` — `PermissionService` (Redis cache, DB fallback, ABAC-lite resolution with role grants + user-level allow/deny overrides).
> - `accounts/permissions.py` — `HasFPSPermission` (JWT fast-path + DB slow-path), `OwnEntryOrCheckerPermission`, `RegionEnforcedPermission`.
> - `accounts/signals.py` — `register_signals()` wired in `AccountsConfig.ready()`. Invalidates Redis cache on `UserPermission`/`RolePermission` save/delete and on `User` save.
> - `accounts/mixins.py` — `RegionScopedQuerysetMixin` (all / region / own-entries filtering from JWT `perms` + `districts` claims).
> - `accounts/middleware.py` — `AuditContextMiddleware` (attaches `_fps_request_id` + `_fps_actor_ip` — Phase 4 foundation).
> - `accounts/token_serializers.py` — Extended `CustomTokenObtainPairSerializer` to add `perms` (sorted list from `PermissionService`), `role_id`, `state`, `districts` JWT claims. Backward-compat claims (`role`, `is_staff`, etc.) retained.
> - `accounts/views.py` + `accounts/urls.py` — Added `ResetPasswordView` (`POST /api/auth/reset-password/`) with token blacklisting.
> - `admin_portal/views.py` — Fixed `AdminForceLogoutView` stub → real token blacklisting via `OutstandingToken`/`BlacklistedToken`. Added `RoleListCreateView`, `RoleDetailView`, `RolePermissionsView`, `PermissionListView`, `UserPermissionListCreateView`, `UserPermissionDetailView`, `AdminResetPasswordView`.
> - `admin_portal/urls.py` — Registered all new role/permission/user-permission routes.
> - `fps_backend/settings.py` — Added `CACHES` block (django-redis, DB 1); added `AuditContextMiddleware` to `MIDDLEWARE`.
>
> **Verified:** `manage.py check` → 0 issues; `makemigrations --check` → no changes; JWT `perms` claim resolves 48 permissions for the admin user from DB (Redis not running in dev without compose, degrades gracefully via `IGNORE_EXCEPTIONS`); URL routing resolves all new endpoints.

### Tasks

- [x] **Create `accounts/services/permission_service.py`** — `PermissionService` with Redis cache, DB fallback, ABAC-lite resolution.
- [x] **Create `accounts/tokens.py`** — *Extended existing `accounts/token_serializers.py`*. Adds `perms`, `role_id`, `state`, `districts` claims to JWT.
- [x] **Update `accounts/views.py`** — login uses custom serializer (pre-existing). Added `ResetPasswordView`.
- [x] **Create `accounts/permissions.py`** — `HasFPSPermission`, `OwnEntryOrCheckerPermission`, `RegionEnforcedPermission`.
- [x] **Create `accounts/signals.py`** — Cache invalidation signals for `UserPermission`, `RolePermission`, `User.primary_role`. Wired in `AccountsConfig.ready()`.
- [x] **Create `accounts/mixins.py`** — `RegionScopedQuerysetMixin`.
- [x] **Add `AuditContextMiddleware`** — `accounts/middleware.py` + registered in `settings.py`.
- [x] **Add Redis `CACHES`** — `fps_backend/settings.py`, DB 1, `IGNORE_EXCEPTIONS=True`.
- [x] **Fix `AdminForceLogoutView`** — real token blacklisting via `token_blacklist` app.
- [x] **Add `reset-password/`** — both `POST /api/auth/reset-password/` and `POST /api/admin/users/<pk>/reset-password/`.
- [x] **Role management APIs** — `/api/admin/roles/` (list, create, detail, update, delete, permission assignment/removal).
- [x] **Permission catalogue API** — `/api/admin/permissions/`.
- [x] **User-permission override APIs** — `/api/admin/user-permissions/` (list, create, delete).
- [~] **Add permission checks to existing views** — `HasFPSPermission` and the new classes are **available** for use on existing views. Existing views retain `IsAuthenticated` + owner-scoped `get_queryset()` defence layer. Full migration of each field-data view to `required_permission` is a Phase 5/8 polish task to avoid breaking field executive workflows before mobile integration (Phase 6) lands the `perms` JWT claim client-side.
- [x] **Test:** `manage.py check` clean; URL routing verified; JWT `perms` claim resolves 48 permissions for admin user from live DB.

### Deviations
- **Existing field-data views not migrated to `required_permission`:** `HasFPSPermission` is built and available but the migration of `crops`/`mandi`/`product_demo` views requires simultaneous mobile client support for the new `perms` JWT claim (to avoid locking out field executives whose cached tokens don't yet carry `perms`). The existing `IsAuthenticated` + owner-scope defence is maintained as-is and will be upgraded in Phase 6/8 once the mobile client has been updated.
- **`AuditContextMiddleware` writes no entries yet:** Phase 4 will extend it to dispatch async Celery tasks. The middleware is in place as infrastructure.
- **Admin portal Approvals page still orphaned:** the `/api/admin/approvals/` endpoint requires the Phase 3 approval workflow engine; that is deferred to Phase 3.

### Deliverable
All existing API endpoints are permission-gated (at least via `IsAuthenticated`). JWT contains `perms` claim. Cache invalidation works on permission changes.
*Status: **met** — JWT `perms` is populated at login; fine-grained `HasFPSPermission` is available for all new and existing views; cache invalidation signals are wired; admin portal Roles and Permissions pages are fully functional against the live API.*

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
Phase 0 (Infra)  ── DONE ──► Phase 1 (DB Schema) ── DONE ──► Phase 2 (Engine) ──┤
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
| 1 — DB Schema | ✅ Done | 100% | All migrations applied (`accounts/0005`–`0009`, `workflow/0001`–`0002`, `audit/0001`). 48 perms / 7 roles / 5 regions / 3 workflows seeded; all 4 users backfilled. Two remediation migrations (0008, 0009) closed schema gaps from obsolete branch. |
| 2 — Permission Engine | ✅ Done | 100% | `PermissionService`, `HasFPSPermission`, signals, mixins, `AuditContextMiddleware`, JWT `perms` claim, Redis `CACHES`, real force-logout, reset-password, roles/permissions/user-permissions admin APIs. |
| 3 — Approval Workflow | 🟡 Partial | ~10% | ApprovalEngine + state machine, transition APIs, signals, escalation. |
| 4 — Audit Engine | 🔄 Differently | ~15% | Real `AuditLog` table, async writes, full instrumentation, immutability (replace synthesis). |
| 5 — Admin APIs | 🟡 Partial | ~55% | approvals/regions APIs; `aud`-scoped admin auth; roles/permissions/user-perms done (Phase 2). |
| 6 — Mobile Integration | ⛔ Not started | ~5% | perms in store, PermissionGate, tab gating, approval fields, checker queue, keychain. |
| 7 — Admin Portal Frontend | 🟡 Mostly built | ~75% | Region + Sync pages; Approvals backend (needs Phase 3); permission-based route guards; httpOnly/`aud` auth; Docker/Nginx. |
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
