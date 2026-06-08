// src/api/cropMonitoring.ts
// All API calls for the Crop Monitoring module.
// Uses the shared Axios client from api/client.ts (token + refresh interceptors included).

import apiClient from './client';
import type {
  CropMaster,
  District,
  Block,
  VillageMaster,
  FarmerVisitSummary,
  RecentVisit,
  FarmerVisitDetail,
  FarmerVisitCreateResponse,
  PaginatedResponse,
} from '../types/cropMonitoring';

// ─── Master data ──────────────────────────────────────────────────────────────

/**
 * GET /api/crop-master/
 * Returns all active crops with their nested varieties.
 * Used to populate the Crop and Variety dropdowns in Step 2.
 */
export const getCropMaster = async (): Promise<CropMaster[]> => {
  const { data } = await apiClient.get<CropMaster[]>('/crop-master/');
  return data;
};

/**
 * GET /api/districts/
 * Returns all active districts.
 * Used to populate the District dropdown in Step 1.
 */
export const getDistricts = async (): Promise<District[]> => {
  const { data } = await apiClient.get<District[]>('/districts/');
  return data;
};

/**
 * GET /api/blocks/?district=<districtId>
 * Returns all blocks for a given district.
 * Used to populate the Block dropdown in Step 1, filtered after district selection.
 */
export const getBlocks = async (districtId?: number): Promise<Block[]> => {
  const params: Record<string, number> = {};
  if (districtId !== undefined) {
    params.district = districtId;
  }
  const { data } = await apiClient.get<Block[]>('/blocks/', { params });
  return data;
};

/**
 * GET /api/village-master/?block=<blockId>
 * Returns all active villages for a given block.
 * Used to populate the Village dropdown in Step 1, filtered after block selection.
 */
export const getVillages = async (blockId: number): Promise<VillageMaster[]> => {
  const { data } = await apiClient.get<VillageMaster[]>('/village-master/', {
    params: { block: blockId },
  });
  return data;
};

// ─── Farmer Visits ────────────────────────────────────────────────────────────

/**
 * POST /api/farmer-visits/
 *
 * Sends a complete visit as multipart/form-data:
 *   - Farmer fields as form fields
 *   - `crops`  as a JSON string (list of crop record objects)
 *   - `photos` as multiple image files
 *
 * The caller is responsible for building the FormData object.
 */
export const submitFarmerVisit = async (
  payload: FormData,
): Promise<FarmerVisitCreateResponse> => {
  const { data } = await apiClient.post<FarmerVisitCreateResponse>(
    '/farmer-visits/',
    payload,
    {
      headers: {
        // Axios + React Native: let the runtime set the correct multipart boundary
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return data;
};

/**
 * GET /api/farmer-visits/
 * Returns a paginated list of visits for the current executive.
 * Pass `page` to fetch subsequent pages.
 */
export const getFarmerVisits = async (
  page: number = 1,
): Promise<PaginatedResponse<RecentVisit>> => {
  const { data } = await apiClient.get<PaginatedResponse<RecentVisit>>(
    '/farmer-visits/',
    { params: { page } },
  );
  return data;
};

/**
 * GET /api/farmer-visits/<uuid>/
 * Full detail including all crop records and photos.
 */
export const getFarmerVisitDetail = async (
  id: string,
): Promise<FarmerVisitDetail> => {
  const { data } = await apiClient.get<FarmerVisitDetail>(
    `/farmer-visits/${id}/`,
  );
  return data;
};

/**
 * GET /api/farmer-visits/summary/
 * Dashboard counts: today / this_week / this_month / team_members.
 */
export const getVisitSummary = async (): Promise<FarmerVisitSummary> => {
  const { data } = await apiClient.get<FarmerVisitSummary>(
    '/farmer-visits/summary/',
  );
  return data;
};

/**
 * PATCH /api/farmer-visits/<uuid>/
 * Partial update — used when the user taps EDIT from the Review screen
 * and resubmits a corrected visit.
 */
export const updateFarmerVisit = async (
  id: string,
  changes: Partial<{
    farmer_name: string;
    mobile_number: string;
    village_name: string;
    block_name: string;
    district_name: string;
    total_land_acre: string;
    remark: string;
  }>,
): Promise<FarmerVisitDetail> => {
  const { data } = await apiClient.patch<FarmerVisitDetail>(
    `/farmer-visits/${id}/`,
    changes,
  );
  return data;
};
