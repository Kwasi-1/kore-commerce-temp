import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TillStaff {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface TillState {
  /** Set when an owner/admin/manager made this device a till (POS Settings → Tills) */
  tillKey: string | null;
  tillId: string | null;
  tillName: string | null;
  businessName: string | null;
  /** Last staff list for the "Who's working?" screen, so it still shows when offline */
  staff: TillStaff[];
  setTill: (till: { key: string; id: string; name: string; businessName?: string | null }) => void;
  setDirectory: (data: { businessName?: string | null; tillName?: string | null; staff: TillStaff[] }) => void;
  clearTill: () => void;
}

/**
 * This device as a till. Kept separate from the signed-in session: signing out or switching user
 * on a till keeps the till (and the shop's held sales and offline product list).
 */
export const useTillStore = create<TillState>()(
  persist(
    (set) => ({
      tillKey: null,
      tillId: null,
      tillName: null,
      businessName: null,
      staff: [],
      setTill: ({ key, id, name, businessName }) =>
        set({ tillKey: key, tillId: id, tillName: name, businessName: businessName ?? null }),
      setDirectory: ({ businessName, tillName, staff }) =>
        set((s) => ({ staff, businessName: businessName ?? s.businessName, tillName: tillName ?? s.tillName })),
      clearTill: () => set({ tillKey: null, tillId: null, tillName: null, businessName: null, staff: [] }),
    }),
    { name: 'kore-till' }
  )
);
