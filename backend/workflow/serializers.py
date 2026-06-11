from rest_framework import serializers
from .models import ApprovalInstance, ApprovalAction, ApprovalWorkflow


class ApprovalActionSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ['id', 'actor_username', 'action', 'comment', 'created_at']


class ApprovalInstanceSerializer(serializers.ModelSerializer):
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    actions = ApprovalActionSerializer(many=True, read_only=True)
    content_type_label = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalInstance
        fields = [
            'id', 'workflow_name', 'content_type_label', 'object_id',
            'submitted_by_username', 'submitted_at', 'status',
            'revision_count', 'revision_note',
            'approved_at', 'rejected_at', 'escalated_at',
            'updated_at', 'actions',
        ]

    def get_content_type_label(self, obj):
        return obj.content_type.model if obj.content_type_id else ''


class ApprovalActionRequestSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default='')
