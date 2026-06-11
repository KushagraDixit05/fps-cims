import uuid
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class ApprovalWorkflow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    module = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    trigger_condition = models.JSONField(default=dict, blank=True)
    require_all = models.BooleanField(default=False)
    approver_role_codes = models.JSONField(default=list)
    escalation_hours = models.IntegerField(default=48)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_approvalworkflow'

    def __str__(self):
        return self.name


class ApprovalInstance(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
        ('resubmitted', 'Resubmitted'),
        ('escalated', 'Escalated'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(ApprovalWorkflow, on_delete=models.PROTECT, related_name='instances')

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)
    content_object = GenericForeignKey('content_type', 'object_id')

    submitted_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='submitted_approvals'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='submitted')
    data_snapshot = models.JSONField(default=dict)

    current_approver = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_approvals'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_approvals'
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rejected_approvals'
    )

    revision_count = models.SmallIntegerField(default=0)
    revision_note = models.TextField(blank=True)

    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='escalated_approvals'
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_approvalinstance'
        indexes = [
            models.Index(fields=['status'], name='idx_approval_status'),
            models.Index(fields=['submitted_by'], name='idx_approval_submitter'),
            models.Index(fields=['content_type', 'object_id'], name='idx_approval_object'),
        ]

    def __str__(self):
        return f"Approval {self.id} [{self.status}]"


class ApprovalAction(models.Model):
    ACTION_CHOICES = [
        ('submitted', 'Submitted'),
        ('started_review', 'Started Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('requested_revision', 'Requested Revision'),
        ('resubmitted', 'Resubmitted'),
        ('escalated', 'Escalated'),
        ('cancelled', 'Cancelled'),
        ('commented', 'Commented'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(ApprovalInstance, on_delete=models.CASCADE, related_name='actions')
    actor = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='approval_actions')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_approvalaction'
        indexes = [
            models.Index(fields=['instance'], name='idx_apaction_instance'),
            models.Index(fields=['actor'], name='idx_apaction_actor'),
        ]

    def __str__(self):
        return f"{self.actor.username} {self.action} on {self.instance_id}"
