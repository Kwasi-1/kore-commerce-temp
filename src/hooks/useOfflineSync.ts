/**
 * useOfflineSync.ts
 * Drains the offline transaction queue whenever the app comes back online.
 *
 * Resilience features:
 * - 2.5s stabilization delay after 'online' hardware event to allow DNS/Render connection to establish.
 * - Transient error isolation: 'Network Error' / timeouts keep the transaction in 'pending' (auto-retries)
 *   instead of permanently marking it as 'failed'.
 * - Business logic rejections (400, 409) are marked as 'failed' with detailed reasons for cashier review.
 * - Periodic background sync check (every 25 seconds) to drain any remaining pending sales.
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const drainQueue = async () => {
    if (isSyncingRef.current) return;

    const currentQueue = useOfflineQueueStore.getState().queue;
    const pending = currentQueue.filter((t) => t.syncStatus === 'pending');

    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    let syncedCount = 0;
    let businessFailedCount = 0;
    let networkInterrupted = false;

    const toastId = toast.loading(`Syncing ${pending.length} offline sale${pending.length > 1 ? 's' : ''}…`);

    for (const transaction of pending) {
      useOfflineQueueStore.getState().markSyncing(transaction.localId);
      try {
        const response = await apiClient.post('/pos/transactions', transaction.payload, {
          headers: {
            'X-Idempotency-Key': transaction.idempotencyKey,
          },
          timeout: 15000,
        });

        // Both fresh 200 and idempotent 200 are treated as success
        useOfflineQueueStore.getState().markSynced(transaction.localId);
        syncedCount++;

        const isIdempotent = response.data?.success?.data?.idempotent === true;
        if (isIdempotent) {
          console.info(`[useOfflineSync] Transaction ${transaction.localId} was already processed idempotently.`);
        }
      } catch (err: any) {
        const hasServerResponse = Boolean(err?.response);
        const reason =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Network Error';

        if (hasServerResponse) {
          // Explicit server business rejection (e.g. 400 Bad Data, 409 Insufficient Stock)
          useOfflineQueueStore.getState().markFailed(transaction.localId, reason);
          businessFailedCount++;
          console.warn(`[useOfflineSync] Business validation error on ${transaction.localId}:`, reason);
        } else {
          // Transient network error (DNS not ready, server cold start, connection dropped)
          // Keep it in 'pending' state so it retries on the next sync cycle
          useOfflineQueueStore.getState().retryTransaction(transaction.localId);
          networkInterrupted = true;
          console.warn(`[useOfflineSync] Transient network error syncing ${transaction.localId}. Retrying shortly:`, reason);
          // Pause queue draining until connection stabilizes
          break;
        }
      }
    }

    // Remove successfully synced entries from queue
    useOfflineQueueStore.getState().clearSynced();

    setLastSyncedCount(syncedCount);
    setLastFailedCount(businessFailedCount);
    isSyncingRef.current = false;
    setIsSyncing(false);

    if (syncedCount > 0) {
      toast.success(
        `✅ ${syncedCount} offline sale${syncedCount > 1 ? 's' : ''} synced successfully`,
        { id: toastId }
      );
      // Silently notify Register and other pages to refresh stock counts
      window.dispatchEvent(new CustomEvent('pos:transaction-completed'));
    }

    if (businessFailedCount > 0) {
      const verb = syncedCount > 0 ? 'others' : '';
      toast.error(
        `⚠️ ${businessFailedCount} sale${businessFailedCount > 1 ? 's' : ''} rejected by server${verb ? ' (' + verb + ' succeeded)' : ''}. Check offline queue.`,
        { id: syncedCount > 0 ? undefined : toastId, duration: 8000 }
      );
    }

    if (networkInterrupted && syncedCount === 0 && businessFailedCount === 0) {
      toast.dismiss(toastId);
    }
  };

  const scheduleDrain = (delayMs = 2500) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      drainQueue();
    }, delayMs);
  };

  useEffect(() => {
    // Attempt drain on mount if online
    if (navigator.onLine) {
      scheduleDrain(1000);
    }

    // When connection is restored, wait 2.5s for DNS and socket establishment
    const handleOnline = () => {
      scheduleDrain(2500);
    };

    window.addEventListener('online', handleOnline);

    // Periodic sync poll every 25s while online to catch any pending items
    const interval = setInterval(() => {
      if (navigator.onLine) {
        drainQueue();
      }
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { isSyncing, lastSyncedCount, lastFailedCount };
}
