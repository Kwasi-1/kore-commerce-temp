import { useState, useEffect, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { useAuthStore } from '@/store/authStore';
import { getModules } from '@/utils/permissions';
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
  Store,
  ChevronsLeft,
  ChevronsRight,
  Sliders,
  CreditCard
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

export default function Sidebar() {
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === 'cashier';
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const { isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useLayoutStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();

  const rawTenantName = tenant?.name || tenant?.business_name || 'HeadlessPOS';
  const tenantName = decodeHtml(rawTenantName);
  const userName = staffUser?.name || `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() || 'Store User';
  const userRole = staffUser?.role || 'Staff';

  const navSections = [
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
      items: [
        { name: 'Register', to: '/pos/register', icon: MonitorSmartphone },
        { name: 'Transactions', to: '/pos/transactions', icon: History },
        { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: BookOpen },
        { name: 'Returns', to: '/pos/returns', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Inventory',
      icon: Package,
      show: !isCashier && modules.inventory,
      items: [
        { name: 'Products', to: '/inventory/products', icon: Package },
        { name: 'Stock Adjustments', to: '/inventory/adjustments', icon: ClipboardList },
        { name: 'Stock Levels', to: '/inventory/stock', icon: Layers },
        { name: 'Reconcile Stock', to: '/inventory/stock-reconciliation', icon: Layers },
        { name: 'Suppliers', to: '/inventory/suppliers', icon: Truck },
        { name: 'Purchase Orders', to: '/inventory/purchase-orders', icon: FileBadge },
      ],
    },
    {
      title: 'Expenses',
      icon: Receipt,
      show: !isCashier && modules.expenses,
      items: [{ name: 'Expenses', to: '/expenses', icon: Receipt }],
    },
    {
      title: 'Ecommerce',
      icon: ShoppingBag,
      show: !isCashier && modules.ecommerce,
      items: [
        { name: 'Online Orders', to: '/ecommerce/orders', icon: ShoppingBag },
        { name: 'Customers', to: '/ecommerce/customers', icon: Users },
        { name: 'Storefront', to: '/ecommerce/storefront', icon: Globe },
        { name: 'Discounts', to: '/ecommerce/discounts', icon: Tag },
      ],
    },
    {
      title: 'Staff',
      icon: Users,
      show: !isCashier && modules.staff,
      items: [{ name: 'Staff', to: '/staff', icon: Users }],
    },
    {
      title: 'Reports',
      icon: TrendingUp,
      show: !isCashier && modules.reports,
      items: [
        { name: 'Sales', to: '/reports/sales', icon: TrendingUp },
        { name: 'Products', to: '/reports/products', icon: Tag },
        { name: 'Cashiers', to: '/reports/cashiers', icon: UserSquare2 },
        { name: 'End of Day', to: '/reports/end-of-day', icon: CalendarCheck },
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      show: !isCashier && modules.settings,
      items: [
        { name: 'Business Profile', to: '/settings/profile', icon: Settings },
        { name: 'POS Settings', to: '/settings/pos', icon: Sliders },
        { name: 'Plan & Billing', to: '/settings/plan', icon: CreditCard },
      ],
    },
  ];

  // Accordion open/close state for sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navSections.forEach((section) => {
      const isChildActive = section.items.some((item) => location.pathname.startsWith(item.to));
      initialState[section.title] = isChildActive || section.title === 'POS' || section.title === 'Inventory';
    });
    return initialState;
  });

  // Automatically expand section when route changes to an item inside it
  useEffect(() => {
    navSections.forEach((section) => {
      const isChildActive = section.items.some((item) => location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to)));
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
        "h-full bg-[#121316] text-white flex-col transition-all duration-300 relative hidden md:flex select-none",
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
          <div className="bg-[#1a1b1e] border border-[#1a1b1e] rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[0.6rem] bg-primary text-zinc-950 font-black text-base flex items-center justify-center shadow-md shrink-0">
                {tenantName.charAt(0).toUpperCase()}
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
            className="h-10 w-10 mx-auto rounded-xl bg-primary text-zinc-950 font-black text-lg flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform mt-4"
          >
            {tenantName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* --- Navigation List --- */}
      <nav className={clsx("flex-1 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-hide flex flex-col", isCashier && "justify-center")}>
        {navSections.map((section) => {
          if (!section.show) return null;

          const hasMultipleItems = section.items.length > 1;
          const isSectionActive = section.items.some(
            (item) => location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to))
          );
          const isOpen = openSections[section.title];
          const SectionIcon = section.icon;

          if (isCollapsed) {
            // --- Collapsed State ---
            return (
              <div key={section.title} className="flex flex-col items-center gap-1.5 py-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => startTransition(() => navigate(item.to))}
                      title={item.name}
                      className={clsx(
                        "min-h-10 min-w-10 p-3 rounded-xl flex items-center justify-center transition-all",
                        isActive
                          ? "bg-primary text-zinc-950 shadow-md font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ItemIcon className="h-[22px] w-[22px]" />
                    </button>
                  );
                })}
              </div>
            );
          }

          // --- Expanded State ---
          if (hasMultipleItems) {
            // Grouped Accordion Section (like POS, Inventory, Ecommerce, Reports, Settings)
            return (
              <div key={section.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenSections((prev) => ({ ...prev, [section.title]: true }));
                    if (section.items[0]?.to) {
                      startTransition(() => navigate(section.items[0].to));
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
                </button>

                {isOpen && (
                  <div className="ml-4 pl-3 border-l border-zinc-800 space-y-1 my-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                      return (
                        <button
                          key={item.name}
                          onClick={() => startTransition(() => navigate(item.to))}
                          className={clsx(
                            "relative flex items-center w-full px-3 py-2 rounded-md text-[12px] tracking-wide font-medium transition-all group",
                            isActive
                              ? "text-white font-bold shadow-sm before:absolute before:-left-[13px] before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-4 before:bg-primary before:rounded-2xl"
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          <span className="truncate">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single Item Section (like Dashboard -> Overview, Expenses, Staff)
          const singleItem = section.items[0];
          const isActive = location.pathname === singleItem.to || (singleItem.to !== '/dashboard' && location.pathname.startsWith(singleItem.to));
          const SingleIcon = singleItem.icon;

          return (
            <div key={section.title} className="space-y-1">
              <button
                type="button"
                onClick={() => startTransition(() => navigate(singleItem.to))}
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs lg:text-sm font-bold capitalize tracking-wider transition-all",
                  isActive
                    ? "bg-primary text-zinc-950 font-black shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <SingleIcon className={clsx("h-5 w-5 shrink-0", isActive ? "text-zinc-950" : "text-zinc-400")} />
                <span className="truncate">{section.title}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* --- Bottom User Profile Card --- */}
      <div className="p-3 mt-auto">
        {!isCollapsed ? (
          <div className="bg-[#1a1b1e] border border-[#1a1b1e] rounded-xl p-2.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-zinc-800 text-white font-bold text-xs flex items-center justify-center border border-white/10 shrink-0">
                {getUserInitials(userName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate max-w-[110px]">
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
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            title="Logout"
            className="h-10 w-10 mx-auto rounded-2xl bg-[#1a1b1e] border border-white/5 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
