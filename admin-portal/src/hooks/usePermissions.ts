import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Permission, UserPermission } from "@/types/models";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data } = await api.get<Permission[]>("/api/admin/permissions/");
      return data;
    },
  });
}

export function useUserPermissions(userId?: number) {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const { data } = await api.get<UserPermission[]>("/api/admin/user-permissions/", {
        params: userId ? { user_id: userId } : undefined,
      });
      return data;
    },
  });
}

export function useGrantUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      user: number;
      permission: string;
      effect: "allow" | "deny";
      reason: string;
      expires_at?: string;
    }) => api.post<UserPermission>("/api/admin/user-permissions/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-permissions"] }),
  });
}

export function useDeleteUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/admin/user-permissions/${id}/`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-permissions"] }),
  });
}
