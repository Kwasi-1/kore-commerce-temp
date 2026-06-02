import { create } from 'zustand';
import apiClient from '@/api/client';

interface POSSettings {
  auto_print: 'always' | 'never' | 'ask';
  require_customer_for_credit: boolean;
  receipt_footer: string;
}

interface StoreSettings {
  name: string;
  description: string;
  email: string;
  phoneNumber: string;
  additionalNumber: string;
}

interface SettingsState {
  posSettings: POSSettings;
  storeSettings: StoreSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updatePOSSettings: (settings: Partial<POSSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  posSettings: {
    auto_print: 'ask',
    require_customer_for_credit: true,
    receipt_footer: 'Thank you for your business!'
  },
  storeSettings: {
    name: '',
    description: '',
    email: '',
    phoneNumber: '',
    additionalNumber: ''
  },
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/tenant/settings');
      const data = response.data.success.data;
      set({ 
        posSettings: data.pos_settings || get().posSettings,
        storeSettings: data.store || get().storeSettings,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updatePOSSettings: async (settings: Partial<POSSettings>) => {
    try {
      await apiClient.patch('/tenant/settings/pos', settings);
      set((state) => ({
        posSettings: { ...state.posSettings, ...settings }
      }));
    } catch (error: any) {
      throw error;
    }
  }
}));
