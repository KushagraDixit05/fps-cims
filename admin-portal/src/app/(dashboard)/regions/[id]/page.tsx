"use client";

import { useState } from "react";
import { use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Save, UserPlus, Trash2, Users, GitBranch } from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useRegion,
  useUpdateRegion,
  useAssignUserToRegion,
  useRemoveUserFromRegion,
} from "@/hooks/useRegions";
import { useUsers } from "@/hooks/useUsers";
import { formatDate } from "@/lib/utils";
import type { Region, RegionUser } from "@/types/models";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function RegionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: region, isLoading } = useRegion(id);
  const updateRegion = useUpdateRegion();
  const assignUser = useAssignUserToRegion();
  const removeUser = useRemoveUserFromRegion();
  const { data: allUsersData } = useUsers();

  const [editForm, setEditForm] = useState<{
    name: string; code: string; state: string;
    district: string; taluka: string; is_active: boolean;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("assigned");
  const [assignError, setAssignError] = useState<string | null>(null);

  function startEdit() {
    if (!region) return;
    setEditForm({
      name: region.name,
      code: region.code,
      state: region.state,
      district: region.district ?? "",
      taluka: region.taluka ?? "",
      is_active: region.is_active,
    });
    setSaveError(null);
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!editForm) return;
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateRegion.mutateAsync({ id, ...editForm });
      setSaveSuccess(true);
      setEditForm(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      setSaveError(
        e?.response?.data ? Object.values(e.response.data).flat().join(", ") : "Failed to save"
      );
    }
  }

  async function handleAssign() {
    setAssignError(null);
    if (!assignUserId) { setAssignError("Please select a user"); return; }
    try {
      await assignUser.mutateAsync({ regionId: id, user_id: Number(assignUserId), role: assignRole });
      setAssignOpen(false);
      setAssignUserId("");
      setAssignRole("assigned");
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      setAssignError(
        e?.response?.data ? Object.values(e.response.data).flat().join(", ") : "Failed to assign user"
      );
    }
  }

  async function handleRemoveUser(userId: number) {
    await removeUser.mutateAsync({ regionId: id, user_id: userId });
  }

  const userColumns: ColumnDef<RegionUser>[] = [
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-fps-ink">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => (
        <Badge variant="secondary">{(getValue() as string).replace(/_/g, " ")}</Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-status-error-text hover:bg-status-error-bg"
            onClick={() => handleRemoveUser(row.original.user_id)}
            disabled={removeUser.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const childColumns: ColumnDef<Region>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link href={`/regions/${row.original.id}`} className="text-sm font-medium text-fps-ink hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-fps-muted">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "district",
      header: "District",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "user_count",
      header: "Users",
      cell: ({ getValue }) => <span className="text-sm text-fps-secondary">{getValue() as number}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ getValue }) =>
        getValue() ? <Badge variant="good">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <div className="h-8 w-64 rounded-lg bg-fps-canvas animate-pulse" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  if (!region) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <p className="text-sm text-fps-muted">Region not found.</p>
        <Button variant="secondary" asChild className="mt-4">
          <Link href="/regions">Back to Regions</Link>
        </Button>
      </div>
    );
  }

  const assignedUserIds = new Set(region.users.map((u) => u.user_id));
  const availableUsers = (allUsersData ?? []).filter((u) => !assignedUserIds.has(u.id) && u.is_active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/regions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-fps-muted">
          <Link href="/regions" className="hover:text-fps-ink transition-colors">Regions</Link>
          {region.parent_name && (
            <>
              <span>/</span>
              <span>{region.parent_name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-fps-ink font-medium">{region.name}</span>
        </div>
      </div>

      <PageHeader
        title={region.name}
        description={`${region.code} · ${region.state}${region.district ? ` · ${region.district}` : ""}`}
        actions={
          editForm ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setEditForm(null); setSaveError(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateRegion.isPending}>
                <Save className="h-4 w-4" />
                {updateRegion.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={startEdit}>Edit Region</Button>
          )
        }
      />

      {saveSuccess && (
        <div className="rounded-xl bg-status-success-bg border border-status-success/20 px-4 py-3 text-sm text-status-success-text">
          Region updated successfully.
        </div>
      )}
      {saveError && (
        <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
          {saveError}
        </div>
      )}

      {editForm ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Region Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)} />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={editForm.code} onChange={(e) => setEditForm((f) => f ? { ...f, code: e.target.value.toUpperCase() } : f)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>State *</Label>
              <Select value={editForm.state} onValueChange={(v) => setEditForm((f) => f ? { ...f, state: v } : f)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input value={editForm.district} onChange={(e) => setEditForm((f) => f ? { ...f, district: e.target.value } : f)} />
              </div>
              <div className="space-y-1.5">
                <Label>Taluka</Label>
                <Input value={editForm.taluka} onChange={(e) => setEditForm((f) => f ? { ...f, taluka: e.target.value } : f)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm((f) => f ? { ...f, is_active: e.target.checked } : f)}
                className="h-4 w-4 accent-fps-primary cursor-pointer"
              />
              <Label htmlFor="edit_is_active" className="cursor-pointer">Active</Label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "State", value: region.state || "—" },
            { label: "District", value: region.district || "—" },
            { label: "Taluka", value: region.taluka || "—" },
            { label: "Parent Region", value: region.parent_name ?? "None" },
            { label: "Users", value: String(region.user_count) },
            { label: "Sub-regions", value: String(region.children_count) },
            { label: "Status", value: region.is_active ? "Active" : "Inactive" },
            { label: "Created", value: formatDate(region.created_at) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-fps-border bg-white p-4">
              <p className="text-xs text-fps-muted mb-1">{label}</p>
              <p className="text-sm font-semibold text-fps-ink">{value}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Assigned Users ({region.users.length})
          </TabsTrigger>
          <TabsTrigger value="children">
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            Sub-regions ({region.children.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Assign User
            </Button>
          </div>
          {region.users.length === 0 ? (
            <div className="rounded-xl border border-fps-border bg-white py-10 text-center">
              <MapPin className="mx-auto h-6 w-6 text-fps-muted mb-2" strokeWidth={1.5} />
              <p className="text-sm text-fps-muted">No users assigned to this region.</p>
            </div>
          ) : (
            <DataTable columns={userColumns} data={region.users} pageSize={10} />
          )}
        </TabsContent>

        <TabsContent value="children" className="mt-4">
          {region.children.length === 0 ? (
            <div className="rounded-xl border border-fps-border bg-white py-10 text-center">
              <GitBranch className="mx-auto h-6 w-6 text-fps-muted mb-2" strokeWidth={1.5} />
              <p className="text-sm text-fps-muted">No sub-regions under this region.</p>
            </div>
          ) : (
            <DataTable columns={childColumns} data={region.children} pageSize={10} />
          )}
        </TabsContent>
      </Tabs>

      {/* Assign User Dialog */}
      <Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) { setAssignUserId(""); setAssignRole("assigned"); setAssignError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {region.name}</DialogTitle>
            <DialogDescription>Select an active user to assign to this region</DialogDescription>
          </DialogHeader>
          {assignError && (
            <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
              {assignError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>User *</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>All active users already assigned</SelectItem>
                  ) : (
                    availableUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.full_name || u.username} ({u.role?.replace(/_/g, " ")})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignment Role</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assignUser.isPending || !assignUserId}>
              {assignUser.isPending ? "Assigning…" : "Assign User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
