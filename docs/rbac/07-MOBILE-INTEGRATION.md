# Mobile App Integration

How RBAC manifests in the React Native app.

> **Status (2026-06-26): ✅ Done — 100% complete.** Full permission layer implemented. See *Implementation Notes* below for deviations from the original design.

## Implementation Notes (as-built — 2026-06-26)

### What was built
- **JWT `perms` consumed:** `src/utils/jwt.ts` decodes the access token payload. `src/api/auth.ts` exposes `getStoredPerms()`. `src/store/authStore.tsx` stores `perms: string[]` in auth state, populated at login and on every session restore — no extra network call (decoded from the JWT already in AsyncStorage).
- **`usePermissions` hook:** `src/hooks/usePermissions.ts` — `can()`, `canAny()`, `canAll()`, `canAccessModule()`.
- **`PermissionGate` component:** `src/components/PermissionGate.tsx` — conditional render wrapper.
- **Tab gating:** `AppNavigatorV2.tsx` `MainTabs` function now gates Crops/Mandi/Reports/ApprovalQueue tabs. Fail-open when `perms` is empty.
- **Dynamic Home tiles:** `HomeScreen.tsx` filters `ALL_TILES` at render time using `can()`. Approval Queue tile shown for checkers.
- **Sidebar gating:** `SidebarContent.tsx` filters `ALL_NAV_ITEMS` by permission.
- **Approval Queue screen:** `src/screens/approvals/ApprovalQueueScreen.tsx` — two-tab screen (Pending / History), per-item actions (Start Review, Approve, Reject, Request Revision), comment modal, pull-to-refresh, empty state.
- **Approval API client:** `src/api/approvals.ts` — all checker transitions + history.
- **X-Device-ID header:** `src/api/client.ts` generates a stable UUID on first launch (persisted in AsyncStorage) and attaches it as `X-Device-ID` on every request. Enables `DeviceSyncLog` and audit actor-device tracking.
- **User type extended:** `src/types/index.ts` — `role` union expanded to all 7 backend roles; optional `perms`, `role_id`, `state`, `districts` fields added.

### Deviations from original design
- **WatermelonDB `approval_status` column not added:** the app does not use WatermelonDB for approval state. Status is read from live API responses at runtime. Offline approval status is not tracked locally — acceptable given the field exec role doesn't perform approvals.
- **No `react-native-keychain`:** not installed and requires native config changes. Tokens remain in AsyncStorage. Documented as Phase 8 hardening work.
- **No Zustand `persist`:** the app uses React Context + useReducer (not Zustand). Perms decoded from the JWT stored in AsyncStorage — same offline-first guarantee.
- **No WatermelonDB sync for approval fields:** N/A. REST API used for all approval interactions.
- **No FCM push notifications:** DeviceRegistration table exists on the backend; FCM integration deferred to Phase 8.

---

## 1. Permission Store

Permissions live in the decoded JWT. No separate API call needed.

```typescript
// src/store/authStore.ts (extend existing)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeJWT } from '../utils/jwt';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: DecodedUser | null;
  perms: string[];
  
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}

interface DecodedUser {
  user_id: string;
  username: string;
  email: string;
  role: string;
  role_id: string;
  state: string;
  districts: string[];
  perms: string[];
  exp: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      perms: [],

      setTokens: (access, refresh) => {
        const decoded = decodeJWT(access) as DecodedUser;
        set({
          accessToken: access,
          refreshToken: refresh,
          user: decoded,
          perms: decoded?.perms ?? [],
        });
      },

      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null, perms: [] }),
    }),
    { name: 'fps-auth-store' }
  )
);
```

---

## 2. `usePermissions` Hook

```typescript
// src/hooks/usePermissions.ts
import { useAuthStore } from '../store/authStore';

export function usePermissions() {
  const perms = useAuthStore(s => s.perms);
  const user = useAuthStore(s => s.user);

  return {
    /** Check if user has a specific permission */
    can: (codename: string): boolean => perms.includes(codename),

    /** Check if user has any of the given permissions */
    canAny: (codenames: string[]): boolean =>
      codenames.some(c => perms.includes(c)),

    /** Check if user has all of the given permissions */
    canAll: (codenames: string[]): boolean =>
      codenames.every(c => perms.includes(c)),

    /** Check if user can access a module */
    canAccessModule: (module: 'crop' | 'mandi' | 'product_demo'): boolean => {
      const map: Record<string, string> = {
        crop: 'can_access_crop_module',
        mandi: 'can_access_mandi_module',
        product_demo: 'can_access_product_demo_module',
      };
      return perms.includes(map[module]);
    },

    role: user?.role ?? '',
    districts: user?.districts ?? [],
    state: user?.state ?? '',
    perms,
    user,
  };
}
```

---

## 3. Navigation Guards

### App Navigator — Module Gating

```tsx
// src/navigation/AppNavigatorV2.tsx (extend existing)
import { usePermissions } from '../hooks/usePermissions';

export function AppNavigatorV2() {
  const { canAccessModule } = usePermissions();

  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreenV2} />
      
      {canAccessModule('crop') && (
        <Tab.Screen name="CropMonitoring" component={CropMonitoringStack} />
      )}
      
      {canAccessModule('mandi') && (
        <Tab.Screen name="MandiArrival" component={MandiStack} />
      )}
      
      {canAccessModule('product_demo') && (
        <Tab.Screen name="ProductDemo" component={ProductDemoStack} />
      )}

      {/* Analytics tab only for roles that can see at least own analytics */}
      {/* Field Executives have can_view_own_analytics */}
      <Tab.Screen name="Analytics" component={AnalyticsStack} />
    </Tab.Navigator>
  );
}
```

