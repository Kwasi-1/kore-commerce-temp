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
}

interface OfflineQueueState {
  queue: PendingTransaction[];
  pendingCount: number;       // derived: items with syncStatus === 'pending'

  enqueue: (entry: Omit<PendingTransaction, 'syncStatus'>) => void;
  markSyncing: (localId: string) => void;
  markSynced: (localId: string) => void;
  markFailed: (localId: string, reason: string) => void;
  clearSynced: () => void;
  resetAll: () => void;
}

const countPending = (queue: PendingTransaction[]) =>
  queue.filter((t) => t.syncStatus === 'pending').length;

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      pendingCount: 0,

      enqueue: (entry) =>
        set((state) => {
          const next: PendingTransaction = { ...entry, syncStatus: 'pending' };
          const newQueue = [...state.queue, next];
          return { queue: newQueue, pendingCount: countPending(newQueue) };
        }),

      markSyncing: (localId) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId ? { ...t, syncStatus: 'syncing' as const } : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue) };
        }),

      markSynced: (localId) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId ? { ...t, syncStatus: 'synced' as const } : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue) };
        }),

      markFailed: (localId, reason) =>
        set((state) => {
          const newQueue = state.queue.map((t) =>
            t.localId === localId
              ? { ...t, syncStatus: 'failed' as const, failureReason: reason }
              : t
          );
          return { queue: newQueue, pendingCount: countPending(newQueue) };
        }),

      clearSynced: () =>
        set((state) => {
          const newQueue = state.queue.filter((t) => t.syncStatus !== 'synced');
          return { queue: newQueue, pendingCount: countPending(newQueue) };
        }),

      resetAll: () => set({ queue: [], pendingCount: 0 }),
    }),
    {
      name: 'pos-offline-queue',
      partialize: (state) => ({ queue: state.queue, pendingCount: state.pendingCount }),
    }
  )
);
