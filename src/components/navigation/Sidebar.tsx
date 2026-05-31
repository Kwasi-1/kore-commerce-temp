import { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  Users,
  BarChart3,
  TrendingUp,
  Tag,
  UserSquare2,
  CalendarCheck,
  Settings,
  Menu,
  ChevronRight,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '@/store/themeStore';

export default function Sidebar() {
  const tenant = useAuthStore((state) => state.tenant);
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const isDark = useThemeStore((state) => state.isDark);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navSections = [
    {
      title: 'Dashboard',
      show: true,
      items: [{ name: 'Overview', to: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'POS',
      show: modules.pos,
      items: [
        { name: 'Register', to: '/pos/register', icon: MonitorSmartphone },
        { name: 'Transactions', to: '/pos/transactions', icon: History },
        { name: 'Shifts', to: '/pos/shifts', icon: Clock },
      ],
    },
    {
      title: 'Inventory',
      show: modules.inventory,
      items: [
        { name: 'Products', to: '/inventory/products', icon: Package },
        { name: 'Stock Levels', to: '/inventory/stock', icon: Layers },
        { name: 'Reconcile Stock', to: '/inventory/stock-reconciliation', icon: Layers },
        { name: 'Suppliers', to: '/inventory/suppliers', icon: Truck },
        { name: 'Purchase Orders', to: '/inventory/purchase-orders', icon: FileBadge },
      ],
    },
    {
      title: 'Expenses',
      show: modules.expenses,
      items: [{ name: 'Expenses', to: '/expenses', icon: Receipt }],
    },
    {
      title: 'Staff',
      show: modules.staff,
      items: [{ name: 'Staff', to: '/staff', icon: Users }],
    },
    {
      title: 'Reports',
      show: modules.reports,
      items: [
        { name: 'Sales', to: '/reports/sales', icon: TrendingUp },
        { name: 'Products', to: '/reports/products', icon: Tag },
        { name: 'Cashiers', to: '/reports/cashiers', icon: UserSquare2 },
        { name: 'End of Day', to: '/reports/end-of-day', icon: CalendarCheck },
      ],
    },
    {
      title: 'Settings',
      show: modules.settings,
      items: [
        { name: 'Business Profile', to: '/settings/profile', icon: Settings },
        { name: 'Plan & Billing', to: '/settings/plan', icon: Receipt },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "min-h-screen border-r bg-pos-sidebar-light text-white dark:bg-card dark:text-pos-sidebar-light dark:border-border flex flex-col transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={clsx("flex items-center justify-between p-6", isCollapsed && "justify-center px-0")}>
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

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide flex flex-col">
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
                  {section.items.map((item) => (
                    <li key={item.name} className={clsx(isCollapsed && "flex justify-center w-full")}>
                      <NavLink
                        to={item.to}
                        title={item.name}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center rounded-xl transition-colors group',
                            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                            isActive
                              ? 'bg-[#b6ff56] text-[#1a1a1a] shadow-md dark:bg-[#b6ff56] dark:text-[#1a1a1a]'
                              : 'text-gray-300 hover:bg-white/10 hover:text-white  dark:hover:bg-white/5 dark:hover:text-white'
                          )
                        }
                      >
                        <item.icon className="h-[22px] w-[22px] shrink-0" />
                        {!isCollapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
                      </NavLink>
                    </li>
                  ))}
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
