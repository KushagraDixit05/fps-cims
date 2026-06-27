"""
audit/tasks.py
==============
Celery tasks for the audit app:

  write_audit_log        — async AuditLog writer (called by AuditEngine).
  check_sync_staleness   — Phase 8 monitoring: alert if device hasn't synced
                           in 48h (runs every 6 hours via Celery beat).
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


@shared_task(name='audit.check_sync_staleness', ignore_result=True)
def check_sync_staleness():
    """
    Phase 8 monitoring alert — runs every 6 hours.

    Finds field-executive devices whose most recent DeviceSyncLog entry is
    older than 48 hours (or that have never synced), and logs a WARNING for
    each stale device.  Also writes a single AuditLog summary entry so the
    admin portal audit page shows the alert.

    Returns a list of stale device IDs for Celery beat logging.
    """
    from datetime import timedelta

    from django.utils import timezone

    from accounts.models.device import DeviceSyncLog
    from audit.engine import AuditEngine

    cutoff = timezone.now() - timedelta(hours=48)

    # Find the latest sync per device and filter those that are stale.
    from django.db.models import Max

    # Group by device registration and find the latest sync per device.
    latest_per_device = (
        DeviceSyncLog.objects
        .values('device__device_id')        # device_id string on DeviceRegistration
        .annotate(last_sync=Max('synced_at'))
        .filter(last_sync__lt=cutoff)
    )

    stale_device_ids = [row['device__device_id'] for row in latest_per_device]

    if not stale_device_ids:
        return []

    logger.warning(
        'MONITORING ALERT — %d device(s) have not synced in >48h: %s',
        len(stale_device_ids),
        stale_device_ids[:10],
    )

    AuditEngine.log(
        request=None,
        event_type='alert',
        action='sync_staleness',
        module='sync',
        changes={
            'stale_device_count': len(stale_device_ids),
            'stale_device_ids': stale_device_ids[:20],
            'cutoff': cutoff.isoformat(),
        },
    )

    return stale_device_ids
