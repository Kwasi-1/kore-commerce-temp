import { useTransition, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getModules } from '@/utils/permissions';
import {
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  History,
  Receipt,
  Users,
  TrendingUp,
  CalendarCheck,
  Tag,
  Truck,
  FileBadge,
  Layers,
  Settings,
  Menu,
  ChevronRight,
  BookOpen,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@nextui-org/react';

export default function BottomNav() {
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === 'cashier';
  const logout = useAuthStore((state) => state.logout);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = (to: string) => {
    setIsDrawerOpen(false);
    startTransition(() => navigate(to));
  };

  // Primary bottom nav links — pick the most important 4 based on role & plan
  const primaryLinks = isCashier
    ? [
        { name: 'Register', to: '/pos/register', icon: MonitorSmartphone },
        { name: 'History', to: '/pos/transactions', icon: History },
        { name: 'Credit Ledger', to: '/pos/credit-ledger', icon: BookOpen },
        { name: 'Returns', to: '/pos/returns', icon: ArrowLeftRight },
      ]
    : [
        { name: 'Overview', to: '/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Register', to: '/pos/register', icon: MonitorSmartphone, show: modules.pos },
        { name: 'Products', to: '/inventory/products', icon: Package, show: modules.inventory },
        { name: 'History', to: '/pos/transactions', icon: History, show: modules.pos },
        { name: 'Expenses', to: '/expenses', icon: Receipt, show: modules.expenses && !modules.pos },
      ].filter(link => link.show).slice(0, 4);

  // Routes already pinned in the bottom nav — exclude these from the drawer
  const pinnedRoutes = new Set(primaryLinks.map(l => l.to));

  // All sections for the drawer — fully dynamic, excluding already-pinned routes
  const drawerSections = isCashier
    ? [
        {
          title: 'Account',
          show: true,
          items: [
            { name: 'Lock Screen', to: '/pos/locked', icon: Settings },
          ].filter(item => !pinnedRoutes.has(item.to)),
        }
      ]
    : [
        {
          title: 'POS',
          show: modules.pos,
          items: [
            { name: 'Register', to: '/pos/register', icon: MonitorSmartphone },
            { name: 'Transactions', to: '/pos/transactions', icon: History },
          ].filter(item => !pinnedRoutes.has(item.to)),
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
          ].filter(item => !pinnedRoutes.has(item.to)),
        },
        {
          title: 'Business',
          show: modules.expenses || modules.staff,
          items: [
            { name: 'Expenses', to: '/expenses', icon: Receipt, show: modules.expenses },
            { name: 'Staff', to: '/staff', icon: Users, show: modules.staff },
          ].filter(i => i.show !== false && !pinnedRoutes.has(i.to)),
        },
        {
          title: 'Reports',
          show: modules.reports,
          items: [
            { name: 'Sales', to: '/reports/sales', icon: TrendingUp },
            { name: 'Products', to: '/reports/products', icon: Tag },
            { name: 'Cashiers', to: '/reports/cashiers', icon: Users },
            { name: 'End of Day', to: '/reports/end-of-day', icon: CalendarCheck },
          ].filter(item => !pinnedRoutes.has(item.to)),
        },
        {
          title: 'Settings',
          show: modules.settings,
          items: [
            { name: 'Business Profile', to: '/settings/profile', icon: Settings },
            { name: 'Plan & Billing', to: '/settings/plan', icon: Receipt },
          ].filter(item => !pinnedRoutes.has(item.to)),
        },
      ].filter(section => section.show && section.items.length > 0);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 dark:bg-sidebar/90 backdrop-blur-md border-t border-border dark:border-white/10 flex items-center justify-around px-2 z-50 shadow[0_-4px_12px_rgba(0,0,0,0.05)]">
        
        {/* Slim top loading bar during transitions */}
        <div
          className={clsx(
            "absolute top-0 left-0 right-0 h-[2px] bg-primary transition-opacity duration-300",
            isPending ? "opacity-100" : "opacity-0"
          )}
          style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
        />

        {primaryLinks.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.to)}
              className="flex flex-col items-center justify-center w-full h-full relative transition-colors"
            >
              {/* Active top indicator bar */}
              <span
                className={clsx(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-300",
                  isActive ? "w-8 bg-primary" : "w-0 bg-transparent"
                )}
              />
              {/* Icon + label wrapper with optional bg */}
              <span
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </span>
            </button>
          );
        })}

        {/* Menu Button to open Drawer */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full relative transition-colors"
        >
          <span
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
              isDrawerOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-muted"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Menu</span>
          </span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} placement="bottom" classNames={{ base: 'bg-card dark:bg-sidebar text-foreground dark:text-white' }}>
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex justify-between items-center border-b border-border dark:border-white/10 pb-3">
                <span className="font-bold text-lg text-foreground">Menu</span>
              </DrawerHeader>
              <DrawerBody className="py-4 overflow-y-auto scrollbar-hide max-h-[75vh]">
                <div className="flex flex-col gap-6">
                  {drawerSections.map((section) => (
                    <div key={section.title}>
                      <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest mb-2 block">
                        {section.title}
                      </span>
                      <div className="flex flex-col gap-1">
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                          return (
                            <button
                              key={item.name}
                              onClick={() => handleNavigation(item.to)}
                              className={clsx(
                                "flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                <span>{item.name}</span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Clean, premium divider and Logout action button in the Drawer */}
                  <div className="border-t border-border dark:border-white/10 pt-4 mt-2">
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        logout();
                        window.location.href = '/login';
                      }}
                      className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    </button>
                  </div>
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
