import { useTransition, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { unreadCount } = useNotificationStore();
  const { posSettings } = useFeaturesStore();

  const previousPlanModules = getPlanModules((graceInfo as any)?.previous_plan || 'standard');
  const hasGraceModule = (key: string) => inGracePeriod && previousPlanModules.includes(key);

  const handleNavigation = (to: string) => {
    setIsMenuOpen(false);
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
      {/* ── 1. Frosted Translucent Backdrop Overlay ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-md z-50"
          />
        )}
      </AnimatePresence>

      {/* ── 2. Morphing Navigation Island Container ── */}
      <div className="fixed bottom-5 inset-x-0 mx-auto w-full flex justify-center items-end px-3.5 z-50 pointer-events-none">
        <AnimatePresence mode="wait">
          {!isMenuOpen ? (
            /* ─────────────────────────────────────────────────────────────
               STATE A: Floating Liquid Frosted Capsule Pill (Resting)
            ───────────────────────────────────────────────────────────── */
            <motion.nav
              key="collapsed-pill"
              layoutId="islandNav"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              className="pointer-events-auto relative flex items-center gap-1.5 p-1.5 rounded-full bg-neutral-900/90 dark:bg-neutral-950/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.45)] ring-1 ring-black/20 text-white select-none"
            >
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
                    className="relative flex items-center justify-center h-11 w-12 rounded-full transition-all focus:outline-none"
                    title={item.name}
                  >
                    {/* Fluid capsule background slider with Framer Motion */}
                    {isActive && (
                      <motion.div
                        layoutId="activePillBubble"
                        className="absolute inset-0 bg-white rounded-full shadow-md -z-10"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}

                    <Icon
                      icon={isActive ? item.activeIcon : item.icon}
                      className={clsx(
                        'transition-all duration-200 text-[22px]',
                        isActive ? 'text-neutral-950 scale-105' : 'text-white/70 hover:text-white'
                      )}
                    />
                  </button>
                );
              })}

              {/* Morphing Menu Trigger Button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="relative flex items-center justify-center h-11 w-12 rounded-full text-white/75 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none"
                title="All Modules & Menu"
              >
                <Icon icon="solar:widget-2-linear" className="text-[22px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-neutral-900" />
                )}
              </button>
            </motion.nav>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               STATE B: Morphing Floating Liquid Grid Menu (Inspired by Inspo #3)
            ───────────────────────────────────────────────────────────── */
            <motion.div
              key="expanded-grid"
              layoutId="islandNav"
              initial={{ scale: 0.92, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 25 }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              className="pointer-events-auto relative w-full max-w-[370px] rounded-[2.25rem] bg-neutral-900/95 dark:bg-neutral-950/98 backdrop-blur-3xl border border-white/15 shadow-[0_25px_65px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-white overflow-hidden flex flex-col max-h-[82vh]"
            >
              {/* Header: Business Identity + Logged-in Staff */}
              <div className="flex items-center justify-between px-5 pt-4.5 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-bold text-xs uppercase tracking-wider text-white">
                    {tenantName.slice(0, 2)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[13px] font-bold text-white leading-tight font-header truncate max-w-[170px]">
                      {tenantName}
                    </span>
                    <span className="text-[10px] text-white/50 font-medium capitalize">
                      {staffName} • {staffUser?.role || 'Staff'}
                    </span>
                  </div>
                </div>

                {/* Top Quick Close Pill */}
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 transition-all"
                  title="Close Menu"
                >
                  <Icon icon="solar:close-circle-linear" className="text-[18px]" />
                </button>
              </div>

              {/* Scrollable Tactile Grid Area (4-Column Layout as in Image 3) */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-4">
                {menuSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block text-left px-1">
                      {section.title}
                    </span>
                    <div className="grid grid-cols-4 gap-2">
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
                              'relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl border transition-all duration-150 text-center group min-h-[66px]',
                              isActive
                                ? 'bg-white text-neutral-950 border-white font-semibold shadow-md'
                                : isLocked
                                ? 'bg-white/[0.02] border-white/5 text-white/25 cursor-not-allowed'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/20 active:scale-95 border-white/10 text-white/90'
                            )}
                          >
                            <Icon
                              icon={item.icon}
                              className={clsx(
                                'text-[22px]',
                                isActive ? 'text-neutral-950' : 'text-white/80 group-hover:scale-110 transition-transform'
                              )}
                            />
                            <span className="text-[10px] font-medium leading-tight truncate w-full px-0.5">
                              {item.name}
                            </span>
                            {isLocked && (
                              <Icon
                                icon="solar:lock-keyhole-minimalistic-bold-duotone"
                                className="absolute top-1.5 right-1.5 text-[10px] text-white/40"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quick-Action Bar & Dedicated Close Button (Matching Image 3) */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-2">
                  {/* Lock Screen Button */}
                  <button
                    onClick={() => handleNavigation('/pos/locked')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-[11px] font-medium transition-all"
                  >
                    <Icon icon="solar:lock-keyhole-minimalistic-linear" className="text-[14px]" />
                    <span>Lock POS</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                      window.location.href = '/login';
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-medium transition-all"
                  >
                    <Icon icon="solar:logout-2-linear" className="text-[14px]" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Prominent Circular Morph Close Button (Matching Image 3 Bottom Right) */}
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 flex items-center justify-center text-white shadow-lg transition-all"
                  title="Close Menu"
                >
                  <Icon icon="solar:close-circle-bold-duotone" className="text-[22px]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
