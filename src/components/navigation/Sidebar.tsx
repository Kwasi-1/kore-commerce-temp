import { useState, useEffect, useTransition, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore, getPlanModules } from '@/store/featuresStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getModules } from '@/utils/permissions';
import PlanGraceBanner from '@/components/shared/PlanGraceBanner';
import apiClient from '@/api/client';

import koreLogo from '@/assets/images/kore.png';
import {
  LayoutDashboard,
  MonitorSmartphone,
  History,
  Package,
  Layers,
  Truck,
  FileBadge,
  Receipt,
  ClipboardList,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Tag,
  UserSquare2,
  CalendarCheck,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LogOut,
  ShoppingBag,
  Globe,
  BookOpen,
  ChevronsLeft,
  Sliders,
  CreditCard,
  Lock,
  Bell,
  Banknote,
  ClipboardCheck,
  User,
} from 'lucide-react';

import clsx from 'clsx';

const decodeHtml = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

import { APP_CONFIG } from '@/config/app.config';

interface NavItem {
  name: string;
  to: string;
  icon: any;
  badge?: number | string;
  moduleKey?: string;  // if set, shows a lock icon when hasModule(moduleKey) is false
}


interface NavSection {
  title: string;
  icon: any;
  show: boolean;
  hasDividerAfter?: boolean;
  badge?: number | string;
  items: NavItem[];
}

