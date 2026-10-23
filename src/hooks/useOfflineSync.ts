/**
 * useOfflineSync.ts
 * Drains the offline transaction queue whenever the app comes back online.
 *
 * Resilience features:
 * - 2.5s stabilization delay after 'online' hardware event to allow DNS/Render connection to establish.
 * - Transient error isolation: 'Network Error' / timeouts keep the transaction in 'pending' (auto-retries)
 *   instead of permanently marking it as 'failed'.
 * - Business logic rejections (400, 403, 404, 409, 422) are marked as 'failed' with detailed reasons for
 *   cashier review. Server errors (5xx), timeouts (408), rate limits (429) and expired logins (401) are
 *   transient: the sale stays pending and retries.
 * - Sales are saved on the till first (offline-first), so a 'pos:sync-now' event drains the queue
 *   straight away; a periodic check (every 25 seconds) catches anything left.
 */

// Worth retrying later rather than asking the cashier to review
const isTransient = (err: any): boolean => {
  const status: number | undefined = err?.response?.status;
  if (!status) return true; // no response: network down, DNS, cold start
  return status >= 500 || status === 408 || status === 429 || status === 401;
};
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
          skipApproval: true, // background sync: never pop up a PIN prompt
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
        const reason =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Network Error';

        if (!isTransient(err)) {
          // Explicit server business rejection (e.g. 400 Bad Data, 409 Insufficient Stock)
          useOfflineQueueStore.getState().markFailed(transaction.localId, reason);
          businessFailedCount++;
          console.warn(`[useOfflineSync] Business validation error on ${transaction.localId}:`, reason);
        } else {
          // Transient (connection dropped, server restarting, login expired): keep it pending
          // so it retries on the next sync cycle
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

    // Sales saved while this run was going: send them too
    if (!networkInterrupted && useOfflineQueueStore.getState().queue.some((t) => t.syncStatus === 'pending')) {
      scheduleDrain(300);
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

    // A sale was just saved on the till: send it now
    const handleSyncNow = () => {
      if (navigator.onLine) scheduleDrain(0);
    };
    window.addEventListener('pos:sync-now', handleSyncNow);

    // Periodic sync poll every 25s while online to catch any pending items
    const interval = setInterval(() => {
      if (navigator.onLine) {
        drainQueue();
      }
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pos:sync-now', handleSyncNow);
      clearInterval(interval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { isSyncing, lastSyncedCount, lastFailedCount };
}
