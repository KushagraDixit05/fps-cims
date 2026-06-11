from rest_framework import serializers
from workflow.models import ApprovalInstance, ApprovalAction


class AdminApprovalActionSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ['id', 'actor_username', 'action', 'comment', 'created_at']


class AdminApprovalSerializer(serializers.ModelSerializer):
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    module = serializers.CharField(source='workflow.module', read_only=True)
    actions = AdminApprovalActionSerializer(many=True, read_only=True)

    class Meta:
        model = ApprovalInstance
        fields = [
            'id', 'workflow_name', 'module', 'object_id',
            'submitted_by_username', 'submitted_at', 'status',
            'revision_count', 'revision_note', 'updated_at', 'actions',
        ]


class ReassignSerializer(serializers.Serializer):
    approver_id = serializers.UUIDField()
    comment = serializers.CharField(required=False, allow_blank=True, default='')
