"""
audit/tasks.py
==============
Celery task that performs the actual AuditLog DB write inside the worker.

Receives a flat dict of primitive values (no Django model instances) so it
is safe to serialise across the broker.  On transient DB failures it retries
up to 3 times; all other exceptions are logged and swallowed so audit writes
never cascade failures to callers.
"""
import logging
import uuid as _uuid

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name='audit.write_audit_log',
    ignore_result=True,
    max_retries=3,
    default_retry_delay=5,
    bind=True,
)
def write_audit_log(self, **fields):
    """Write one AuditLog row.  Called by AuditEngine._dispatch()."""
    try:
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType
        from audit.models import AuditLog

        # Resolve actor FK
        actor_id = fields.get('actor_id')
        actor = None
        if actor_id:
            actor = get_user_model().objects.filter(pk=actor_id).first()

        # Resolve ContentType FK
        ct_id = fields.get('content_type_id')
        ct = None
        if ct_id:
            ct = ContentType.objects.filter(id=ct_id).first()

        # Convert request_id string → UUID (or None)
        raw_rid = fields.get('request_id')
        request_id = None
        if raw_rid:
            try:
                request_id = _uuid.UUID(str(raw_rid))
            except (ValueError, AttributeError):
                pass

        AuditLog.objects.create(
            actor=actor,
            actor_username=fields.get('actor_username', ''),
            actor_role=fields.get('actor_role', ''),
            actor_ip=fields.get('actor_ip'),
            actor_device=fields.get('actor_device', ''),
            event_type=fields.get('event_type', ''),
            module=fields.get('module', ''),
            action=fields.get('action', ''),
            content_type=ct,
            object_id=fields.get('object_id', ''),
            object_repr=fields.get('object_repr', ''),
            changes=fields.get('changes') or {},
            request_id=request_id,
        )
    except Exception as exc:
        from django.db import OperationalError
        if isinstance(exc, OperationalError):
            raise self.retry(exc=exc)
        logger.exception('audit.write_audit_log task failed: %s', exc)
