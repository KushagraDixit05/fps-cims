/**
 * usePermissions — RBAC permission check hook (Phase 6).
 *
 * Reads the `perms` string array from the auth store (decoded from the JWT
 * access token at login) and exposes helper methods for checking whether the
 * current user holds a given permission codename.
 *
 * Permissions are always derived from the JWT:
 *  - Populated immediately at login (no extra API call).
 *  - Available offline (decoded from the token stored in AsyncStorage).
 *  - Refreshed automatically when the token rotates (next background refresh).
 *
 * Usage:
 *   const { can, canAccessModule } = usePermissions();
 *   if (can('can_approve_crop_visit')) { ... }
 */

import { useAuth } from '../store/authStore';

export interface UsePermissionsResult {
  /** True if the user holds exactly this permission codename. */
  can: (codename: string) => boolean;
  /** True if the user holds at least one of the given codenames. */
  canAny: (codenames: string[]) => boolean;
  /** True if the user holds every one of the given codenames. */
  canAll: (codenames: string[]) => boolean;
  /**
   * True if the user can enter the given module.
   * Maps to the `can_access_<module>_module` permission codename.
   */
  canAccessModule: (module: 'crop' | 'mandi' | 'product_demo') => boolean;
  /** Raw permission codenames list from the JWT. */
  perms: string[];
  /** The user's role string (e.g. 'field_executive'). Empty string if not logged in. */
  role: string;
  /** State code from the JWT (e.g. 'MH'). Empty string if not set. */
  state: string;
  /** District codes the user is assigned to (from JWT). */
  districts: string[];
}

const MODULE_PERM_MAP: Record<'crop' | 'mandi' | 'product_demo', string> = {
  crop:         'can_access_crop_module',
  mandi:        'can_access_mandi_module',
  product_demo: 'can_access_product_demo_module',
};

export function usePermissions(): UsePermissionsResult {
  const { perms, user } = useAuth();

  return {
    can: (codename: string) => perms.includes(codename),

    canAny: (codenames: string[]) => codenames.some(c => perms.includes(c)),

    canAll: (codenames: string[]) => codenames.every(c => perms.includes(c)),

    canAccessModule: (module: 'crop' | 'mandi' | 'product_demo') =>
      perms.includes(MODULE_PERM_MAP[module]),

    perms,
    role:      user?.role ?? '',
    state:     user?.state ?? '',
    districts: user?.districts ?? [],
  };
}
