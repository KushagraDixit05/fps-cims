"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Check } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole, useRolePermissions, useAddRolePermissions, useRemoveRolePermissions } from "@/hooks/useRoles";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { Permission } from "@/types/models";

function groupByModule(perms: Permission[]): Record<string, Permission[]> {
  return perms.reduce<Record<string, Permission[]>>((acc, p) => {
    const m = p.module ?? "other";
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});
}

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: role, isLoading: loadingRole } = useRole(id);
  const { data: rolePerms } = useRolePermissions(id);
  const { data: allPerms } = usePermissions();
  const addPerms = useAddRolePermissions(id);
  const removePerms = useRemoveRolePermissions(id);

  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());

  const grantedIds = new Set(rolePerms?.map((p) => p.id) ?? []);

  function toggle(permId: string) {
    if (role?.is_preset) return;
    if (grantedIds.has(permId)) {
      setPendingRemove((s) => { const n = new Set(s); n.add(permId); return n; });
      setPendingAdd((s) => { const n = new Set(s); n.delete(permId); return n; });
    } else {
      setPendingAdd((s) => { const n = new Set(s); n.add(permId); return n; });
      setPendingRemove((s) => { const n = new Set(s); n.delete(permId); return n; });
    }
  }

  async function saveChanges() {
    if (pendingAdd.size > 0) await addPerms.mutateAsync([...pendingAdd]);
    if (pendingRemove.size > 0) await removePerms.mutateAsync([...pendingRemove]);
    setPendingAdd(new Set());
    setPendingRemove(new Set());
  }

  const hasChanges = pendingAdd.size > 0 || pendingRemove.size > 0;

  const allGrouped = groupByModule(allPerms ?? []);

  if (loadingRole) return <div className="animate-pulse h-96 rounded-2xl bg-fps-border/40" />;
  if (!role) return <div className="text-fps-muted">Role not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/roles"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <span className="text-sm text-fps-muted">Roles</span>
      </div>

      <PageHeader
        title={role.name}
        description={role.description || `Role code: ${role.code}`}
        actions={
          <div className="flex items-center gap-2">
            {role.is_preset && (
              <Badge variant="default">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                Preset — Read Only
              </Badge>
            )}
            {!role.is_preset && hasChanges && (
              <Button
                onClick={saveChanges}
                disabled={addPerms.isPending || removePerms.isPending}
              >
                Save Changes ({pendingAdd.size + pendingRemove.size})
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          {!role.is_preset && (
            <p className="text-xs text-fps-muted">Toggle permissions to grant or revoke access for this role</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(allGrouped).map(([module, perms]) => (
              <div key={module}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-fps-muted mb-3">
                  {module.replace(/_/g, " ")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {perms.map((perm) => {
                    const isGranted = pendingAdd.has(perm.id)
                      ? true
                      : pendingRemove.has(perm.id)
                      ? false
                      : grantedIds.has(perm.id);
                    return (
                      <button
                        key={perm.id}
                        onClick={() => toggle(perm.id)}
                        disabled={role.is_preset}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-100",
                          isGranted
                            ? "bg-fps-primary-light border-fps-primary/30 text-fps-primary"
                            : "bg-white border-fps-border text-fps-secondary hover:border-fps-primary/30",
                          role.is_preset && "cursor-default",
                          !role.is_preset && "cursor-pointer hover:shadow-sm"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            isGranted ? "bg-fps-primary border-fps-primary" : "border-fps-border bg-white"
                          )}
                        >
                          {isGranted && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold truncate">{perm.label}</p>
                          <p className="text-[10px] font-mono text-fps-muted truncate">{perm.codename}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
