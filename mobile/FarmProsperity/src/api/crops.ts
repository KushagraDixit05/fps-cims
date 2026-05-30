/**
 * Crops API — villages, farmers, crop entries, and dashboard summary.
 */

import apiClient from './client';
import type {
  Village,
  Farmer,
  CropEntry,
  CropEntryPayload,
  DashboardSummary,
} from '../types';

// ─── Villages ─────────────────────────────────────────────────────────────────

/**
 * GET /api/villages/?search=<query>
 * Used for village search in form dropdowns.
 */
export const getVillages = async (search?: string): Promise<Village[]> => {
  const { data } = await apiClient.get<Village[]>('/villages/', {
    params: search ? { search } : {},
  });
  return data;
};

// ─── Farmers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/farmers/?village=<id>&search=<query>
 * Used to populate farmer dropdown in the crop entry form.
 */
export const getFarmers = async (options?: {
  villageId?: number;
  search?: string;
}): Promise<Farmer[]> => {
  const params: Record<string, string | number> = {};
  if (options?.villageId) params.village = options.villageId;
  if (options?.search) params.search = options.search;
  const { data } = await apiClient.get<Farmer[]>('/farmers/', { params });
  return data;
};

/**
 * POST /api/farmers/
 * Register a new farmer.
 */
export const createFarmer = async (
  farmerData: Pick<Farmer, 'name' | 'phone_number' | 'village'>,
): Promise<Farmer> => {
  const { data } = await apiClient.post<Farmer>('/farmers/', farmerData);
  return data;
};

// ─── Crop Entries ─────────────────────────────────────────────────────────────

/**
 * GET /api/crops/
 * Returns the current user's crop entries (field executives) or all (admin).
 */
export const getCropEntries = async (): Promise<CropEntry[]> => {
  const { data } = await apiClient.get<CropEntry[]>('/crops/');
  return data;
};

/**
 * GET /api/crops/<id>/
 */
export const getCropEntry = async (id: string): Promise<CropEntry> => {
  const { data } = await apiClient.get<CropEntry>(`/crops/${id}/`);
  return data;
};

/**
 * POST /api/crops/
 * Submit a new field visit / crop entry.
 */
export const createCropEntry = async (
  entry: CropEntryPayload,
): Promise<CropEntry> => {
  const { data } = await apiClient.post<CropEntry>('/crops/', entry);
  return data;
};

/**
 * PATCH /api/crops/<id>/
 * Partial update — useful for offline-sync later.
 */
export const updateCropEntry = async (
  id: string,
  changes: Partial<CropEntryPayload>,
): Promise<CropEntry> => {
  const { data } = await apiClient.patch<CropEntry>(`/crops/${id}/`, changes);
  return data;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * GET /api/crops/summary/
 * Aggregate stats for the home screen dashboard.
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await apiClient.get<DashboardSummary>('/crops/summary/');
  return data;
};
