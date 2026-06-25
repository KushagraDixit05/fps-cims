# Security Architecture

> **Status (2026-06-25): 🟡 Partial.** Core JWT auth is real; several hardening measures below are not implemented. See *Implementation Notes*.

## Implementation Notes (current state)

- **Implemented:** JWT access/refresh via `djangorestframework-simplejwt`, refresh rotation, Bearer auth, the `/api/auth/*` endpoints. CORS configured.
- **Deviations / not implemented:**
  - Access-token lifetime is **12h** (this doc recommends 8h) — kept deliberately. As of Phase 0, the `token_blacklist` app **is** installed and `BLACKLIST_AFTER_ROTATION=True`, so rotated refresh tokens are now invalidated. The admin `force-logout` endpoint, however, is **still a no-op stub** — wiring it to `OutstandingToken.blacklist()` is Phase 5 work.
  - **No `aud: fps-admin` scope** — the admin portal reuses the standard user token with a coarse `IsStaffUser` check.
  - Refresh tokens are stored in **localStorage** (admin portal) / **AsyncStorage** (mobile), not httpOnly cookies / Keychain.
  - No brute-force/rate-limiting, no CSP headers, no device binding implemented.
  - Object-level / fine-grained permission checks do not exist (see `02`).

---

## 1. JWT Strategy

### Token Design

Two tokens per session:

| Token | Lifetime | Storage | Contains |
|-------|----------|---------|---------|
| Access | 8 hours | In-memory (React state) | Full permission claims |
| Refresh | 30 days | Secure storage (Keychain/Keystore) | Minimal claims |

**Why 8h access token for a field app?**  
Field executives work 6–10 hour days. A 1-hour access token would require re-authentication mid-shift, which fails when there's no connectivity. An 8h window covers a full shift. Permission changes propagate at next day's login at the latest.

**Never store access tokens in AsyncStorage.** AsyncStorage is not encrypted on Android. Use:
- iOS: Keychain via `react-native-keychain`
- Android: Keystore via `react-native-keychain`

```typescript
// src/utils/secureStorage.ts
import * as Keychain from 'react-native-keychain';

export async function storeRefreshToken(token: string) {
  await Keychain.setGenericPassword('fps_refresh', token, {
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await Keychain.getGenericPassword();
  return result ? result.password : null;
}

export async function clearSecureStorage() {
  await Keychain.resetGenericPassword();
}
```

### Token Blacklisting

Use `djangorestframework-simplejwt`'s built-in blacklist app, extended with our custom `RefreshTokenBlacklist` table for tracking revocation reasons.

```python
INSTALLED_APPS += ['rest_framework_simplejwt.token_blacklist']

SIMPLE_JWT = {
    'BLACKLIST_AFTER_ROTATION': True,
    'ROTATE_REFRESH_TOKENS': True,
    # ...
}
```

### Admin Token Separation

Admin portal uses a separate JWT audience claim (`aud: fps-admin`). Mobile tokens (`aud: fps-mobile`) cannot access `/api/admin/*` endpoints even if stolen — the audience validation will reject them.

```python
SIMPLE_JWT = {
    # ...
    'AUDIENCE': None,  # Each endpoint validates its own expected audience
}

# In IsAdminPortalUser permission:
aud = request.auth.payload.get('aud', '')
if aud != 'fps-admin':
    return False
```

---

## 2. API Security

### Rate Limiting

Use `django-ratelimit` or Django REST Framework throttling.

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/min',       # login attempts
        'user': '300/min',       # authenticated API calls
        'sync': '60/min',        # sync endpoint — burst allowed
    },
}
```

Apply tighter throttling to auth endpoints:

```python
class LoginThrottle(AnonRateThrottle):
    rate = '5/min'   # 5 login attempts per minute per IP

class LoginView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]
```

### Brute-Force Protection

After 5 failed login attempts from the same IP within 5 minutes:
1. Lock out the IP for 15 minutes
2. Write an audit log entry `user.login_failed`
3. If 10+ failures within 1 hour, alert admin

```python
# accounts/views.py — override TokenObtainPairView
class FPSLoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            # Log success
            AuditEngine.log(
                actor=User.objects.get(username=request.data.get('username')),
                event_type='user.login',
            )
            return response
        except Exception as e:
            # Log failure
            AuditEngine.log(
                actor=None,
                event_type='user.login_failed',
                changes={'username': [None, request.data.get('username', '')]},
            )
            raise
