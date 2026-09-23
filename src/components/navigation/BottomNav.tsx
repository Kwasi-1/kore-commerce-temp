import { useTransition, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore, getPlanModules } from '@/store/featuresStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getModules } from '@/utils/permissions';
import { APP_CONFIG } from '@/config/app.config';

// Top-level navigation routes that should show the BottomNav on mobile.
export const BOTTOM_NAV_ROUTES = new Set([
  // POS
  '/pos/register',
  '/pos/transactions',
  '/pos/credit-ledger',
  '/pos/returns',
  // Dashboard
  '/dashboard',
  // Inventory
  '/inventory/products',
  '/inventory/adjustments',
  '/inventory/stock',
  '/inventory/stock-reconciliation',
  '/inventory/suppliers',
  '/inventory/purchase-orders',
  // Expenses
  '/expenses',
  // Ecommerce
  '/ecommerce/orders',
  '/ecommerce/customers',
  '/ecommerce/storefront',
  '/ecommerce/discounts',
  // Notifications
  '/notifications',
  // Staff
  '/staff',
  '/staff/payroll',
  // Reports
  '/reports/sales',
  '/reports/products',
  '/reports/cashiers',
  '/reports/end-of-day',
  // Settings
  '/settings/account',
  '/settings/profile',
  '/settings/pos',
  '/settings/plan',
]);

export function isBottomNavRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return BOTTOM_NAV_ROUTES.has(normalized);
}

