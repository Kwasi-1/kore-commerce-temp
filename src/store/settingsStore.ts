import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/api/client';

export interface POSSettings {
  auto_print: 'always' | 'never' | 'ask';
  require_customer_for_credit: boolean;
  receipt_footer: string;
  receipt_prefix?: string;
}

export interface StoreSettings {
  name: string;
  description: string;
  email: string;
  phoneNumber: string;
  additionalNumber: string;
  address?: string;
  location?: string;
}

interface SettingsState {
  posSettings: POSSettings;
  storeSettings: StoreSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updatePOSSettings: (settings: Partial<POSSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      posSettings: {
        auto_print: 'ask',
        require_customer_for_credit: true,
        receipt_footer: 'Thank you for your business!',
        receipt_prefix: ''
      },
      storeSettings: {
        name: '',
        description: '',
        email: '',
        phoneNumber: '',
        additionalNumber: '',
        address: '',
        location: ''
      },
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.get('/tenant/settings');
          const data = response.data.success.data;
          const storeData = data.store || {};
          if (data.location?.address) {
            storeData.address = data.location.address;
            storeData.location = data.location.address;
          }
          set({ 
            posSettings: { ...get().posSettings, ...(data.pos_settings || {}) },
            storeSettings: { ...get().storeSettings, ...storeData },
            isLoading: false 
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      updatePOSSettings: async (settings: Partial<POSSettings>) => {
        // Immediate local state update for snappy UI and offline resilience
        set((state) => ({
          posSettings: { ...state.posSettings, ...settings }
        }));
        try {
          await apiClient.patch('/tenant/settings/pos', settings);
        } catch (error: any) {
          // If backend endpoint is offline or not implemented, keep local update intact
          console.warn('Could not sync pos settings to server:', error);
        }
      }
    }),
    {
      name: 'kore-pos-settings'
    }
  )
);
