import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

/** Query keys for "MoMo payments without a sale" (shared by the banner, the header icon and the window). */
export const UNMATCHED_MOMO_KEY = ['pos', 'momo', 'unmatched'] as const;
export const UNMATCHED_MOMO_HISTORY_KEY = ['pos', 'momo', 'unmatched', 'history'] as const;

/**
 * Managers: MoMo payments that never became a sale. One shared query, so every place showing it
 * agrees and makes a single request. It's one of the few "live" screens: it checks again every
 * minute while the page is visible (not in a hidden tab), when the tab is focused again, and after
 * a sale on this till. Actions in the window refresh it straight away (invalidate UNMATCHED_MOMO_KEY).
 */
export function useUnmatchedMomo<T = any>(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: UNMATCHED_MOMO_KEY });
    window.addEventListener('pos:transaction-completed', refresh);
    return () => window.removeEventListener('pos:transaction-completed', refresh);
  }, [enabled, queryClient]);

  return useQuery<T[]>({
    queryKey: UNMATCHED_MOMO_KEY,
    queryFn: async () => (await apiClient.get('/pos/momo/unmatched')).data?.success?.data?.charges || [],
    enabled,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
