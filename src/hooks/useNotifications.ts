import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'inventory' | 'orders' | 'financial' | 'system';
  type: 'warning' | 'info' | 'success' | 'alert';
  timestamp: string | null;
  read: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
  /** Low-stock alerts: the product of the variant (to open Restock) */
  productId?: string | null;
}

interface ListPage {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  has_more: boolean;
  can_manage: boolean;
}

export type NotificationTab = 'all' | 'unread' | 'inventory' | 'orders' | 'financial' | 'system';

/** Everything notification-related shares this prefix, so one invalidate refreshes the badge, bell and page. */
export const NOTIFICATIONS_KEY = ['notifications'] as const;
const PAGE_SIZE = 30;

const errorMessage = (err: any, fallback: string) => err?.response?.data?.error?.message || fallback;

/** Cashiers only see stock alerts, and can't mark them read or delete them (read state is shared by the store). */
export const useCanManageNotifications = () => useAuthStore((s) => s.staffUser?.role !== 'cashier');

/**
 * The unread badge for the sidebar, bottom nav and header bell. One shared query: checks again every
 * minute while the app is visible, when the tab is focused again, and right after any action below.
 */
export function useUnreadNotifications() {
  const token = useAuthStore((s) => s.token);
  const { data } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread'],
    queryFn: async () => Number((await apiClient.get('/tenant/notifications/unread-count')).data?.success?.data?.unreadCount ?? 0),
    enabled: !!token,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  return data ?? 0;
}

const fetchPage = async (page: number, tab: NotificationTab, search: string, perPage = PAGE_SIZE): Promise<ListPage> => {
  const params: Record<string, string | number> = { page, per_page: perPage };
  if (tab === 'unread') params.is_read = 'false';
  else if (tab !== 'all') params.category = tab;
  if (search.trim()) params.search = search.trim();
  const d = (await apiClient.get('/tenant/notifications', { params })).data?.success?.data || {};
  return {
    notifications: d.notifications || [],
    unreadCount: d.unreadCount ?? 0,
    total: d.total ?? 0,
    page: d.page ?? page,
    has_more: !!d.has_more,
    can_manage: d.can_manage !== false,
  };
};

/** The notifications page: filtered on the server, loaded 30 at a time. */
export function useNotificationList(tab: NotificationTab, search: string) {
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', tab, search.trim()],
    queryFn: ({ pageParam }) => fetchPage(pageParam, tab, search),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    refetchOnWindowFocus: true,
  });
}

/** The header bell: the latest 10, unread first. */
export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'recent'],
    queryFn: async () => {
      const page = await fetchPage(1, 'all', '', 10);
      return [...page.notifications].sort((a, b) => Number(a.read) - Number(b.read));
    },
    enabled,
    staleTime: 10_000,
  });
}

/** Mark read / delete / mark all / clear read. Each refreshes every notification query; errors are shown, not hidden. */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const onError = (fallback: string) => (err: any) => toast.error(errorMessage(err, fallback));

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/tenant/notifications/${id}/read`),
    onSettled: refresh,
    onError: onError("Couldn't mark it as read"),
  });
  const markAllRead = useMutation({
    mutationFn: () => apiClient.post('/tenant/notifications/read-all'),
    onSuccess: () => toast.success('All notifications marked as read'),
    onSettled: refresh,
    onError: onError("Couldn't mark them as read"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tenant/notifications/${id}`),
    onSettled: refresh,
    onError: onError("Couldn't delete it"),
  });
  const clearRead = useMutation({
    mutationFn: () => apiClient.delete('/tenant/notifications/clear-read'),
    onSuccess: (res) => {
      const n = res.data?.success?.data?.removed ?? 0;
      toast.success(n ? `Cleared ${n} read notification${n === 1 ? '' : 's'}` : 'Nothing to clear');
    },
    onSettled: refresh,
    onError: onError("Couldn't clear them"),
  });

  return { markRead, markAllRead, remove, clearRead };
}
