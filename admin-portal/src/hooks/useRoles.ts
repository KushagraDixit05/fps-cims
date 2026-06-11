import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Role, Permission } from "@/types/models";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await api.get<Role[]>("/api/admin/roles/");
      return data;
    },
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ["roles", id],
    queryFn: async () => {
      const { data } = await api.get<Role>(`/api/admin/roles/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRolePermissions(id: string) {
  return useQuery({
    queryKey: ["roles", id, "permissions"],
    queryFn: async () => {
      const { data } = await api.get<Permission[]>(`/api/admin/roles/${id}/permissions/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAddRolePermissions(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissionIds: string[]) =>
      api
        .post(`/api/admin/roles/${roleId}/permissions/`, { permission_ids: permissionIds })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles", roleId] }),
  });
}

export function useRemoveRolePermissions(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissionIds: string[]) =>
      api
        .delete(`/api/admin/roles/${roleId}/permissions/`, {
          data: { permission_ids: permissionIds },
        })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles", roleId] }),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; code: string; description?: string }) =>
      api.post<Role>("/api/admin/roles/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/roles/${id}/`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}
