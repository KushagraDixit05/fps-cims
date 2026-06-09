// src/sync/syncTypes.ts
// Shared types for the sync engine.

export interface SyncResult {
  /** Number of records successfully pushed to the Django backend. */
  synced: number;
  /** Number of records that failed to push. They remain unsynced and will retry. */
  failed: number;
  /** Human-readable error messages for each failed record. */
  errors: string[];
  /** Unix timestamp (ms) when this sync run completed. */
  timestamp: number;
  /**
   * True when the sync was aborted because the device was offline.
   * Callers MUST check this before interpreting synced === 0 as "nothing to do".
   */
  offline: boolean;
}

export interface SyncStats {
  pendingVisits: number;
  pendingCropEntries: number;
  pendingMandiArrivals: number;
  pendingProductDemos: number;
  total: number;
}
