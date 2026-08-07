/**
 * featuresStore.ts
 * Zustand store for the tenant's feature access.
 * Loaded once after login. Provides:
 *   - plan: current plan name (starter, standard, business, ecom_only)
 *   - modules: list of enabled module keys
 *   - posSettings: micro-feature toggles for the POS register
 *   - hasModule(key): boolean check
 *   - hasSetting(key): boolean check
 *   - loadFeatures(): fetches from GET /tenant/features
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/api/client';

export interface POSSettings {
  pos_tax_enabled: boolean;
  pos_tax_rate: number;             // 0.15 = 15%
  pos_tax_label: string;            // "VAT", "Tax", "NHIL+GETFund"
  pos_credit_enabled: boolean;
  pos_credit_ledger_enabled: boolean;
  pos_wholesale_enabled: boolean;
  pos_discounts_enabled: boolean;
  pos_service_charge_enabled: boolean;
  pos_service_charge_rate: number;
  pos_service_charge_label: string;
  pos_split_payment_enabled: boolean;
  pos_payment_methods: string[];   // e.g. ["cash", "mobile_money", "card"]
  pos_notes_enabled: boolean;
  pos_customer_required: boolean;
  pos_price_override_enabled: boolean;
  pos_barcode_scan_enabled: boolean;
  pos_shift_management_enabled: boolean;
}

const DEFAULT_POS_SETTINGS: POSSettings = {
  pos_tax_enabled: false,
  pos_tax_rate: 0,
  pos_tax_label: 'Tax',
  pos_credit_enabled: false,
  pos_credit_ledger_enabled: true,
  pos_wholesale_enabled: false,
  pos_discounts_enabled: true,
  pos_service_charge_enabled: false,
  pos_service_charge_rate: 0,
  pos_service_charge_label: 'Service Charge',
  pos_split_payment_enabled: false,
  pos_payment_methods: ['cash', 'mobile_money', 'card'],
  pos_notes_enabled: true,
  pos_customer_required: false,
  pos_price_override_enabled: false,
  pos_barcode_scan_enabled: true,
  pos_shift_management_enabled: false,
};

// Fallback modules for each plan (mirrors backend PLAN_MODULES)
const PLAN_MODULES: Record<string, string[]> = {
  starter:   ['pos', 'inventory_basic', 'reports_basic', 'settings'],
  standard:  [
    'pos', 'credit_ledger', 'returns', 'inventory_basic', 'inventory_advanced',
    'suppliers', 'purchase_orders', 'supplier_credit', 'stock_reconciliation',
    'adjustments', 'staff', 'expenses', 'reports_basic', 'reports_advanced', 'settings',
  ],
  business:  [
    'pos', 'credit_ledger', 'returns', 'inventory_basic', 'inventory_advanced',
    'suppliers', 'purchase_orders', 'supplier_credit', 'stock_reconciliation',
    'adjustments', 'staff', 'expenses', 'reports_basic', 'reports_advanced',
    'ecommerce', 'payroll', 'settings',
  ],
  ecom_only: ['inventory_basic', 'ecommerce', 'reports_basic', 'settings'],
  // Legacy plan names — graceful fallback
  pos_only:    [
    'pos', 'credit_ledger', 'returns', 'inventory_basic', 'inventory_advanced',
    'suppliers', 'purchase_orders', 'supplier_credit', 'stock_reconciliation',
    'adjustments', 'staff', 'expenses', 'reports_basic', 'reports_advanced', 'settings',
  ],
  ecommerce_only: ['inventory_basic', 'ecommerce', 'reports_basic', 'settings'],
  full_suite:  [
    'pos', 'credit_ledger', 'returns', 'inventory_basic', 'inventory_advanced',
    'suppliers', 'purchase_orders', 'supplier_credit', 'stock_reconciliation',
    'adjustments', 'staff', 'expenses', 'reports_basic', 'reports_advanced',
    'ecommerce', 'payroll', 'settings',
  ],
};

interface FeaturesState {
  plan: string;
  modules: string[];
  posSettings: POSSettings;
  isLoaded: boolean;
  lastFetchedAt: number | null;    // timestamp ms — for cache invalidation
  hasModule: (key: string) => boolean;
  hasSetting: (key: keyof POSSettings) => boolean;
  loadFeatures: () => Promise<void>;
  updatePOSSettings: (settings: Partial<POSSettings>) => void;
  reset: () => void;
}

export const useFeaturesStore = create<FeaturesState>()(
  persist(
    (set, get) => ({
      plan: 'starter',
      modules: PLAN_MODULES['starter'],
      posSettings: DEFAULT_POS_SETTINGS,
      isLoaded: false,
      lastFetchedAt: null,

      hasModule: (key: string) => get().modules.includes(key),

      hasSetting: (key: keyof POSSettings) => Boolean(get().posSettings[key]),

      loadFeatures: async () => {
        try {
          const res = await apiClient.get('/tenant/features');
          const data = res.data?.success?.data || res.data?.data || {};
          const plan: string = data.plan || 'starter';
          const modules: string[] = data.modules?.length
            ? data.modules
            : (PLAN_MODULES[plan] ?? PLAN_MODULES['starter']);
          const posSettings: POSSettings = {
            ...DEFAULT_POS_SETTINGS,
            ...(data.pos_settings || {}),
          };
          set({
            plan,
            modules,
            posSettings,
            isLoaded: true,
            lastFetchedAt: Date.now(),
          });
        } catch (err) {
          // Fail-safe: derive modules from cached plan (most restrictive if unknown)
          const currentPlan = get().plan || 'starter';
          const fallbackModules = PLAN_MODULES[currentPlan] ?? PLAN_MODULES['starter'];
          set({
            modules: fallbackModules,
            isLoaded: true, // mark loaded so app doesn't block
          });
          console.warn('[featuresStore] Failed to load features from server, using cached/fallback.', err);
        }
      },

      updatePOSSettings: (partial: Partial<POSSettings>) => {
        set((state) => ({
          posSettings: { ...state.posSettings, ...partial },
        }));
      },

      reset: () =>
        set({
          plan: 'starter',
          modules: PLAN_MODULES['starter'],
          posSettings: DEFAULT_POS_SETTINGS,
          isLoaded: false,
          lastFetchedAt: null,
        }),
    }),
    {
      name: 'headlesspos-features',  // localStorage key
      partialize: (state) => ({      // only persist plan + settings (not functions)
        plan: state.plan,
        modules: state.modules,
        posSettings: state.posSettings,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
