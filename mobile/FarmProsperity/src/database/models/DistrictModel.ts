// src/database/models/DistrictModel.ts
// Read-only reference data cached from GET /api/districts/.
// Used by Step1_FarmerDetails to populate the district dropdown offline.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class DistrictModel extends Model {
  static table = 'districts';

  @field('server_id') serverId!: number;   // Django PK (integer)
  @field('name')      name!: string;
  @field('state')     state!: string | null;
}
