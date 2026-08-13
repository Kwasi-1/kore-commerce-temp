/**
 * useNetworkStatus.ts
 * Reactive hook that tracks the browser's online/offline state
 * and exposes the number of pending offline transactions.
 */
import { useState, useEffect } from 'react';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

export interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const pendingCount = useOfflineQueueStore((s) => s.pendingCount);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount };
}
