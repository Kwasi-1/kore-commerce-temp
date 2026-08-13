/**
 * useOfflineSync.ts
 * Drains the offline transaction queue whenever the app comes back online.
 *
 * - Listens to the browser 'online' event
 * - Iterates pending entries in useOfflineQueueStore
 * - POSTs each to /pos/transactions with X-Idempotency-Key header
 * - On success: marks synced, fires pos:transaction-completed event, shows toast
 * - On failure: marks failed, shows toast with detail
 * - Also dispatches pos:transaction-completed so ProductSearchBar refreshes stock
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

  const { queue, markSyncing, markSynced, markFailed, clearSynced } = useOfflineQueueStore.getState();

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
        await apiClient.post('/pos/transactions', transaction.payload, {
          headers: {
            'X-Idempotency-Key': transaction.idempotencyKey,
          },
        });
        useOfflineQueueStore.getState().markSynced(transaction.localId);
        syncedCount++;
      } catch (err: any) {
        const reason =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Unknown error';
        useOfflineQueueStore.getState().markFailed(transaction.localId, reason);
        failedCount++;
        console.warn(`[useOfflineSync] Failed to sync transaction ${transaction.localId}:`, reason);
      }
    }

    // Clean up synced entries
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
      toast.error(
        `⚠️ ${failedCount} offline sale${failedCount > 1 ? 's' : ''} could not be synced — please contact support`,
        { id: syncedCount > 0 ? undefined : toastId, duration: 6000 }
      );
    }

    if (syncedCount === 0 && failedCount === 0) {
      toast.dismiss(toastId);
    }
  };

  useEffect(() => {
    // Also try to drain on mount (in case app was refreshed while back online)
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
