/**
 * Mandi API — mandi list, arrivals CRUD, and year-on-year comparison.
 */

import apiClient from './client';
import type { Mandi, MandiArrival, MandiArrivalPayload, YoYComparison } from '../types';

// ─── Mandis ───────────────────────────────────────────────────────────────────

/**
 * GET /api/mandis/
 * Full list of active mandis (used for pickers).
 */
export const getMandis = async (search?: string): Promise<Mandi[]> => {
  const { data } = await apiClient.get<Mandi[]>('/mandis/', {
    params: search ? { search } : {},
  });
  return data;
};

// ─── Mandi Arrivals ───────────────────────────────────────────────────────────

/**
 * GET /api/mandi-arrivals/?mandi=<id>&commodity=<str>
 * Returns arrivals, optionally filtered by mandi or commodity.
 */
export const getMandiArrivals = async (options?: {
  mandiId?: number;
  commodity?: string;
}): Promise<MandiArrival[]> => {
  const params: Record<string, string | number> = {};
  if (options?.mandiId) params.mandi = options.mandiId;
  if (options?.commodity) params.commodity = options.commodity;
  const { data } = await apiClient.get<MandiArrival[]>('/mandi-arrivals/', { params });
  return data;
};

/**
 * GET /api/mandi-arrivals/<id>/
 */
export const getMandiArrival = async (id: string): Promise<MandiArrival> => {
  const { data } = await apiClient.get<MandiArrival>(`/mandi-arrivals/${id}/`);
  return data;
};

/**
 * POST /api/mandi-arrivals/
 * Submit a new mandi arrival entry.
 */
export const createMandiArrival = async (
  arrival: MandiArrivalPayload,
): Promise<MandiArrival> => {
  const { data } = await apiClient.post<MandiArrival>('/mandi-arrivals/', arrival);
  return data;
};

/**
 * PATCH /api/mandi-arrivals/<id>/
 */
export const updateMandiArrival = async (
  id: string,
  changes: Partial<MandiArrivalPayload>,
): Promise<MandiArrival> => {
  const { data } = await apiClient.patch<MandiArrival>(`/mandi-arrivals/${id}/`, changes);
  return data;
};

// ─── Year-on-Year Comparison ──────────────────────────────────────────────────

/**
 * GET /api/mandi-arrivals/yoy_comparison/?mandi_id=<id>&commodity=Chili
 */
export const getYoYComparison = async (
  mandiId: number,
  commodity = 'Chili',
): Promise<YoYComparison> => {
  const { data } = await apiClient.get<YoYComparison>('/mandi-arrivals/yoy_comparison/', {
    params: { mandi_id: mandiId, commodity },
  });
  return data;
};
