import { useAuth } from '../store/authStore';
import { decodeJWT } from '../utils/jwt';

export interface PermissionsResult {
  can: (codename: string) => boolean;
  canAny: (codenames: string[]) => boolean;
  perms: string[];
  role: string;
  districts: string[];
  isApprover: boolean;
}

export function usePermissions(): PermissionsResult {
  const { accessToken } = useAuth();
  const claims = accessToken ? decodeJWT(accessToken) : null;
  const perms: string[] = claims?.perms ?? [];
  const role: string = claims?.role ?? '';
  const districts: string[] = claims?.districts ?? [];

  return {
    can: (codename: string) => perms.includes(codename),
    canAny: (codenames: string[]) => codenames.some((c) => perms.includes(c)),
    perms,
    role,
    districts,
    isApprover: perms.some((p) => p.startsWith('can_approve_')),
  };
}
