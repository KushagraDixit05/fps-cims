import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders `children` only if the current user has the required permission.
 * Falls back to `fallback` (default: null) otherwise.
 */
export const PermissionGate = ({ permission, children, fallback = null }: PermissionGateProps) => {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
};
