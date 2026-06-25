# Audit System

> **Status (2026-06-25): 🔄 Done differently.** There is no audit table; events are **synthesized on read**. See *Implementation Notes*.

## Implementation Notes (current state)

- The `audit/` app is empty. `admin_portal/views.py::_build_audit_events()` reconstructs an "audit feed" at request time by scanning submission tables (user registrations + the three submission types) and serves it via `/api/admin/audit/` and `/api/admin/audit/export/`.
- Consequences vs the goals below:
  - **Not immutable / not written** — nothing is persisted; it is recomputed each request.
  - **Not comprehensive** — only `create`-type events; **no** logins, role/permission changes, approvals, updates, or deletes.
  - **No async (Celery)** — synthesis is synchronous.
  - **Missing fields** — `actor_ip`, `actor_device`, `changes`, and `request_id` are always empty.
- `django-simple-history` is not installed; no DB immutability rules exist.

---

## 1. Design Goals

- **Immutable** — once written, audit records cannot be modified or deleted through the application
- **Comprehensive** — every permission-sensitive action is logged
- **Efficient** — writes are async (Celery) so they never slow down the request cycle
- **Queryable** — structured JSON enables filtering and aggregation
- **Exportable** — CSV export for compliance reporting

---

## 2. What Gets Logged

### User Account Events

| Event Type | Trigger |
|-----------|---------|
| `user.created` | Admin creates a new user |
| `user.updated` | User profile changed |
| `user.deactivated` | Account disabled |
| `user.reactivated` | Account re-enabled |
| `user.password_reset` | Password reset triggered |
| `user.force_logout` | Session/device blacklisted |
| `user.login` | Successful login |
| `user.login_failed` | Failed login attempt |
| `user.logout` | User logged out |

### Permission Events

| Event Type | Trigger |
|-----------|---------|
| `permission.role_changed` | User's role updated |
| `permission.override_granted` | User-level ALLOW added |
| `permission.override_denied` | User-level DENY added |
| `permission.override_removed` | Override removed |
| `permission.role_permission_added` | Permission added to a role |
| `permission.role_permission_removed` | Permission removed from a role |

### Data Events (per module)

| Event Type | Trigger |
|-----------|---------|
| `crop.visit_created` | FE creates a visit |
| `crop.visit_updated` | Any field changed |
| `crop.visit_submitted` | FE submits for approval |
| `crop.visit_approved` | Checker/manager approves |
| `crop.visit_rejected` | Checker/manager rejects |
| `crop.visit_revision_requested` | Checker requests revision |
| `crop.visit_deleted` | Visit deleted |
| (same pattern for `mandi.*` and `demo.*`) | |

### Sync Events

| Event Type | Trigger |
|-----------|---------|
| `sync.push` | Mobile app pushed records |
| `sync.pull` | Mobile app pulled records |
| `sync.failed` | Sync attempt failed |

---

## 3. What the Audit Log Record Contains

```python
# Fully populated example
{
    "id": "uuid",
    "actor_id": "user-uuid",
    "actor_username": "john.doe",
    "actor_role": "checker",
    "actor_ip": "192.168.1.100",
    "actor_device": "device-id-abc123",
    "event_type": "crop.visit_approved",
    "module": "crop",
    "action": "visit_approved",
    "content_type_id": 14,
    "object_id": "visit-uuid",
    "object_repr": "FarmerVisit #234 — Ravi Kumar, Nanded",
    "changes": {
        "approval_status": ["under_review", "approved"]
    },
    "request_id": "request-uuid",
    "sync_batch_id": null,
    "created_at": "2026-06-07T09:45:23Z"
}
```

The `changes` field uses the format `{"field_name": ["old_value", "new_value"]}` for updates. For creates, it's `{"field_name": [null, "new_value"]}`. For deletes, `{"field_name": ["old_value", null]}`.

---

## 4. `django-simple-history` Integration

