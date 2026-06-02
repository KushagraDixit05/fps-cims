// src/database/models/MandiModel.ts
// Read-only reference data cached from GET /api/mandis/.
// Used by MandiEntryFormScreen to populate the mandi picker offline.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class MandiModel extends Model {
  static table = 'mandis';

  @field('server_id') serverId!: number;   // Django PK
  @field('name')      name!: string;
  @field('district')  district!: string | null;
  @field('state')     state!: string | null;
  @field('is_active') isActive!: boolean;
}
