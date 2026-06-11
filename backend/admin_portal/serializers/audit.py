from rest_framework import serializers
from audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_username', 'actor_role', 'actor_ip', 'actor_device',
            'event_type', 'module', 'action', 'object_repr',
            'changes', 'request_id', 'created_at',
        ]
        read_only_fields = fields
