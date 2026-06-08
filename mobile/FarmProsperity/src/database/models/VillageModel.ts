// src/database/models/VillageModel.ts
// Local model for VillageMaster reference data.
// Maps to the `villages` WatermelonDB table (read-only cache from API).

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class VillageModel extends Model {
  static table = 'villages';

  @field('server_id')       serverId!: number;       // Django PK
  @field('name')            name!: string;
  @field('block_server_id') blockServerId!: number;  // FK to blocks.server_id
  @field('block_name')      blockName!: string | null;
}
