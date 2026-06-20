# Phase 4 — Editable Submissions & Audit

> **Goal:** Allow users to edit submitted entries within a time window, with role-based permissions, locked fields, and a full audit trail with version history.

**Depends on:** Phase 0, RBAC branch (role-based editing permissions)

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| G-4 | Edit Submitted Entries | All three modules |

---

## Estimated Effort

- **Total:** 10–14 days
- **Risk:** High — touches all three modules, requires audit infrastructure, depends on RBAC for role-based constraints

---

## Design Decisions

### Edit Window
- Entries are editable for a **configurable duration** after submission.
- **Default:** 24 hours.
- Stored as a system setting (admin-configurable via Admin Portal).
- After the window expires, entries become **read-only**.

### Role-Based Edit Permissions

| Role | Scope | Notes |
|------|-------|-------|
| Field Executive | Own entries only | Within the edit window |
| Manager | Team entries | Team = direct reports |
| Admin | All entries | No time restriction |

> [!IMPORTANT]
> Role-based constraints depend on the RBAC engine from `feature/rbac-implementation`. If RBAC is not merged before this phase, implement a simplified version (Field Executive → own entries only, Admin → all entries).

### Editable vs Locked Fields

| Editable | Locked (Never Editable) |
|----------|-------------------------|
| Remarks / observations | Submission timestamp (`submitted_at`) |
| Photos (add new, no delete) | Creator (`executive` / `submitted_by`) |
| Contact information | Sync identifiers (`local_id`) |
| Non-critical metadata | Audit fields (`created_at`) |
| Market insight | UUID primary key |
| Crop condition (CMM) | — |
| Prices (Market Intel) | — |

---

## 1. Backend Changes

### 1.1 System Settings Model

```python
# New: fps_backend/models.py or a new 'settings' app
class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

# Initial seed:
# { key: 'edit_window_hours', value: 24 }
```

### 1.2 Edit Eligibility Logic

Shared utility function:

```python
# utils/edit_eligibility.py
from datetime import timedelta
from django.utils import timezone

def can_edit(record, user):
    """Returns (can_edit: bool, reason: str)."""
    
    # Admin can always edit
    if user.is_staff or user.role == 'admin':
        return True, 'admin_override'
    
    # Check ownership
    owner_field = getattr(record, 'executive', None) or getattr(record, 'submitted_by', None)
    if owner_field != user:
        return False, 'not_owner'
    
    # Check time window
    edit_window = SystemSetting.objects.filter(key='edit_window_hours').first()
    hours = edit_window.value if edit_window else 24
    submitted = getattr(record, 'submitted_at', None) or getattr(record, 'created_at', None)
    
    if timezone.now() > submitted + timedelta(hours=hours):
        return False, 'window_expired'
    
    return True, 'allowed'
```

### 1.3 PATCH Endpoints (Update Existing)

The existing PATCH endpoints need to be extended:

| Module | Endpoint | Status |
|--------|----------|--------|
| Crop Intelligence | `PATCH /api/farmer-visits/<uuid>/` | Exists — needs edit guards |
| Market Intelligence | `PATCH /api/market-visits/<uuid>/` | New (Phase 3 model) |
| Product Performance | `PATCH /api/product-demos/<uuid>/` | Needs to be created |

Each PATCH handler:
1. Check `can_edit()`.
2. Validate only editable fields are being changed.
3. Reject changes to locked fields.
4. Create an audit record (see §1.4).
5. Save the update.

### 1.4 Audit Trail — Edit History

```python
# audit/models.py (extend existing app)
class EditRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # What was edited
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=100)
    
    # Who edited
    edited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    edited_at = models.DateTimeField(auto_now_add=True)
    
    # What changed
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    
    # Context
    reason = models.TextField(blank=True)  # Optional reason for the edit
    
    class Meta:
        ordering = ['-edited_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
```

### 1.5 Version History API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farmer-visits/<uuid>/history/` | Edit history for a visit |
| GET | `/api/market-visits/<uuid>/history/` | Edit history for a market visit |
| GET | `/api/product-demos/<uuid>/history/` | Edit history for a demo |

Returns a list of `EditRecord` objects for the given record.

---

## 2. Mobile Changes

### 2.1 Edit Button on Detail Screens

On each detail screen (`CropMonitoringDetailScreen`, `MandiArrivalDetailScreen`, `ProductDemoDetailScreen`):

1. Check if the entry is within the edit window.
2. If editable:
   - Show an "Edit" button in the header.
   - Tapping opens the wizard in **edit mode** with pre-filled data.
3. If not editable:
   - Show a disabled "Edit" button with a tooltip: "Editing window expired."
   - Or hide the button entirely.

### 2.2 Edit Mode Wizard

The existing wizard screens (Step 1, Step 2, etc.) need an **edit mode**:

```typescript
// Navigation params
type CropMonitoringFormParams = {
  mode: 'create' | 'edit';
  visitId?: string;       // Only in edit mode
  existingData?: FormState; // Pre-filled data for edit mode
};
```

In edit mode:
- All fields are pre-filled with existing data.
- Locked fields are displayed but **disabled** (greyed out, non-interactive).
- Editable fields are interactive.
- Submit button says "Save Changes" instead of "Submit".
- On save, send PATCH instead of POST.

### 2.3 Offline Edit Support

- Edits made offline are stored as pending updates in WatermelonDB.
- New column on each module table: `has_pending_edit` (boolean).
- On sync: send PATCH requests for edited records.
- If the edit window has expired by the time sync happens, the backend rejects the edit and the mobile shows an error.

### 2.4 Edit Confirmation

Before saving edits, show a confirmation dialog:

> "You are about to modify a submitted entry. This change will be recorded in the audit log. Continue?"
>
> [Cancel] [Save Changes]

---

## 3. Admin Portal Changes

### 3.1 Edit History View

On each detail view in the admin portal:
- New "History" tab showing the timeline of edits.
- Each edit shows: field changed, old value, new value, edited by, timestamp.

### 3.2 Edit Window Configuration

New admin settings page:
- Edit window duration (hours): input field, default 24.
- Save updates the `SystemSetting` record.

### 3.3 Audit Log Enhancement

The existing Audit Log page (`admin-portal/src/app/(dashboard)/audit/`) should include:
- Edit events in addition to creation events.
- Filter by event type: `create` | `edit`.

---

## Open Questions

> [!WARNING]
> These are critical design decisions that affect user experience and data integrity.

1. **Approval workflow:** Should edits require manager approval (maker-checker), or are they immediately applied?
2. **Photo edits:** Can users add new photos to an existing entry? Can they delete photos?
3. **Crop record edits (CMM):** Can users add/remove crops from a visit, or only edit existing crop records?
4. **Offline edit conflicts:** If two users edit the same record offline, how do we resolve conflicts?
5. **Edit reason:** Should we require a reason/comment for each edit?
6. **Notification:** Should the original submitter be notified when a manager edits their entry?

---

## Implementation Order

1. **Backend:** System settings model, edit eligibility utility, PATCH handlers, audit trail.
2. **Mobile:** Detail screen edit button, edit mode wizard, offline edit support.
3. **Admin Portal:** History view, settings page, audit log enhancement.

---

## Verification Plan

### Automated
- Test edit within window → success.
- Test edit after window → rejection.
- Test locked field edit → rejection.
- Test admin edit after window → success (admin override).
- Test audit record creation on edit.

### Manual
- Create a visit, wait 5 minutes, edit successfully.
- Wait 24+ hours, verify edit is blocked.
- Login as admin, verify can edit any entry at any time.
- Check audit log shows the edit history.
- Test offline edit → sync → verify edit applied.
