// src/database/models/CropEntryModel.ts
// Local model for the legacy 4-step crop entry form.
// Maps to the `crop_entries` WatermelonDB table.
// Synced to POST /api/crops/ when online.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class CropEntryModel extends Model {
  static table = 'crop_entries';

  @field('farmer_id')            farmerId!: number;
  @field('farmer_name_display')  farmerNameDisplay!: string | null;
  @field('visit_date')           visitDate!: string;
  @field('crop_name')            cropName!: string;
  @field('area_this_year')       areaThisYear!: number;
  @field('area_last_year')       areaLastYear!: number | null;
  @field('sowing_date')          sowingDate!: string | null;
  @field('crop_stage')           cropStage!: string;
  @field('crop_condition')       cropCondition!: string;
  @field('expected_yield')       expectedYield!: number | null;
  @field('buyer_interest')       buyerInterest!: boolean;
  @field('problem_pest')         problemPest!: boolean;
  @field('problem_disease')      problemDisease!: boolean;
  @field('problem_weather')      problemWeather!: boolean;
  @field('problem_price_concern') problemPriceConcern!: boolean;
  @field('problem_other')        problemOther!: string | null;
  @field('latitude')             latitude!: number | null;
  @field('longitude')            longitude!: number | null;

  // Sync tracking
  @field('server_id')            serverId!: string | null;
  @field('is_synced')            isSynced!: boolean;
  @field('sync_error')           syncError!: string | null;
  @field('created_at_local')     createdAtLocal!: number;
  @field('updated_at_local')     updatedAtLocal!: number;
}
