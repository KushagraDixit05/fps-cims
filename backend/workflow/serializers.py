from rest_framework import serializers
from .models import ApprovalAction, ApprovalInstance


class ApprovalActionSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_full_name = serializers.CharField(source='actor.get_full_name', read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ['id', 'actor', 'actor_username', 'actor_full_name',
                  'action', 'comment', 'created_at']


class ApprovalInstanceListSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    module = serializers.CharField(source='workflow.module', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    current_approver_username = serializers.CharField(
        source='current_approver.username', read_only=True, allow_null=True
    )

    class Meta:
        model = ApprovalInstance
        fields = [
            'id', 'workflow', 'workflow_name', 'module',
            'object_id', 'submitted_by', 'submitted_by_username',
            'status', 'current_approver', 'current_approver_username',
            'submitted_at', 'approved_at', 'rejected_at',
            'revision_count', 'escalated_at', 'updated_at',
        ]


class ApprovalInstanceDetailSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    module = serializers.CharField(source='workflow.module', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    submitted_by_full_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    current_approver_username = serializers.CharField(
        source='current_approver.username', read_only=True, allow_null=True
    )
    approved_by_username = serializers.CharField(
        source='approved_by.username', read_only=True, allow_null=True
    )
    rejected_by_username = serializers.CharField(
        source='rejected_by.username', read_only=True, allow_null=True
    )
    actions = ApprovalActionSerializer(many=True, read_only=True)

    class Meta:
        model = ApprovalInstance
        fields = [
            'id', 'workflow', 'workflow_name', 'module',
            'object_id', 'data_snapshot',
            'submitted_by', 'submitted_by_username', 'submitted_by_full_name',
            'status', 'current_approver', 'current_approver_username',
            'approved_at', 'approved_by', 'approved_by_username',
            'rejected_at', 'rejected_by', 'rejected_by_username',
            'revision_count', 'revision_note',
            'escalated_at', 'escalated_to',
            'submitted_at', 'updated_at',
            'actions',
        ]


class ApprovalCommentSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default='')


class ApprovalReassignSerializer(serializers.Serializer):
    approver_id = serializers.IntegerField()
    comment = serializers.CharField(required=False, allow_blank=True, default='')
