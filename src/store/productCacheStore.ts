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

  isStale: () => boolean;
  setCache: (products: Product[], categories: { name: string; count: number }[]) => void;
  clearCache: () => void;
}

export const useProductCacheStore = create<ProductCacheState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      cachedAt: null,

      isStale: () => {
        const { cachedAt } = get();
        if (!cachedAt) return true;
        return Date.now() - cachedAt > CACHE_TTL_MS;
      },

      setCache: (products, categories) =>
        set({ products, categories, cachedAt: Date.now() }),

      clearCache: () => set({ products: [], categories: [], cachedAt: null }),
    }),
    {
      name: 'pos-product-cache',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        cachedAt: state.cachedAt,
      }),
    }
  )
);