export default function Sidebar() {
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const graceInfo = useAuthStore((state) => state.graceInfo);
  const inGracePeriod = Boolean(graceInfo && graceInfo.active);
  const isCashier = staffUser?.role === 'cashier';
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'starter';
  const modules = getModules(plan);
  const hasModule = useFeaturesStore((s) => s.hasModule);
  const posSettings = useFeaturesStore((s) => s.posSettings);

  const { isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useLayoutStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [logoError, setLogoError] = useState(false);

  const rawTenantName = tenant?.name || tenant?.business_name || APP_CONFIG.name;
  const tenantName = decodeHtml(rawTenantName);
  const userName = staffUser?.name || `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() || 'Store User';
  const userRole = staffUser?.role || 'Staff';

  const previousPlanModules = getPlanModules((graceInfo as any)?.previous_plan || 'standard');
  const hasGraceModule = (key: string) => inGracePeriod && previousPlanModules.includes(key);

  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const { unreadCount: unreadNotificationsCount, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (!tenant?.id) return;
    let isMounted = true;
    fetchUnreadCount();
    apiClient.get('/tenant/products?limit=100')
      .then((res) => {
        if (!isMounted) return;
        const prods = res.data?.success?.data?.products || [];
        let count = 0;
        prods.forEach((p: any) => {
          const variants = p.variants || [];
          if (variants.length === 0) {
            const rawStock = p.total_stock_base_units ?? p.stock_quantity ?? 0;
            const stock = typeof rawStock === 'object' ? (rawStock?.parsedValue ?? 0) : Number(rawStock || 0);
            if (stock <= 5) {
              count++;
            }
          } else {
            variants.forEach((v: any) => {
              const rawStock = v.stock_quantity ?? 0;
              const stock = typeof rawStock === 'object' ? (rawStock?.parsedValue ?? 0) : Number(rawStock || 0);
              const threshold = Number(v.low_stock_threshold ?? 5);
              if (stock <= threshold) {
                count++;
              }
            });
          }
        });
        setLowStockCount(count);
      })
      .catch((err) => {
        console.error('Failed to load low stock count for sidebar:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [tenant?.id, fetchUnreadCount, location.pathname]);

  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      show: !isCashier,
      items: [{ name: 'Overview', to: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'POS',
      icon: MonitorSmartphone,
      show: modules.pos,
      hasDividerAfter: true,
      items: [
        { name: 'Register', to: '/pos/register', icon: MonitorSmartphone, moduleKey: 'pos' },
        { name: 'Transactions', to: '/pos/transactions', icon: History, moduleKey: 'pos' },
        { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: BookOpen, moduleKey: 'credit_ledger' },
        { name: 'Returns', to: '/pos/returns', icon: ArrowLeftRight, moduleKey: 'returns' },
      ],
    },

    {
      title: 'Inventory',
      icon: Package,
      show: !isCashier && (modules.inventory || hasGraceModule('inventory_basic')),
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      items: [
        { name: 'Products', to: '/inventory/products', icon: Package, moduleKey: 'inventory' },
        { name: 'Stock Adjustments', to: '/inventory/adjustments', icon: ClipboardList, moduleKey: 'adjustments' },
        { name: 'Stock Levels', to: '/inventory/stock', icon: Layers, badge: lowStockCount > 0 ? lowStockCount : undefined },
        { name: 'Reconcile Stock', to: '/inventory/stock-reconciliation', icon: ClipboardCheck, moduleKey: 'stock_reconciliation' },
        { name: 'Suppliers', to: '/inventory/suppliers', icon: Truck, moduleKey: 'suppliers' },
        { name: 'Purchase Orders', to: '/inventory/purchase-orders', icon: FileBadge, moduleKey: 'purchase_orders' },
      ],
    },

    {
      title: 'Expenses',
      icon: Receipt,
      show: !isCashier && (modules.expenses || hasGraceModule('expenses')),
      items: [{ name: 'Expenses', to: '/expenses', icon: Receipt, moduleKey: 'expenses' }],
    },
    {
      title: 'Ecommerce',
      icon: ShoppingBag,
      show: !isCashier && (modules.ecommerce || hasGraceModule('ecommerce')),
      badge: 2,
      hasDividerAfter: true,
      items: [
        { name: 'Online Orders', to: '/ecommerce/orders', icon: ShoppingBag, badge: 2, moduleKey: 'ecommerce' },
        { name: 'Customers', to: '/ecommerce/customers', icon: Users, moduleKey: 'ecommerce' },
        { name: 'Storefront', to: '/ecommerce/storefront', icon: Globe, moduleKey: 'ecommerce' },
        { name: 'Discounts', to: '/ecommerce/discounts', icon: Tag, moduleKey: 'ecommerce' },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      show: true,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      items: [{ name: 'Activity Log', to: '/notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined }],
    },
    {
      title: 'Staff',
      icon: Users,
      show: !isCashier && (modules.staff || hasGraceModule('staff')),
      items: [
        { name: 'Staff Management', to: '/staff', icon: Users, moduleKey: 'staff' },
        { name: 'Payroll & Salaries', to: '/staff/payroll', icon: Banknote, moduleKey: 'staff' }
      ],
    },
    {
      title: 'Reports',
      icon: TrendingUp,
      show: !isCashier && (modules.reports || hasGraceModule('reports_basic')),
      hasDividerAfter: true,
      items: [
        { name: 'Sales', to: '/reports/sales', icon: TrendingUp },
        { name: 'Products', to: '/reports/products', icon: Tag, moduleKey: 'reports_advanced' },
        { name: 'Cashiers', to: '/reports/cashiers', icon: UserSquare2, moduleKey: 'reports_advanced' },
        { name: 'End of Day', to: '/reports/end-of-day', icon: CalendarCheck, moduleKey: 'reports_advanced' },
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      show: !isCashier,
      items: [
        { name: 'Account Settings', to: '/settings/account', icon: User },
        { name: 'Business Profile', to: '/settings/profile', icon: Settings },
        { name: 'POS Settings', to: '/settings/pos', icon: Sliders },
        { name: 'Plan & Billing', to: '/settings/plan', icon: CreditCard },
      ],
    },
  ];

  const allNavPaths = useMemo(() => {
    return navSections.flatMap((s) => s.items.map((i) => i.to));
  }, []);

  const isRouteActive = (to: string) => {
    if (location.pathname === to) return true;
    if (to === '/dashboard') return false;
    if (location.pathname.startsWith(to + '/')) {
      const hasMoreSpecificMatch = allNavPaths.some(
        (otherTo) =>
          otherTo !== to &&
          otherTo.startsWith(to + '/') &&
          (location.pathname === otherTo || location.pathname.startsWith(otherTo + '/'))
      );
      return !hasMoreSpecificMatch;
    }
    return false;
  };

  // Accordion open/close state for sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navSections.forEach((section) => {
      const isChildActive = section.items.some((item) => isRouteActive(item.to));
      initialState[section.title] = isChildActive || section.title === 'POS' || section.title === 'Inventory';
    });
    return initialState;
  });

  // Automatically expand section when route changes to an item inside it
  useEffect(() => {
    navSections.forEach((section) => {
      const isChildActive = section.items.some((item) => isRouteActive(item.to));
      if (isChildActive) {
        setOpenSections((prev) => ({ ...prev, [section.title]: true }));
      }
    });
  }, [location.pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={clsx(
        "h-full bg-[#121316] dark:bg-sidebar text-white flex-col transition-all duration-300 relative hidden md:flex select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Slim top loading bar during transitions */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 h-[2px] bg-primary rounded-full transition-opacity duration-300 z-50",
          isPending ? "opacity-100" : "opacity-0"
        )}
        style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
      />

      {/* --- Top Header / Company Card --- */}
      <div className="p-3">
        {!isCollapsed ? (
          <div className="bg-white/[3%] border border-[#1a1b1e] rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[0.6rem] bg-primary text-zinc-950 font-black text-base flex items-center justify-center shadow-md shrink-0 overflow-hidden p1">
                {!logoError ? (
                  <img
                    src={koreLogo}
                    alt="Kore Logo"
                    onError={() => setLogoError(true)}
                    className="h-full w-full object-contain rounded-md"
                  />
                ) : (
                  tenantName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold font-header capitalize text-white truncate tracking-tight">
                  {tenantName}
                </span>
                <span className="text-[11px] font-medium text-zinc-400 capitalize truncate">
                  {plan?.replace('_', ' ') || 'Company'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsCollapsed(false)}
            title="Expand sidebar"
            className="h-10 w-10 mx-auto rounded-xl bg-primary text-zinc-950 font-black text-lg flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform mt-3 overflow-hidden p1.5"
          >
            {!logoError ? (
              <img
                src={koreLogo}
                alt="Kore Logo"
                onError={() => setLogoError(true)}
                className="h-full w-full object-contain rounded-sm"
              />
            ) : (
              tenantName.charAt(0).toUpperCase()
            )}
          </div>
        )}
      </div>

      {/* --- Navigation List --- */}
      <nav className={clsx("flex-1 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-hide flex flex-col", isCashier && "justify-center")}>
        {navSections.map((section) => {
          if (!section.show) return null;

          // Filter section items: hide un-owned modules unless tenant is in a Grace Period
          const visibleItems = section.items.filter((item) => {
            if (!item.moduleKey) return true;
            const isUnlocked = hasModule(item.moduleKey);
            if (item.moduleKey === 'credit_ledger') {
              const ledgerEnabled = posSettings?.pos_credit_ledger_enabled ?? true;
              return (isUnlocked && ledgerEnabled) || inGracePeriod;
            }
            return isUnlocked || inGracePeriod;
          });

          if (visibleItems.length === 0) return null;

          const hasMultipleItems = visibleItems.length > 1;
          const isSectionActive = visibleItems.some((item) => isRouteActive(item.to));
          const isOpen = openSections[section.title];
          const SectionIcon = section.icon;

          if (isCollapsed) {
            // --- Collapsed State ---
            return (
              <div key={section.title} className="flex flex-col items-center gap-1.5 py-1">
                {visibleItems.map((item) => {
                  const isActive = isRouteActive(item.to);
                  const isLocked = item.moduleKey ? !hasModule(item.moduleKey) : false;
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => startTransition(() => navigate(item.to))}
                      title={item.name}
                      className={clsx(
                        "relative min-h-10 min-w-10 p-3 rounded-xl flex items-center justify-center transition-all",
                        isActive
                          ? "bg-primary text-zinc-950 shadow-md font-bold"
                          : isLocked
                          ? "text-zinc-600 hover:text-zinc-400"
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ItemIcon className="h-[22px] w-[22px]" />
                      {isLocked ? (
                        <Lock className="absolute -top-1 -right-1 h-3.5 w-3.5 text-zinc-500 bg-zinc-900 rounded-full p-0.5" />
                      ) : item.badge ? (
                        <span className="absolute -top-1 -right-1 bg-primary text-zinc-950 font-black text-[9px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-[#121316]">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          }

          // --- Expanded State ---
          return (
            <div key={section.title} className="space-y-1">
              {hasMultipleItems ? (
                // Grouped Accordion Section (like POS, Inventory, Ecommerce, Reports, Settings)
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSections((prev) => ({ ...prev, [section.title]: true }));
                      if (visibleItems[0]?.to) {
                        startTransition(() => navigate(visibleItems[0].to));
                      }
                    }}
                    className={clsx(
                      "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors group cursor-pointer",
                      isSectionActive ? "text-primary font-bold bg-white/5" : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <SectionIcon className={clsx("h-5 w-5 shrink-0 transition-colors", isSectionActive ? "text-primary" : "text-zinc-400 group-hover:text-white")} />
                      <span className="text-[13px] font-bold capitalize">{section.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {section.badge && (
                        <span className="bg-primary/20 text-primary font-bold text-[10px] px-1.5 py-0.5 rounded-md">
                          {section.badge}
                        </span>
                      )}
                      <div
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.title);
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 group-hover:text-white transition-colors"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="ml-4 pl-3 border-l border-zinc-800 space-y-1 my-1">
                      {visibleItems.map((item) => {
                        const isActive = isRouteActive(item.to);
                        const isLocked = item.moduleKey ? !hasModule(item.moduleKey) : false;
                        return (
                          <button
                            key={item.name}
                            onClick={() => startTransition(() => navigate(item.to))}
                            className={clsx(
                              "relative flex items-center justify-between w-full px-3 py-2 rounded-md text-[12px] tracking-wide font-medium transition-all group",
                              isActive
                                ? "text-white font-bold shadow-sm before:absolute before:-left-[13px] before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-4 before:bg-primary before:rounded-2xl"
                                : isLocked
                                ? "text-zinc-600 hover:text-zinc-400"
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            <span className="truncate">{item.name}</span>
                            {isLocked ? (
                              <Lock className="h-3 w-3 text-zinc-600 shrink-0" />
                            ) : item.badge ? (
                              <span className="bg-primary text-zinc-950 font-black text-[9px] px-[5px] py-[1px] rounded">
                                {item.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                // Single Item Section (like Dashboard -> Overview, Expenses, Notifications, Staff)
                (() => {
                  const singleItem = visibleItems[0];
                  if (!singleItem) return null;
                  const isActive = isRouteActive(singleItem.to);
                  const isLocked = singleItem.moduleKey ? !hasModule(singleItem.moduleKey) : false;
                  const SingleIcon = singleItem.icon;

                  return (
                    <button
                      type="button"
                      onClick={() => startTransition(() => navigate(singleItem.to))}
                      className={clsx(
                        "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs lg:text-sm font-bold capitalize tracking-wider transition-all",
                        isActive
                          ? "bg-primary text-zinc-950 font-black shadow-md"
                          : isLocked
                          ? "text-zinc-600 hover:text-zinc-400"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <SingleIcon className={clsx("h-5 w-5 shrink-0", isActive ? "text-zinc-950" : isLocked ? "text-zinc-600" : "text-zinc-400")} />
                        <span className="truncate">{section.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <Lock className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        ) : section.badge ? (
                          <span className={clsx(
                            "font-black text-[10px] px-1.5 py-0.5 rounded-md",
                            isActive ? "bg-zinc-950 text-primary" : "bg-primary text-zinc-950"
                          )}>
                            {section.badge}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })()
              )}
            </div>
          );
        })}
      </nav>
      {/* Grace Period Warning Banner */}
      {!isCollapsed && <PlanGraceBanner />}

      {/* --- Bottom User Profile Card --- */}
      <div className="p-3 mt-auto">
        {!isCollapsed ? (
          <div className="bg-white/[4%] border border-[#1a1b1e] hover:border-white/10 rounded-xl p-2.5 flex items-center justify-between shadow-sm transition-all">
            <div
              onClick={() => startTransition(() => navigate('/settings/account'))}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
              title="View Account Settings"
            >
              <div className="h-9 w-9 rounded-lg bg-zinc-800 text-white font-bold text-xs flex items-center justify-center border border-white/10 shrink-0 group-hover:border-primary/50 transition-colors">
                {getUserInitials(userName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate max-w-[110px] group-hover:text-primary transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] font-medium text-zinc-400 capitalize truncate">
                  {userRole}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              title="Logout"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startTransition(() => navigate('/settings/account'))}
            title="Account Settings"
            className="h-10 w-10 mx-auto rounded-2xl bg-[#1a1b1e] border border-white/5 text-zinc-400 hover:text-primary flex items-center justify-center transition-colors"
          >
            <User className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
