import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DeviceSyncLog } from "@/types/models";

interface SyncFilters {
  user_id?: number;
  device_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useSyncMonitorList(filters?: SyncFilters) {
  return useQuery({
    queryKey: ["sync", filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.user_id) params.user_id = String(filters.user_id);
      if (filters?.device_id) params.device_id = filters.device_id;
      if (filters?.status) params.status = filters.status;
      if (filters?.date_from) params.date_from = filters.date_from;
      if (filters?.date_to) params.date_to = filters.date_to;
      const { data } = await api.get<PaginatedResponse<DeviceSyncLog>>("/api/admin/sync/", {
        params,
      });
      return data;
    },
  });
}

export function useDeviceSyncHistory(deviceId: string) {
  return useQuery({
    queryKey: ["sync", deviceId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<DeviceSyncLog>>(
        `/api/admin/sync/${deviceId}/`
      );
      return data;
    },
    enabled: !!deviceId,
  });
}
