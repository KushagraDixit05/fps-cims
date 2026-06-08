# Permission Engine

How permissions are defined, resolved, cached, and delivered to mobile clients.

---

## 1. Permission Catalogue

All permissions follow the naming convention: `can_<verb>_<subject>`.

### Global / Admin

| Codename | Label | Category |
|----------|-------|----------|
| `can_manage_users` | Create/edit/deactivate users | admin |
| `can_assign_roles` | Assign or change user roles | admin |
| `can_assign_permissions` | Grant/deny individual permissions | admin |
| `can_view_audit_logs` | Read audit trail | admin |
| `can_export_audit_logs` | Export audit CSV | admin |
| `can_manage_regions` | Create/edit regions | admin |
| `can_view_all_users` | See all users across regions | admin |
| `can_reset_passwords` | Trigger password reset for any user | admin |
| `can_view_sync_logs` | See mobile sync activity | admin |
| `can_force_logout` | Blacklist a device/session | admin |

### Crop Monitoring Module

| Codename | Label | Category |
|----------|-------|----------|
| `can_access_crop_module` | Enter the Crop Monitoring module | module |
| `can_create_crop_visit` | Create new farmer visit | create |
| `can_edit_own_crop_visit` | Edit own unsubmitted visit | update |
| `can_edit_any_crop_visit` | Edit any visit (checker/manager) | update |
| `can_delete_crop_visit` | Delete a visit | delete |
| `can_submit_crop_visit` | Submit visit for approval | create |
| `can_approve_crop_visit` | Approve submitted visit | approve |
| `can_reject_crop_visit` | Reject submitted visit | approve |
| `can_request_revision_crop` | Request revision on a visit | approve |
| `can_view_own_crop_entries` | See own entries | read |
| `can_view_region_crop_entries` | See entries in assigned region | read |
| `can_view_all_crop_entries` | See all entries platform-wide | read |

### Mandi Arrival Module

| Codename | Label | Category |
|----------|-------|----------|
| `can_access_mandi_module` | Enter the Mandi Arrival module | module |
| `can_create_mandi_arrival` | Log new arrival | create |
| `can_edit_own_mandi_arrival` | Edit own unsubmitted arrival | update |
| `can_edit_any_mandi_arrival` | Edit any arrival | update |
| `can_delete_mandi_arrival` | Delete arrival record | delete |
| `can_approve_mandi_arrival` | Approve arrival | approve |
| `can_reject_mandi_arrival` | Reject arrival | approve |
| `can_view_own_mandi_entries` | See own mandi entries | read |
| `can_view_region_mandi_entries` | See region mandi entries | read |
| `can_view_all_mandi_entries` | See all mandi entries | read |

### Product Demo Module

| Codename | Label | Category |
|----------|-------|----------|
| `can_access_product_demo_module` | Enter the Product Demo module | module |
| `can_create_product_demo` | Create demo record | create |
| `can_edit_own_product_demo` | Edit own demo | update |
| `can_edit_any_product_demo` | Edit any demo | update |
| `can_delete_product_demo` | Delete demo record | delete |
| `can_approve_product_demo` | Approve demo | approve |
| `can_view_own_demo_entries` | See own demo entries | read |
| `can_view_region_demo_entries` | See region demo entries | read |
| `can_view_all_demo_entries` | See all demo entries | read |

### Analytics

| Codename | Label | Category |
|----------|-------|----------|
| `can_view_own_analytics` | Own performance dashboard | read |
| `can_view_team_analytics` | Team/region analytics | read |
| `can_view_all_analytics` | Platform-wide analytics | read |
| `can_export_reports` | Download analytics exports | export |
| `can_view_executive_productivity` | See per-FE productivity stats | read |

### Sync

| Codename | Label | Category |
|----------|-------|----------|
| `can_sync_data` | Perform WatermelonDB sync | sync |
| `can_sync_offline` | Use offline data collection | sync |

---

## 2. Permission Resolution Algorithm

```python
def resolve_permissions(user: User) -> set[str]:
    """
    Returns the effective set of permission codenames for a user.
    Called at login and on token refresh.
    """
    if not user.is_active:
        return set()

    # 1. Start with role permissions
    role_perms = set(
        RolePermission.objects
        .filter(role=user.primary_role, role__is_active=True)
        .values_list('permission__codename', flat=True)
    )

    # 2. Apply user-level overrides
    now = timezone.now()
    user_overrides = UserPermission.objects.filter(
        user=user,
        permission__is_active=True,
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )

    for override in user_overrides:
        codename = override.permission.codename
        if override.effect == 'allow':
            role_perms.add(codename)
        elif override.effect == 'deny':
            role_perms.discard(codename)

    return role_perms
```

