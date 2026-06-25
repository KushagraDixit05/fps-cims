from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Immutable audit trail — fully read-only in the admin."""

    list_display = ['created_at', 'event_type', 'action', 'module', 'actor_username', 'object_repr']
    list_filter = ['event_type', 'module', 'action']
    search_fields = ['actor_username', 'object_id', 'object_repr', 'event_type']
    date_hierarchy = 'created_at'
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
