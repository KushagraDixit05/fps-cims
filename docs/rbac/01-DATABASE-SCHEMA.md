# RBAC Database Schema

---

## Design Principles

- All primary keys are UUIDs (except junction tables where composite PKs are cheaper)
- `created_at` / `updated_at` on every table — no exceptions
- Soft deletes via `is_active` / `deleted_at` — never hard-delete permission records
- Enums stored as `CharField` with `choices` — readable in raw SQL, no enum migration pain
- Indexes called out explicitly — don't leave them to Django's default

---

## Table: `accounts_role`

Preset and custom roles. A role is a named bundle of permissions.

```sql
CREATE TABLE accounts_role (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,     -- "Field Executive", "Regional Head"
    code        VARCHAR(50)  NOT NULL UNIQUE,     -- "field_executive", "regional_head"
    description TEXT,
    is_preset   BOOLEAN NOT NULL DEFAULT TRUE,    -- FALSE = admin-created custom role
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_code ON accounts_role(code);
CREATE INDEX idx_role_active ON accounts_role(is_active);
```

**Django model:** `accounts.Role`

---

## Table: `accounts_permission`

The master permission catalogue. All permission codenames live here.

```sql
CREATE TABLE accounts_permission (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codename    VARCHAR(100) NOT NULL UNIQUE,   -- "can_create_crop_visit"
    label       VARCHAR(200) NOT NULL,           -- human-readable
    module      VARCHAR(50)  NOT NULL,           -- "crop_monitoring", "mandi", "product_demo", "analytics", "admin"
    category    VARCHAR(50)  NOT NULL,           -- "create", "read", "update", "delete", "approve", "export", "sync"
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_perm_module ON accounts_permission(module);
CREATE INDEX idx_perm_codename ON accounts_permission(codename);
```

**Seed data:** See `03-PRESET-ROLES.md` for the full permission catalogue.

---

## Table: `accounts_rolepermission`

Many-to-many: which permissions belong to which role.

```sql
CREATE TABLE accounts_rolepermission (
    role_id       UUID NOT NULL REFERENCES accounts_role(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES accounts_permission(id) ON DELETE CASCADE,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_roleperm_role ON accounts_rolepermission(role_id);
CREATE INDEX idx_roleperm_perm ON accounts_rolepermission(permission_id);
```

---

## Table: `accounts_user` (extends existing)

Extends the current `User` model. Existing columns are preserved; new ones added.

```sql
ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS
    -- Identity
    employee_id     VARCHAR(50) UNIQUE,           -- company employee ID
    phone_number    VARCHAR(15) UNIQUE,            -- already exists, keep
    profile_photo   VARCHAR(255),

    -- Role (replaces simple CharField)
    primary_role_id UUID REFERENCES accounts_role(id) ON DELETE RESTRICT,

    -- Hierarchy
    reporting_to_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,

    -- Region scope
    state           VARCHAR(100),
    districts       JSONB DEFAULT '[]',            -- ["Nanded", "Latur"] — denormalised for query speed
    assigned_region_ids UUID[] DEFAULT '{}',       -- FK to region table

    -- Account control
    is_active       BOOLEAN NOT NULL DEFAULT TRUE, -- already exists
    deactivated_at  TIMESTAMPTZ,
    deactivated_by_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    deactivation_reason TEXT,

    -- Device / session
    last_login_device VARCHAR(200),
    last_login_ip     INET,

    -- Metadata
    created_by_id   UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX idx_user_role ON accounts_user(primary_role_id);
CREATE INDEX idx_user_reporting ON accounts_user(reporting_to_id);
CREATE INDEX idx_user_state ON accounts_user(state);
CREATE INDEX idx_user_active ON accounts_user(is_active);
CREATE INDEX idx_user_districts ON accounts_user USING GIN(districts);
```

**Migration note:** The old `role` CharField must be kept and populated during migration, then deprecated. New code reads `primary_role_id`. Old code continues to work. Drop `role` CharField in a future phase once all code is migrated.

---

## Table: `accounts_userpermission`

Per-user permission overrides. Allows granting or denying individual permissions beyond what the role provides.

