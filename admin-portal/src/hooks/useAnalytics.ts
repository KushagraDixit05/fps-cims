import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  ProductivityMetric,
  SummaryResponse,
  CropIntelligenceResponse,
  MarketIntelligenceResponse,
  ProductPerformanceResponse,
  RecentActivity,
  ExecutivePerformanceMetric,
} from "@/types/models";

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


export function useSummary(period: "today" | "week" | "month" = "week") {
  return useQuery({
    queryKey: ["analytics", "summary", period],
    queryFn: async () => {
      const { data } = await api.get<SummaryResponse>("/api/admin/analytics/summary/", {
        params: { period },
      });
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCropIntelligence(days = 30) {
  return useQuery({
    queryKey: ["analytics", "crop-intelligence", days],
    queryFn: async () => {
      const { data } = await api.get<CropIntelligenceResponse>(
        "/api/admin/analytics/crop-intelligence/",
        { params: { days } }
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useMarketIntelligence(days = 30) {
  return useQuery({
    queryKey: ["analytics", "market-intelligence", days],
    queryFn: async () => {
      const { data } = await api.get<MarketIntelligenceResponse>(
        "/api/admin/analytics/market-intelligence/",
        { params: { days } }
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useProductPerformance(days = 30) {
  return useQuery({
    queryKey: ["analytics", "product-performance", days],
    queryFn: async () => {
      const { data } = await api.get<ProductPerformanceResponse>(
        "/api/admin/analytics/product-performance/",
        { params: { days } }
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useRecentActivities(limit = 20) {
  return useQuery({
    queryKey: ["analytics", "recent-activities", limit],
    queryFn: async () => {
      const { data } = await api.get<{ activities: RecentActivity[] }>(
        "/api/admin/analytics/recent-activities/",
        { params: { limit } }
      );
      return data.activities ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useExecutivePerformance(days = 30) {
  return useQuery({
    queryKey: ["analytics", "executive-performance", days],
    queryFn: async () => {
      const { data } = await api.get<{ days: number; executives: ExecutivePerformanceMetric[] }>(
        "/api/admin/analytics/executive-performance/",
        { params: { days } }
      );
      return data.executives ?? [];
    },
    staleTime: 60_000,
  });
}
