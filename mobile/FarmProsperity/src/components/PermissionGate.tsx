/**
 * PermissionGate — conditional render wrapper based on RBAC permissions (Phase 6).
 *
 * Renders `children` only when the current user holds the required permission(s).
 * Renders `fallback` (or a default "Access Restricted" view) otherwise.
 *
 * Usage:
 *   <PermissionGate requires="can_approve_crop_visit">
 *     <ApprovalActionBar />
 *   </PermissionGate>
 *
 *   <PermissionGate
 *     requires={['can_edit_own_crop_visit', 'can_edit_any_crop_visit']}
 *     fallback={<ReadOnlyView />}
 *   >
 *     <EditableForm />
 *   </PermissionGate>
 *
 *   <PermissionGate requires={['can_create_crop_visit', 'can_submit_crop_visit']} requireAll>
 *     <SubmitButton />
 *   </PermissionGate>
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** One codename or a list of codenames to check. */
  requires: string | string[];
  /**
   * When true: ALL codenames must be present (AND logic).
   * When false (default): ANY codename is sufficient (OR logic).
   */
  requireAll?: boolean;
  /** Rendered instead of the default "Access Restricted" banner when access is denied. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  requires,
  requireAll = false,
  fallback,
  children,
}: PermissionGateProps): React.ReactElement | null {
  const { canAny, canAll } = usePermissions();

  const codenames = Array.isArray(requires) ? requires : [requires];
  const allowed = requireAll ? canAll(codenames) : canAny(codenames);

  if (!allowed) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedText}>Access Restricted</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  denied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deniedText: {
    color: '#8A8A7A',
    fontSize: 15,
    fontWeight: '500',
  },
});