**Evaluation is deterministic**: DENY overrides always win over role grants. ALLOW overrides add on top of role permissions.

---

## 3. Permission Caching

### Cache Key Design

```
fps:perms:{user_id}  →  JSON-encoded list of codenames
TTL: 300 seconds (5 minutes)
```

### Invalidation

The cache is invalidated whenever:

- `UserPermission` is created, updated, or deleted for this user
- `RolePermission` is changed for the user's role
- The user's `primary_role_id` changes
- The user is deactivated

```python
# signals.py in accounts app

@receiver([post_save, post_delete], sender=UserPermission)
def invalidate_user_perm_cache(sender, instance, **kwargs):
    cache.delete(f"fps:perms:{instance.user_id}")

@receiver([post_save, post_delete], sender=RolePermission)
def invalidate_role_perm_cache(sender, instance, **kwargs):
    # All users with this role need cache busting
    user_ids = User.objects.filter(
        primary_role=instance.role
    ).values_list('id', flat=True)
    cache.delete_many([f"fps:perms:{uid}" for uid in user_ids])
```

For large roles (many users), use a bulk Redis pipeline to avoid N DELETE calls.

---

## 4. JWT Permissions Embedding

Permissions are embedded directly into the access token so the mobile app never needs a network call to check permissions offline.

### Token Claims Structure

```json
{
  "user_id": "uuid",
  "username": "john.doe",
  "email": "john@fps.com",
  "role": "field_executive",
  "role_id": "uuid",
  "state": "Maharashtra",
  "districts": ["Nanded", "Latur"],
  "perms": [
    "can_access_crop_module",
    "can_create_crop_visit",
    "can_edit_own_crop_visit",
    "can_submit_crop_visit",
    "can_access_mandi_module",
    "can_create_mandi_arrival",
    "can_sync_data"
  ],
  "exp": 1749830400,
  "iat": 1749801600,
  "jti": "uuid",
  "token_type": "access",
  "aud": "fps-mobile"
}
```

### Token Lifetimes

| Token | Lifetime | Rationale |
|-------|----------|-----------|
| Access | 8 hours | Covers a full field day without re-login; permission changes propagate at next refresh |
| Refresh | 30 days | Survives weekend + multi-day offline trips |

### Custom Token Serializer

```python
# accounts/tokens.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .services import PermissionService

class FPSTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        perms = PermissionService.get_user_permissions(user)
        regions = list(user.userregion_set.values_list('region__code', flat=True))
        
        token['user_id']   = str(user.id)
        token['role']      = user.primary_role.code if user.primary_role else ''
        token['role_id']   = str(user.primary_role_id) if user.primary_role_id else ''
        token['state']     = user.state or ''
        token['districts'] = user.districts or []
        token['perms']     = sorted(perms)   # sorted for deterministic comparison
        token['aud']       = 'fps-mobile'
        
        return token
```

---

## 5. DRF Permission Classes

### Base Permission Class

```python
# accounts/permissions.py
from rest_framework.permissions import BasePermission

class HasFPSPermission(BasePermission):
    """
    Check that the authenticated user's JWT claims contain the required codename.
    Falls back to DB check if JWT claims are absent (admin portal tokens).
    """
    required_permission = None  # set in subclass or view

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False

        codename = getattr(view, 'required_permission', self.required_permission)
        if not codename:
            return True  # no restriction declared

        # Fast path: JWT claims
        perms = request.auth.payload.get('perms', []) if request.auth else []
        if perms:
            return codename in perms

        # Slow path: DB (used by admin portal, management commands)
        from .services import PermissionService
        return PermissionService.user_has_permission(request.user, codename)
```

### View-Level Usage

```python
class CropVisitCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, HasFPSPermission]
    required_permission = 'can_create_crop_visit'
    ...
```

### Object-Level Permission (Ownership Check)

