// src/database/migrations.ts
// WatermelonDB schema migrations.
// Add a new migration object each time DB_SCHEMA_VERSION is bumped.
// Order: oldest → newest.

import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // ── v1 → v2: Mandi Arrival wizard columns ─────────────────────────────────
    // Adds varieties_json, photos_json, total_arrival_qt, latitude, longitude
    // to the mandi_arrivals table. All additive — no existing data is affected.
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'mandi_arrivals',
          columns: [
            { name: 'varieties_json',   type: 'string', isOptional: true },
            { name: 'photos_json',      type: 'string', isOptional: true },
            { name: 'total_arrival_qt', type: 'number', isOptional: true },
            { name: 'latitude',         type: 'number', isOptional: true },
            { name: 'longitude',        type: 'number', isOptional: true },
          ],
        }),
      ],
    },

    // ── v2 → v3: Product Demo wizard table ────────────────────────────────────
    // Creates the product_demos table for the new Product Demo module.
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'product_demos',
          columns: [
            { name: 'farmer_name',     type: 'string' },
            { name: 'mobile_number',   type: 'string', isOptional: true },
            { name: 'village_name',    type: 'string' },
            { name: 'block_name',      type: 'string' },
            { name: 'district_name',   type: 'string' },
            { name: 'total_land_acre', type: 'string', isOptional: true },
            { name: 'crop_name',       type: 'string' },
            { name: 'variety',         type: 'string' },
            { name: 'crop_stage',      type: 'string' },
            { name: 'crop_stage_days', type: 'string' },
            { name: 'demo_date',       type: 'string' },
            { name: 'product_name',    type: 'string' },
            { name: 'dose',            type: 'string' },
            { name: 'dose_unit',       type: 'string' },
            { name: 'demo_result',     type: 'string' },
            { name: 'additional_observations', type: 'string', isOptional: true },
            { name: 'remark',          type: 'string', isOptional: true },
            { name: 'before_photos_json', type: 'string', isOptional: true },
            { name: 'after_photos_json',  type: 'string', isOptional: true },
            { name: 'latitude',        type: 'number', isOptional: true },
            { name: 'longitude',       type: 'number', isOptional: true },
            { name: 'server_id',       type: 'string', isOptional: true },
            { name: 'is_synced',       type: 'boolean' },
            { name: 'sync_error',      type: 'string', isOptional: true },
            { name: 'created_at_local', type: 'number' },
            { name: 'updated_at_local', type: 'number' },
          ],
        }),
      ],
    },
    // ── v4 → v5: Custom mandi name column ────────────────────────────────────────
    // Adds mandi_custom_name (optional string) to mandi_arrivals.
    // Written when user selects "Others (Please Specify)" in Step 1.
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'mandi_arrivals',
          columns: [
            { name: 'mandi_custom_name', type: 'string', isOptional: true },
          ],
        }),
      ],
    },

    // ── v3 → v4: Village hierarchy + village_id columns ───────────────────────────
    // Adds villages reference table.
    // Adds village_id (optional FK) to farmer_visits and product_demos.
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'villages',
          columns: [
            { name: 'server_id',       type: 'number' },
            { name: 'name',            type: 'string' },
            { name: 'block_server_id', type: 'number' },
            { name: 'block_name',      type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'farmer_visits',
          columns: [
            { name: 'village_id', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'product_demos',
          columns: [
            { name: 'village_id', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
