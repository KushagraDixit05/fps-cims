from django.contrib import admin

from .models import ApprovalAction, ApprovalInstance, ApprovalWorkflow


@admin.register(ApprovalWorkflow)
class ApprovalWorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'model_name', 'escalation_hours', 'is_active']
    list_filter = ['module', 'is_active']
    search_fields = ['name', 'module', 'model_name']
    readonly_fields = ['created_at']


class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0
    readonly_fields = ['actor', 'action', 'comment', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ApprovalInstance)
class ApprovalInstanceAdmin(admin.ModelAdmin):
    list_display = ['id', 'workflow', 'status', 'submitted_by', 'current_approver', 'submitted_at']
    list_filter = ['status', 'workflow__module']
    search_fields = ['submitted_by__username', 'object_id']
    readonly_fields = ['submitted_at', 'updated_at', 'content_type', 'object_id']
    inlines = [ApprovalActionInline]


@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    """Append-only log — read-only in the admin."""

    list_display = ['instance', 'action', 'actor', 'created_at']
    list_filter = ['action']
    search_fields = ['actor__username']
    readonly_fields = ['instance', 'actor', 'action', 'comment', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
