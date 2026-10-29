import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import type { CartItem } from '@/store/cartStore';
import { useProductCacheStore } from '@/store/productCacheStore';

/** A line of the cart as it was saved with a MoMo prompt. */
export interface SavedCartLine {
  variant_id: string;
  packaging_tier_id: string;
  quantity: number;
  price_type?: 'retail' | 'wholesale';
  unit_price?: number;
  name?: string;
  sku?: string;
  tier_name?: string;
  units_per_tier?: number;
  imageUrl?: string;
}

/** A paid MoMo prompt that isn't on a sale yet, as the till is offered it. */
export interface RecoverableCharge {
  reference: string;
  amount: number;
  phone: string;
  paid_at: string | null;
  /** Released by a manager (it may have been taken by another cashier) */
  released?: boolean;
  staff_name?: string | null;
  /** What was in the cart when the prompt was sent */
  cart?: SavedCartLine[];
  /** Someone is ringing it up (held for them for 10 minutes) */
  claimed_by_name?: string | null;
  claimed_by_me?: boolean;
}

/** Hold the payment for this cashier while they ring up the sale. False (with a toast) if someone else has it. */
export async function claimCharge(reference: string): Promise<boolean> {
  try {
    await apiClient.post(`/pos/momo/charge/${reference}/claim`);
    return true;
  } catch (err: any) {
    toast.error(err?.response?.data?.error?.message || "This payment can't be used any more");
    return false;
  }
}

/** Let go of it (backed out without completing the sale). */
export const unclaimCharge = (reference: string) => {
  apiClient.post(`/pos/momo/charge/${reference}/unclaim`).catch(() => {});
};

/**
 * Rebuild the cart a prompt was sent for, at today's prices (from the till's product list). Discounts
 * and changed prices aren't brought back: they'd need approving again.
 */
export function cartFromSaved(lines: SavedCartLine[]): CartItem[] {
  const products = useProductCacheStore.getState().products;
  return lines.map((line) => {
    const product = products.find((p) => p.variant_id === line.variant_id);
    const tier = product?.packaging_tiers.find((t) => t.id === line.packaging_tier_id);
    const wholesale = line.price_type === 'wholesale' && tier?.prices.wholesale != null;
    const price = tier ? (wholesale ? (tier.prices.wholesale as number) : tier.prices.retail) : Number(line.unit_price) || 0;
    return {
      productId: `${line.variant_id}-${line.packaging_tier_id}`,
      name: product?.name || line.name || 'Item',
      sku: product?.sku || line.sku || '',
      price,
      quantity: Number(line.quantity) || 1,
      imageUrl: product?.imageUrl || line.imageUrl,
      category: product?.category,
      stock_quantity: product?.stock_quantity,
      variant_id: line.variant_id,
      packaging_tier_id: line.packaging_tier_id,
      tier_name: tier?.name || line.tier_name || '',
      units_per_tier: tier?.units_per_tier || line.units_per_tier || 1,
      unit_price: price,
      price_type: wholesale ? 'wholesale' : 'retail',
      packaging_tiers: product?.packaging_tiers,
      list_price: price,
    };
  });
}
