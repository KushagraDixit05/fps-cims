import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApprovalInstance } from "@/types/models";

export function useApprovals(params?: { status?: string; module?: string }) {
  return useQuery({
    queryKey: ["approvals", params],
    queryFn: async () => {
      const { data } = await api.get<ApprovalInstance[]>("/api/admin/approvals/", { params });
      return data;
    },
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: ["approvals", id],
    queryFn: async () => {
      const { data } = await api.get<ApprovalInstance>(`/api/admin/approvals/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useForceApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      api
        .post(`/api/admin/approvals/${id}/force-approve/`, { comment })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}

export function useReassignApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approver_id,
      comment,
    }: {
      id: string;
      approver_id: number;
      comment?: string;
    }) =>
      api
        .post(`/api/admin/approvals/${id}/reassign/`, { approver_id, comment })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}
