# Admin Panel Architecture

> **Status (2026-06-26): 🟡 Mostly built (Approvals pending).** The portal is live, and Phase 2 un-orphaned the Roles and Permissions pages. See *Implementation Notes*.

## Implementation Notes (current state)

Built with **Next.js 16** (this doc says 15), shadcn/ui, Tailwind, TanStack Query, Zustand.

| Page | State |
|------|-------|
| Dashboard | ✅ built + wired |
| User Management | ✅ built + wired (`/api/admin/users/*`) |
| Analytics | ✅ built + wired (`/api/admin/analytics/*`) |
| Audit Log Viewer | ✅ built + wired, but reads **synthesized** audit (see `08`) |
| Role Management | ✅ built + wired (`/api/admin/roles/*`) |
| Permission Management | ✅ built + wired (`/api/admin/permissions/`, `/api/admin/user-permissions/`) |
| Approval Queue | 🟡 UI built, **orphaned** — calls missing `/api/admin/approvals/*` |
| Region Management | ⛔ not built |
| Sync Monitor | ⛔ not built |

**Auth deviations:** localStorage Zustand store + client-side JWT decode (`store/authStore.ts`, `lib/api.ts`) — **not** the httpOnly-cookie / `aud: fps-admin` model below. `AuthGuard` enforces *logged-in only*; there are **no permission-based route guards** (any authenticated user can open every admin page). Only the audit-CSV export is role-gated. No Docker/Nginx config yet.

---

## 1. Stack Decision

**Next.js 15 (App Router) — deployed as a separate internal service.**

### Why Next.js (not Django Admin, not a React SPA)

| Criteria | Django Admin | React SPA | Next.js |
|----------|-------------|-----------|---------|
| Server-side rendering | ✓ (but rigid) | ✗ | ✓ |
| Custom UI design | Very limited | ✓ | ✓ |
| SEO (irrelevant for admin) | n/a | n/a | n/a |
| Auth at server level | ✓ | ✗ | ✓ |
| API colocation | ✓ | ✗ | ✓ (route handlers) |
| Table/data-heavy UIs | Poor | Good | Good |
| Real-time updates | Poor | Good | Good |
| Dev speed | Fast for simple needs | Slow | Medium-fast |

**Decision: Next.js 15 with shadcn/ui component library.**

Django Admin remains useful for super admin emergency access and database-level operations. It is NOT the primary admin UI.

### Why a Separate Service (Not Same Backend)

- Admin can be deployed on an internal network without exposing it to the public internet
- Separate scaling — admin portal can be smaller instances
- Separate deployment lifecycle — admin UI changes don't affect mobile API
- The `fps-admin` JWT audience claim ensures mobile tokens cannot be replayed against admin endpoints

---

## 2. Admin Portal Pages

### 2.1 Dashboard (Home)

**Route:** `/dashboard`

Widgets:
- Total users (by role breakdown)
- Active field executives today
- Pending approvals (by module)
- Sync activity (last 24h)
- Recent audit events
- Escalated approvals requiring attention

Real-time updates via polling (10s interval) or WebSocket (if needed).

---

### 2.2 User Management

**Route:** `/users`

#### User List (`/users`)
- Paginated, searchable, filterable by role / region / status
- Columns: Name, Employee ID, Role, Region, Status, Last Login, Actions
- Bulk actions: Activate, Deactivate, Export CSV

#### Create User (`/users/new`)
Multi-step form:
1. **Basic Info** — Name, Email, Phone, Employee ID
2. **Role Assignment** — Select role (dropdown of all active roles)
3. **Region Assignment** — State → District → Multi-select districts
4. **Reporting Manager** — Autocomplete search of managers/regional heads
5. **Custom Permissions** (optional) — Permission overrides beyond role
6. **Review & Create**

The form calls `POST /api/admin/users/`.  
On success, an auto-generated temporary password is sent to the user's email/phone.

#### User Detail (`/users/:id`)
- Profile summary
- Role + effective permissions viewer
- Region assignments
- Reporting hierarchy (who reports to them, who they report to)
- Active device sessions
- Approval queue stats
- Audit log timeline for this user
- Actions: Edit, Deactivate, Force Logout, Reset Password

#### Edit User (`/users/:id/edit`)
- Same as create form but pre-populated
- Role change triggers confirmation modal: "Changing role will alter 12 permissions. Continue?"

---

### 2.3 Role Management

**Route:** `/roles`

- List all roles (preset + custom), show user count per role
- View role detail: permission breakdown by module
- Create custom role: name, select permissions from catalogue (grouped by module)
- Edit preset roles (super admin only — show warning)
- Delete custom role (only if 0 users assigned)

---

### 2.4 Permission Management

**Route:** `/permissions`

- Full permission catalogue view (grouped by module + category)
- Search by codename
- Per-user permission overrides:
  - Search user
  - See effective permissions (role-granted vs. user-override)
  - Add ALLOW or DENY override with optional expiry date
  - Remove override

---

### 2.5 Approval Queue

**Route:** `/approvals`

Tabs: `Pending` | `Under Review` | `Escalated` | `Completed`

