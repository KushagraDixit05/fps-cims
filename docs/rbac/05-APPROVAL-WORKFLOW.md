# Approval Workflow Engine

> **Status (2026-06-25): 🟡 Partial.** Only the data shape exists; the engine, state machine, and APIs below are **not built**. See *Implementation Notes*.

## Implementation Notes (current state)

- Each submission model (`FarmerVisit`, `MandiArrival`, `ProductDemo`) has an `approval_status` CharField (default `'draft'`) and `approved_at`. That is the full extent of implementation.
- **No** `ApprovalWorkflow`/`ApprovalInstance`/`ApprovalAction` models, **no** `ApprovalEngine`, **no** transition APIs (`approve`/`reject`/`request-revision`/`resubmit`), **no** auto-create signals, **no** escalation, **no** data-locking. The `workflow/` app is empty.
- Nothing moves a record out of `'draft'` via API; the state machine below is unrealized.
- The only approval-aware code is the read-only `admin_portal` `ApprovalSLAView` (analytics). The admin portal's Approvals queue UI calls `/api/admin/approvals/*`, which **does not exist** (orphaned — see `06-ADMIN-PANEL.md`).

---

## 1. Why a Maker-Checker System

Field data is high-stakes. A crop visit with incorrect land area figures affects procurement decisions, insurance claims, and government reporting. A mandi arrival with fabricated quantity is financial fraud.

The maker-checker pattern requires a second human to verify data before it becomes canonical. This adds friction by design — and surfaces errors before they propagate downstream.

---

## 2. State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
    FE saves entry  ▼                                         │
         ┌──────[DRAFT]                                       │
         │         │                                         │
         │    FE submits                                      │
         │         ▼                                         │
         │    [SUBMITTED] ──── Checker picks up ──── [UNDER_REVIEW]
         │         │                   │
         │         │                   ├── Approve ──────► [APPROVED] ✓
         │         │                   │
         │         │                   ├── Reject ───────► [REJECTED] ✗
         │         │                   │                         │
         │         │                   │                    FE can view
         │         │                   │                    but not edit
         │         │                   │
         │         │                   └── Request Revision ► [REVISION_REQUESTED]
         │         │                                              │
         │         │                                         FE edits + resubmits
         │         │                                              │
         │         └──────────────────────────────────────── [RESUBMITTED]
         │                                                        │
         │                                                   (back to UNDER_REVIEW)
         │
         └── FE cancels (only from DRAFT) ─────────────────► [CANCELLED]
```

### Escalation Path

```
[SUBMITTED] ─── 48h no action ──► [ESCALATED] ─── auto-assigned to Regional Head
[ESCALATED] ─── 24h no action ──► Admin notified (no auto-transition)
```

---

## 3. Status Definitions

| Status | Who Can Act | Editable By | Description |
|--------|-------------|-------------|-------------|
| `draft` | FE | FE | Saved locally, not submitted |
| `submitted` | Checker/Regional Head | Nobody | Awaiting first review |
| `under_review` | Checker/Regional Head | Nobody | Checker has opened it |
| `approved` | Admin only | Admin only (override) | Canonical — feeds analytics |
| `rejected` | Nobody | Nobody | Terminal — FE must create new entry |
| `revision_requested` | FE | FE | Checker flagged issues; FE must correct |
| `resubmitted` | Checker/Regional Head | Nobody | FE corrected and resubmitted |
| `escalated` | Regional Head/Manager | Nobody | Past SLA — escalated up hierarchy |
| `cancelled` | Nobody | Nobody | FE cancelled before submission |

---

## 4. Who Can Approve What

This is configured per `ApprovalWorkflow` record, not hardcoded.

```python
# Seed data for the three existing modules

workflows = [
    {
        'name': 'Crop Visit Approval',
        'module': 'crop_monitoring',
        'model_name': 'FarmerVisit',
        'approver_role_codes': ['checker', 'regional_head', 'manager', 'admin', 'super_admin'],
        'escalation_hours': 48,
        'trigger_condition': {},  # Always requires approval
    },
    {
        'name': 'Mandi Arrival Approval',
        'module': 'mandi',
        'model_name': 'MandiArrival',
        'approver_role_codes': ['checker', 'regional_head', 'manager', 'admin', 'super_admin'],
        'escalation_hours': 24,  # Mandi data is more time-sensitive
        'trigger_condition': {},
    },
    {
        'name': 'Product Demo Approval',
        'module': 'product_demo',
        'model_name': 'ProductDemo',
        'approver_role_codes': ['checker', 'regional_head', 'admin', 'super_admin'],
        'escalation_hours': 72,
        'trigger_condition': {},
    },
]
```

### Conditional Approval

Some entries may not need checker review. For example, if the workflow has a `trigger_condition`:

```json
{"field": "total_land_acres", "op": "lte", "value": 2}
```

Then entries where total land ≤ 2 acres auto-approve (less risk). Entries > 2 acres require checker review.

This allows "straight-through processing" for low-risk data.

---

## 5. Data Locking Strategy

When an approval instance exists for a record, the record is locked based on status:

```python
# In CropEntry/FarmerVisit views

