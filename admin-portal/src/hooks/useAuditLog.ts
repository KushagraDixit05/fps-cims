import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AuditLog } from "@/types/models";

interface AuditParams {
  module?: string;
  event_type?: string;
  actor_username?: string;
  since?: string;
  until?: string;
  page?: number;
}

interface PaginatedAuditLog {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLog[];
}

export function useAuditLog(params?: AuditParams) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedAuditLog | AuditLog[]>("/api/admin/audit/", {
        params,
      });
      if (Array.isArray(data)) return { results: data, count: data.length };
      return data as PaginatedAuditLog;
    },
  });
}

export function exportAuditCsv() {
  return api
    .get("/api/admin/audit/export/", { responseType: "blob" })
    .then(({ data, headers }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fps-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
}
