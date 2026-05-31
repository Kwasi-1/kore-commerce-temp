import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getModules } from '@/utils/permissions';

/**
 * usePrefetchModules
 *
 * After login, silently prefetches (downloads + caches) the lazy-loaded
 * page chunks that the current user's role is permitted to access.
 *
 * This runs as a fire-and-forget in the background — it does NOT block
 * rendering. By the time the user clicks a link, the JS chunk is already
 * in the browser cache, eliminating the Suspense loading flash.
 */
export function usePrefetchModules() {
  const staffUser = useAuthStore((state) => state.staffUser);
  const tenant = useAuthStore((state) => state.tenant);

  useEffect(() => {
    if (!staffUser || !tenant) return;

    const role = staffUser.role;
    const plan = tenant.plan || 'pos_only';
    const modules = getModules(plan);

    // Always available to authenticated users
    const prefetchQueue: Array<() => Promise<unknown>> = [
      () => import('@/pages/dashboard/Overview'),
    ];

    // POS Module — available to all roles with POS access
    if (modules.pos) {
      prefetchQueue.push(
        () => import('@/pages/pos/register/Register'),
        () => import('@/pages/pos/Transactions'),
      );
    }

    // Manager + Owner/Admin only
    if (role === 'manager' || role === 'owner' || role === 'admin') {
      if (modules.reports) {
        prefetchQueue.push(
          () => import('@/pages/reports/SalesSummary'),
          () => import('@/pages/reports/ProductReport'),
          () => import('@/pages/reports/CashierReport'),
          () => import('@/pages/reports/EndOfDay'),
        );
      }
      if (modules.expenses) {
        prefetchQueue.push(() => import('@/pages/expenses/Expenses'));
      }
      if (modules.staff) {
        prefetchQueue.push(() => import('@/pages/staff/StaffManagement'));
      }
    }

    // Owner/Admin only
    if (role === 'owner' || role === 'admin') {
      if (modules.inventory) {
        prefetchQueue.push(
          () => import('@/pages/inventory/Products'),
          () => import('@/pages/inventory/StockManagement'),
          () => import('@/pages/inventory/StockReconciliation'),
          () => import('@/pages/inventory/Suppliers'),
          () => import('@/pages/inventory/PurchaseOrders'),
        );
      }
      prefetchQueue.push(
        () => import('@/pages/settings/BusinessProfile'),
        () => import('@/pages/settings/PlanBilling'),
      );
    }

    // Fire all prefetches simultaneously in the background.
    // Using requestIdleCallback (or setTimeout fallback) so we don't
    // compete with critical rendering work on the initial page load.
    const prefetch = () => {
      prefetchQueue.forEach((loader) => {
        // Intentionally NOT awaited — pure fire-and-forget cache warming
        loader().catch(() => {
          // Silently ignore prefetch failures (offline, slow connection, etc.)
        });
      });
    };

    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(prefetch, { timeout: 2000 });
      return () => cancelIdleCallback(idleId);
    } else {
      // Safari fallback
      const timer = setTimeout(prefetch, 300);
      return () => clearTimeout(timer);
    }
  }, [staffUser, tenant]);
}