```

### CORS Policy

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3001',    # admin portal dev
    'https://admin.fps.internal',  # admin portal prod
]
CORS_ALLOW_CREDENTIALS = True

# Mobile app doesn't go through CORS (native HTTP client)
# Only admin portal needs CORS
```

---

## 3. Object-Level Permission Patterns

### "Can only act on own region's data"

```python
class RegionEnforcedPermission(BasePermission):
    """
    For Regional Heads and Checkers: verify the record belongs to their region.
    """
    def has_object_permission(self, request, view, obj):
        perms = request.auth.payload.get('perms', [])
        
        # Global access — no region check needed
        if 'can_view_all_crop_entries' in perms:
            return True
        
        # Region-scoped — check district membership
        user_districts = request.auth.payload.get('districts', [])
        record_district = self._get_record_district(obj)
        
        return record_district in user_districts

    def _get_record_district(self, obj):
        # Traverses FK chain to get district — varies by model
        return getattr(obj, 'village', None) and obj.village.district
```

---

## 4. Admin Portal Security

### Content Security Policy

```python
# admin_portal/middleware.py or Nginx config
response['Content-Security-Policy'] = (
    "default-src 'self'; "
    "script-src 'self' 'nonce-{nonce}'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "connect-src 'self' https://api.fps.internal; "
    "frame-ancestors 'none';"
)
```

### Session Security (Next.js Admin)

```typescript
// admin-portal/lib/session.ts
import { getIronSession } from 'iron-session';

const sessionOptions = {
  password: process.env.SESSION_SECRET!,  // min 32 chars
  cookieName: 'fps-admin-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 8 * 60 * 60,  // 8 hours
  },
};
```

### IP Allowlisting (Nginx)

```nginx
location /admin {
    # Only allow VPN/office IP range
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    deny all;
    
    proxy_pass http://admin-portal:3000;
}
```

---

## 5. Device/Session Management

### Device Registration at Login

```python
# accounts/views.py — in login view, after token issuance
device_id = request.META.get('HTTP_X_DEVICE_ID', '')
if device_id:
    DeviceRegistration.objects.update_or_create(
        user=user,
        device_id=device_id,
        defaults={
            'platform': request.META.get('HTTP_X_PLATFORM', ''),
            'app_version': request.META.get('HTTP_X_APP_VERSION', ''),
            'last_active_at': timezone.now(),
        }
    )
```

### Force Logout — Blacklist All Tokens

```python
# admin_portal/views/users.py
class ForceLogoutView(APIView):
    permission_classes = [IsAuthenticated, IsAdminPortalUser, HasFPSPermission]
    required_permission = 'can_force_logout'

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        
        # Blacklist all outstanding refresh tokens for this user
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        tokens = OutstandingToken.objects.filter(user=target_user)
        for token in tokens:
            token.blacklist()
        
        # Also write to our custom blacklist with reason
        RefreshTokenBlacklist.objects.bulk_create([
            RefreshTokenBlacklist(
                jti=t.jti, user=target_user, reason='force_logout'
            )
            for t in tokens
        ], ignore_conflicts=True)
        
        AuditEngine.log(request.user, 'user.force_logout', target_user)
        return Response({'detail': 'User sessions terminated.'})
```

---

## 6. Secrets Management

| Secret | Storage |
|--------|---------|
| Django `SECRET_KEY` | Environment variable / vault |
| DB password | Environment variable / vault |
| Redis password | Environment variable / vault |
| JWT signing key | Environment variable / vault — rotate annually |
| Admin session secret | Environment variable / vault |

**Never commit secrets to git.** The existing `.env` + `python-dotenv` pattern is correct. For production, use HashiCorp Vault, AWS Secrets Manager, or equivalent.

---

## 7. Dependency Security

```bash
# Run regularly in CI
pip-audit                          # Python dependency vulnerability scan
npm audit --audit-level=high       # Node dependency scan (admin portal)
```

Add to the CI pipeline as a blocking check.
