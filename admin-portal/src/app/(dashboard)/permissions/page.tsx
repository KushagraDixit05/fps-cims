"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions, useUserPermissions, useGrantUserPermission, useDeleteUserPermission } from "@/hooks/usePermissions";
import { useUsers } from "@/hooks/useUsers";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Permission } from "@/types/models";

function groupByModule(perms: Permission[]): Record<string, Permission[]> {
  return perms.reduce<Record<string, Permission[]>>((acc, p) => {
    const m = p.module ?? "other";
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});
}

export default function PermissionsPage() {
  const { data: permissions } = usePermissions();
  const { data: overrides } = useUserPermissions();
  const { data: users } = useUsers();
  const grantPermission = useGrantUserPermission();
  const deletePermission = useDeleteUserPermission();

  const [search, setSearch] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [form, setForm] = useState({
    user: "",
    permission: "",
    effect: "allow" as "allow" | "deny",
    reason: "",
    expires_at: "",
  });

  const filtered = permissions?.filter(
    (p) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.codename.toLowerCase().includes(search.toLowerCase()) ||
      p.module.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const grouped = groupByModule(filtered);

  async function handleGrant() {
    await grantPermission.mutateAsync({
      user: Number(form.user),
      permission: form.permission,
      effect: form.effect,
      reason: form.reason,
      expires_at: form.expires_at || undefined,
    });
    setGrantOpen(false);
    setForm({ user: "", permission: "", effect: "allow", reason: "", expires_at: "" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Permission Catalogue"
        description={`${permissions?.length ?? 0} permissions across all modules`}
        actions={
          <Button onClick={() => setGrantOpen(true)}>
            <Plus className="h-4 w-4" />
            Grant Override
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fps-muted" />
        <Input
          placeholder="Search permissions…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Permission catalogue */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, perms]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle className="capitalize">{module.replace(/_/g, " ")}</CardTitle>
                <p className="text-xs text-fps-muted">{perms.length} permissions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {perms.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-fps-canvas transition-colors"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-fps-ink">{p.label}</p>
                        <p className="text-[10px] font-mono text-fps-muted">{p.codename}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">{p.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User permission overrides */}
        <Card>
          <CardHeader>
            <CardTitle>User Permission Overrides</CardTitle>
            <p className="text-xs text-fps-muted">Individual allow/deny exceptions to role permissions</p>
          </CardHeader>
          <CardContent>
            {!overrides || overrides.length === 0 ? (
              <p className="text-sm text-fps-muted py-4 text-center">No overrides configured</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((o) => (
                  <div key={o.id} className="flex items-start justify-between gap-2 py-2.5 border-b border-fps-divider last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={o.effect === "allow" ? "good" : "error"} className="text-[10px]">
                          {o.effect}
                        </Badge>
                        <p className="text-[12px] font-semibold text-fps-ink truncate">
                          {o.permission_label ?? o.permission_codename ?? o.permission}
                        </p>
                      </div>
                      <p className="text-[11px] text-fps-muted">
                        @{o.user_username ?? `User ${o.user}`}
                        {o.expires_at && ` · expires ${formatDate(o.expires_at)}`}
                      </p>
                      {o.reason && <p className="text-[11px] text-fps-secondary italic">{o.reason}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-status-error-text hover:bg-status-error-bg shrink-0"
                      onClick={() => deletePermission.mutate(o.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grant override dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Permission Override</DialogTitle>
            <DialogDescription>Override a specific permission for an individual user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={form.user} onValueChange={(v) => setForm((f) => ({ ...f, user: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name ?? u.username} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Permission</Label>
              <Select value={form.permission} onValueChange={(v) => setForm((f) => ({ ...f, permission: v }))}>
                <SelectTrigger><SelectValue placeholder="Select permission" /></SelectTrigger>
                <SelectContent>
                  {permissions?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} — <span className="font-mono text-xs">{p.codename}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Effect</Label>
              <Select value={form.effect} onValueChange={(v) => setForm((f) => ({ ...f, effect: v as "allow" | "deny" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="Why is this override needed?"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setGrantOpen(false)}>Cancel</Button>
            <Button
              onClick={handleGrant}
              disabled={grantPermission.isPending || !form.user || !form.permission}
            >
              Grant Override
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
