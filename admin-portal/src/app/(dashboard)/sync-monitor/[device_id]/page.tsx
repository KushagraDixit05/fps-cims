"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Activity, AlertCircle, Smartphone, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeviceSyncHistory } from "@/hooks/useSyncMonitor";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { DeviceSyncLog } from "@/types/models";

const STATUS_VARIANT: Record<string, "good" | "warn" | "error"> = {
  success: "good",
  partial: "warn",
  failed: "error",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-status-success" strokeWidth={1.75} />,
  partial: <AlertCircle className="h-4 w-4 text-status-warn" strokeWidth={1.75} />,
  failed: <XCircle className="h-4 w-4 text-status-error-text" strokeWidth={1.75} />,
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  pull: "Pull",
  push: "Push",
  full: "Full",
};

export default function DeviceSyncHistoryPage({
  params,
}: {
  params: Promise<{ device_id: string }>;
}) {
  const { device_id } = use(params);
  const decodedDeviceId = decodeURIComponent(device_id);
  const { data, isLoading, isError } = useDeviceSyncHistory(decodedDeviceId);

  const logs = data?.results ?? [];
  const latest = logs[0];

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
        return (
          <div className="flex items-center gap-1.5">
            {STATUS_ICON[s]}
            <Badge variant={STATUS_VARIANT[s] ?? "secondary"}>{s}</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "records_pushed",
      header: "Pushed",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "records_pulled",
      header: "Pulled",
      cell: ({ getValue }) => (
        <span className="text-sm text-fps-secondary">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "sync_batch_id",
      header: "Batch ID",
      cell: ({ getValue }) => (
        <span className="text-[11px] font-mono text-fps-muted">
          {getValue() ? (getValue() as string).slice(0, 12) + "…" : "—"}
        </span>
      ),
    },
    {
      accessorKey: "error_detail",
      header: "Error",
      cell: ({ getValue }) => (
        <span className="text-xs text-status-error-text">
          {(getValue() as string) || "—"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <div className="h-8 w-64 rounded-lg bg-fps-canvas animate-pulse" />
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-status-error-text mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-fps-ink mb-1">Device not found</p>
        <p className="text-xs text-fps-muted mb-4">
          No device with ID <span className="font-mono">{decodedDeviceId}</span> is registered.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/sync-monitor">Back to Sync Monitor</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/sync-monitor">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-fps-muted">
          <Link href="/sync-monitor" className="hover:text-fps-ink transition-colors">Sync Monitor</Link>
          <span>/</span>
          <span className="font-mono text-fps-ink">{decodedDeviceId.slice(0, 20)}…</span>
        </div>
      </div>

      <PageHeader
        title="Device Sync History"
        description={`${data?.count ?? 0} sync events for this device`}
      />

      {/* Device info cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "User",
              value: latest.username,
              icon: <Activity className="h-4 w-4 text-fps-muted" />,
            },
            {
              label: "Device",
              value: latest.device_name || "Unknown",
              icon: <Smartphone className="h-4 w-4 text-fps-muted" />,
            },
            {
              label: "Platform",
              value: latest.platform || "—",
              icon: <Smartphone className="h-4 w-4 text-fps-muted" />,
            },
            {
              label: "Last Sync",
              value: formatRelative(latest.synced_at),
              icon: <Activity className="h-4 w-4 text-fps-muted" />,
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-fps-border bg-white p-4">
              <p className="text-xs text-fps-muted mb-1">{label}</p>
              <p className="text-sm font-semibold text-fps-ink">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Device ID card */}
      <div className="rounded-xl border border-fps-border bg-white px-4 py-3">
        <p className="text-xs text-fps-muted mb-1">Device ID</p>
        <p className="text-sm font-mono text-fps-ink break-all">{decodedDeviceId}</p>
      </div>

      {/* Sync history table */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-fps-border bg-white py-16 text-center">
          <Activity className="mx-auto h-8 w-8 text-fps-muted mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-fps-ink mb-1">No sync history</p>
          <p className="text-xs text-fps-muted">This device has not synced yet.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={logs} pageSize={20} />
      )}
    </motion.div>
  );
}
