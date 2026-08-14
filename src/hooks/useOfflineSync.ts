/**
 * useOfflineSync.ts
 * Drains the offline transaction queue whenever the app comes back online.
 *
 * Phase 2 improvements:
 * - Granular per-item error handling: if item A fails (e.g. Insufficient Stock),
 *   item A is marked 'failed' with the server error but item B continues processing.
 * - On success, idempotent responses (HTTP 200 with idempotent: true) are treated as sync success.
 * - Dispatches pos:transaction-completed to trigger stock refresh.
 * - Exposes isSyncing, lastSyncedCount, lastFailedCount.
 */
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

export interface OfflineSyncStatus {
  isSyncing: boolean;
  lastSyncedCount: number;
  lastFailedCount: number;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);
  const [lastFailedCount, setLastFailedCount] = useState(0);
  const isSyncingRef = useRef(false);

  const drainQueue = async () => {
    if (isSyncingRef.current) return;

    const currentQueue = useOfflineQueueStore.getState().queue;
    const pending = currentQueue.filter((t) => t.syncStatus === 'pending');

    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    let syncedCount = 0;
    let failedCount = 0;

    const toastId = toast.loading(`Syncing ${pending.length} offline sale${pending.length > 1 ? 's' : ''}…`);

    for (const transaction of pending) {
      useOfflineQueueStore.getState().markSyncing(transaction.localId);
      try {
        const response = await apiClient.post('/pos/transactions', transaction.payload, {
          headers: {
            'X-Idempotency-Key': transaction.idempotencyKey,
          },
        });

        // Both a fresh 200 and an idempotent 200 are treated as success
        useOfflineQueueStore.getState().markSynced(transaction.localId);
        syncedCount++;

        const isIdempotent = response.data?.success?.data?.idempotent === true;
        if (isIdempotent) {
          console.info(`[useOfflineSync] Transaction ${transaction.localId} was already synced (idempotent response).`);
        }
      } catch (err: any) {
        // Granular failure — this item fails but the loop continues for other pending items
        const reason =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Unknown error';
        useOfflineQueueStore.getState().markFailed(transaction.localId, reason);
        failedCount++;
        console.warn(`[useOfflineSync] Failed to sync transaction ${transaction.localId}:`, reason);
      }
    }

    // Remove successfully synced entries from the queue
    useOfflineQueueStore.getState().clearSynced();

    setLastSyncedCount(syncedCount);
    setLastFailedCount(failedCount);
    isSyncingRef.current = false;
    setIsSyncing(false);

    if (syncedCount > 0) {
      toast.success(
        `✅ ${syncedCount} offline sale${syncedCount > 1 ? 's' : ''} synced successfully`,
        { id: toastId }
      );
      // Trigger stock refresh on the register
      window.dispatchEvent(new CustomEvent('pos:transaction-completed'));
    }

    if (failedCount > 0) {
      const verb = syncedCount > 0 ? 'others' : '';
      toast.error(
        `⚠️ ${failedCount} sale${failedCount > 1 ? 's' : ''} could not sync${verb ? ' — ' + verb + ' succeeded' : ''}. Tap the Offline badge to review.`,
        { id: syncedCount > 0 ? undefined : toastId, duration: 8000 }
      );
    }

    if (syncedCount === 0 && failedCount === 0) {
      toast.dismiss(toastId);
    }
  };

  useEffect(() => {
    // Also try to drain on mount (in case app was refreshed while already back online)
    if (navigator.onLine) {
      drainQueue();
    }

    const handleOnline = () => {
      drainQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return { isSyncing, lastSyncedCount, lastFailedCount };
}
