# Backend Architecture

> **Status (2026-06-26): ✅ Complete.** All phases 0–7 are done. Phases 3 (Approval Workflow) and 4 (Audit Engine) are fully implemented. Phase 7 (Admin Portal Frontend) is 100% complete as of 2026-06-26. See *Implementation Notes*.

## Implementation Notes (current state)

- **`accounts`** — real, extended: `models/` package fully established with RBAC tables. `PermissionService`, `tokens`, `signals`, `mixins`, `permissions`, and `middleware` (AuditContext) are all wired up.
- **`admin_portal`** — real: user-mgmt, analytics, audit, roles, permissions, user-permissions, approvals, regions, and sync monitor views are all live.
- **`workflow`** — ✅ **complete**: `ApprovalEngine` with 10 transition methods, all state machine APIs, `workflow/signals.py` auto-creates `ApprovalInstance` on sync, hourly Celery escalation task.
- **`audit`** — ✅ **complete**: `AuditEngine` service, async Celery writes with sync fallback, full instrumentation (25+ event types), PostgreSQL immutability RULEs on `audit_auditlog` + `workflow_approvalaction`.
- **`crops`/`mandi`/`product_demo`** — existing; gained `approval_status`/`approved_at` fields and owner-filtered querysets. `HasFPSPermission` is available for integration.

---

## 1. Django App Structure

The RBAC system is split across existing and new apps to maintain separation of concerns.

```
backend/
├── accounts/           # EXTENDED — User model, Role, Permission, auth APIs
├── workflow/           # NEW — Approval engine, state machine, queues
├── audit/              # NEW — Immutable audit logging
├── admin_portal/       # NEW — Admin-facing APIs (separate from mobile APIs)
├── crops/              # EXISTING — unchanged models, add permission checks
├── mandi/              # EXISTING — unchanged models, add permission checks
├── product_demo/       # EXISTING — unchanged models, add permission checks
└── fps_backend/
    ├── settings.py
    ├── permissions.py  # Global DRF permission classes
    └── middleware.py   # Request context injection
```

---

## 2. `accounts` App — Extended

### New Models

```
accounts/
├── models/
│   ├── __init__.py
│   ├── user.py           # Extended User model
│   ├── role.py           # Role, RolePermission
│   ├── permission.py     # Permission (the catalogue)
│   ├── user_permission.py # UserPermission (overrides)
│   └── region.py         # Region, UserRegion
├── services/
│   ├── permission_service.py
│   ├── user_service.py    # create_user, deactivate_user, etc.
│   └── token_service.py   # custom JWT logic
├── permissions.py         # DRF permission classes
├── serializers.py
├── tokens.py              # Custom TokenObtainPairSerializer
├── views.py
├── signals.py             # Cache invalidation triggers
└── admin.py
```

### Key API Endpoints (mobile auth)

```
POST /api/auth/login/              → returns access + refresh tokens with perms embedded
POST /api/auth/token/refresh/      → returns new access token (permission refresh happens here)
POST /api/auth/logout/             → blacklists refresh token
GET  /api/auth/me/                 → current user info + permissions (from token, not DB)
```

---

## 3. `workflow` App — New

### Structure

```
workflow/
├── models/
│   ├── approval_workflow.py     # ApprovalWorkflow (template)
│   └── approval_instance.py    # ApprovalInstance, ApprovalAction
├── services/
│   ├── approval_engine.py      # Core state machine
│   └── escalation_service.py  # Celery-driven escalation
├── permissions.py
├── serializers.py
├── views.py
├── tasks.py                    # Celery tasks
└── signals.py                  # Auto-create instances on model save
```

### Approval Engine Service

