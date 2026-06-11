from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver([post_save, post_delete], sender='accounts.UserPermission')
def invalidate_user_perm_cache(sender, instance, **kwargs):
    from django.core.cache import cache
    cache.delete(f"fps:perms:{instance.user_id}")


@receiver([post_save, post_delete], sender='accounts.RolePermission')
def invalidate_role_perm_cache(sender, instance, **kwargs):
    from django.core.cache import cache
    from accounts.models import User
    user_ids = User.objects.filter(primary_role_id=instance.role_id).values_list('id', flat=True)
    cache.delete_many([f"fps:perms:{uid}" for uid in user_ids])
