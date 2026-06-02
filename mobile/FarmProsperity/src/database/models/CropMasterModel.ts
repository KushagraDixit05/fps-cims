// src/database/models/CropMasterModel.ts
// Read-only reference data cached from GET /api/crop-master/.
// Varieties stored as JSON string to avoid a separate table.
// Used by Step2_CropDetails for the crop + variety dropdowns.

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class CropMasterModel extends Model {
  static table = 'crop_master';

  @field('server_id')      serverId!: number;   // Django PK
  @field('crop_name')      cropName!: string;
  // JSON: [{ id: number; variety_name: string }]
  @field('varieties_json') varietiesJson!: string;
}
