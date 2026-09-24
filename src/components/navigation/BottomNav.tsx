import { useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';

import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore, getPlanModules } from '@/store/featuresStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useNavDrawerStore, NavDrawerGroup } from '@/store/navDrawerStore';
import { getModules } from '@/utils/permissions';

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
  const plan = tenant?.plan || 'starter';
  const modules = getModules(plan);
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const { isOpen, setIsOpen, activeGroup, setActiveGroup, closeDrawer, openDrawer } = useNavDrawerStore();
  const { unreadCount } = useNotificationStore();
  const { posSettings } = useFeaturesStore();

  const previousPlanModules = getPlanModules((graceInfo as any)?.previous_plan || 'standard');
  const hasGraceModule = (key: string) => inGracePeriod && previousPlanModules.includes(key);

  const handleNavigation = (to: string) => {
    closeDrawer();
    startTransition(() => navigate(to));
  };

  const isModuleVisible = (moduleKey?: string) => {
    if (!moduleKey) return true;
    const isUnlocked = hasModule(moduleKey);
    if (moduleKey === 'credit_ledger') {
      const ledgerEnabled = posSettings?.pos_credit_ledger_enabled ?? true;
      return (isUnlocked && ledgerEnabled) || inGracePeriod;
    }
    return isUnlocked || inGracePeriod || hasGraceModule(moduleKey);
  };

  // Determine current contextual route group
  const isRegisterPage = location.pathname === '/pos/register';
  const isReportsContext = location.pathname.startsWith('/reports');
  const isSettingsContext = location.pathname.startsWith('/settings');
  const isEcommerceContext = location.pathname.startsWith('/ecommerce');

  // Primary bottom pill links (Context-Aware: dynamically adapts to functional group)
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
    : isReportsContext
    ? [
        {
          name: 'Home',
          to: '/dashboard',
          icon: 'solar:home-2-linear',
          activeIcon: 'solar:home-2-bold-duotone',
        },
        {
          name: 'Sales',
          to: '/reports/sales',
          icon: 'solar:chart-2-linear',
          activeIcon: 'solar:chart-2-bold-duotone',
        },
        {
          name: 'Products',
          to: '/reports/products',
          icon: 'solar:box-minimalistic-linear',
          activeIcon: 'solar:box-minimalistic-bold-duotone',
        },
        {
          name: 'Cashiers',
          to: '/reports/cashiers',
          icon: 'solar:users-group-rounded-linear',
          activeIcon: 'solar:users-group-rounded-bold-duotone',
        },
      ]
    : isSettingsContext
    ? [
        {
          name: 'Home',
          to: '/dashboard',
          icon: 'solar:home-2-linear',
          activeIcon: 'solar:home-2-bold-duotone',
        },
        {
          name: 'Account',
          to: '/settings/account',
          icon: 'solar:user-circle-linear',
          activeIcon: 'solar:user-circle-bold-duotone',
        },
        {
          name: 'Business',
          to: '/settings/profile',
          icon: 'solar:shop-2-linear',
          activeIcon: 'solar:shop-2-bold-duotone',
        },
        {
          name: 'POS',
          to: '/settings/pos',
          icon: 'solar:tuning-square-2-linear',
          activeIcon: 'solar:tuning-square-2-bold-duotone',
        },
      ]
    : isEcommerceContext
    ? [
        {
          name: 'Home',
          to: '/dashboard',
          icon: 'solar:home-2-linear',
          activeIcon: 'solar:home-2-bold-duotone',
        },
        {
          name: 'Orders',
          to: '/ecommerce/orders',
          icon: 'solar:bag-2-linear',
          activeIcon: 'solar:bag-2-bold-duotone',
        },
        {
          name: 'Store',
          to: '/ecommerce/storefront',
          icon: 'solar:global-linear',
          activeIcon: 'solar:global-bold-duotone',
        },
        {
          name: 'Customers',
          to: '/ecommerce/customers',
          icon: 'solar:users-group-two-rounded-linear',
          activeIcon: 'solar:users-group-two-rounded-bold-duotone',
        },
      ]
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

  // Group definitions for Option A sub-view drilldowns
  const groupDefinitions = {
    reports: {
      title: 'Reports',
      icon: 'solar:chart-2-bold-duotone',
      items: [
        { name: 'Sales', to: '/reports/sales', icon: 'solar:chart-2-bold-duotone' },
        { name: 'Products', to: '/reports/products', icon: 'solar:box-minimalistic-bold-duotone' },
        { name: 'Cashiers', to: '/reports/cashiers', icon: 'solar:users-group-rounded-bold-duotone' },
        { name: 'End of Day', to: '/reports/end-of-day', icon: 'solar:calendar-date-bold-duotone' },
      ],
    },
    settings: {
      title: 'Settings',
      icon: 'solar:settings-bold-duotone',
      items: [
        { name: 'Account', to: '/settings/account', icon: 'solar:user-circle-bold-duotone' },
        { name: 'Business', to: '/settings/profile', icon: 'solar:shop-2-bold-duotone' },
        { name: 'POS Config', to: '/settings/pos', icon: 'solar:tuning-square-2-bold-duotone' },
        { name: 'Billing', to: '/settings/plan', icon: 'solar:card-2-bold-duotone' },
      ],
    },
    ecommerce: {
      title: 'E-Commerce',
      icon: 'solar:shop-2-bold-duotone',
      items: [
        { name: 'Orders', to: '/ecommerce/orders', icon: 'solar:bag-2-bold-duotone' },
        { name: 'Storefront', to: '/ecommerce/storefront', icon: 'solar:global-bold-duotone' },
        { name: 'Discounts', to: '/ecommerce/discounts', icon: 'solar:tag-price-bold-duotone' },
        { name: 'Customers', to: '/ecommerce/customers', icon: 'solar:users-group-two-rounded-bold-duotone' },
      ],
    },
  };

  // Flat standalone items for the root drawer grid
  const flatItems = isCashier
    ? [
        { name: 'Register', to: '/pos/register', icon: 'solar:cart-large-2-bold-duotone' },
        { name: 'Transactions', to: '/pos/transactions', icon: 'solar:clock-circle-bold-duotone' },
        { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: 'solar:book-2-bold-duotone', moduleKey: 'credit_ledger' },
        { name: 'Returns', to: '/pos/returns', icon: 'solar:restart-bold-duotone', moduleKey: 'returns' },
      ].filter((item) => isModuleVisible(item.moduleKey))
    : [
        // POS operations
        { name: 'Register', to: '/pos/register', icon: 'solar:cart-large-2-bold-duotone', moduleKey: 'pos' },
        { name: 'Transactions', to: '/pos/transactions', icon: 'solar:clock-circle-bold-duotone', moduleKey: 'pos' },
        { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: 'solar:book-2-bold-duotone', moduleKey: 'credit_ledger' },
        { name: 'Returns', to: '/pos/returns', icon: 'solar:restart-bold-duotone', moduleKey: 'returns' },
        // Inventory
        { name: 'Products', to: '/inventory/products', icon: 'solar:box-minimalistic-bold-duotone', moduleKey: 'inventory' },
        { name: 'Adjustments', to: '/inventory/adjustments', icon: 'solar:clipboard-list-bold-duotone', moduleKey: 'adjustments' },
        { name: 'Stock Levels', to: '/inventory/stock', icon: 'solar:layers-bold-duotone', moduleKey: 'inventory' },
        { name: 'Reconcile', to: '/inventory/stock-reconciliation', icon: 'solar:clipboard-check-bold-duotone', moduleKey: 'stock_reconciliation' },
        { name: 'Suppliers', to: '/inventory/suppliers', icon: 'solar:delivery-bold-duotone', moduleKey: 'suppliers' },
        { name: 'Purchase Orders', to: '/inventory/purchase-orders', icon: 'solar:file-check-bold-duotone', moduleKey: 'purchase_orders' },
        // Business
        { name: 'Expenses', to: '/expenses', icon: 'solar:bill-check-bold-duotone', moduleKey: 'expenses' },
        { name: 'Staff', to: '/staff', icon: 'solar:user-id-bold-duotone', moduleKey: 'staff' },
      ].filter((item) => isModuleVisible(item.moduleKey));

  // Omit actions already visible in the primary bottom nav to avoid duplication
  const activePrimaryRoutes = new Set(
    isRegisterPage ? [] : primaryLinks.map((l) => l.to)
  );

  const visibleFlatItems = flatItems.filter((item) => !activePrimaryRoutes.has(item.to));

  // Visible group folder tiles in root grid
  const visibleGroups: Array<{ key: NonNullable<NavDrawerGroup>; title: string; icon: string; count: number }> = isCashier
    ? []
    : [
        ...(isModuleVisible('reports_basic')
          ? [{ key: 'reports' as const, title: 'Reports', icon: 'solar:chart-2-bold-duotone', count: groupDefinitions.reports.items.length }]
          : []),
        { key: 'settings' as const, title: 'Settings', icon: 'solar:settings-bold-duotone', count: groupDefinitions.settings.items.length },
        ...(isModuleVisible('ecommerce')
          ? [{ key: 'ecommerce' as const, title: 'E-Commerce', icon: 'solar:shop-2-bold-duotone', count: groupDefinitions.ecommerce.items.length }]
          : []),
      ];

  return (
    <div className="md:hidden">
      {/* ── 1. Floating Capsule Nav & Detached Satellite Launcher (Hidden on /pos/register) ── */}
      {!isRegisterPage && (
        <div className="fixed bottom-5 inset-x-0 mx-auto w-full flex justify-center items-center gap-2 px-3.5 z-50 pointer-events-none">
          {/* Primary 4-Tab Capsule Pill */}
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
                      isActive
                        ? 'text-white dark:text-neutral-950 scale-105'
                        : 'text-neutral-500 hover:text-neutral-950 dark:text-white/70 dark:hover:text-white'
                    )}
                  />
                </button>
              );
            })}
          </nav>

          {/* Detached Drawer Trigger Button */}
          <button
            onClick={() => openDrawer()}
            className="pointer-events-auto relative flex items-center justify-center h-12 w-12 rounded-full bg-muted/80 dark:bg-neutral-900/85 backdrop-blur-2xl border border-border/40 dark:border-white/5 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.03] dark:ring-white/5 text-neutral-700 hover:text-neutral-950 dark:text-white/80 dark:hover:text-white active:scale-95 transition-all focus:outline-none shrink-0"
            title="All Modules & Menu"
          >
            <Icon icon="solar:widget-2-linear" className="text-[22px]" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>
        </div>
      )}

      {/* ── 2. Native Mobile Menu Drawer (4-Column Box Grid with Sub-View Option A) ── */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="bg-card/95 dark:bg-neutral-900/95 backdrop-blur-2xl text-foreground dark:text-white max-h-[68vh] outline-none mx-2.5 mb-3 rounded-[1.75rem] border border-border/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden after:!hidden">
          
          <div className="flex flex-col max-h-[calc(68vh-20px)] overflow-hidden">
            {/* Header Navigation Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 dark:border-white/10 shrink-0">
              {activeGroup ? (
                <button
                  onClick={() => setActiveGroup(null)}
                  className="flex items-center gap-1 text-xs font-semibold hover:text-primary/80 transition-colors active:scale-95 py-1 px-1 -ml-1 rounded-lg"
                >
                  <Icon icon="solar:alt-arrow-left-linear" className="text-base" />
                  <span>All Modules</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Icon icon="solar:widget-2-bold-duotone" className="text-base text-primary" />
                  <span className="text-xs font-bold tracking-tight text-foreground">Modules & Operations</span>
                </div>
              )}

              {activeGroup && (
                <span className="text-xs font-bold text-foreground">
                  {groupDefinitions[activeGroup].title}
                </span>
              )}

              <DrawerClose className="h-7 w-7 rounded-full bg-muted/60 dark:bg-white/10 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <Icon icon="solar:close-circle-linear" className="text-lg" />
              </DrawerClose>
            </div>

            {/* Scrollable Box Grid Area */}
            <div className="overflow-y-auto scrollbar-hide py-3 px-3">
              <AnimatePresence mode="wait">
                {activeGroup ? (
                  /* Sub-View Grid (Option A Drill-Down) */
                  <motion.div
                    key={`subview-${activeGroup}`}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.16 }}
                    className="grid grid-cols-4 gap-2 pb-2"
                  >
                    {groupDefinitions[activeGroup].items.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.to)}
                        className="group relative flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/50 dark:bg-white/5 hover:bg-muted/90 dark:hover:bg-white/10 active:scale-95 transition-all text-center border border-border/30 dark:border-white/5 shadow-xs aspect-square focus:outline-none"
                      >
                        <Icon
                          icon={item.icon}
                          className="text-[26px] text-foreground/85 group-hover:text-primary transition-colors mb-1"
                        />
                        <span className="text-[10px] font-semibold text-foreground/80 group-hover:text-foreground line-clamp-1 truncate w-full text-center leading-tight tracking-tight">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  /* Root Grid (4-Column Squircle Box Grid) */
                  <motion.div
                    key="root-grid"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ duration: 0.16 }}
                    className="grid grid-cols-4 gap-2 pb-2"
                  >
                    {/* Standalone Flat Items */}
                    {visibleFlatItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.to)}
                        className="group relative flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/50 dark:bg-white/5 hover:bg-muted/90 dark:hover:bg-white/10 active:scale-95 transition-all text-center border border-border/30 dark:border-white/5 shadow-xs aspect-square focus:outline-none"
                      >
                        <Icon
                          icon={item.icon}
                          className="text-[26px] text-foreground/85 group-hover:text-primary transition-colors mb-1"
                        />
                        <span className="text-[10px] font-semibold text-foreground/80 group-hover:text-foreground line-clamp-1 truncate w-full text-center leading-tight tracking-tight">
                          {item.name}
                        </span>
                      </button>
                    ))}

                    {/* Group Folder Tiles (Option A Drilldown triggers) */}
                    {visibleGroups.map((group) => (
                      <button
                        key={group.key}
                        onClick={() => setActiveGroup(group.key)}
                        className="group relative flex flex-col items-center justify-center p-2 rounded-2xl bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15 active:scale-95 transition-all text-center border border-primary/20 dark:border-primary/30 shadow-xs aspect-square focus:outline-none ring-1 ring-primary/10"
                      >
                        <div className="relative mb-1">
                          <Icon
                            icon={group.icon}
                            className="text-[26px] text-primary transition-transform group-hover:scale-110"
                          />
                          <span className="absolute -top-1 -right-2 bg-primary text-white dark:text-neutral-950 text-[8px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs">
                            {group.count}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-foreground line-clamp-1 truncate w-full text-center leading-tight tracking-tight">
                          {group.title}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
