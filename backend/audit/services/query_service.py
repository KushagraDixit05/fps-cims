"""
audit/services/query_service.py
================================
AuditQueryService — query and export helpers for the AuditLog table.

Replaces the read-time synthesis in admin_portal/views.py::_build_audit_events().
All filter logic lives here so the view layer stays thin.
"""
from django.utils.dateparse import parse_datetime, parse_date


class AuditQueryService:

    @staticmethod
    def get_queryset(module=None, event_type=None, actor_username=None,
                     since=None, until=None):
        """Return a filtered AuditLog queryset (newest-first)."""
        from audit.models import AuditLog

        qs = AuditLog.objects.all()

        if module:
            qs = qs.filter(module=module)
        if event_type:
            qs = qs.filter(event_type=event_type)
        if actor_username:
            qs = qs.filter(actor_username__icontains=actor_username)
        if since:
            dt = parse_datetime(since)
            if dt is None:
                d = parse_date(since)
                if d:
                    from datetime import datetime, timezone
                    dt = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
            if dt:
                qs = qs.filter(created_at__gte=dt)
        if until:
            dt = parse_datetime(until)
            if dt is None:
                d = parse_date(until)
                if d:
                    from datetime import datetime, timezone
                    dt = datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        return qs

    @staticmethod
    def to_api_dict(log) -> dict:
        """Convert one AuditLog instance to the API response shape.

        Preserves the same key set as the old synthesized _build_audit_events()
        so the Next.js admin portal frontend needs zero changes.
        """
        return {
            'id': str(log.id),
            'actor_username': log.actor_username,
            'actor_role': log.actor_role,
            'actor_ip': log.actor_ip or '',
            'actor_device': log.actor_device,
            'event_type': log.event_type,
            'module': log.module,
            'action': log.action,
            'object_repr': log.object_repr,
            'changes': log.changes,
            'request_id': str(log.request_id) if log.request_id else '',
            'created_at': log.created_at.isoformat(),
        }

    @staticmethod
    def export_rows(queryset):
        """Generator yielding the header row then one list per AuditLog row.

        Uses .iterator() for memory-efficient streaming of large result sets.
        """
        headers = [
            'id', 'created_at', 'actor_username', 'actor_role',
            'actor_ip', 'event_type', 'module', 'action', 'object_repr', 'request_id',
        ]
        yield headers
        for log in queryset.iterator(chunk_size=500):
            yield [
                str(log.id),
                log.created_at.isoformat(),
                log.actor_username,
                log.actor_role,
                log.actor_ip or '',
                log.event_type,
                log.module,
                log.action,
                log.object_repr,
                str(log.request_id) if log.request_id else '',
            ]
