import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav, { isBottomNavRoute } from '@/components/navigation/BottomNav';
import { useLayoutStore } from '@/store/layoutStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function DashboardLayout() {
  const { isSidebarCollapsed } = useLayoutStore();
  const { loadFeatures } = useFeaturesStore();
  const location = useLocation();
  const showBottomNav = isBottomNavRoute(location.pathname);

  // Background offline queue drain across all admin/pos pages
  useOfflineSync();

  // Silently refresh features in background on layout mount (SWR pattern).
  // The cached value is used instantly; the fresh fetch updates Zustand + localStorage.
  useEffect(() => {
    loadFeatures();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <div className="flex h-screen w-full transition-colors duration-200 overflow-hidden">
      {/* Dark Wrapper Container */}
      <div className="flex w-full h-full bg-dark-sidebar dark:bg-sidebar shadow-2xl overflow-hidden ring-1 ring-black/5">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area Container */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 p-0 md:py-2 md:pr-2 ${isSidebarCollapsed ? 'md:pl-0' : 'md:pl-0'}`}>
          <div className={`flex flex-col flex-1 overflow-hidden bg-background shadow-inner relative transition-all duration-300 scrollbar-hide ${isSidebarCollapsed ? 'rounded-none  md:rounded-[1.25rem] lg:rounded-[1.15rem]' : 'rounded-none md:rounded-[1.0rem]'}`}>
            <main className={`flex-1 overflow-y-auto px-4 md:px-5 py-2 md:py-0 scrollbar-hide ${showBottomNav ? 'pb-20 md:pb-0' : 'pb-0'}`}>
              <Outlet />
            </main>
          </div>
        </div>

        {/* Mobile Navigation */}
        <BottomNav />

      </div>
    </div>
  );
}