export default function BottomNav() {
  const location = useLocation();

  if (!isBottomNavRoute(location.pathname)) {
    return null;
  }

  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const graceInfo = useAuthStore((state) => state.graceInfo);
  const inGracePeriod = Boolean(graceInfo && graceInfo.active);
  const hasModule = useFeaturesStore((s) => s.hasModule);
  const isCashier = staffUser?.role === 'cashier';
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'starter';
  const modules = getModules(plan);
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { unreadCount } = useNotificationStore();
  const { posSettings } = useFeaturesStore();

  const previousPlanModules = getPlanModules((graceInfo as any)?.previous_plan || 'standard');
  const hasGraceModule = (key: string) => inGracePeriod && previousPlanModules.includes(key);

  const handleNavigation = (to: string) => {
    setIsDrawerOpen(false);
    startTransition(() => navigate(to));
  };

  const isModuleVisible = (moduleKey?: string) => {
    if (!moduleKey) return true;
    const isUnlocked = hasModule(moduleKey);
    if (moduleKey === 'credit_ledger') {
      const ledgerEnabled = posSettings?.pos_credit_ledger_enabled ?? true;
      return (isUnlocked && ledgerEnabled) || inGracePeriod;
    }
    return isUnlocked || inGracePeriod;
  };

  // Primary bottom pill links (most essential 4 based on user role)
  const primaryLinks = isCashier
    ? [
        {
          name: 'Register',
          to: '/pos/register',
          icon: 'solar:cart-large-2-linear',
          activeIcon: 'solar:cart-large-2-bold-duotone',
        },
        {
          name: 'History',
          to: '/pos/transactions',
          icon: 'solar:clock-circle-linear',
          activeIcon: 'solar:clock-circle-bold-duotone',
        },
        {
          name: 'Credit',
          to: '/pos/credit-ledger',
          icon: 'solar:book-2-linear',
          activeIcon: 'solar:book-2-bold-duotone',
          moduleKey: 'credit_ledger',
        },
        {
          name: 'Returns',
          to: '/pos/returns',
          icon: 'solar:restart-linear',
          activeIcon: 'solar:restart-bold-duotone',
          moduleKey: 'returns',
        },
      ].filter((item) => isModuleVisible(item.moduleKey))
    : [
        {
          name: 'Home',
          to: '/dashboard',
          icon: 'solar:home-2-linear',
          activeIcon: 'solar:home-2-bold-duotone',
          show: true,
        },
        {
          name: 'Register',
          to: '/pos/register',
          icon: 'solar:cart-large-2-linear',
          activeIcon: 'solar:cart-large-2-bold-duotone',
          show: modules.pos,
        },
        {
          name: 'Products',
          to: '/inventory/products',
          icon: 'solar:box-minimalistic-linear',
          activeIcon: 'solar:box-minimalistic-bold-duotone',
          show: modules.inventory,
        },
        {
          name: 'History',
          to: '/pos/transactions',
          icon: 'solar:clock-circle-linear',
          activeIcon: 'solar:clock-circle-bold-duotone',
          show: modules.pos,
        },
      ].filter((link) => link.show).slice(0, 4);

  // Grid categories for the morphing menu card
  const menuSections = isCashier
    ? [
        {
          title: 'POS Operations',
          items: [
            { name: 'Register', to: '/pos/register', icon: 'solar:cart-large-2-bold-duotone' },
            { name: 'Transactions', to: '/pos/transactions', icon: 'solar:clock-circle-bold-duotone' },
            { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: 'solar:book-2-bold-duotone', moduleKey: 'credit_ledger' },
            { name: 'Returns', to: '/pos/returns', icon: 'solar:restart-bold-duotone', moduleKey: 'returns' },
          ].filter((item) => isModuleVisible(item.moduleKey)),
        },
      ]
    : [
        {
          title: 'Point of Sale',
          items: [
            { name: 'Register', to: '/pos/register', icon: 'solar:cart-large-2-bold-duotone' },
            { name: 'Transactions', to: '/pos/transactions', icon: 'solar:clock-circle-bold-duotone' },
            { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: 'solar:book-2-bold-duotone', moduleKey: 'credit_ledger' },
            { name: 'Returns', to: '/pos/returns', icon: 'solar:restart-bold-duotone', moduleKey: 'returns' },
          ].filter((item) => isModuleVisible(item.moduleKey)),
        },
        {
          title: 'Inventory',
          items: [
            { name: 'Products', to: '/inventory/products', icon: 'solar:box-minimalistic-bold-duotone' },
            { name: 'Adjustments', to: '/inventory/adjustments', icon: 'solar:clipboard-list-bold-duotone', moduleKey: 'adjustments' },
            { name: 'Stock Levels', to: '/inventory/stock', icon: 'solar:layers-bold-duotone' },
            { name: 'Reconcile', to: '/inventory/stock-reconciliation', icon: 'solar:clipboard-check-bold-duotone', moduleKey: 'stock_reconciliation' },
            { name: 'Suppliers', to: '/inventory/suppliers', icon: 'solar:delivery-bold-duotone', moduleKey: 'suppliers' },
            { name: 'Purchase Orders', to: '/inventory/purchase-orders', icon: 'solar:file-check-bold-duotone', moduleKey: 'purchase_orders' },
          ].filter((item) => isModuleVisible(item.moduleKey)),
        },
        {
          title: 'Management & Ecommerce',
          items: [
            { name: 'Expenses', to: '/expenses', icon: 'solar:bill-check-bold-duotone', moduleKey: 'expenses' },
            { name: 'Online Orders', to: '/ecommerce/orders', icon: 'solar:shop-2-bold-duotone', moduleKey: 'ecommerce' },
            { name: 'Storefront', to: '/ecommerce/storefront', icon: 'solar:global-bold-duotone', moduleKey: 'ecommerce' },
            { name: 'Discounts', to: '/ecommerce/discounts', icon: 'solar:tag-price-bold-duotone', moduleKey: 'ecommerce' },
            { name: 'Customers', to: '/ecommerce/customers', icon: 'solar:users-group-rounded-bold-duotone', moduleKey: 'ecommerce' },
            { name: 'Staff', to: '/staff', icon: 'solar:user-id-bold-duotone', moduleKey: 'staff' },
            { name: 'Reports', to: '/reports/sales', icon: 'solar:chart-2-bold-duotone', moduleKey: 'reports_basic' },
            { name: 'Settings', to: '/settings/account', icon: 'solar:settings-bold-duotone' },
          ].filter((item) => isModuleVisible(item.moduleKey)),
        },
      ];

  const tenantName = tenant?.name || tenant?.business_name || APP_CONFIG.name;
  const staffName = staffUser?.name || `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() || 'Store User';

  return (
    <div className="md:hidden">
      {/* ── 1. Floating Liquid Frosted Capsule Pill ── */}
      <div className="fixed bottom-5 inset-x-0 mx-auto w-full flex justify-center items-end px-3.5 z-50 pointer-events-none">
        <nav className="pointer-events-auto relative flex items-center gap-1.5 p-1.5 rounded-full bg-muted/80 dark:bg-neutral-900/85 backdrop-blur-2xl border border-border/40 dark:border-white/5 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.03] dark:ring-white/5 text-neutral-900 dark:text-white select-none">
          {/* Subtle top loading transition indicator */}
          {isPending && (
            <div className="absolute top-0 inset-x-4 h-[2px] bg-primary rounded-full animate-pulse" />
          )}

          {/* Primary Fast-Access Navigation Tabs */}
          {primaryLinks.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.to)}
                className="relative flex items-center justify-center h-11 w-11 rounded-full transition-all focus:outline-none"
                title={item.name}
              >
                {/* Fluid capsule background slider with Framer Motion */}
                {isActive && (
                  <motion.div
                    layoutId="activePillBubble"
                    className="absolute inset-0 bg-neutral-950 dark:bg-white rounded-full shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  />
                )}

                <Icon
                  icon={isActive ? item.activeIcon : item.icon}
                  className={clsx(
                    'transition-all duration-200 text-[22px]',
                    isActive ? 'text-white dark:text-neutral-950 scale-105' : 'text-neutral-500 hover:text-neutral-950 dark:text-white/70 dark:hover:text-white'
                  )}
                />
              </button>
            );
          })}

          {/* Drawer Menu Trigger Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center justify-center h-11 w-11 rounded-full text-neutral-600 hover:text-neutral-950 hover:bg-black/5 dark:text-white/75 dark:hover:text-white dark:hover:bg-white/10 active:scale-95 transition-all focus:outline-none"
            title="All Modules & Menu"
          >
            <Icon icon="solar:widget-2-linear" className="text-[22px]" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>
        </nav>
      </div>

      {/* ── 2. Native Mobile Menu Drawer (Hardware-Accelerated Vaul Sheet) ── */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-card dark:bg-sidebar text-foreground dark:text-white max-h-[55vh] outline-none mx-1 mb-1 rounded-b-3xl">

          <div className="py-4 px-5 overflow-y-auto scrollbar-hide max-h-[calc(85vh-70px)] space-y-5">
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block text-left px-1">
                  {section.title}
                </span>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const isActive =
                      location.pathname === item.to ||
                      (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));
                    const itemWithKey = item as { moduleKey?: string };
                    const isLocked = itemWithKey.moduleKey ? !hasModule(itemWithKey.moduleKey) : false;

                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.to)}
                        disabled={isLocked}
                        className={clsx(
                          'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                          isActive
                            ? 'bg-foreground text-background font-bold shadow-sm'
                            : isLocked
                            ? 'text-muted-foreground/40 hover:bg-muted/30 cursor-not-allowed'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon icon={item.icon} className="h-4 w-4 text-base" />
                          <span>{item.name}</span>
                        </div>
                        {isLocked ? (
                          <Icon icon="solar:lock-keyhole-minimalistic-linear" className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        ) : (
                          <Icon icon="solar:alt-arrow-right-linear" className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Actions & Logout */}
            <div className="border-t border-border dark:border-white/10 pt-3 mt-2 flex items-center justify-between">
              <button
                onClick={() => handleNavigation('/pos/locked')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-all"
              >
                <Icon icon="solar:lock-keyhole-minimalistic-linear" className="text-sm" />
                <span>Lock POS</span>
              </button>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  logout();
                  window.location.href = '/login';
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Icon icon="solar:logout-2-linear" className="text-sm" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
