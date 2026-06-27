"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Shield, Users, Key, Trash2, Lock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoles, useCreateRole, useDeleteRole } from "@/hooks/useRoles";
import type { Role } from "@/types/models";

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: "#1A4A2E", text: "#FFFFFF", border: "#1A4A2E" },
  admin: { bg: "#2A6A44", text: "#FFFFFF", border: "#2A6A44" },
  regional_head: { bg: "#185FA5", text: "#FFFFFF", border: "#185FA5" },
  checker: { bg: "#C8900A", text: "#FFFFFF", border: "#C8900A" },
  field_executive: { bg: "#E1F2E8", text: "#1A4A2E", border: "#1A4A2E" },
  viewer: { bg: "#F8F6F1", text: "#6A7A6A", border: "#E0DDD5" },
};

function RoleCard({ role }: { role: Role }) {
  const colors = ROLE_COLORS[role.code] ?? { bg: "#F8F6F1", text: "#1A3A25", border: "#E0DDD5" };
  const deleteRole = useDeleteRole();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden"
      style={{ borderColor: colors.border + "40" }}
    >
      {/* Color header bar */}
      <div className="h-2" style={{ background: colors.bg }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: colors.bg + "20", border: `1px solid ${colors.border}30` }}
          >
            <Shield
              className="h-5 w-5"
              style={{ color: role.code === "super_admin" || role.code === "admin" || role.code === "regional_head" || role.code === "checker" ? colors.bg : colors.text === "#FFFFFF" ? colors.bg : colors.text }}
              strokeWidth={1.75}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {role.is_preset ? (
              <Badge variant="default">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                Preset
              </Badge>
            ) : (
              <Badge variant="secondary">Custom</Badge>
            )}
          </div>
        </div>

        <p className="text-[15px] font-bold text-fps-ink mb-0.5">{role.name}</p>
        <p className="text-[11px] font-mono text-fps-muted mb-3">{role.code}</p>
        {role.description && (
          <p className="text-xs text-fps-secondary mb-3 line-clamp-2">{role.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-fps-muted border-t border-fps-divider pt-3">
          <span className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            {role.permission_count ?? "—"} perms
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {role.user_count ?? "—"} users
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <Button variant="secondary" size="sm" asChild className="flex-1">
            <Link href={`/roles/${role.id}`}>Manage</Link>
          </Button>
          {!role.is_preset && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-status-error-text hover:bg-status-error-bg"
              onClick={() => deleteRole.mutate(role.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function RolesPage() {
  const { data: roles, isLoading, isError } = useRoles();
  const createRole = useCreateRole();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      await createRole.mutateAsync(form);
      setCreateOpen(false);
      setForm({ name: "", code: "", description: "" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      setError(e?.response?.data ? Object.values(e.response.data).flat().join(", ") : "Failed");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Role Management"
        description={`${roles?.length ?? 0} roles configured`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-fps-border bg-white h-52 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
          Failed to load roles. Your session may have expired — please log out and log back in.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {roles?.map((role) => <RoleCard key={role.id} role={role} />)}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>Add a new role to assign to users</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input
                placeholder="e.g. District Manager"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role Code</Label>
              <Input
                placeholder="e.g. district_manager"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="What can this role do?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRole.isPending || !form.name || !form.code}>
              Create Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