def get_is_locked(self, obj):
    instance = ApprovalInstance.objects.filter(
        content_type=ContentType.objects.get_for_model(obj),
        object_id=obj.pk,
    ).exclude(status__in=['draft', 'cancelled', 'rejected']).first()
    
    if not instance:
        return False

    # Locked except during revision period
    return instance.status not in ['revision_requested']
```

**Locking rules:**
- `draft` → not locked (FE can freely edit)
- `submitted` / `under_review` / `approved` / `resubmitted` / `escalated` → locked (no edits by FE)
- `revision_requested` → unlocked for FE only
- `rejected` → locked (FE cannot edit a rejected entry; must create new)

---

## 6. Offline Implications

### Drafts

WatermelonDB drafts live in `status = 'draft'` locally. The FE can create, edit, and continue working on drafts with zero connectivity. No approval instance exists yet.

### Submission

When FE submits, the entry is pushed to the server during the next sync. The server creates the `ApprovalInstance` at that point. Until sync completes, the entry remains `draft` locally.

### Post-Submission Edits While Offline

If the FE goes offline after submitting (entry is `submitted` on server), they cannot edit it because the local record will have `status = submitted` after the last sync. The app should show it as read-only.

### Revision Requests While Offline

If the checker sends a revision request while the FE is offline:

1. FE's local record still shows `submitted` (stale)
2. On next sync, the record downloads as `revision_requested` with `revision_note`
3. WatermelonDB merges: server wins for status field
4. The app shows the revision note and re-enables the edit flow

**Sync conflict rule:** Status fields always resolve server-wins. Data fields (land area, quantities) resolve last-write-wins only when the record is in an editable state (`draft` or `revision_requested`).

---

## 7. Approval Queue API (for Checker mobile/web view)

```
GET  /api/approvals/queue/              → Paginated list of pending instances
GET  /api/approvals/{id}/              → Instance detail + actions history
POST /api/approvals/{id}/approve/       → Approve
POST /api/approvals/{id}/reject/        → Reject (comment required)
POST /api/approvals/{id}/request-revision/ → Request revision (comment required)
GET  /api/approvals/history/            → Completed approvals (approved/rejected)
```

Queue endpoint filters automatically by the approver's region assignments and role.

---

## 8. Notification Strategy

Notifications are sent asynchronously via Celery.

| Event | Who Gets Notified | Channel |
|-------|-------------------|---------|
| Entry submitted | All checkers in the region | Push + in-app |
| Approved | Submitting FE | Push + in-app |
| Rejected | Submitting FE | Push + in-app |
| Revision requested | Submitting FE | Push + in-app |
| Resubmitted | Checker who last reviewed | Push + in-app |
| Escalated | Regional Head | Push + in-app + email |
| Escalation ignored 24h | Admin | Email |

Push notifications use FCM (Firebase Cloud Messaging). Device tokens are stored in `accounts_deviceregistration`.

---

## 9. Approval History & Comparison View

When a checker opens a submission, they see:

1. The current submitted data
2. Previous approved version (if this is a resubmission)
3. Side-by-side diff of changed fields
4. Full action log with timestamps and actors

The `data_snapshot` JSONB column on `ApprovalInstance` stores the record's state at submission time — enabling the comparison view even if the record is later edited.

---

## 10. Approval Analytics (Admin Dashboard)

Track SLA compliance:

```sql
SELECT
    DATE_TRUNC('week', submitted_at) AS week,
    COUNT(*) AS total_submitted,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
    COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
    AVG(EXTRACT(EPOCH FROM (approved_at - submitted_at))/3600)
        FILTER (WHERE status = 'approved') AS avg_approval_hours
FROM workflow_approvalinstance
GROUP BY week
ORDER BY week DESC;
```
