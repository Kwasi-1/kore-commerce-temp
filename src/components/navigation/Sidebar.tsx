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
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '@/store/themeStore';

export default function Sidebar() {
  const tenant = useAuthStore((state) => state.tenant);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const isDark = useThemeStore((state) => state.isDark);

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
        { name: 'Stock', to: '/inventory/stock', icon: Layers },
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
    <aside className="w-64 min-h-screen border-r bg-pos-sidebar-light text-white dark:bg-pos-sidebar-dark dark:text-pos-sidebar-light dark:border-pos-dark-border flex flex-col transition-colors duration-200">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight text-pos-accent">
          {tenant?.name || 'HeadlessPOS'}
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-hide">
        {navSections.map(
          (section) =>
            section.show && (
              <div key={section.title}>
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-pos-accent text-pos-accent-text dark:bg-pos-accent dark:text-pos-accent-text'
                              : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-600 dark:hover:bg-black/5 dark:hover:text-black'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
        )}
      </nav>
    </aside>
  );
}