```python
# workflow/services/approval_engine.py

class ApprovalEngine:
    
    @classmethod
    def submit(cls, instance: ApprovalInstance, actor: User, comment: str = '') -> ApprovalInstance:
        """Transition from draft → submitted."""
        cls._assert_status(instance, ['draft'])
        cls._assert_permission(actor, 'can_submit_crop_visit')  # dynamic per module
        
        instance.status = 'submitted'
        instance.submitted_at = timezone.now()
        instance.save(update_fields=['status', 'submitted_at', 'updated_at'])
        
        cls._log_action(instance, actor, 'submitted', comment)
        cls._notify_approvers(instance)
        AuditEngine.log(actor, 'approval.submitted', instance)
        return instance

    @classmethod
    def approve(cls, instance: ApprovalInstance, actor: User, comment: str = '') -> ApprovalInstance:
        """Transition from submitted/under_review → approved."""
        cls._assert_status(instance, ['submitted', 'under_review'])
        cls._assert_can_approve(actor, instance)
        
        instance.status = 'approved'
        instance.approved_at = timezone.now()
        instance.approved_by = actor
        instance.save(update_fields=['status', 'approved_at', 'approved_by', 'updated_at'])
        
        cls._log_action(instance, actor, 'approved', comment)
        cls._apply_approval_to_record(instance)
        AuditEngine.log(actor, 'approval.approved', instance)
        return instance

    @classmethod
    def reject(cls, instance: ApprovalInstance, actor: User, comment: str) -> ApprovalInstance:
        """Transition → rejected. Comment is mandatory."""
        if not comment:
            raise ValidationError("Rejection reason is required.")
        cls._assert_status(instance, ['submitted', 'under_review'])
        cls._assert_can_approve(actor, instance)
        
        instance.status = 'rejected'
        instance.rejected_at = timezone.now()
        instance.rejected_by = actor
        instance.save(update_fields=['status', 'rejected_at', 'rejected_by', 'updated_at'])
        
        cls._log_action(instance, actor, 'rejected', comment)
        cls._notify_submitter(instance, comment)
        AuditEngine.log(actor, 'approval.rejected', instance)
        return instance

    @classmethod
    def request_revision(cls, instance, actor, comment: str) -> ApprovalInstance:
        """Transition → revision_requested. Record remains editable by submitter."""
        if not comment:
            raise ValidationError("Revision instructions are required.")
        cls._assert_status(instance, ['submitted', 'under_review'])
        
        instance.status = 'revision_requested'
        instance.revision_count += 1
        instance.revision_note = comment
        instance.save(update_fields=['status', 'revision_count', 'revision_note', 'updated_at'])
        
        cls._log_action(instance, actor, 'requested_revision', comment)
        cls._notify_submitter(instance, comment)
        AuditEngine.log(actor, 'approval.revision_requested', instance)
        return instance

    @classmethod
    def resubmit(cls, instance, actor, comment: str = '') -> ApprovalInstance:
        """Transition from revision_requested → resubmitted."""
        cls._assert_status(instance, ['revision_requested'])
        cls._assert_is_submitter(actor, instance)
        
        instance.status = 'resubmitted'
        instance.save(update_fields=['status', 'updated_at'])
        
        cls._log_action(instance, actor, 'resubmitted', comment)
        cls._notify_approvers(instance)
        AuditEngine.log(actor, 'approval.resubmitted', instance)
        return instance

    # --- Private helpers ---

    @staticmethod
    def _assert_status(instance, allowed_statuses):
        if instance.status not in allowed_statuses:
            raise ValidationError(
                f"Action not allowed in current status: {instance.status}"
            )

    @staticmethod
    def _assert_can_approve(actor, instance):
        approver_codes = instance.workflow.approver_role_codes
        if actor.primary_role.code not in approver_codes:
            raise PermissionDenied("You are not authorized to approve this entry.")

    @staticmethod
    def _log_action(instance, actor, action, comment):
        ApprovalAction.objects.create(
            instance=instance,
            actor=actor,
            action=action,
            comment=comment,
        )
```

---

## 4. `audit` App — New

### Structure

```
audit/
├── models.py        # AuditLog (append-only)
├── engine.py        # AuditEngine — the only way to write logs
├── middleware.py    # Inject request_id into thread-local context
├── serializers.py
├── views.py         # Admin-only read endpoints
└── tasks.py         # Async audit write task
```

### AuditEngine

```python
# audit/engine.py
import threading
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog
from .tasks import write_audit_log_async

_context = threading.local()

class AuditEngine:
    
    @classmethod
    def set_request_context(cls, request_id, device, ip):
        """Called by middleware at request start."""
        _context.request_id = request_id
        _context.device = device
        _context.ip = ip

    @classmethod
    def log(cls, actor, event_type: str, obj=None, changes: dict = None, **kwargs):
        """
        Write an audit entry. Always async (Celery task) to avoid
        blocking the request/response cycle.
        """
        payload = {
            'actor_id': str(actor.id) if actor else None,
            'actor_username': actor.username if actor else 'system',
            'actor_role': actor.primary_role.code if actor and actor.primary_role_id else '',
            'actor_ip': str(getattr(_context, 'ip', '')),
            'actor_device': getattr(_context, 'device', ''),
            'event_type': event_type,
            'module': event_type.split('.')[0],
            'action': event_type.split('.')[1] if '.' in event_type else event_type,
            'content_type_id': ContentType.objects.get_for_model(obj).id if obj else None,
            'object_id': str(obj.pk) if obj else None,
            'object_repr': str(obj) if obj else '',
            'changes': changes or {},
            'request_id': str(getattr(_context, 'request_id', '')),
        }
        write_audit_log_async.delay(payload)
```

