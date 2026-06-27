"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Search, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSyncMonitorList } from "@/hooks/useSyncMonitor";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { DeviceSyncLog } from "@/types/models";

const STATUS_VARIANT: Record<string, "good" | "warn" | "error"> = {
  success: "good",
  partial: "warn",
  failed: "error",
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  pull: "Pull",
  push: "Push",
  full: "Full",
};

export default function SyncMonitorPage() {
  const router = useRouter();
  const [usernameSearch, setUsernameSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useSyncMonitorList({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const logs = data?.results ?? [];

  const filtered = logs.filter((log) => {
    if (usernameSearch && !log.username.toLowerCase().includes(usernameSearch.toLowerCase())) return false;
    if (deviceSearch && !log.device_identifier.toLowerCase().includes(deviceSearch.toLowerCase())) return false;
    return true;
  });

  const columns: ColumnDef<DeviceSyncLog>[] = [
    {
      accessorKey: "synced_at",
      header: "Timestamp",
      cell: ({ getValue }) => (
        <div>
          <p className="text-xs font-mono text-fps-muted whitespace-nowrap">
            {formatDateTime(getValue() as string)}
          </p>
          <p className="text-[10px] text-fps-muted/70">{formatRelative(getValue() as string)}</p>
        </div>
      ),
    },
    {
      accessorKey: "username",
      header: "User",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-fps-ink">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "device_identifier",
      header: "Device ID",
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-fps-muted truncate max-w-[140px] block" title={getValue() as string}>
          {(getValue() as string).slice(0, 20)}…
        </span>
      ),
    },
    {
      accessorKey: "device_name",
      header: "Device",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-fps-secondary">{row.original.device_name || "—"}</p>
          <p className="text-[10px] text-fps-muted capitalize">{row.original.platform || "—"}</p>
        </div>
      ),
    },
    {
      accessorKey: "sync_type",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge variant="secondary">{SYNC_TYPE_LABELS[getValue() as string] ?? getValue() as string}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant={STATUS_VARIANT[s] ?? "secondary"}>{s}</Badge>;
      },
    },
    {
      accessorKey: "records_pushed",
      header: "Pushed",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary text-right block">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "records_pulled",
      header: "Pulled",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary text-right block">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "error_detail",
      header: "",
      cell: ({ getValue }) =>
        getValue() ? (
          <span title={getValue() as string}>
            <AlertCircle className="h-4 w-4 text-status-error-text" strokeWidth={1.75} />
          </span>
        ) : null,
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
        title="Sync Monitor"
        description={`${data?.count ?? 0} sync events recorded`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fps-muted pointer-events-none" />
          <Input
            placeholder="Search by username…"
            value={usernameSearch}
            onChange={(e) => setUsernameSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fps-muted pointer-events-none" />
          <Input
            placeholder="Search by device ID…"
            value={deviceSearch}
            onChange={(e) => setDeviceSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={9} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-fps-border bg-white py-16 text-center">
          <Activity className="mx-auto h-8 w-8 text-fps-muted mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-fps-ink mb-1">No sync events yet</p>
          <p className="text-xs text-fps-muted max-w-xs mx-auto">
            Mobile sync events will appear here once field executives begin syncing data from the app.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          pageSize={20}
          onRowClick={(row) => router.push(`/sync-monitor/${row.device_identifier}`)}
        />
      )}
    </motion.div>
  );
}
