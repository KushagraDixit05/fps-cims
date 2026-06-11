import uuid
from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    actor = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs'
    )
    actor_username = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=100, blank=True)
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    actor_device = models.CharField(max_length=200, blank=True)

    event_type = models.CharField(max_length=50)
    module = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=50)

    content_type = models.ForeignKey(
        'contenttypes.ContentType', on_delete=models.SET_NULL, null=True, blank=True
    )
    object_id = models.CharField(max_length=64, blank=True)
    object_repr = models.CharField(max_length=300, blank=True)

    changes = models.JSONField(default=dict)
    request_id = models.UUIDField(null=True, blank=True)
    sync_batch_id = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_auditlog'
        indexes = [
            models.Index(fields=['actor'], name='idx_audit_actor'),
            models.Index(fields=['event_type'], name='idx_audit_event'),
            models.Index(fields=['content_type', 'object_id'], name='idx_audit_object'),
            models.Index(fields=['-created_at'], name='idx_audit_created'),
            models.Index(fields=['module'], name='idx_audit_module'),
        ]

    def __str__(self):
        return f"{self.actor_username} {self.event_type} @ {self.created_at}"