### Screen-Level Guard Component

```tsx
// src/components/PermissionGate.tsx
import { usePermissions } from '../hooks/usePermissions';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  requires: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ requires, requireAll = false, fallback, children }: Props) {
  const { can, canAny, canAll } = usePermissions();

  const codenames = Array.isArray(requires) ? requires : [requires];
  const allowed = requireAll ? canAll(codenames) : canAny(codenames);

  if (!allowed) {
    return fallback ? <>{fallback}</> : (
      <View style={styles.denied}>
        <Text style={styles.deniedText}>Access Restricted</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deniedText: { color: '#666', fontSize: 16 },
});
```

Usage:

```tsx
// In any screen
<PermissionGate requires="can_approve_crop_visit">
  <ApprovalActionBar onApprove={handleApprove} onReject={handleReject} />
</PermissionGate>

<PermissionGate requires="can_edit_own_crop_visit" fallback={<ReadOnlyView entry={entry} />}>
  <EditableForm entry={entry} />
</PermissionGate>
```

---

## 4. Home Screen Module Tiles

The Home screen tiles should be dynamically rendered based on permissions.

```tsx
// src/screens-v2/HomeScreen.tsx (update existing)
export function HomeScreen() {
  const { canAccessModule, can } = usePermissions();

  const modules = [
    {
      id: 'crop',
      title: 'Crop Monitoring',
      icon: 'leaf',
      screen: 'CropMonitoringHome',
      visible: canAccessModule('crop'),
    },
    {
      id: 'mandi',
      title: 'Mandi Arrival',
      icon: 'store',
      screen: 'MandiHome',
      visible: canAccessModule('mandi'),
    },
    {
      id: 'product_demo',
      title: 'Product Demo',
      icon: 'flask',
      screen: 'ProductDemoHome',
      visible: canAccessModule('product_demo'),
    },
    {
      id: 'approvals',
      title: 'Approval Queue',
      icon: 'check-circle',
      screen: 'ApprovalQueue',
      visible: can('can_approve_crop_visit') ||
               can('can_approve_mandi_arrival') ||
               can('can_approve_product_demo'),
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'bar-chart',
      screen: 'Analytics',
      visible: can('can_view_own_analytics'),
    },
  ].filter(m => m.visible);

  return (
    <FlatList
      data={modules}
      renderItem={({ item }) => <ModuleTile {...item} />}
      numColumns={2}
    />
  );
}
```

---

## 5. Approval Queue on Mobile (for Checkers)

Checkers use the same mobile app — they get an additional "Approvals" tile.

```tsx
// src/screens/approvals/ApprovalQueueScreen.tsx — NEW
export function ApprovalQueueScreen() {
  const { can } = usePermissions();
  
  // API call — server-side filters by region + role automatically
  const { data, isLoading } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: () => api.get('/api/approvals/queue/'),
  });

  return (
    <FlatList
      data={data?.results}
      renderItem={({ item }) => (
        <ApprovalCard
          item={item}
          canApprove={can('can_approve_crop_visit')}  // dynamic per module
          onApprove={() => handleApprove(item.id)}
          onReject={() => handleReject(item.id)}
          onRequestRevision={() => handleRevision(item.id)}
        />
      )}
    />
  );
}
```

---

## 6. Token Refresh + Permission Update

```typescript
// src/api/client.ts (extend existing)
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const client = axios.create({ baseURL: API_BASE_URL });

// Request interceptor — attach token
client.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refresh is happening
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        // This updates perms automatically — new access token has updated perms
        useAuthStore.getState().setTokens(data.access, data.refresh || refreshToken);

        failedQueue.forEach(req => req.resolve(data.access));
        failedQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return client(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(req => req.reject(refreshError));
        failedQueue = [];
        // Refresh failed — force logout
        useAuthStore.getState().clearAuth();
        NavigationService.navigate('Login');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 7. WatermelonDB — No Schema Changes Needed

Permissions don't need WatermelonDB changes because:

- Permissions live in the JWT (in-memory / persisted auth store)
- Approval status on records is a field on the existing model schema (add `approval_status` column)
- The sync engine already handles status field updates server-side

### Add `approval_status` to WatermelonDB Schema

```typescript
// src/database/schema.ts — add to FarmerVisit / MandiArrival / ProductDemo tables
tableSchema({
  name: 'farmer_visits',
  columns: [
    // ... existing columns ...
    { name: 'approval_status', type: 'string' },   // mirrors server: draft|submitted|approved|etc.
    { name: 'revision_note', type: 'string', isOptional: true },
    { name: 'is_locked', type: 'boolean' },
  ],
})
```

The sync engine pulls `approval_status` from the server. Local UI reads it to determine edit availability.

---

## 8. Offline Behaviour Summary

| Scenario | Behaviour |
|----------|-----------|
| FE creates entry offline | Saved as `draft` locally, synced when online |
| FE submits offline | Queued in sync engine, submitted on next connection |
| Checker approves → FE offline | FE sees `draft` locally until next sync; then `approved` |
| Admin revokes module access | FE keeps access until token expires (max 8h); then module hidden |
| Admin deactivates user | Refresh token blacklisted; next sync/token refresh → forced logout |
| Checker sends revision request | FE sees old status until sync; on sync `revision_requested` + note appear |
| Permissions change mid-day | New perms effective after token refresh (8h max delay) |
