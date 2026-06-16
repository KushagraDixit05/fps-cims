"use client";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useShallow } from 'zustand/shallow';
import { geoApi } from '@/lib/geoApi';
import { useFilterStore } from '@/store/filterStore';

function useFilters() {
  return useFilterStore(
    useShallow((s) => ({
      crops:       s.crops,
      modules:     s.modules,
      condition:   s.condition,
      district:    s.district,
      block:       s.block,
      village:     s.village,
      executiveId: s.executiveId,
      productName: s.productName,
      dateFrom:    s.dateFrom,
      dateTo:      s.dateTo,
    }))
  );
}

function toQK(f: ReturnType<typeof useFilters>) {
  return [
    f.crops.join(','),
    f.modules.join(','),
    f.condition,
    f.district,
    f.block,
    f.village,
    f.executiveId,
    f.productName,
    f.dateFrom,
    f.dateTo,
  ];
}

export function useGeoAggregate(level: 'district' | 'state' | 'hex' = 'district') {
  const filters = useFilters();
  return useQuery({
    queryKey:        ['geo', 'aggregate', level, ...toQK(filters)],
    queryFn:         () => geoApi.aggregate(level, filters).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime:       30_000,
  });
}

export function useGeoPoints(bbox: [number, number, number, number] | null) {
  const filters = useFilters();
  return useQuery({
    queryKey:        ['geo', 'points', bbox?.join(',') ?? 'none', ...toQK(filters)],
    queryFn:         () => geoApi.points(bbox!, filters).then((r) => r.data),
    enabled:         bbox !== null,
    placeholderData: keepPreviousData,
    staleTime:       15_000,
  });
}

export function useGeoRecord(id: string | null, module: string) {
  return useQuery({
    queryKey: ['geo', 'record', id, module],
    queryFn:  () => geoApi.record(id!, module).then((r) => r.data),
    enabled:  id !== null,
    staleTime: 60_000,
  });
}

export function useGeoRegionSummary(level: string | null, regionId: string | null) {
  const filters = useFilters();
  return useQuery({
    queryKey:        ['geo', 'region', level, regionId, ...toQK(filters)],
    queryFn:         () => geoApi.regionSummary(level!, regionId!, filters).then((r) => r.data),
    enabled:         level !== null && regionId !== null,
    placeholderData: keepPreviousData,
    staleTime:       30_000,
  });
}

export function useGeoFlows(type: 'mandi' | 'demo' = 'mandi') {
  const filters = useFilters();
  return useQuery({
    queryKey:        ['geo', 'flows', type, ...toQK(filters)],
    queryFn:         () => geoApi.flows(type, filters).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime:       30_000,
  });
}

export function useGeoTimeline(bucket: 'day' | 'week' = 'day') {
  const filters = useFilters();
  return useQuery({
    queryKey:        ['geo', 'timeline', bucket, ...toQK(filters)],
    queryFn:         () => geoApi.timeline(bucket, filters).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime:       30_000,
  });
}
