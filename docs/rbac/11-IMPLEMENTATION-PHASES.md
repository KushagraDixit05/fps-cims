# Implementation Phases

Step-by-step delivery plan. Each phase is independently deployable and leaves the system in a working state.

---

## Phase 0 — Prerequisites & Setup
**Duration: 2–3 days**

Before any RBAC code is written, set up the infrastructure that everything depends on.

### Tasks

1. **Add Redis to docker-compose.yml**
   ```yaml
   redis:
     image: redis:7-alpine
     ports: ["6379:6379"]
   ```

2. **Add Celery to the project**
   ```bash
   pip install celery[redis] django-celery-beat
   ```
   Create `fps_backend/celery.py` with standard Celery app setup.

3. **Add django-simple-history**
   ```bash
   pip install django-simple-history
   ```

4. **Add rest_framework_simplejwt token blacklist**
   - Already installed via `djangorestframework-simplejwt`
   - Add `'rest_framework_simplejwt.token_blacklist'` to `INSTALLED_APPS`
   - Run migrations

5. **Configure SIMPLE_JWT settings** as defined in `04-BACKEND-ARCHITECTURE.md`

6. **Update requirements.txt**

### Deliverable
Docker compose starts cleanly with Redis. Celery worker starts without errors.

---

## Phase 1 — Database Schema
**Duration: 3–4 days**

Create the new models. No logic yet — just the data structures.

### Tasks

1. **Create `accounts/models/role.py`** — `Role`, `RolePermission`
2. **Create `accounts/models/permission.py`** — `Permission` catalogue
3. **Create `accounts/models/user_permission.py`** — `UserPermission`
4. **Create `accounts/models/region.py`** — `Region`, `UserRegion`
5. **Extend `accounts/models/user.py`** — add new fields to `User`
   - `employee_id`, `profile_photo`
   - `primary_role` FK to `Role`
   - `reporting_to` self-FK
   - `state`, `districts` JSONB
   - `deactivated_at`, `deactivated_by`
   - `created_by`
   - Keep old `role` CharField temporarily
6. **Create `workflow/` app** — `ApprovalWorkflow`, `ApprovalInstance`, `ApprovalAction`
7. **Create `audit/` app** — `AuditLog`
8. **Create `accounts/models/device.py`** — `DeviceRegistration`, `RefreshTokenBlacklist`
9. **Write and run migrations** — one migration per app
10. **Write data migration** — seed preset `Role` objects and `Permission` catalogue
11. **Backfill** — set `primary_role_id` on existing users from their old `role` CharField
12. **Add all indexes** as defined in schema doc
13. **Register all new models in `admin.py`**

### Deliverable
`python manage.py migrate` runs cleanly. All preset roles and permissions exist in the DB. Existing users have `primary_role_id` set.

---

## Phase 2 — Permission Engine
**Duration: 3–4 days**

Wire up permission resolution, caching, and JWT embedding.

### Tasks

1. **Create `accounts/services/permission_service.py`** — full `PermissionService` class
2. **Create `accounts/tokens.py`** — `FPSTokenObtainPairSerializer` with perms in claims
3. **Update `accounts/views.py`** — use `FPSTokenObtainPairSerializer` for login
4. **Create `accounts/permissions.py`** — `HasFPSPermission`, `OwnEntryOrCheckerPermission`, `RegionEnforcedPermission`
5. **Create `accounts/signals.py`** — cache invalidation on `UserPermission`, `RolePermission` changes
6. **Create `accounts/mixins.py`** — `RegionScopedQuerysetMixin`
7. **Add permission checks to existing views:**
   - `crops/views.py` — add `required_permission` to all views
   - `mandi/views.py` — same
   - `product_demo/views.py` — same
8. **Add `AuditContextMiddleware`** to `fps_backend/middleware.py` and `settings.py`
9. **Test:** Login returns JWT with `perms` list. Calling an API with a token that lacks the permission returns 403.

### Deliverable
All existing API endpoints are permission-gated. JWT contains `perms` claim. Cache invalidation works on permission changes.

---

## Phase 3 — Approval Workflow Engine
**Duration: 4–5 days**

Build the state machine and approval APIs.

### Tasks

1. **Create `workflow/services/approval_engine.py`** — full `ApprovalEngine` class
2. **Create `workflow/services/escalation_service.py`** — `EscalationService.escalate()`
3. **Create `workflow/tasks.py`** — `check_approval_escalations` Celery beat task
4. **Add `approval_status` field to `FarmerVisit`, `MandiArrival`, `ProductDemo` models** — new migration
5. **Create `crops/signals.py`** — auto-create `ApprovalInstance` when visit status → `submitted`
6. **Create approval API endpoints:**
   ```
   GET  /api/approvals/queue/
   GET  /api/approvals/{id}/
   POST /api/approvals/{id}/approve/
   POST /api/approvals/{id}/reject/
   POST /api/approvals/{id}/request-revision/
   POST /api/approvals/{id}/resubmit/
   GET  /api/approvals/history/
   ```
7. **Add data locking logic** to existing crop/mandi/product_demo edit endpoints
8. **Seed `ApprovalWorkflow` records** for the three modules
9. **Configure Celery beat** for hourly escalation check

### Deliverable
Full maker-checker flow works end-to-end via API. FE submits → checker approves/rejects → audit log written. Escalation runs on schedule.

---

## Phase 4 — Audit Engine
**Duration: 2–3 days**

### Tasks

