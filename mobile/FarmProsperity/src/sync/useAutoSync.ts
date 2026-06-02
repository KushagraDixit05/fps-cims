// src/sync/useAutoSync.ts
// React hook that listens for network connectivity changes and triggers
// background sync automatically when the device goes online.
//
// Throttled to once per 60 seconds via a ref (no extra state, no re-renders).
// Safe to mount once at the App root — cleans up the NetInfo listener on unmount.

import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingRecords } from './syncService';
import type { SyncResult } from './syncTypes';

const THROTTLE_MS = 60_000; // 1 minute between auto-syncs

export interface AutoSyncState {
  /** True while a sync cycle is running. */
  isSyncing: boolean;
  /** Result of the most recent sync, or null if none has run yet. */
  lastResult: SyncResult | null;
}

/**
 * Mount this once in App.tsx (inside AuthProvider so it has access to tokens).
 * Returns sync state for optional status display.
 */
export const useAutoSync = (): AutoSyncState => {
  const [isSyncing, setIsSyncing]     = useState(false);
  const [lastResult, setLastResult]   = useState<SyncResult | null>(null);
  const lastSyncAtRef                 = useRef<number>(0);
  const isSyncingRef                  = useRef(false); // guards against concurrent runs

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || !state.isInternetReachable) {
        return;
      }

      // Throttle: skip if synced recently
      const now = Date.now();
      if (now - lastSyncAtRef.current < THROTTLE_MS) {
        return;
      }

      // Guard against concurrent sync runs
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      lastSyncAtRef.current = now;
      setIsSyncing(true);

      try {
        const result = await syncPendingRecords();
        setLastResult(result);
        if (result.synced > 0) {
          console.log(`[FPS Sync] ✅ Synced ${result.synced} record(s) to backend.`);
        }
        if (result.failed > 0) {
          console.warn(`[FPS Sync] ⚠️ ${result.failed} record(s) failed to sync.`);
        }
      } catch (err: any) {
        console.warn('[FPS Sync] Sync cycle threw unexpectedly:', err?.message);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isSyncing, lastResult };
};