For automatic field-level change tracking on key models, use `django-simple-history`. This complements the custom audit log — simple-history tracks every field on a model, the custom audit log records business-level events.

```python
# accounts/models/user.py
from simple_history.models import HistoricalRecords

class User(AbstractUser):
    # ... fields ...
    history = HistoricalRecords()
```

```python
# crops/models.py (on FarmerVisit)
class FarmerVisit(models.Model):
    # ... fields ...
    history = HistoricalRecords(
        excluded_fields=['updated_at'],  # don't track noise
    )
```

Simple history stores the full row snapshot on every save. The custom audit log stores structured business events. Both are useful; they serve different query patterns.

---

## 5. DB Enforcement of Immutability

The application never calls `UPDATE` or `DELETE` on audit_auditlog. But we can add a PostgreSQL rule to enforce this at the DB level:

```sql
-- Prevent any UPDATE on audit log
CREATE RULE no_update_audit AS ON UPDATE TO audit_auditlog DO INSTEAD NOTHING;

-- Prevent any DELETE on audit log
CREATE RULE no_delete_audit AS ON DELETE TO audit_auditlog DO INSTEAD NOTHING;
```

These rules fire even if someone connects to the DB directly with a Django management command or SQL client (other than superuser). Archive old logs to cold storage rather than deleting.

Similarly for `workflow_approvalaction`:

```sql
CREATE RULE no_update_approval_action AS ON UPDATE TO workflow_approvalaction DO INSTEAD NOTHING;
CREATE RULE no_delete_approval_action AS ON DELETE TO workflow_approvalaction DO INSTEAD NOTHING;
```

---

## 6. Audit API Endpoints (Admin Portal)

```python
# admin_portal/views/audit.py
class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['actor_id', 'event_type', 'module', 'action']
    ordering = ['-created_at']
    ordering_fields = ['created_at']

    def get_queryset(self):
        qs = AuditLog.objects.all()
        
        # Date range filter
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            qs = qs.filter(created_at__gte=start)
        if end:
            qs = qs.filter(created_at__lte=end)
        
        return qs


class AuditLogExportView(APIView):
    """CSV export — super admin only."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        import csv
        from django.http import StreamingHttpResponse

        def rows():
            yield ['Timestamp', 'Actor', 'Role', 'Event', 'Module', 'Object', 'IP', 'Changes']
            for log in AuditLog.objects.order_by('-created_at').iterator(chunk_size=500):
                yield [
                    log.created_at.isoformat(),
                    log.actor_username,
                    log.actor_role,
                    log.event_type,
                    log.module,
                    log.object_repr,
                    str(log.actor_ip),
                    str(log.changes),
                ]

        response = StreamingHttpResponse(
            (csv.writer(r) for r in rows()),
            content_type='text/csv',
        )
        response['Content-Disposition'] = 'attachment; filename="fps-audit.csv"'
        return response
```

---

## 7. Log Retention Policy

| Age | Action |
|-----|--------|
| 0–90 days | Hot storage — PostgreSQL, fully queryable |
| 90 days–1 year | Archive to PostgreSQL partition or object storage (S3/MinIO) |
| 1+ year | Cold archive — S3 Glacier or similar, exportable on demand |

Implement partitioning by month on `audit_auditlog(created_at)` when daily write volume exceeds ~10,000 rows.

---

## 8. Compliance Reporting

Pre-built queries the admin can run from the audit dashboard:

```sql
-- Who approved what in the last 30 days
SELECT actor_username, actor_role, COUNT(*) as approvals
FROM audit_auditlog
WHERE event_type LIKE '%.approved'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY actor_username, actor_role
ORDER BY approvals DESC;

-- Failed login attempts (potential brute force)
SELECT actor_ip, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_auditlog
WHERE event_type = 'user.login_failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY actor_ip
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- Permission changes made by each admin
SELECT actor_username, event_type, COUNT(*) as changes
FROM audit_auditlog
WHERE module = 'permission'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY actor_username, event_type
ORDER BY actor_username, event_type;
```
