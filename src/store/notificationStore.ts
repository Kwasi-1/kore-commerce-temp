import { create } from 'zustand';
import apiClient from '@/api/client';

interface NotificationState {
  unreadCount: number;
  isLoading: boolean;
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isLoading: false,
  fetchUnreadCount: async () => {
    try {
      set({ isLoading: true });
      const res = await apiClient.get('/tenant/notifications?per_page=1');
      const count = res.data?.success?.data?.unreadCount ?? 0;
      set({ unreadCount: count, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  markAllRead: () => set({ unreadCount: 0 })
}));
