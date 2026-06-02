// src/database/models/MandiArrivalModel.ts
// Local model for the mandi entry form.
// Maps to the `mandi_arrivals` WatermelonDB table.
// Synced to POST /api/mandi-arrivals/ when online.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class MandiArrivalModel extends Model {
  static table = 'mandi_arrivals';

  @field('mandi_id')          mandiId!: number;
  @field('mandi_name')        mandiName!: string | null;
  @field('commodity')         commodity!: string;
  @field('date')              date!: string;
  @field('arrival_quantity')  arrivalQuantity!: number;
  @field('avg_rate')          avgRate!: number | null;
  @field('min_rate')          minRate!: number | null;
  @field('max_rate')          maxRate!: number | null;
  @field('source')            source!: string;
  @field('remark')            remark!: string | null;

  // Sync tracking
  @field('server_id')         serverId!: string | null;
  @field('is_synced')         isSynced!: boolean;
  @field('sync_error')        syncError!: string | null;
  @field('created_at_local')  createdAtLocal!: number;
  @field('updated_at_local')  updatedAtLocal!: number;
}
