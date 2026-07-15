import { useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { useAuthStore } from '@/store/authStore';
import { getModules } from '@/utils/permissions';
import {
  LayoutDashboard,
  MonitorSmartphone,
  History,
  Clock,
  Package,
  Layers,
  Truck,
  FileBadge,
  Receipt,
  ClipboardList,
  Users,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Tag,
  UserSquare2,
  CalendarCheck,
  Settings,
  Menu,
  ChevronRight,
  ChevronLeft,
  LogOut,
  ShoppingBag,
  Globe,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '@/store/themeStore';

export default function Sidebar() {
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === 'cashier';
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const isDark = useThemeStore((state) => state.isDark);
  const { isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useLayoutStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();

  const navSections = [
    {
      title: 'Dashboard',
      show: !isCashier,
      items: [{ name: 'Overview', to: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'POS',
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
      show: !isCashier && modules.expenses,
      items: [{ name: 'Expenses', to: '/expenses', icon: Receipt }],
    },
    {
      title: 'Ecommerce',
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
      show: !isCashier && modules.staff,
      items: [{ name: 'Staff', to: '/staff', icon: Users }],
    },
    {
      title: 'Reports',
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
      show: !isCashier && modules.settings,
      items: [
        { name: 'Business Profile', to: '/settings/profile', icon: Settings },
        { name: 'POS Settings', to: '/settings/pos', icon: Receipt },
        { name: 'Plan & Billing', to: '/settings/plan', icon: Receipt },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "h-full bg-sidebar text-white flex-col transition-all duration-300 relative hidden md:flex",
        isCollapsed ? "w-20" : "w-60"
      )}
    >
      {/* Slim top loading bar during transitions */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 h-[2px] bg-secondary/60 rounded-full transition-opacity duration-300 z-50",
          isPending ? "opacity-100" : "opacity-0"
        )}
        style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
      />
      <div className={clsx("flex items-center justify-between p-6", isCollapsed && "justify-center px-0 mx-auto")}>
        {!isCollapsed && (
          <h2 className="text-2xl font-bold tracking-tight text-primary truncate">
            {tenant?.name || 'HeadlessPOS'}
          </h2>
        )}
        {isCollapsed && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl leading-none shadow-sm cursor-pointer" onClick={() => setIsCollapsed(false)}>
            {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'H'}
          </div>
        )}
      </div>

      <nav className={clsx("flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide flex flex-col", isCashier && "justify-center")}>
        {navSections.map(
          (section) =>
            section.show && (
              <div key={section.title} className={clsx(isCollapsed && "flex flex-col items-center")}>
                {!isCollapsed && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-2 w-full">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <li key={item.name} className={clsx(isCollapsed && "flex justify-center w-full")}>
                        <button
                          onClick={() => startTransition(() => navigate(item.to))}
                          title={item.name}
                          className={clsx(
                            'flex items-center rounded-xl transition-colors group',
                            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 w-full',
                            isActive
                              ? 'bg-primary text-[#1a1a1a] dark:text-[#1a1a1a]'
                              : 'text-gray-300 hover:bg-white/10 hover:text-white dark:hover:bg-white/5 dark:hover:text-white'
                          )}
                        >
                          <item.icon className="h-[22px] w-[22px] shrink-0" />
                          {!isCollapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
        )}
      </nav>

      <div className="mt-auto p-4 border-t border-white/10 dark:border-border flex flex-col gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "flex items-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-colors",
            isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-[22px] w-[22px]" /> : <ChevronLeft className="h-[22px] w-[22px]" />}
          {!isCollapsed && <span className="font-medium text-sm">Collapse</span>}
        </button>

        <button
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
          className={clsx(
            "flex items-center rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors",
            isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
          )}
          title="Logout"
        >
          <LogOut className="h-[22px] w-[22px]" />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