```sql
CREATE TABLE accounts_userpermission (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES accounts_permission(id) ON DELETE CASCADE,
    effect        VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),  -- explicit grant or deny
    reason        TEXT,
    granted_by_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    expires_at    TIMESTAMPTZ,                   -- NULL = permanent
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, permission_id)
);

CREATE INDEX idx_userperm_user ON accounts_userpermission(user_id);
CREATE INDEX idx_userperm_expires ON accounts_userpermission(expires_at) WHERE expires_at IS NOT NULL;
```

---

## Table: `accounts_region`

Replaces the freeform `region` CharField. Structured geographic hierarchy.

```sql
CREATE TABLE accounts_region (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    code       VARCHAR(50)  NOT NULL UNIQUE,    -- "MH-NAN" for Maharashtra/Nanded
    state      VARCHAR(100) NOT NULL,
    district   VARCHAR(100),                    -- NULL means state-level region
    taluka     VARCHAR(100),                    -- NULL means district-level
    parent_id  UUID REFERENCES accounts_region(id) ON DELETE SET NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_region_state ON accounts_region(state);
CREATE INDEX idx_region_parent ON accounts_region(parent_id);
CREATE INDEX idx_region_code ON accounts_region(code);
```

---

## Table: `accounts_userregion`

Maps users to the regions they are responsible for (many-to-many).

```sql
CREATE TABLE accounts_userregion (
    user_id   UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES accounts_region(id) ON DELETE CASCADE,
    role      VARCHAR(50) DEFAULT 'assigned',   -- "assigned", "backup", "observer"
    PRIMARY KEY (user_id, region_id)
);

CREATE INDEX idx_userregion_user ON accounts_userregion(user_id);
CREATE INDEX idx_userregion_region ON accounts_userregion(region_id);
```

---

## Table: `workflow_approvalworkflow`

Defines approval rule templates. E.g., "Crop Visit submissions need checker review."

