from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor_username', 'event_type', 'module', 'object_repr', 'created_at']
    list_filter = ['module', 'event_type']
    search_fields = ['actor_username', 'event_type', 'object_repr']
    readonly_fields = [f.name for f in AuditLog._meta.get_fields()]
