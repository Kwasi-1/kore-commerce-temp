import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import { useLayoutStore } from '@/store/layoutStore';

export default function POSLayout() {
  const { isSidebarCollapsed } = useLayoutStore();

  return (
    <div className="flex h-screen w-full transition-colors duration-200 overflow-hidden">
      {/* Dark Wrapper Container */}
      <div className="flex w-full h-full bg-sidebar shadow-2xl overflow-hidden ring-1 ring-black/5">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area Container */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 p-0 md:py-2 md:pr-2 ${isSidebarCollapsed ? 'md:pl-0' : 'md:pl-0'}`}>
          <div className={`flex flex-col flex-1 overflow-hidden bg-background shadow-inner border border-black/5 relative transition-all duration-300 scrollbar-hide pb-16 md:pb-0 ${isSidebarCollapsed ? 'rounded-none md:rounded-[1.5rem]' : 'rounded-none  md:rounded-[1.25rem]'}`}>
            <main className="flex-1 overflow-y-auto scrollbar-hide lg:pl-3">
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