```python
class OwnEntryOrCheckerPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        perms = request.auth.payload.get('perms', [])
        
        # Can edit any entry (checker/manager)
        if 'can_edit_any_crop_visit' in perms:
            return True
        
        # Can edit own entry (field executive)
        if 'can_edit_own_crop_visit' in perms:
            return obj.created_by_id == request.user.id
        
        return False
```

---

## 6. QuerySet-Level Filtering (Row Security)

API views must scope their querysets to what the user is allowed to see — even if they have a read permission, they should only see records within their scope.

```python
# accounts/mixins.py
class RegionScopedQuerysetMixin:
    """
    Mixin for ModelViewSets. Filters queryset based on user's region scope.
    The region_field kwarg names the FK path to the region on the model.
    """
    region_field = 'village__district'   # override in subclass

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        perms = self.request.auth.payload.get('perms', [])

        # Admins / super admins see everything
        if 'can_view_all_crop_entries' in perms:
            return qs

        # Regional scope
        if 'can_view_region_crop_entries' in perms:
            districts = self.request.auth.payload.get('districts', [])
            if districts:
                return qs.filter(**{f'{self.region_field}__in': districts})

        # Own entries only
        return qs.filter(created_by=user)
```

---

## 7. Permission Service

Central service layer — all permission logic goes here, not in views.

```python
# accounts/services.py
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q

class PermissionService:
    CACHE_TTL = 300  # 5 minutes

    @classmethod
    def get_user_permissions(cls, user) -> set[str]:
        if not user.is_active:
            return set()

        cache_key = f"fps:perms:{user.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return set(cached)

        perms = cls._resolve_from_db(user)
        cache.set(cache_key, list(perms), cls.CACHE_TTL)
        return perms

    @classmethod
    def _resolve_from_db(cls, user) -> set[str]:
        role_perms = set()
        if user.primary_role_id:
            role_perms = set(
                RolePermission.objects
                .filter(role_id=user.primary_role_id)
                .values_list('permission__codename', flat=True)
            )

        now = timezone.now()
        overrides = UserPermission.objects.filter(
            user=user
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).select_related('permission')

        for override in overrides:
            if override.effect == 'allow':
                role_perms.add(override.permission.codename)
            else:
                role_perms.discard(override.permission.codename)

        return role_perms

    @classmethod
    def user_has_permission(cls, user, codename: str) -> bool:
        return codename in cls.get_user_permissions(user)

    @classmethod
    def invalidate_cache(cls, user_id):
        cache.delete(f"fps:perms:{user_id}")
```

---

## 8. Offline Permission Handling on Mobile

The mobile app reads permissions exclusively from the decoded JWT payload. No separate permission sync is needed.

### What happens when permissions change while offline

1. User is offline with an 8h access token that includes old permissions
2. Admin changes their permissions server-side
3. Redis cache is invalidated immediately
4. User stays offline — their old access token works until it expires
5. When the user comes back online and the token expires, they hit `/api/auth/token/refresh/`
6. The refresh endpoint issues a new access token with updated permissions
7. The mobile app stores the new token — permissions update transparently

### Worst-case window

Maximum 8 hours of stale permissions (access token lifetime). This is acceptable for a field app.

For time-sensitive revocations (user terminated, fraud detected):

1. Admin blacklists the refresh token via the admin panel
2. User's next sync attempt returns `401 Unauthorized`
3. Mobile app intercepts this and redirects to login screen
4. User cannot log back in because their account is deactivated

```typescript
// mobile/src/api/client.ts — already exists; add this interceptor
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AuthService.logout();         // clear stored tokens
      NavigationService.navigate('Login'); // force re-login
    }
    return Promise.reject(error);
  }
);
```

### Permission-driven UI gating

```typescript
// mobile/src/hooks/usePermissions.ts
import { useAuthStore } from '../store/authStore';
import { decodeJWT } from '../utils/jwt';

export function usePermissions() {
  const token = useAuthStore(s => s.accessToken);
  const claims = token ? decodeJWT(token) : null;
  const perms: string[] = claims?.perms ?? [];

  return {
    can: (codename: string) => perms.includes(codename),
    perms,
    role: claims?.role ?? '',
    districts: claims?.districts ?? [],
  };
}
```

Usage in components:

```tsx
const { can } = usePermissions();

// Conditionally render the "Submit for Approval" button
{can('can_submit_crop_visit') && (
  <Button onPress={handleSubmit} title="Submit for Approval" />
)}
```
