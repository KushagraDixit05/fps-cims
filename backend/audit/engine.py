import threading
from django.contrib.contenttypes.models import ContentType

_context = threading.local()


class AuditEngine:

    @classmethod
    def set_request_context(cls, request_id, device, ip):
        _context.request_id = request_id
        _context.device = device
        _context.ip = str(ip) if ip else ''

    @classmethod
    def log(cls, actor, event_type: str, obj=None, changes: dict = None, **kwargs):
        from audit.tasks import write_audit_log_async

        parts = event_type.split('.', 1)
        module = parts[0]
        action = parts[1] if len(parts) > 1 else event_type

        ct_id = None
        if obj is not None:
            try:
                ct_id = ContentType.objects.get_for_model(obj).id
            except Exception:
                pass

        payload = {
            'actor_id': str(actor.id) if actor else None,
            'actor_username': actor.username if actor else 'system',
            'actor_role': (actor.primary_role.code if actor and actor.primary_role_id
                           else (actor.role if actor else '')),
            'actor_ip': getattr(_context, 'ip', ''),
            'actor_device': getattr(_context, 'device', ''),
            'event_type': event_type,
            'module': module,
            'action': action,
            'content_type_id': ct_id,
            'object_id': str(obj.pk) if obj else '',
            'object_repr': str(obj) if obj else '',
            'changes': changes or {},
            'request_id': str(getattr(_context, 'request_id', '')) or None,
        }
        try:
            write_audit_log_async.delay(payload)
        except Exception:
            # Celery not available (dev/test) — write synchronously
            from audit.models import AuditLog
            _write_log(payload)


def _write_log(payload: dict):
    from audit.models import AuditLog
    import uuid

    rid = payload.get('request_id')
    try:
        rid = uuid.UUID(rid) if rid else None
    except (ValueError, AttributeError):
        rid = None

    AuditLog.objects.create(
        actor_id=payload.get('actor_id'),
        actor_username=payload['actor_username'],
        actor_role=payload.get('actor_role', ''),
        actor_ip=payload.get('actor_ip') or None,
        actor_device=payload.get('actor_device', ''),
        event_type=payload['event_type'],
        module=payload.get('module', ''),
        action=payload['action'],
        content_type_id=payload.get('content_type_id'),
        object_id=payload.get('object_id', ''),
        object_repr=payload.get('object_repr', ''),
        changes=payload.get('changes', {}),
        request_id=rid,
    )
