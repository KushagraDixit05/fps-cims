# RBAC Implementation Guide — FPS Project

**Branch:** `feature/rbac-implementation`  
**Status:** All phases complete — Phases 0–8 including the Next.js admin portal (Phase 7).

---

## What Was Built

### Architecture Summary

ABAC-lite hybrid system: roles give base permissions, per-user overrides can add or deny individual permissions, and permissions are embedded in JWT tokens so the mobile app works offline with no extra API calls.

```
User → primary_role → RolePermission[] → Permission codenames
                 ↘ UserPermission[] (allow/deny overrides)
                         ↓
              JWT { perms: ["can_create_crop_visit", ...] }
                         ↓
              Mobile: usePermissions() hook reads JWT
              Backend: HasFPSPermission DRF class checks JWT
```

---

## Files Created / Modified

### Backend — `backend/`

| File | What it does |
|------|-------------|
| `docker-compose.yml` | Added Redis 7-alpine service (port 6379) |
| `requirements.txt` | Added celery, django-celery-beat, redis, django-redis, django-simple-history. Django pinned to 5.1.15 |
| `fps_backend/celery.py` | Celery app config |
| `fps_backend/__init__.py` | Loads celery on startup |
| `fps_backend/settings.py` | SIMPLE_JWT config, Redis cache, Celery broker, added new apps to INSTALLED_APPS |
| `fps_backend/middleware.py` | `AuditContextMiddleware` — attaches request_id + IP to every request |
| `fps_backend/urls.py` | Routes `/api/approvals/` and `/api/admin/` |
| **accounts/models/** | Package replacing old models.py |
| `accounts/models/user.py` | User extended: `primary_role` FK, `reporting_to`, `state`, `districts`, `deactivated_at/by/reason`, `employee_id` |
| `accounts/models/role.py` | `Role` (UUID PK, code, is_preset) + `RolePermission` |
| `accounts/models/permission.py` | `Permission` (codename, module, category) |
| `accounts/models/user_permission.py` | `UserPermission` (effect=allow/deny, expires_at) — per-user overrides |
| `accounts/models/region.py` | `Region` (hierarchical) + `UserRegion` |
| `accounts/models/device.py` | `DeviceRegistration` + `RefreshTokenBlacklist` |
| `accounts/migrations/0003_…` | Creates all RBAC tables + indexes |
| `accounts/migrations/0004_seed_…` | Seeds 6 roles, ~50 permissions, backfills `primary_role_id` from old `role` field |
| `accounts/services/permission_service.py` | `PermissionService` — resolves perms from DB with Redis cache (TTL 300s) |
| `accounts/tokens.py` | `FPSTokenObtainPairSerializer` — embeds `perms`, `role`, `districts`, `regions` in JWT |
| `accounts/permissions.py` | `HasFPSPermission`, `OwnEntryOrCheckerPermission`, `IsAdminRole` DRF classes |
| `accounts/mixins.py` | `RegionScopedQuerysetMixin` |
| `accounts/signals.py` | Cache invalidation on permission change |
| `accounts/serializers.py` | `UserProfileSerializer` extended with `primary_role_code`, `perms` |
| `accounts/tests.py` | 5 tests (all passing) |
| **workflow/** | New app |
| `workflow/models.py` | `ApprovalWorkflow`, `ApprovalInstance`, `ApprovalAction` |
| `workflow/services/approval_engine.py` | State machine: draft→submitted→under_review→approved/rejected/revision_requested→resubmitted |
| `workflow/tasks.py` | Celery task: auto-escalate stale approvals every hour |
| `workflow/views.py` | Queue, Detail, Approve, Reject, RequestRevision, Resubmit |
| `workflow/urls.py` | 6 routes under `/api/approvals/` |
| `workflow/management/commands/create_approval_workflows.py` | Seeds 3 workflow records (crops, mandi, product_demo) |
| **audit/** | New app |
| `audit/models.py` | `AuditLog` (UUID PK, actor, event_type, module, changes JSON, request_id) |
| `audit/engine.py` | `AuditEngine` — async Celery dispatch with sync fallback |
| `audit/tasks.py` | `write_audit_log_async` Celery task |
| **admin_portal/** | New app |
| `admin_portal/views/users.py` | User CRUD + deactivate/reactivate/force-logout |
| `admin_portal/views/roles.py` | Role CRUD + permission assignment + user-level overrides |
| `admin_portal/views/approvals.py` | Admin approval queue + force-approve + reassign |
| `admin_portal/views/analytics.py` | Productivity stats + approval SLA metrics |
| `admin_portal/views/audit.py` | Audit log list + CSV export (super_admin only) |
| `admin_portal/urls.py` | All admin routes |
| **crops/mandi/product_demo** | `approval_status` CharField added to each main model |
| `crops/signals.py` | Auto-creates `ApprovalInstance` when `approval_status` → `submitted` |
| `mandi/signals.py` | Same for MandiArrival |
| `product_demo/signals.py` | Same for ProductDemo |

### Admin Portal — `admin-portal/`

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, TanStack Table, Recharts, Zustand, React Query.

| File / Directory | What it does |
|---|---|
| `src/app/login/page.tsx` | FPS-branded login form, POSTs to `/api/auth/login/`, stores JWT in Zustand |
| `src/app/(dashboard)/page.tsx` | Dashboard — KPI strip, productivity bar chart, SLA chart, recent approvals |
| `src/app/(dashboard)/users/` | User table with search/filter, create/edit drawer, deactivate / reactivate / force-logout |
| `src/app/(dashboard)/users/[id]/` | User profile detail + per-user permission overrides panel |
| `src/app/(dashboard)/roles/` | Color-coded role card grid, create custom role dialog |
| `src/app/(dashboard)/roles/[id]/` | Permission matrix grouped by module — toggle to grant/revoke per role |
| `src/app/(dashboard)/permissions/` | Full permission catalogue + per-user override management (grant/deny with optional expiry) |
| `src/app/(dashboard)/approvals/` | Approval queue table, force-approve and reassign with comment dialogs |
| `src/app/(dashboard)/approvals/[id]/` | Animated timeline, data snapshot, inline force-approve |
| `src/app/(dashboard)/analytics/` | Full-page Recharts dashboards with 7/14/30/60/90 day selector |
| `src/app/(dashboard)/audit/` | Expandable audit log table, row diff view, CSV export (super_admin only) |
| `src/store/authStore.ts` | Zustand store, persisted to `localStorage` key `fps-auth` |
| `src/lib/api.ts` | Axios instance pointing to `localhost:8000`, auto-refreshes JWT on 401 |
| `src/hooks/` | `useUsers`, `useRoles`, `usePermissions`, `useApprovals`, `useAnalytics`, `useAuditLog` |
| `src/components/layout/` | `Sidebar` (forest green, mirrors mobile header), `TopBar`, `AppShell`, `AuthGuard` |
| `src/components/common/` | `KPICard`, `DataTable` (TanStack), `StatusBadge`, `PageHeader`, `SkeletonTable` |

**Run:** `cd admin-portal && npm run dev` → http://localhost:3000. Backend must be running.

---

### Mobile — `mobile/FarmProsperity/src/`

| File | What it does |
|------|-------------|
| `utils/jwt.ts` | Decodes JWT payload without any npm package |
| `hooks/usePermissions.ts` | Reads `perms` from stored JWT — `can()`, `canAny()`, `isApprover` |
| `components/PermissionGate.tsx` | Render-guard: `<PermissionGate permission="can_create_crop_visit">` |
| `api/approvals.ts` | `getApprovalQueue`, `approveEntry`, `rejectEntry`, `requestRevision`, `resubmitEntry` |
| `screens/ApprovalQueueScreen.tsx` | Full approval queue UI — Approve / Reject / Request Revision buttons |
| `types/index.ts` | `User` extended: `primary_role_code`, `perms`, `state`, `districts` |
| `store/authStore.tsx` | `accessToken` added to state, populated on login + session restore |
| `navigation/types.ts` | `Approvals` tab added to `MainTabParamList` |
| `navigation/AppNavigatorV2.tsx` | Approvals tab shown conditionally for `isApprover` roles |
| `screens-v2/HomeScreen.tsx` | Module tiles wrapped in `<PermissionGate>`. Approvals tile for approvers. |

---

## How to Deploy & Test

### Step 1 — Start services

```bash
cd backend
docker compose up -d db redis
```

### Step 2 — Apply migrations

```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

This runs migrations 0003 (creates RBAC tables) and 0004 (seeds roles, permissions, backfills existing users).

### Step 3 — Seed approval workflows

```bash
python manage.py create_approval_workflows
```

Creates 3 `ApprovalWorkflow` records (idempotent — safe to run multiple times):
- `crop_monitoring / FarmerVisit`
- `mandi / MandiArrival`
- `product_demo / ProductDemo`

### Step 4 — Create a superuser

```bash
python manage.py createsuperuser
```

### Step 5 — Start the server

```bash
python manage.py runserver
# In a second terminal (for async tasks):
celery -A fps_backend worker -l info
# In a third terminal (for scheduled escalation):
celery -A fps_backend beat -l info
```

### Step 6 — Run tests

```bash
python manage.py test accounts.tests --verbosity=2
```

Expected output:
```
test_checker_has_approve_crop_visit ... ok
test_deny_override_removes_perm ... ok
test_field_executive_has_crop_create ... ok
test_jwt_contains_perms_array ... ok
test_fe_cannot_access_checker_only_endpoint ... ok
Ran 5 tests in ~2.5s — OK
```

---

## Using the Admin Portal

**Start:** `cd admin-portal && npm run dev` → http://localhost:3000

**Login:** Use any user with `role = admin` or `role = super_admin`. All other roles are rejected at the API level.

**Access matrix for the two portal roles:**

| Feature | `admin` | `super_admin` |
|---|---|---|
| User CRUD, deactivate, reactivate, force-logout | ✅ | ✅ |
| Role management + permission matrix | ✅ | ✅ |
| Per-user permission overrides | ✅ | ✅ |
| Approval queue — view, force-approve, reassign | ✅ | ✅ |
| Analytics dashboards | ✅ | ✅ |
| Audit log — read/search/filter | ✅ | ✅ |
| **Audit log — Export CSV** | ❌ | ✅ |
| Delete preset roles | ❌ | ✅ |

The Export CSV button is conditionally rendered only when `user.role === "super_admin"` in the frontend, and the backing endpoint (`GET /api/admin/audit/export/`) is gated by `IsSuperAdmin` on the backend.

---

## Using RBAC Without the Admin Portal (Django Admin + Shell)

Everything below also works via Django Admin (`/admin/`) or the shell.

### Django Admin

Go to `http://localhost:8000/admin/` and log in as superuser. You will see:

- **Accounts → Roles** — view/edit the 6 preset roles
- **Accounts → Permissions** — full catalogue of ~50 codenames
- **Accounts → Role permissions** — which permissions belong to which role
- **Accounts → User permissions** — per-user allow/deny overrides
- **Accounts → Users** — set `primary_role` on any user
- **Workflow → Approval workflows** — configure approver roles + escalation hours
- **Workflow → Approval instances** — see all pending/approved/rejected entries
- **Audit → Audit logs** — full audit trail

### Shell Recipes

#### Assign a role to a user
```python
python manage.py shell
from accounts.models import User, Role
user = User.objects.get(username='alice')
role = Role.objects.get(code='checker')
user.primary_role = role
user.save()

# Invalidate their JWT cache so next login picks up new role
from accounts.services.permission_service import PermissionService
PermissionService.invalidate_cache(user.id)
```

#### Grant an extra permission to one user (allow override)
```python
from accounts.models import User, Permission, UserPermission
user = User.objects.get(username='alice')
perm = Permission.objects.get(codename='can_export_reports')
superuser = User.objects.get(username='admin')
UserPermission.objects.create(user=user, permission=perm, effect='allow', granted_by=superuser)
PermissionService.invalidate_cache(user.id)
```

#### Deny a permission for one user (deny override)
```python
UserPermission.objects.create(user=user, permission=perm, effect='deny', granted_by=superuser)
PermissionService.invalidate_cache(user.id)
```

#### Add a permission to a role
```python
from accounts.models import Role, Permission, RolePermission
role = Role.objects.get(code='field_executive')
perm = Permission.objects.get(codename='can_view_team_analytics')
superuser = User.objects.get(username='admin')
RolePermission.objects.create(role=role, permission=perm, granted_by=superuser)

# Invalidate cache for ALL users on this role
for u in User.objects.filter(primary_role=role):
    PermissionService.invalidate_cache(u.id)
```

#### Check what permissions a user has
```python
from accounts.services.permission_service import PermissionService
user = User.objects.get(username='alice')
print(sorted(PermissionService.get_user_permissions(user)))
```

#### Verify JWT payload after login
```bash
# 1. Get a token
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass"}' | python3 -m json.tool

# 2. Decode the JWT payload (the middle part)
echo "<paste access token here>" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
# Look for "perms": [...] and "role": "checker"
```

---

## API Reference (No Admin Portal Needed)

### Auth

| Method | URL | Who |
|--------|-----|-----|
| POST | `/api/auth/login/` | Anyone |
| POST | `/api/auth/refresh/` | Anyone with refresh token |
| GET | `/api/auth/me/` | Authenticated |
| POST | `/api/auth/register/` | Anyone |

### Approval Workflow (for checkers, regional heads, managers)

| Method | URL | Required permission |
|--------|-----|---------------------|
| GET | `/api/approvals/queue/` | any `can_approve_*` |
| GET | `/api/approvals/{id}/` | authenticated |
| POST | `/api/approvals/{id}/approve/` | authenticated (engine checks role) |
| POST | `/api/approvals/{id}/reject/` | authenticated |
| POST | `/api/approvals/{id}/request-revision/` | authenticated |
| POST | `/api/approvals/{id}/resubmit/` | authenticated (original submitter) |

### Admin Portal APIs (for admin/super_admin JWT tokens)

| Method | URL | Notes |
|--------|-----|-------|
| GET/POST | `/api/admin/users/` | List + create users |
| GET/PATCH | `/api/admin/users/{id}/` | User detail |
| POST | `/api/admin/users/{id}/deactivate/` | Soft-deactivate |
| POST | `/api/admin/users/{id}/force-logout/` | Blacklists all tokens |
| GET/POST | `/api/admin/roles/` | Role list + create |
| GET/POST/DELETE | `/api/admin/roles/{id}/permissions/` | Assign/remove perms on role |
| GET | `/api/admin/permissions/` | Full permission catalogue |
| GET/POST | `/api/admin/user-permissions/` | Per-user overrides |
| DELETE | `/api/admin/user-permissions/{id}/` | Remove override |
| GET | `/api/admin/approvals/` | All approvals across modules |
| POST | `/api/admin/approvals/{id}/force-approve/` | Bypass role check |
| GET | `/api/admin/audit/` | Paginated audit log |
| GET | `/api/admin/audit/export/` | CSV (super_admin only) |
| GET | `/api/admin/analytics/productivity/` | Per-FE entry counts |
| GET | `/api/admin/analytics/approval-sla/` | Avg/min/max approval hours |

All `/api/admin/` endpoints require a JWT where `role` claim is `admin` or `super_admin`.

---

## The 6 Roles and What They Can Do

| Role | Can Create | Can Approve | Can View | Admin |
|------|-----------|-------------|----------|-------|
| `field_executive` | crop visit, mandi arrival, product demo | — | Own entries only | — |
| `checker` | crop visit, mandi arrival, product demo | All 3 modules | Own + region | — |
| `regional_head` | crop visit, mandi arrival, product demo | All 3 modules | Own + region | — |
| `manager` | crop visit, mandi arrival, product demo | All 3 modules | All entries platform-wide | — |
| `admin` | Everything | Everything | Everything | Manage users, roles, regions |
| `super_admin` | Everything | Everything | Everything | All admin + export audit CSV |

---

## Approval Flow (How Data Moves)

```
Field Executive creates entry (approval_status = 'draft')
         ↓
FE sets approval_status = 'submitted'
         ↓  (signal auto-creates ApprovalInstance)
Checker/Manager sees it in GET /api/approvals/queue/
         ↓
  ┌──────────────────────────────────┐
  │  Approve → status = 'approved'  │
  │  Reject  → status = 'rejected'  │
  │  Request Revision → FE edits    │
  │    and resubmits                │
  └──────────────────────────────────┘
         ↓  (if no action in 48h)
Celery escalates → status = 'escalated'
```

---

## JWT Payload Structure

Every login returns an access token. Decode the middle segment (base64) to see:

```json
{
  "user_id": 42,
  "role": "checker",
  "role_id": "uuid...",
  "state": "Maharashtra",
  "districts": ["Pune", "Nashik"],
  "regions": ["uuid..."],
  "perms": [
    "can_access_crop_module",
    "can_approve_crop_visit",
    "can_approve_mandi_arrival",
    ...
  ],
  "aud": "fps-mobile",
  "exp": 1234567890
}
```

Mobile app reads this offline — no extra API call needed to check permissions.

---

## What's Still Pending

| Item | Action needed |
|------|--------------|
| Pending migrations on production | Run `python manage.py migrate` |
| `SECRET_KEY` in production is short (< 32 bytes) — causes JWT warning | Set a longer key in `.env` |

---

## Quick Smoke Test Sequence

```bash
# 1. Register a field executive
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"fe_test","password":"Test1234!","email":"fe@fps.in","role":"field_executive"}'

# 2. Login and decode JWT
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"fe_test","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")

echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool | grep -A20 '"perms"'

# 3. Create a farmer visit
curl -X POST http://localhost:8000/api/farmer-visits/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ...visit payload... }'

# 4. Submit it for approval (triggers ApprovalInstance creation)
curl -X PATCH http://localhost:8000/api/farmer-visits/{id}/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approval_status": "submitted"}'

# 5. Login as checker, hit approval queue
CHECKER_TOKEN=...
curl http://localhost:8000/api/approvals/queue/ \
  -H "Authorization: Bearer $CHECKER_TOKEN"

# 6. Approve it
curl -X POST http://localhost:8000/api/approvals/{approval_id}/approve/ \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Looks good."}'
```