1. **Create `audit/engine.py`** — `AuditEngine` class
2. **Create `audit/tasks.py`** — `write_audit_log_async` Celery task
3. **Create `audit/middleware.py`** — extend existing `AuditContextMiddleware`
4. **Instrument all significant actions** — add `AuditEngine.log()` calls to:
   - User login/logout/failed login
   - User create/update/deactivate
   - Role change
   - Permission override grant/deny/remove
   - All approval transitions
   - Data create/update/delete in all three modules
5. **Add `django-simple-history`** to `FarmerVisit`, `MandiArrival`, `ProductDemo`, `User`
6. **Add DB immutability rules** (PostgreSQL `CREATE RULE`) for `audit_auditlog` and `workflow_approvalaction`

### Deliverable
Every significant system action writes an audit log entry asynchronously. The audit table is append-only at the DB level.

---

## Phase 5 — Admin Portal APIs
**Duration: 4–5 days**

Build the Django backend APIs that the admin portal will call. No frontend yet.

### Tasks

1. **Create `admin_portal/` app**
2. **Create `admin_portal/permissions.py`** — `IsAdminPortalUser`, `IsSuperAdmin`
3. **Add admin login endpoint** — `POST /api/admin/auth/login/` (issues `aud: fps-admin` token)
4. **Create admin user management APIs:**
   - `GET/POST /api/admin/users/`
   - `GET/PATCH /api/admin/users/:id/`
   - `POST /api/admin/users/:id/deactivate/`
   - `POST /api/admin/users/:id/reactivate/`
   - `POST /api/admin/users/:id/force-logout/`
   - `POST /api/admin/users/:id/reset-password/`
5. **Create admin role management APIs:**
   - `GET/POST /api/admin/roles/`
   - `GET/PATCH/DELETE /api/admin/roles/:id/`
   - `GET/POST/DELETE /api/admin/roles/:id/permissions/`
6. **Create admin permission management APIs:**
   - `GET /api/admin/permissions/`
   - `GET/POST/DELETE /api/admin/user-permissions/`
7. **Create admin region management APIs:**
   - `GET/POST/PATCH /api/admin/regions/`
8. **Create admin approval management APIs:**
   - `GET /api/admin/approvals/`
   - `POST /api/admin/approvals/:id/force-approve/`
   - `POST /api/admin/approvals/:id/reassign/`
9. **Create audit log APIs:**
   - `GET /api/admin/audit/`
   - `GET /api/admin/audit/export/`
10. **Create analytics APIs:**
    - `GET /api/admin/analytics/productivity/`
    - `GET /api/admin/analytics/approval-sla/`
    - `GET /api/admin/sync/`

### Deliverable
All admin APIs working, tested via Postman/Django tests. Swagger/OpenAPI docs generated.

---

## Phase 6 — Mobile App Integration
**Duration: 3–4 days**

Update the React Native app to use permissions.

### Tasks

1. **Update `src/store/authStore.ts`** — add `perms`, `user` with decoded claims
2. **Create `src/hooks/usePermissions.ts`**
3. **Create `src/components/PermissionGate.tsx`**
4. **Update `src/api/client.ts`** — add 401 interceptor with token refresh + forced logout
5. **Update `AppNavigatorV2.tsx`** — module tab gating based on `canAccessModule()`
6. **Update `HomeScreen.tsx`** — dynamic module tiles based on permissions
7. **Add `approval_status` columns to WatermelonDB schema** — run migration
8. **Update WatermelonDB models** — `FarmerVisit`, `MandiArrival`, `ProductDemo` with approval fields
9. **Update sync pull logic** — include `approval_status` and `revision_note` in sync
10. **Add edit-lock UI** — show read-only mode when `approval_status` is locked
11. **Create `ApprovalQueueScreen.tsx`** — for Checkers
12. **Integrate secure token storage** — `react-native-keychain` for refresh token
13. **Update device registration** — send `X-Device-ID` header on login

### Deliverable
Mobile app hides/shows modules based on permissions from JWT. Field Executives see edit-lock on submitted entries. Checkers see the approval queue.

---

## Phase 7 — Admin Portal Frontend
**Duration: 7–10 days**

Build the Next.js admin panel.

### Tasks

1. **Initialize Next.js 15 project** in `admin-portal/`
2. **Set up shadcn/ui + Tailwind + TanStack Query**
3. **Implement admin auth** — login page, httpOnly cookie session, protected routes
4. **Build Dashboard page** — summary widgets, pending approvals count
5. **Build User Management:**
   - User list with search/filter
   - Create user multi-step form
   - User detail page
   - Edit user form
   - Deactivate/reactivate/force-logout actions
6. **Build Role Management:**
   - Role list
   - Role detail with permission breakdown
   - Create/edit custom role
7. **Build Permission Management:**
   - Permission catalogue view
   - Per-user permission overrides
8. **Build Approval Queue:**
   - Pending tab with detail view
   - Completed tab with filters
   - Force approve / reassign (admin actions)
9. **Build Region Management**
10. **Build Analytics Dashboard** — charts for productivity, approval SLA, sync activity
11. **Build Audit Log Viewer** — table with filters, CSV export
12. **Build Sync Monitor**
13. **Add Docker configuration** for admin portal
14. **Configure Nginx** to route `/admin` to Next.js (internal only)

### Deliverable
Full admin portal operational. Admins can create users, assign roles, manage permissions, view approval queues, and read audit logs.

---

## Phase 8 — Hardening & Testing
**Duration: 3–5 days**

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

Phases 2, 3, 4 can overlap with two parallel developers.  
Phase 6 (mobile) can start as soon as Phase 2 is done.  
Phase 7 (admin frontend) can start as soon as Phase 5 is done.

---

## Total Estimated Duration

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

With 2 developers working in parallel on appropriate phases: **~20–28 working days.**