```sql
CREATE TABLE workflow_approvalworkflow (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    module          VARCHAR(50)  NOT NULL,        -- "crop_monitoring", "mandi", "product_demo"
    model_name      VARCHAR(100) NOT NULL,         -- Django model name string
    trigger_condition JSONB DEFAULT '{}',          -- JSON rule: {"field": "total_land", "op": "gt", "value": 5}
    require_all     BOOLEAN NOT NULL DEFAULT FALSE, -- all approvers must approve
    approver_role_codes VARCHAR[] NOT NULL,        -- roles that can approve
    escalation_hours INTEGER DEFAULT 48,           -- hours before auto-escalation
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Table: `workflow_approvalinstance`

One instance per record going through approval. This is the state machine.

```sql
CREATE TABLE workflow_approvalinstance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflow_approvalworkflow(id),

    -- Polymorphic link to the record being approved
    content_type_id INTEGER NOT NULL,              -- Django ContentType FK
    object_id       UUID NOT NULL,
    
    -- Submitter
    submitted_by_id UUID NOT NULL REFERENCES accounts_user(id),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- State machine
    status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'draft', 'submitted', 'under_review',
                        'approved', 'rejected', 'revision_requested',
                        'resubmitted', 'escalated', 'cancelled'
                    )),

    -- Snapshot of data at submission time (for audit/compare)
    data_snapshot   JSONB NOT NULL DEFAULT '{}',

    -- Approval tracking
    current_approver_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    approved_by_id  UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    rejected_at     TIMESTAMPTZ,
    rejected_by_id  UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    
    -- Revision
    revision_count  SMALLINT NOT NULL DEFAULT 0,
    revision_note   TEXT,

    -- Escalation
    escalated_at    TIMESTAMPTZ,
    escalated_to_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL,

    -- Timestamps
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_status ON workflow_approvalinstance(status);
CREATE INDEX idx_approval_submitter ON workflow_approvalinstance(submitted_by_id);
CREATE INDEX idx_approval_object ON workflow_approvalinstance(content_type_id, object_id);
CREATE INDEX idx_approval_approver ON workflow_approvalinstance(current_approver_id) WHERE status IN ('submitted', 'under_review');
```

---

## Table: `workflow_approvalaction`

Immutable append-only log of every action taken on an approval instance.

```sql
CREATE TABLE workflow_approvalaction (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_approvalinstance(id) ON DELETE CASCADE,
    actor_id    UUID NOT NULL REFERENCES accounts_user(id),
    action      VARCHAR(30) NOT NULL
                CHECK (action IN (
                    'submitted', 'started_review', 'approved',
                    'rejected', 'requested_revision', 'resubmitted',
                    'escalated', 'cancelled', 'commented'
                )),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apaction_instance ON workflow_approvalaction(instance_id);
CREATE INDEX idx_apaction_actor ON workflow_approvalaction(actor_id);
```

**This table is append-only. No UPDATE or DELETE ever.**

---

## Table: `audit_auditlog`

Immutable audit trail for every significant system event.

```sql
CREATE TABLE audit_auditlog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    actor_id        UUID REFERENCES accounts_user(id) ON DELETE SET NULL,
    actor_username  VARCHAR(150) NOT NULL,         -- denormalised — survives user deletion
    actor_role      VARCHAR(100),                  -- role at time of action
    actor_ip        INET,
    actor_device    VARCHAR(200),
    
    -- Action
    event_type      VARCHAR(50) NOT NULL,           -- "user.created", "permission.granted", "entry.approved"
    module          VARCHAR(50),
    action          VARCHAR(50) NOT NULL,           -- "create", "update", "delete", "approve", etc.
    
    -- Target object
    content_type_id INTEGER,
    object_id       VARCHAR(64),
    object_repr     VARCHAR(300),                   -- string snapshot of the object
    
    -- Change detail
    changes         JSONB DEFAULT '{}',             -- {"field": ["old", "new"]}
    
    -- Context
    request_id      UUID,                           -- correlate with API logs
    sync_batch_id   UUID,                           -- if via mobile sync
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_auditlog(actor_id);
CREATE INDEX idx_audit_event ON audit_auditlog(event_type);
CREATE INDEX idx_audit_object ON audit_auditlog(content_type_id, object_id);
CREATE INDEX idx_audit_created ON audit_auditlog(created_at DESC);
CREATE INDEX idx_audit_module ON audit_auditlog(module);

-- Partition by month for high-volume deployments (future)
-- PARTITION BY RANGE (created_at)
```

**This table is append-only. Enforce via DB trigger or application-level constraint.**

---

## Table: `accounts_refreshtokenblacklist`

Track revoked refresh tokens. Required for immediate permission revocation.

```sql
CREATE TABLE accounts_refreshtokenblacklist (
    jti         UUID PRIMARY KEY,              -- JWT ID claim
    user_id     UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason      VARCHAR(100)                   -- "deactivated", "role_change", "logout", "forced_logout"
);

CREATE INDEX idx_blacklist_user ON accounts_refreshtokenblacklist(user_id);
-- This table is queried on every token refresh — keep it small
-- Archive entries older than 30 days (beyond max refresh token lifetime)
```

---

## Table: `accounts_deviceregistration`

Track devices used by each field executive.

```sql
CREATE TABLE accounts_deviceregistration (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    device_id       VARCHAR(200) NOT NULL,        -- stable device identifier
    device_name     VARCHAR(200),
    platform        VARCHAR(20),                  -- "android", "ios"
    app_version     VARCHAR(20),
    last_active_at  TIMESTAMPTZ,
    is_trusted      BOOLEAN DEFAULT FALSE,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_id)
);

CREATE INDEX idx_device_user ON accounts_deviceregistration(user_id);
```

---

## Entity Relationship Summary

```
accounts_role ──────────── accounts_rolepermission ─────── accounts_permission
     │                                                            │
     │ (primary_role_id)                                          │
     ▼                                                            │
accounts_user ──────────── accounts_userpermission ─────────────┘
     │              │
     │              └──── accounts_userregion ──── accounts_region
     │
     │ (submitted_by_id)
     ▼
workflow_approvalinstance ─── workflow_approvalaction
     │
     └──── (polymorphic FK) ──── CropEntry / MandiArrival / ProductDemo
     
audit_auditlog (references everything via content_type + object_id)
```

---

## Migration Strategy

The existing `accounts_user.role` CharField must be migrated carefully:

```python
# Migration step (data migration, not schema migration)
ROLE_MAP = {
    'field_executive': 'field_executive',
    'admin': 'admin',
    'viewer': 'viewer',
}
# 1. Create Role objects for all ROLE_MAP values
# 2. Set user.primary_role_id = Role.objects.get(code=user.role).id
# 3. Keep old role field for 1 sprint as fallback
# 4. Remove old role field in next migration
```
