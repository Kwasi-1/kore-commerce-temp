import { useTransition, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getModules } from '@/utils/permissions';
import {
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  History,
  Menu,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@nextui-org/react';

export default function BottomNav() {
  const tenant = useAuthStore((state) => state.tenant);
  const plan = tenant?.plan || 'pos_only';
  const modules = getModules(plan);
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mainLinks = [
    { name: 'Overview', to: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Register', to: '/pos/register', icon: MonitorSmartphone, show: modules.pos },
    { name: 'Products', to: '/inventory/products', icon: Package, show: modules.inventory },
    { name: 'History', to: '/pos/transactions', icon: History, show: modules.pos },
  ].filter(link => link.show);

  // Take up to 4 main links to fit the bottom nav, leave 1 spot for "Menu"
  const visibleLinks = mainLinks.slice(0, 4);

  const handleNavigation = (to: string) => {
    setIsDrawerOpen(false);
    startTransition(() => navigate(to));
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-white/10 flex items-center justify-around px-2 z-50">
        
        {/* Slim top loading bar during transitions */}
        <div
          className={clsx(
            "absolute top-0 left-0 right-0 h-[2px] bg-primary transition-opacity duration-300",
            isPending ? "opacity-100" : "opacity-0"
          )}
          style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
        />

        {visibleLinks.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.to)}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-gray-400 hover:text-white"
              )}
            >
              <item.icon className={clsx("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </button>
          );
        })}

        {/* Menu Button to open Drawer */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} placement="bottom" className="bg-sidebar text-white">
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex justify-between items-center border-b border-white/10">
                <span className="font-bold text-lg">Menu</span>
              </DrawerHeader>
              <DrawerBody className="py-4 gap-4 overflow-y-auto scrollbar-hide max-h-[70vh]">
                <div className="grid grid-cols-2 gap-3">
                  {/* Additional links can be populated here or simply duplicate the Sidebar sections */}
                  <div className="flex flex-col space-y-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Inventory</span>
                    <button onClick={() => handleNavigation('/inventory/stock')} className="text-left text-sm text-gray-300 py-2">Stock Levels</button>
                    <button onClick={() => handleNavigation('/inventory/suppliers')} className="text-left text-sm text-gray-300 py-2">Suppliers</button>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Business</span>
                    <button onClick={() => handleNavigation('/expenses')} className="text-left text-sm text-gray-300 py-2">Expenses</button>
                    <button onClick={() => handleNavigation('/staff')} className="text-left text-sm text-gray-300 py-2">Staff</button>
                  </div>
                  <div className="flex flex-col space-y-2 col-span-2 mt-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Reports</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleNavigation('/reports/sales')} className="text-left text-sm text-gray-300 py-2">Sales</button>
                      <button onClick={() => handleNavigation('/reports/end-of-day')} className="text-left text-sm text-gray-300 py-2">End of Day</button>
                    </div>
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
