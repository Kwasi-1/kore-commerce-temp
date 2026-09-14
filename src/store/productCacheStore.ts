/**
 * productCacheStore.ts
 * Zustand + persist store for caching the POS product catalog.
 * Written on every successful /pos/products fetch.
 * Read locally when the browser is offline.
 *
 * Cache TTL: 30 minutes. isStale() returns true after 30 min.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/components/pos/ProductCard';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface ProductCacheState {
  products: Product[];
  categories: { name: string; count: number }[];
  cachedAt: number | null;
  tenantId: string | null;

  isStale: () => boolean;
  setCache: (products: Product[], categories: { name: string; count: number }[], tenantId?: string | null) => void;
  clearCache: () => void;
}

export const useProductCacheStore = create<ProductCacheState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      cachedAt: null,
      tenantId: null,

      isStale: () => {
        const { cachedAt, tenantId } = get();
        if (!cachedAt) return true;
        try {
          const rawAuth = localStorage.getItem('headlesspos-auth');
          if (rawAuth) {
            const parsedAuth = JSON.parse(rawAuth);
            const activeTenantId = parsedAuth?.state?.tenant?.id;
            if (activeTenantId && tenantId && tenantId !== activeTenantId) {
              return true; // Force refetch for new tenant
            }
          }
        } catch {
          // ignore
        }
        return Date.now() - cachedAt > CACHE_TTL_MS;
      },

      setCache: (products, categories, tenantId = null) => {
        let activeTenantId = tenantId;
        if (!activeTenantId) {
          try {
            const rawAuth = localStorage.getItem('headlesspos-auth');
            if (rawAuth) {
              const parsedAuth = JSON.parse(rawAuth);
              activeTenantId = parsedAuth?.state?.tenant?.id || null;
            }
          } catch {
            // ignore
          }
        }
        set({ products, categories, cachedAt: Date.now(), tenantId: activeTenantId });
      },

      clearCache: () => set({ products: [], categories: [], cachedAt: null, tenantId: null }),
    }),
    {
      name: 'pos-product-cache',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        cachedAt: state.cachedAt,
        tenantId: state.tenantId,
      }),
    }
  )
);
