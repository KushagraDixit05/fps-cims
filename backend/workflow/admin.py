from django.contrib import admin
from .models import ApprovalWorkflow, ApprovalInstance, ApprovalAction


@admin.register(ApprovalWorkflow)
class ApprovalWorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'model_name', 'is_active', 'escalation_hours']
    list_filter = ['module', 'is_active']


@admin.register(ApprovalInstance)
class ApprovalInstanceAdmin(admin.ModelAdmin):
    list_display = ['id', 'workflow', 'submitted_by', 'status', 'submitted_at']
    list_filter = ['status', 'workflow']
    raw_id_fields = ['submitted_by', 'current_approver', 'approved_by', 'rejected_by']


@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    list_display = ['id', 'instance', 'actor', 'action', 'created_at']
    list_filter = ['action']
