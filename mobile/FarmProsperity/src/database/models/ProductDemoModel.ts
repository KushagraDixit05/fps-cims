// src/database/models/ProductDemoModel.ts
// Local model for Product Demo wizard submissions.
// Maps to the `product_demos` WatermelonDB table.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class ProductDemoModel extends Model {
  static table = 'product_demos';

  // Step 1 — Farmer details
  @field('farmer_name')     farmerName!: string;
  @field('mobile_number')   mobileNumber!: string | null;
  @field('village_name')    villageName!: string;
  @field('block_name')      blockName!: string;
  @field('district_name')   districtName!: string;
  @field('total_land_acre') totalLandAcre!: string | null;

  // Step 2 — Crop & stage
  @field('crop_name')       cropName!: string;
  @field('variety')         variety!: string;                    // primary (compat)
  @field('varieties_json')  varietiesJson!: string | null;       // JSON list of names
  @field('crop_stage')      cropStage!: string;
  @field('crop_stage_days') cropStageDays!: string;
  @field('demo_date')       demoDate!: string;

  // Step 3 — Product & dose
  @field('product_name')    productName!: string;
  @field('dose')            dose!: string;
  @field('dose_unit')       doseUnit!: string;

  // Step 4 — Result (deferred to the After update; null until then)
  @field('demo_result')     demoResult!: string | null;
  @field('additional_observations') additionalObservations!: string | null;
  @field('remark')          remark!: string | null;

  // Before/After lifecycle
  @field('demo_phase')         demoPhase!: string;            // 'before' | 'completed'
  @field('after_pending_sync') afterPendingSync!: boolean;
  @field('after_sync_error')   afterSyncError!: string | null;

  // Step 4 — Photos (JSON strings)
  @field('before_photos_json') beforePhotosJson!: string | null;
  @field('after_photos_json')  afterPhotosJson!: string | null;

  // GPS
  @field('latitude')        latitude!: number | null;
  @field('longitude')       longitude!: number | null;

  // Sync tracking
  @field('server_id')       serverId!: string | null;
  @field('is_synced')       isSynced!: boolean;
  @field('sync_error')      syncError!: string | null;
  @field('created_at_local') createdAtLocal!: number;
  @field('updated_at_local') updatedAtLocal!: number;
}