#### Pending Tab
- Grouped by module and region
- Sort by submission time (oldest first by default)
- Quick actions: Assign to checker, Force Approve (admin only), View Details

#### Completed Tab
- Filter by date range, module, approver, status
- Export as CSV

#### Approval Detail (`/approvals/:id`)
- Record data + previous version comparison (diff view)
- Approval action log
- Admin override buttons: Force Approve, Reassign

---

### 2.6 Region Management

**Route:** `/regions`

- Hierarchical tree view: State → District → Taluka
- Create/edit regions
- Region-to-user mapping: who covers which regions
- View regional statistics inline

---

### 2.7 Analytics Dashboard

**Route:** `/analytics`

Sub-pages:
- **Productivity** — FE submission rates, by region/period
- **Approval SLA** — Average approval time, SLA breach rate
- **Sync Activity** — Devices syncing, sync frequency, failed syncs
- **Data Quality** — Rejection rate, revision rate, resubmission rate
- **Module Usage** — Crop vs. Mandi vs. Product Demo breakdown

All charts are filter-controlled: date range, state, district, role.

---

### 2.8 Audit Log Viewer

**Route:** `/audit`

- Paginated, filterable by: actor, event type, module, date range, object
- Expandable rows showing change details (`{"field": ["old_val", "new_val"]}`)
- Export to CSV (super admin only)
- Immutable — no edit/delete UI exposed here

---

### 2.9 Sync Monitor

**Route:** `/sync`

- Live table of recent sync attempts
- Fields: User, Device, Timestamp, Records pushed, Records pulled, Status
- Failed sync detail: error message, retry count
- Alert configuration: notify admin if FE hasn't synced in X hours

---

## 3. API Architecture

### Namespace

All admin APIs are under `/api/admin/` and are completely separate from mobile APIs under `/api/`.

```
/api/admin/auth/login/              POST — admin login (fps-admin audience)
/api/admin/users/                   GET, POST
/api/admin/users/:id/               GET, PATCH, DELETE
/api/admin/users/:id/deactivate/    POST
/api/admin/users/:id/force-logout/  POST
/api/admin/users/:id/reset-password/ POST
/api/admin/roles/                   GET, POST
/api/admin/roles/:id/               GET, PATCH, DELETE
/api/admin/permissions/             GET
/api/admin/user-permissions/        GET, POST, DELETE
/api/admin/regions/                 GET, POST, PATCH
/api/admin/approvals/               GET
/api/admin/approvals/:id/force-approve/ POST
/api/admin/approvals/:id/reassign/  POST
/api/admin/audit/                   GET
/api/admin/audit/export/            GET (super admin)
/api/admin/analytics/productivity/  GET
/api/admin/analytics/approval-sla/  GET
/api/admin/sync/                    GET
```

### Admin Authentication Flow

```
Admin User
    │
    ▼ POST /api/admin/auth/login/ (email + password + OTP if configured)
    │
    ▼ Backend validates: is_active + role in (admin, super_admin)
    │
    ▼ Issues token with aud: "fps-admin"
    │
    ▼ Admin portal stores token in httpOnly cookie (not localStorage)
    │
    ▼ All /api/admin/* requests include cookie
    │
    ▼ IsAdminPortalUser permission class validates aud claim on every request
```

**httpOnly cookie, not localStorage.** This protects admin tokens from XSS — JavaScript cannot read httpOnly cookies.

---

## 4. Next.js API Route Handlers (BFF Pattern)

Next.js route handlers act as a Backend-For-Frontend layer. The browser talks to Next.js; Next.js talks to Django.

This enables:
- The admin token lives in a server-side session (httpOnly cookie)
- The browser never directly calls the Django API
- Cross-origin concerns are eliminated
- Rate limiting can be added at the Next.js layer

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const session = await getAdminSession(request);  // reads httpOnly cookie
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const response = await fetch(`${DJANGO_API_URL}/api/admin/users/`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await response.json();
  return Response.json(data);
}
```

---

## 5. Deployment

```yaml
# docker-compose.yml addition

  admin-portal:
    build: ./admin-portal
    ports:
      - "3001:3000"       # Internal only — not exposed to public
    environment:
      DJANGO_API_URL: http://backend:8000
      NEXTAUTH_SECRET: ${ADMIN_SECRET}
    networks:
      - internal

  # Nginx rule: /admin → admin-portal:3000 (only on VPN/internal network)
```

The admin portal should NOT be publicly accessible. Put it behind a VPN or IP allowlist at the nginx/load-balancer level.

---

## 6. Technology Choices Summary

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 | SSR + API routes + ecosystem |
| UI components | shadcn/ui + Tailwind | Accessible, no bundle bloat |
| Data tables | TanStack Table | Headless, sorts/filters/pagination |
| Charts | Recharts | React-native-friendly API |
| Forms | React Hook Form + Zod | Type-safe, performant |
| State | Zustand (minimal) | Global auth state only |
| Server state | TanStack Query | Caching + background refresh |
| Auth | Custom session (httpOnly cookie) | Security — no localStorage tokens |
