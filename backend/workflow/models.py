import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField
from django.db import models

APPROVAL_STATUS_CHOICES = [
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

APPROVAL_ACTION_CHOICES = [
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


class ApprovalWorkflow(models.Model):
    """Approval rule template, e.g. "Crop Visit submissions need checker review"."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    module = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    trigger_condition = models.JSONField(default=dict, blank=True)
    require_all = models.BooleanField(default=False)
    approver_role_codes = ArrayField(
        models.CharField(max_length=50), default=list
    )
    escalation_hours = models.IntegerField(default=48)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_approvalworkflow'
        ordering = ['module', 'name']

    def __str__(self):
        return self.name


class ApprovalInstance(models.Model):
    """One instance per record going through approval. This is the state machine."""

    STATUS_CHOICES = APPROVAL_STATUS_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        ApprovalWorkflow, on_delete=models.PROTECT, related_name='instances'
    )

    # Polymorphic link to the record being approved.
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='submitted_approvals',
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='draft'
    )
    data_snapshot = models.JSONField(default=dict, blank=True)

    current_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pending_approvals',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='approved_approvals',
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='rejected_approvals',
    )

    revision_count = models.SmallIntegerField(default=0)
    revision_note = models.TextField(blank=True, default='')

    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='escalated_approvals',
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_approvalinstance'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    status__in=[c[0] for c in APPROVAL_STATUS_CHOICES]
                ),
                name='ck_approvalinstance_status',
            ),
        ]
        indexes = [
            models.Index(fields=['status'], name='idx_approval_status'),
            models.Index(fields=['submitted_by'], name='idx_approval_submitter'),
            models.Index(
                fields=['content_type', 'object_id'], name='idx_approval_object'
            ),
            models.Index(
                fields=['current_approver'], name='idx_approval_approver',
                condition=models.Q(status__in=['submitted', 'under_review']),
            ),
        ]

    def __str__(self):
        return f'{self.workflow.module}:{self.object_id} [{self.status}]'


class ApprovalAction(models.Model):
    """Immutable append-only log of every action taken on an approval instance.

    Append-only: never UPDATE or DELETE. Enforced at the application/DB layer
    in Phase 4; schema only at Phase 1.
    """

    ACTION_CHOICES = APPROVAL_ACTION_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(
        ApprovalInstance, on_delete=models.CASCADE, related_name='actions'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='approval_actions',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_approvalaction'
        ordering = ['created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    action__in=[c[0] for c in APPROVAL_ACTION_CHOICES]
                ),
                name='ck_approvalaction_action',
            ),
        ]
        indexes = [
            models.Index(fields=['instance'], name='idx_apaction_instance'),
            models.Index(fields=['actor'], name='idx_apaction_actor'),
        ]

    def __str__(self):
        return f'{self.action} by {self.actor_id}'
