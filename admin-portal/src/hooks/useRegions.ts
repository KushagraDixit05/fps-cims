import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Region, RegionDetail, RegionUser } from "@/types/models";

interface RegionFilters {
  search?: string;
  state?: string;
  is_active?: boolean;
  parent?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useRegions(filters?: RegionFilters) {
  return useQuery({
    queryKey: ["regions", filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.state) params.state = filters.state;
      if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);
      if (filters?.parent) params.parent = filters.parent;
      const { data } = await api.get<PaginatedResponse<Region>>("/api/admin/regions/", { params });
      return data;
    },
  });
}

export function useRegion(id: string) {
  return useQuery({
    queryKey: ["regions", id],
    queryFn: async () => {
      const { data } = await api.get<RegionDetail>(`/api/admin/regions/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRegionUsers(regionId: string) {
  return useQuery({
    queryKey: ["regions", regionId, "users"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<RegionUser>>(
        `/api/admin/regions/${regionId}/users/`
      );
      return data;
    },
    enabled: !!regionId,
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      code: string;
      state: string;
      district?: string;
      taluka?: string;
      parent?: string | null;
      is_active?: boolean;
    }) => api.post<Region>("/api/admin/regions/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      code?: string;
      state?: string;
      district?: string;
      taluka?: string;
      parent?: string | null;
      is_active?: boolean;
    }) => api.patch<Region>(`/api/admin/regions/${id}/`, payload).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["regions"] });
      qc.invalidateQueries({ queryKey: ["regions", vars.id] });
    },
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/regions/${id}/`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useAssignUserToRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      regionId,
      user_id,
      role = "assigned",
    }: {
      regionId: string;
      user_id: number;
      role?: string;
    }) =>
      api
        .post<RegionUser>(`/api/admin/regions/${regionId}/assign-user/`, { user_id, role })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["regions", vars.regionId, "users"] });
      qc.invalidateQueries({ queryKey: ["regions", vars.regionId] });
    },
  });
}

export function useRemoveUserFromRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ regionId, user_id }: { regionId: string; user_id: number }) =>
      api
        .delete(`/api/admin/regions/${regionId}/assign-user/`, { data: { user_id } })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["regions", vars.regionId, "users"] });
      qc.invalidateQueries({ queryKey: ["regions", vars.regionId] });
    },
  });
}
