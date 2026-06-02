// src/database/models/FarmerVisitModel.ts
// Local model for Crop Monitoring wizard submissions.
// Maps to the `farmer_visits` WatermelonDB table.
// Synced to POST /api/farmer-visits/ (multipart) when online.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class FarmerVisitModel extends Model {
  static table = 'farmer_visits';

  // Step 1 — Farmer details
  @field('farmer_name')     farmerName!: string;
  @field('mobile_number')   mobileNumber!: string | null;
  @field('village_name')    villageName!: string;
  @field('block_name')      blockName!: string;
  @field('district_name')   districtName!: string;
  @field('total_land_acre') totalLandAcre!: string | null;

  // Step 3 — GPS + remark
  @field('latitude')        latitude!: number | null;
  @field('longitude')       longitude!: number | null;
  @field('remark')          remark!: string | null;

  // Step 2 — Crops serialized as JSON string
  // Shape: CropRecordDraft[] (see types/cropMonitoring.ts)
  @field('crops_json')      cropsJson!: string;

  // Step 3 — Photos serialized as JSON string
  // Shape: { uri: string; name: string; type: string }[]
  @field('photos_json')     photosJson!: string | null;

  // Sync tracking
  @field('server_id')       serverId!: string | null;
  @field('is_synced')       isSynced!: boolean;
  @field('sync_error')      syncError!: string | null;
  @field('created_at_local') createdAtLocal!: number;
  @field('updated_at_local') updatedAtLocal!: number;
}
