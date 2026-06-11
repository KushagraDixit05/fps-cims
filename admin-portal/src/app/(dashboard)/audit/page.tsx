"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Search, ChevronDown, ChevronRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditLog, exportAuditCsv } from "@/hooks/useAuditLog";
import { useAuthStore } from "@/store/authStore";
import { formatDateTime, truncate } from "@/lib/utils";
import type { AuditLog } from "@/types/models";

const EVENT_TYPE_VARIANTS: Record<string, "good" | "error" | "warn" | "info" | "secondary"> = {
  create: "good",
  delete: "error",
  update: "warn",
  login: "info",
  logout: "secondary",
  force_logout: "warn",
  deactivate: "error",
  reactivate: "good",
};

export default function AuditPage() {
  const [module, setModule] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [actor, setActor] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { user } = useAuthStore();

  const { data, isLoading } = useAuditLog({
    module: module !== "all" ? module : undefined,
    event_type: eventType !== "all" ? eventType : undefined,
    actor_username: actor || undefined,
  });

  const logs = data?.results ?? [];

  const columns: ColumnDef<AuditLog>[] = [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId((prev) => (prev === row.original.id ? null : row.original.id));
          }}
          className="text-fps-muted hover:text-fps-ink transition-colors p-0.5 cursor-pointer"
        >
          {expandedId === row.original.id ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ getValue }) => (
        <span className="text-xs text-fps-muted font-mono whitespace-nowrap">
          {formatDateTime(getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "actor_username",
      header: "Actor",
      cell: ({ getValue, row }) => (
        <div>
          <p className="text-[13px] font-semibold text-fps-ink">@{getValue() as string}</p>
          <p className="text-[10px] text-fps-muted capitalize">
            {row.original.actor_role?.replace(/_/g, " ")}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "event_type",
      header: "Event",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const variant = EVENT_TYPE_VARIANTS[v] ?? "secondary";
        return <Badge variant={variant} className="capitalize">{v}</Badge>;
      },
    },
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold text-fps-secondary capitalize">
          {(getValue() as string)?.replace(/_/g, " ") ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-fps-secondary">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "object_repr",
      header: "Object",
      cell: ({ getValue }) => (
        <span className="text-xs text-fps-secondary">{truncate(getValue() as string, 32)}</span>
      ),
    },
    {
      accessorKey: "actor_ip",
      header: "IP",
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-fps-muted">{(getValue() as string) ?? "—"}</span>
      ),
    },
  ];

  async function handleExport() {
    setExporting(true);
    try {
      await exportAuditCsv();
    } finally {
      setExporting(false);
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
        title="Audit Log"
        description={`${data?.count ?? 0} total events recorded`}
        actions={
          user?.role === "super_admin" && (
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fps-muted" />
          <Input
            placeholder="Filter by actor…"
            className="pl-9"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </div>
        <Select value={module} onValueChange={setModule}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="accounts">Accounts</SelectItem>
            <SelectItem value="crops">Crops</SelectItem>
            <SelectItem value="mandi">Mandi</SelectItem>
            <SelectItem value="product_demo">Product Demo</SelectItem>
            <SelectItem value="workflow">Workflow</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl border border-fps-border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fps-border bg-fps-canvas">
                    <th className="w-8 px-3 py-3" />
                    {["Timestamp", "Actor", "Event", "Module", "Action", "Object", "IP"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-fps-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="h-32 text-center text-fps-muted text-sm">
                        No audit log entries found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <>
                        <tr
                          key={log.id}
                          className="border-b border-fps-divider last:border-0 hover:bg-fps-canvas/70 transition-colors cursor-pointer"
                          onClick={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                        >
                          <td className="px-3 py-3">
                            <span className="text-fps-muted">
                              {expandedId === log.id ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-fps-muted font-mono whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-[13px] font-semibold text-fps-ink">@{log.actor_username}</p>
                              <p className="text-[10px] text-fps-muted capitalize">{log.actor_role?.replace(/_/g, " ")}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={EVENT_TYPE_VARIANTS[log.event_type] ?? "secondary"} className="capitalize">
                              {log.event_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-fps-secondary capitalize">
                              {log.module?.replace(/_/g, " ") ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-fps-secondary">{log.action}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-fps-secondary">{truncate(log.object_repr, 32)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-fps-muted">{log.actor_ip ?? "—"}</span>
                          </td>
                        </tr>
                        {expandedId === log.id && (
                          <tr key={`${log.id}-expand`} className="bg-fps-canvas/50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-fps-muted">Changes</p>
                                <pre className="text-xs text-fps-secondary bg-white rounded-xl p-4 border border-fps-border overflow-auto max-h-48">
                                  {JSON.stringify(log.changes, null, 2) || "No change data"}
                                </pre>
                                <p className="text-[10px] font-mono text-fps-muted">
                                  Request ID: {log.request_id ?? "—"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
