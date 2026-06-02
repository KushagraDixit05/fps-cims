// src/database/models/BlockModel.ts
// Read-only reference data cached from GET /api/blocks/.
// Used by Step1_FarmerDetails to populate the block dropdown offline.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class BlockModel extends Model {
  static table = 'blocks';

  @field('server_id')          serverId!: number;         // Django PK
  @field('name')               name!: string;
  @field('district_server_id') districtServerId!: number; // FK to districts.server_id
  @field('district_name')      districtName!: string | null;
}
