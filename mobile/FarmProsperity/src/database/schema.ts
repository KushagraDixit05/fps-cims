// src/database/schema.ts
// WatermelonDB schema — defines all local SQLite tables.
// Version must be bumped whenever columns are added/removed (add a migration).
//
// Tables:
//   User-data (need is_synced + server_id):
//     - farmer_visits       → Crop Monitoring wizard submissions
//     - crop_entries        → Legacy 4-step crop entry form
//     - mandi_arrivals      → Mandi entry form
//
//   Reference data (read-only cache seeded from API):
//     - districts
//     - blocks
//     - crop_master
//     - mandis

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const DB_SCHEMA_VERSION = 1;

export default appSchema({
  version: DB_SCHEMA_VERSION,
  tables: [
    // ── Crop Monitoring wizard (FarmerVisit) ──────────────────────────────────
    tableSchema({
      name: 'farmer_visits',
      columns: [
        // Farmer details (Step 1)
        { name: 'farmer_name',     type: 'string' },
        { name: 'mobile_number',   type: 'string', isOptional: true },
        { name: 'village_name',    type: 'string' },
        { name: 'block_name',      type: 'string' },
        { name: 'district_name',   type: 'string' },
        { name: 'total_land_acre', type: 'string', isOptional: true },
        // GPS (Step 3)
        { name: 'latitude',        type: 'number', isOptional: true },
        { name: 'longitude',       type: 'number', isOptional: true },
        // Remark (Step 3)
        { name: 'remark',          type: 'string', isOptional: true },
        // Crops: serialized JSON array of CropRecordDraft objects
        { name: 'crops_json',      type: 'string' },
        // Photos: serialized JSON array of { uri, name, type }
        { name: 'photos_json',     type: 'string', isOptional: true },
        // Sync fields
        { name: 'server_id',       type: 'string', isOptional: true },
        { name: 'is_synced',       type: 'boolean' },
        { name: 'sync_error',      type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
        { name: 'updated_at_local', type: 'number' },
      ],
    }),

    // ── Legacy CropEntry (4-step form) ────────────────────────────────────────
    tableSchema({
      name: 'crop_entries',
      columns: [
        { name: 'farmer_id',          type: 'number' },
        { name: 'farmer_name_display', type: 'string', isOptional: true },
        { name: 'visit_date',          type: 'string' },
        { name: 'crop_name',           type: 'string' },
        { name: 'area_this_year',      type: 'number' },
        { name: 'area_last_year',      type: 'number', isOptional: true },
        { name: 'sowing_date',         type: 'string', isOptional: true },
        { name: 'crop_stage',          type: 'string' },
        { name: 'crop_condition',      type: 'string' },
        { name: 'expected_yield',      type: 'number', isOptional: true },
        { name: 'buyer_interest',      type: 'boolean' },
        { name: 'problem_pest',        type: 'boolean' },
        { name: 'problem_disease',     type: 'boolean' },
        { name: 'problem_weather',     type: 'boolean' },
        { name: 'problem_price_concern', type: 'boolean' },
        { name: 'problem_other',       type: 'string', isOptional: true },
        { name: 'latitude',            type: 'number', isOptional: true },
        { name: 'longitude',           type: 'number', isOptional: true },
        // Sync fields
        { name: 'server_id',           type: 'string', isOptional: true },
        { name: 'is_synced',           type: 'boolean' },
        { name: 'sync_error',          type: 'string', isOptional: true },
        { name: 'created_at_local',    type: 'number' },
        { name: 'updated_at_local',    type: 'number' },
      ],
    }),

    // ── Mandi arrivals ────────────────────────────────────────────────────────
    tableSchema({
      name: 'mandi_arrivals',
      columns: [
        { name: 'mandi_id',          type: 'number' },
        { name: 'mandi_name',        type: 'string', isOptional: true },
        { name: 'commodity',         type: 'string' },
        { name: 'date',              type: 'string' },
        { name: 'arrival_quantity',  type: 'number' },
        { name: 'avg_rate',          type: 'number', isOptional: true },
        { name: 'min_rate',          type: 'number', isOptional: true },
        { name: 'max_rate',          type: 'number', isOptional: true },
        { name: 'source',            type: 'string' },
        { name: 'remark',            type: 'string', isOptional: true },
        // Sync fields
        { name: 'server_id',         type: 'string', isOptional: true },
        { name: 'is_synced',         type: 'boolean' },
        { name: 'sync_error',        type: 'string', isOptional: true },
        { name: 'created_at_local',  type: 'number' },
        { name: 'updated_at_local',  type: 'number' },
      ],
    }),

    // ── Reference: Districts ──────────────────────────────────────────────────
    tableSchema({
      name: 'districts',
      columns: [
        { name: 'server_id', type: 'number' },   // Django PK
        { name: 'name',      type: 'string' },
        { name: 'state',     type: 'string', isOptional: true },
      ],
    }),

    // ── Reference: Blocks ─────────────────────────────────────────────────────
    tableSchema({
      name: 'blocks',
      columns: [
        { name: 'server_id',         type: 'number' },   // Django PK
        { name: 'name',              type: 'string' },
        { name: 'district_server_id', type: 'number' },  // FK
        { name: 'district_name',     type: 'string', isOptional: true },
      ],
    }),

    // ── Reference: Crop Master ────────────────────────────────────────────────
    // Varieties stored as JSON string to avoid a separate join table
    tableSchema({
      name: 'crop_master',
      columns: [
        { name: 'server_id',     type: 'number' },   // Django PK
        { name: 'crop_name',     type: 'string' },
        { name: 'varieties_json', type: 'string' },  // JSON: [{id, variety_name}]
      ],
    }),

    // ── Reference: Mandis ─────────────────────────────────────────────────────
    tableSchema({
      name: 'mandis',
      columns: [
        { name: 'server_id', type: 'number' },   // Django PK
        { name: 'name',      type: 'string' },
        { name: 'district',  type: 'string', isOptional: true },
        { name: 'state',     type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
      ],
    }),
  ],
});