---

## 5. Middleware

### `AuditContextMiddleware`

```python
# fps_backend/middleware.py
import uuid
from audit.engine import AuditEngine

class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = uuid.uuid4()
        device = request.META.get('HTTP_X_DEVICE_ID', '')
        ip = self._get_client_ip(request)
        AuditEngine.set_request_context(request_id, device, ip)
        response = self.get_response(request)
        response['X-Request-ID'] = str(request_id)
        return response

    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
```

Add to `MIDDLEWARE` in settings.py, after `AuthenticationMiddleware`.

---

## 6. Admin Portal App — Separate

The admin portal uses a **separate set of DRF views** under `/api/admin/`. These views require the `fps-admin` JWT audience claim.

```
admin_portal/
├── views/
│   ├── users.py           # CRUD + activate/deactivate
│   ├── roles.py           # Role management
│   ├── permissions.py     # Permission assignment
│   ├── regions.py         # Region management
│   ├── approvals.py       # Approval queue management
│   ├── analytics.py       # Dashboard data
│   └── audit.py           # Audit log viewer + export
├── serializers/
├── permissions.py         # AdminPortalPermission class
└── urls.py
```

### Admin JWT — Separate Audience

```python
# admin_portal/permissions.py
class IsAdminPortalUser(BasePermission):
    """Only allow tokens issued for the admin portal."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Check JWT audience
        aud = request.auth.payload.get('aud', '')
        if aud != 'fps-admin':
            return False
        # Check role
        role = request.auth.payload.get('role', '')
        return role in ('admin', 'super_admin')
```

Admins log in at a separate endpoint: `POST /api/admin/auth/login/`  
This endpoint issues a token with `aud: fps-admin`.

---

## 7. Celery Tasks

```python
# workflow/tasks.py
from celery import shared_task
from django.utils import timezone

@shared_task
def check_approval_escalations():
    """
    Run every hour. Find approval instances past their escalation deadline
    and transition them to 'escalated' status.
    """
    from .models import ApprovalInstance
    from .services.escalation_service import EscalationService
    
    now = timezone.now()
    overdue = ApprovalInstance.objects.filter(
        status__in=['submitted', 'under_review'],
    ).select_related('workflow', 'submitted_by', 'current_approver')
    
    for instance in overdue:
        hours_since_submit = (now - instance.submitted_at).total_seconds() / 3600
        if hours_since_submit >= instance.workflow.escalation_hours:
            EscalationService.escalate(instance)
```

```python
# audit/tasks.py
@shared_task
def write_audit_log_async(payload: dict):
    from .models import AuditLog
    AuditLog.objects.create(**payload)
```

---

## 8. Signal Hooks on Existing Models

To trigger approval workflows automatically when FE submits data:

```python
# crops/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from workflow.services.approval_engine import ApprovalEngine

@receiver(post_save, sender=FarmerVisit)
def create_approval_on_submit(sender, instance, created, **kwargs):
    """When a FarmerVisit transitions to submitted status, open an approval instance."""
    if not created and instance.status == 'submitted':
        workflow = ApprovalWorkflow.objects.filter(
            module='crop_monitoring',
            model_name='FarmerVisit',
            is_active=True
        ).first()
        if workflow:
            ApprovalEngine.create_instance(workflow, instance, instance.submitted_by)
```

---

## 9. `settings.py` Additions

```python
# fps_backend/settings.py

INSTALLED_APPS += [
    'workflow',
    'audit',
    'admin_portal',
]

MIDDLEWARE += [
    'fps_backend.middleware.AuditContextMiddleware',
]

# Redis cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
    }
}

# Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://127.0.0.1:6379/0')
CELERY_BEAT_SCHEDULE = {
    'check-escalations': {
        'task': 'workflow.tasks.check_approval_escalations',
        'schedule': 3600,  # every hour
    },
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'TOKEN_OBTAIN_SERIALIZER': 'accounts.tokens.FPSTokenObtainPairSerializer',
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```
