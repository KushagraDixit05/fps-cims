"""
accounts/middleware.py
======================
AuditContextMiddleware — Phase 2 foundation for the audit engine (Phase 4).

Attaches per-request audit context to the request object (not thread-locals,
to remain WSGI/ASGI safe):
  - request._fps_request_id  : UUID string identifying this HTTP request.
  - request._fps_actor_ip    : Client IP, honouring X-Forwarded-For from
                               Render's TLS termination proxy.

This middleware writes nothing to the DB in Phase 2.  Phase 4 will extend
it to dispatch async Celery tasks that write AuditLog entries.

See docs/rbac/08-AUDIT-SYSTEM.md for the full audit design.
"""
import uuid


class AuditContextMiddleware:
    """
    Lightweight request-context middleware.

    Adds audit metadata to each request so that any downstream view or
    signal handler can log context-rich entries without re-parsing the request.

    Place this AFTER AuthenticationMiddleware in MIDDLEWARE so that
    ``request.user`` is already populated if needed by Phase 4 consumers.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach a unique request identifier for correlation / idempotency.
        request._fps_request_id = str(uuid.uuid4())

        # Extract real client IP.  In production Render forwards the original
        # IP in X-Forwarded-For; take the first (leftmost) value which is the
        # actual client (rightmost is Render's own edge node).
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if xff:
            request._fps_actor_ip = xff.split(',')[0].strip()
        else:
            request._fps_actor_ip = request.META.get('REMOTE_ADDR', '')

        return self.get_response(request)
