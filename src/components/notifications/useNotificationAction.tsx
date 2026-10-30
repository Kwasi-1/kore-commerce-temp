import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useCan } from '@/hooks/usePermissions';
import { useFeaturesStore } from '@/store/featuresStore';
import { NOTIFICATIONS_KEY, useCanManageNotifications, type NotificationItem } from '@/hooks/useNotifications';
import { QuickStockIntakeModal, type ProductStockItem } from '@/pages/inventory/components/QuickStockIntakeModal';

/**
 * What a notification's button does, if anything: Restock a low item, open Stock Levels, or the
 * online orders. Only for people allowed to (cashiers get none: they see stock alerts only).
 */
export function useNotificationAction() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = useCanManageNotifications();
  const queryClient = useQueryClient();
  const madeInHouseEnabled = useFeaturesStore((s) => !!s.posSettings?.made_in_house_enabled);
  const [restockItem, setRestockItem] = useState<ProductStockItem | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openRestock = async (n: NotificationItem) => {
    setLoadingId(n.id);
    try {
      const p = (await apiClient.get(`/tenant/products/${n.productId}`)).data?.success?.data?.product;
      const v = (p?.variants || []).find((x: any) => x.id === n.referenceId);
      if (!p || !v) throw new Error('missing');
      const attrs = Object.values(v.variant_attributes || {}).filter(Boolean).join(' / ');
      setRestockItem({
        id: v.id,
        variantId: v.id,
        productId: p.id,
        name: attrs ? `${p.name} (${attrs})` : p.name,
        category: p.category || 'General',
        sku: v.sku || '',
        quantity: Number(v.stock_quantity ?? 0),
        base_unit_name: v.base_unit_name || 'unit',
        imageUrl: v.image_url || p.images?.[0],
        packaging_tiers: v.packaging_tiers || [],
        cost_price: v.cost_price_per_base_unit || 0,
        isMadeInHouse: !!p.is_made_in_house && madeInHouseEnabled,
      });
    } catch {
      toast.error("Couldn't open this product. It may have been removed.");
    } finally {
      setLoadingId(null);
    }
  };

  const actionFor = (n: NotificationItem): { label: string; run: () => void } | null => {
    if (!canManage) return null;
    if (n.referenceType === 'low_stock' && n.productId && can('stock.adjust')) {
      return { label: 'Restock', run: () => openRestock(n) };
    }
    if ((n.referenceType === 'low_stock' || n.referenceType === 'low_stock_summary') && can(['stock.adjust', 'products.edit'])) {
      return { label: 'View stock', run: () => navigate('/inventory/stock') };
    }
    if (n.category === 'orders' && can('online.orders')) {
      return { label: 'View orders', run: () => navigate('/ecommerce/orders') };
    }
    return null;
  };

  const restockModal = (
    <QuickStockIntakeModal
      isOpen={!!restockItem}
      onClose={() => setRestockItem(null)}
      product={restockItem}
      // Restocking above the alert level clears the alert on the server
      onSuccess={() => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })}
    />
  );

  return { actionFor, restockModal, loadingId };
}
