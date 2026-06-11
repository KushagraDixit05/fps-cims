"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, MoreHorizontal, UserX, UserCheck, LogOut, Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserDrawer } from "@/components/users/UserDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUsers, useDeactivateUser, useReactivateUser, useForceLogout } from "@/hooks/useUsers";
import { formatDate, initials } from "@/lib/utils";
import type { User } from "@/types/models";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<User | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  const { data: users, isLoading } = useUsers({
    search: search || undefined,
    is_active: statusFilter !== "all" ? (statusFilter === "active" ? "true" : "false") : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });

  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const forceLogout = useForceLogout();

  const columns: ColumnDef<User>[] = [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => {
        const u = row.original;
        const name = u.full_name ?? (`${u.first_name} ${u.last_name}`.trim() || u.username);
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs font-bold">{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[13px] font-semibold text-fps-ink">{name}</p>
              <p className="text-[11px] text-fps-muted">{u.username}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "primary_role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.primary_role;
        return role ? (
          <Badge variant={role.is_preset ? "default" : "secondary"}>{role.name}</Badge>
        ) : (
          <span className="text-fps-muted text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "phone_number",
      header: "Phone",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() ? "active" : "inactive"} />
      ),
    },
    {
      accessorKey: "date_joined",
      header: "Joined",
      cell: ({ getValue }) => (
        <span className="text-xs text-fps-muted">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditUser(u);
                  setDrawerOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {u.is_active ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeactivateDialog(u);
                  }}
                  className="text-status-error-text focus:text-status-error-text"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    reactivate.mutate(u.id);
                  }}
                  className="text-status-good-text focus:text-status-good-text"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  forceLogout.mutate(u.id);
                }}
                className="text-status-warn-text focus:text-status-warn-text"
              >
                <LogOut className="h-3.5 w-3.5" />
                Force Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="User Management"
        description={`${users?.length ?? 0} users in the system`}
        actions={
          <Button onClick={() => { setEditUser(null); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fps-muted" />
          <Input
            placeholder="Search users…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="field_executive">Field Executive</SelectItem>
            <SelectItem value="checker">Checker</SelectItem>
            <SelectItem value="regional_head">Regional Head</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : (
        <DataTable columns={columns} data={users ?? []} pageSize={12} />
      )}

      <UserDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditUser(null); }}
        user={editUser}
      />

      {/* Deactivate dialog */}
      <Dialog
        open={!!deactivateDialog}
        onOpenChange={(v) => !v && setDeactivateDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              This will prevent{" "}
              <strong>
                {deactivateDialog?.full_name ??
                  deactivateDialog?.username}
              </strong>{" "}
              from logging in. You can reactivate them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you deactivating this user?"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setDeactivateDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deactivate.isPending}
              onClick={() => {
                if (!deactivateDialog) return;
                deactivate.mutate(
                  { id: deactivateDialog.id, reason: deactivateReason },
                  { onSuccess: () => { setDeactivateDialog(null); setDeactivateReason(""); } }
                );
              }}
            >
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
