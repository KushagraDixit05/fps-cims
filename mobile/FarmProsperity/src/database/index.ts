// src/database/index.ts
// Singleton WatermelonDB Database instance used throughout the app.
// Import `database` from here — never create a second instance.
//
// jsi: true  → uses JSI bridge (faster; works on RN 0.85 + Hermes + New Architecture)
// If you hit build issues, set jsi: false (async adapter, same correctness).

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import migrations from './migrations';
import { FarmerVisitModel }  from './models/FarmerVisitModel';
import { CropEntryModel }    from './models/CropEntryModel';
import { MandiArrivalModel } from './models/MandiArrivalModel';
import { DistrictModel }     from './models/DistrictModel';
import { BlockModel }        from './models/BlockModel';
import { CropMasterModel }   from './models/CropMasterModel';
import { MandiModel }        from './models/MandiModel';
import { ProductDemoModel }  from './models/ProductDemoModel';
import { VillageModel }      from './models/VillageModel';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'fps_database',
  // jsi gives ~2-3× faster reads via direct JS/C++ bridge; requires Hermes
  jsi: true,
});

const database = new Database({
  adapter,
  modelClasses: [
    FarmerVisitModel,
    CropEntryModel,
    MandiArrivalModel,
    DistrictModel,
    BlockModel,
    CropMasterModel,
    MandiModel,
    ProductDemoModel,
    VillageModel,
  ],
});

export default database;
