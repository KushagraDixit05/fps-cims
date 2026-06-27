"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Search, Trash2, ChevronRight, Users, GitBranch } from "lucide-react";
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
import { useRegions, useCreateRegion, useDeleteRegion } from "@/hooks/useRegions";
import { formatDate } from "@/lib/utils";
import type { Region } from "@/types/models";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

type CreateForm = {
  name: string;
  code: string;
  state: string;
  district: string;
  taluka: string;
  parent: string;
  is_active: boolean;
};

const EMPTY_FORM: CreateForm = {
  name: "", code: "", state: "", district: "", taluka: "", parent: "", is_active: true,
};

export default function RegionsPage() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useRegions({
    search: search || undefined,
    state: stateFilter !== "all" ? stateFilter : undefined,
    is_active: activeFilter !== "all" ? activeFilter === "active" : undefined,
  });

  const createRegion = useCreateRegion();
  const deleteRegion = useDeleteRegion();

  const regions = data?.results ?? [];

  const allStates = Array.from(new Set(regions.map((r) => r.state).filter(Boolean))).sort();
  const stateOptions = Array.from(new Set([...INDIAN_STATES, ...allStates])).sort();

  async function handleCreate() {
    setCreateError(null);
    try {
      await createRegion.mutateAsync({
        name: form.name,
        code: form.code,
        state: form.state,
        district: form.district || undefined,
        taluka: form.taluka || undefined,
        parent: form.parent || null,
        is_active: form.is_active,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      setCreateError(
        e?.response?.data ? Object.values(e.response.data).flat().join(", ") : "Failed to create region"
      );
    }
  }

  async function handleDelete(region: Region) {
    setDeleteError(null);
    try {
      await deleteRegion.mutateAsync(region.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setDeleteError(e?.response?.data?.detail ?? "Failed to delete region");
    }
  }

  const columns: ColumnDef<Region>[] = [
    {
      accessorKey: "name",
      header: "Region",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fps-canvas border border-fps-border">
            <MapPin className="h-3.5 w-3.5 text-fps-muted" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-fps-ink">{row.original.name}</p>
            <p className="text-xs font-mono text-fps-muted">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{getValue() as string || "—"}</span>
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
      accessorKey: "parent_name",
      header: "Parent",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-muted">{(getValue() as string) ?? "—"}</span>
      ),
    },
    {
      accessorKey: "user_count",
      header: "Users",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-sm text-fps-secondary">
          <Users className="h-3.5 w-3.5 text-fps-muted" />
          {getValue() as number}
        </span>
      ),
    },
    {
      accessorKey: "children_count",
      header: "Sub-regions",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-sm text-fps-secondary">
          <GitBranch className="h-3.5 w-3.5 text-fps-muted" />
          {getValue() as number}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="good">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-xs text-fps-muted">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/regions/${row.original.id}`}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-status-error-text hover:bg-status-error-bg"
            onClick={() => handleDelete(row.original)}
            disabled={deleteRegion.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
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
        title="Region Management"
        description={`${data?.count ?? 0} regions configured`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Region
          </Button>
        }
      />

      {deleteError && (
        <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
          {deleteError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fps-muted pointer-events-none" />
          <Input
            placeholder="Search regions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {stateOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : regions.length === 0 ? (
        <div className="rounded-xl border border-fps-border bg-white py-16 text-center">
          <MapPin className="mx-auto h-8 w-8 text-fps-muted mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-fps-ink mb-1">No regions found</p>
          <p className="text-xs text-fps-muted">Create your first region to get started.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={regions} pageSize={15} />
      )}

      {/* Create Region Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setForm(EMPTY_FORM); setCreateError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Region</DialogTitle>
            <DialogDescription>Define a geographic region for user assignment</DialogDescription>
          </DialogHeader>
          {createError && (
            <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
              {createError}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Region Name *</Label>
                <Input
                  placeholder="e.g. Nanded District"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g. MH-NND"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>State *</Label>
              <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input
                  placeholder="e.g. Nanded"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Taluka</Label>
                <Input
                  placeholder="e.g. Mukhed"
                  value={form.taluka}
                  onChange={(e) => setForm((f) => ({ ...f, taluka: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Region</Label>
              <Select value={form.parent || "none"} onValueChange={(v) => setForm((f) => ({ ...f, parent: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 accent-fps-primary cursor-pointer"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createRegion.isPending || !form.name || !form.code || !form.state}
            >
              {createRegion.isPending ? "Creating…" : "Create Region"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
