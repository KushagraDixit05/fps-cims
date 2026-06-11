import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ProductivityMetric, ApprovalSLAMetric } from "@/types/models";

export function useProductivity(days = 30) {
  return useQuery({
    queryKey: ["analytics", "productivity", days],
    queryFn: async () => {
      const { data } = await api.get<{ days: number; executives: ProductivityMetric[] }>(
        "/api/admin/analytics/productivity/",
        { params: { days } }
      );
      return data.executives ?? [];
    },
  });
}

export function useApprovalSLA(days = 30) {
  return useQuery({
    queryKey: ["analytics", "sla", days],
    queryFn: async () => {
      const { data } = await api.get<{ days: number; by_module: ApprovalSLAMetric }>(
        "/api/admin/analytics/approval-sla/",
        { params: { days } }
      );
      return data.by_module ?? {};
    },
  });
}
