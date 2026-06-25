import uuid

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models


class AuditLog(models.Model):
    """Immutable audit trail for every significant system event.

    Append-only: never UPDATE or DELETE. DB-level immutability is enforced in
    Phase 4; this is the schema only. Actor identity is denormalised
    (``actor_username``/``actor_role``) so entries survive user deletion.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Actor
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs',
    )
    actor_username = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=100, blank=True, default='')
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    actor_device = models.CharField(max_length=200, blank=True, default='')

    # Action
    event_type = models.CharField(max_length=50)
    module = models.CharField(max_length=50, blank=True, default='')
    action = models.CharField(max_length=50)

    # Target object (denormalised; no hard FK so it survives type deletion)
    content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    object_id = models.CharField(max_length=64, blank=True, default='')
    object_repr = models.CharField(max_length=300, blank=True, default='')

    # Change detail: {"field": ["old", "new"]}
    changes = models.JSONField(default=dict, blank=True)

    # Context
    request_id = models.UUIDField(null=True, blank=True)
    sync_batch_id = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_auditlog'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor'], name='idx_audit_actor'),
            models.Index(fields=['event_type'], name='idx_audit_event'),
            models.Index(
                fields=['content_type', 'object_id'], name='idx_audit_object'
            ),
            models.Index(fields=['-created_at'], name='idx_audit_created'),
            models.Index(fields=['module'], name='idx_audit_module'),
        ]

    def __str__(self):
        return f'{self.event_type} by {self.actor_username} @ {self.created_at:%Y-%m-%d %H:%M}'
