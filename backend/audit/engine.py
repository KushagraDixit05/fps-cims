"""
audit/engine.py
===============
AuditEngine — single public interface for writing AuditLog entries.

All call sites use:
    AuditEngine.log(request, event_type, action, module='', obj=None,
                    changes=None, actor_override=None)

The engine resolves actor/object context synchronously in the calling process
(so no Django model instances cross Celery process boundaries), then dispatches
write_audit_log.apply_async() for an async write.  If Celery / the broker is
unavailable it falls back to a synchronous DB write.  All exceptions from both
paths are swallowed — an audit failure must never break the business operation
that triggered it.

Disable entirely (e.g., in unit tests) by setting AUDIT_ENGINE_ENABLED = False
in your test settings.  In integration tests, set CELERY_TASK_ALWAYS_EAGER = True
to execute the task synchronously.
"""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class AuditEngine:

    @staticmethod
    def log(
        request,
        event_type: str,
        action: str,
        module: str = '',
        obj=None,
        changes: dict | None = None,
        actor_override=None,
    ) -> None:
        """Emit one audit event.

        Parameters
        ----------
        request:
            Current HttpRequest (or None for system/background events).
        event_type:
            Top-level category: 'user', 'permission', 'crop', 'mandi', 'demo',
            'sync', etc.
        action:
            Specific action within the category: 'login', 'created',
            'visit_updated', etc.
        module:
            App-level module string stored on the log row.
        obj:
            The target model instance (optional). Used to populate
            content_type_id, object_id, object_repr.
        changes:
            Dict of field-level changes: {"field": ["old", "new"]}.
        actor_override:
            A User instance to use as the actor when request.user is anonymous
            or request is None (e.g. self-registration, background tasks).
        """
        if not getattr(settings, 'AUDIT_ENGINE_ENABLED', True):
            return

        fields = AuditEngine._build_fields(
            request, event_type, action, module, obj, changes or {}, actor_override
        )
        AuditEngine._dispatch(fields)

    # ─────────────────────────────────────────────────────────── internals ──

    @staticmethod
    def _build_fields(request, event_type, action, module, obj, changes, actor_override):
        """Build a flat primitive dict safe to pass across process boundaries."""
        # ── actor resolution ──────────────────────────────────────────────
        user = actor_override
        if user is None and request is not None:
            req_user = getattr(request, 'user', None)
            if req_user is not None and not getattr(req_user, 'is_anonymous', True):
                user = req_user

        actor_id = None
        actor_username = 'system'
        actor_role = ''

        if user is not None:
            actor_id = user.pk
            actor_username = getattr(user, 'username', '') or 'system'
            # Prefer primary_role FK code; fall back to legacy role CharField
            primary = getattr(user, 'primary_role', None)
            if primary is not None:
                actor_role = getattr(primary, 'code', '') or ''
            if not actor_role:
                actor_role = getattr(user, 'role', '') or ''
        elif changes.get('username'):
            # login_failed: no authenticated user; store the attempted username
            actor_username = changes['username']

        # ── request context ───────────────────────────────────────────────
        actor_ip = None
        actor_device = ''
        request_id = None

        if request is not None:
            actor_ip = getattr(request, '_fps_actor_ip', None) or None
            actor_device = getattr(request, '_fps_actor_device', '') or ''
            raw_rid = getattr(request, '_fps_request_id', None)
            request_id = str(raw_rid) if raw_rid else None

        # ── object resolution ─────────────────────────────────────────────
        content_type_id = None
        object_id = ''
        object_repr = ''

        if obj is not None:
            try:
                from django.contrib.contenttypes.models import ContentType
                content_type_id = ContentType.objects.get_for_model(obj.__class__).id
                object_id = str(obj.pk)
                object_repr = str(obj)[:300]
            except Exception:
                pass

        return {
            'actor_id': actor_id,
            'actor_username': actor_username,
            'actor_role': actor_role,
            'actor_ip': actor_ip,
            'actor_device': actor_device,
            'event_type': event_type,
            'module': module,
            'action': action,
            'content_type_id': content_type_id,
            'object_id': object_id,
            'object_repr': object_repr,
            'changes': changes,
            'request_id': request_id,
        }

    @staticmethod
    def _dispatch(fields: dict) -> None:
        try:
            from audit.tasks import write_audit_log
            write_audit_log.apply_async(kwargs=fields)
        except Exception:
            logger.debug('AuditEngine: Celery unavailable, writing audit log synchronously')
            AuditEngine._write_sync(fields)

    @staticmethod
    def _write_sync(fields: dict) -> None:
        try:
            from audit.models import AuditLog
            from django.contrib.contenttypes.models import ContentType
            import uuid as _uuid

            ct_id = fields.get('content_type_id')
            ct = None
            if ct_id:
                ct = ContentType.objects.filter(id=ct_id).first()

            raw_rid = fields.get('request_id')
            request_id = None
            if raw_rid:
                try:
                    request_id = _uuid.UUID(str(raw_rid))
                except (ValueError, AttributeError):
                    pass

            actor_id = fields.get('actor_id')
            actor = None
            if actor_id:
                from django.contrib.auth import get_user_model
                actor = get_user_model().objects.filter(pk=actor_id).first()

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
        except Exception:
            logger.exception('AuditEngine: synchronous fallback write failed')
