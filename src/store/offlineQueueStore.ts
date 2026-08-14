/**
 * offlineQueueStore.ts
 * Zustand + persist store for queuing POS transactions made while offline.
 * Each entry carries an idempotencyKey so the server can safely reject duplicates.
 * The queue drains via useOfflineSync when the browser comes back online.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PendingTransaction {
  localId: string;           // client-generated UUID
  idempotencyKey: string;    // sent as X-Idempotency-Key header to prevent double-posting
  payload: Record<string, any>;
  createdAt: string;         // ISO timestamp (offline device time)
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  failureReason?: string;
  retryCount?: number;
}

interface OfflineQueueState {
  queue: PendingTransaction[];
  pendingCount: number;       // derived: items with syncStatus === 'pending'
  failedCount: number;        // derived: items with syncStatus === 'failed'

  enqueue: (entry: Omit<PendingTransaction, 'syncStatus' | 'retryCount'>) => void;
  markSyncing: (localId: string) => void;
  markSynced: (localId: string) => void;
  markFailed: (localId: string, reason: string) => void;
  retryTransaction: (localId: string) => void;
  removeTransaction: (localId: string) => void;
  retryAllFailed: () => void;
  clearSynced: () => void;
  resetAll: () => void;
}

const countPending = (queue: PendingTransaction[]) =>
  queue.filter((t) => t.syncStatus === 'pending').length;

const countFailed = (queue: PendingTransaction[]) =>
  queue.filter((t) => t.syncStatus === 'failed').length;

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      pendingCount: 0,
      failedCount: 0,

      enqueue: (entry) =>
        set((state) => {
          const next: PendingTransaction = { ...entry, syncStatus: 'pending', retryCount: 0 };
          const newQueue = [...state.queue, next];
          return {
            queue: newQueue,
            pendingCount: countPending(newQueue),
            failedCount: countFailed(newQueue),
          };
        }),

      markSyncing: (localId) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId ? { ...t, syncStatus: 'syncing' as const } : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      markSynced: (localId) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId ? { ...t, syncStatus: 'synced' as const } : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      markFailed: (localId, reason) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId
              ? { ...t, syncStatus: 'failed' as const, failureReason: reason, retryCount: (t.retryCount ?? 0) + 1 }
              : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      retryTransaction: (localId) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId
              ? { ...t, syncStatus: 'pending' as const, failureReason: undefined }
              : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      removeTransaction: (localId) =>
        set((state) => {
          const newQueue = state.queue.filter((t) => t.localId !== localId);
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      retryAllFailed: () =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.syncStatus === 'failed'
              ? { ...t, syncStatus: 'pending' as const, failureReason: undefined }
              : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      clearSynced: () =>
        set((state) => {
          const newQueue = state.queue.filter((t) => t.syncStatus !== 'synced');
          return { queue: newQueue, pendingCount: countPending(newQueue), failedCount: countFailed(newQueue) };
        }),

      resetAll: () => set({ queue: [], pendingCount: 0, failedCount: 0 }),
    }),
    {
      name: 'pos-offline-queue',
      partialize: (state) => ({
        queue: state.queue,
        pendingCount: state.pendingCount,
        failedCount: state.failedCount,
      }),
    }
  )
);
