import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';

export default function POSLayout() {
  return (
    <div className="flex h-screen w-full transition-colors duration-200 overflow-hidden">
      {/* Dark Wrapper Container */}
      <div className="flex w-full h-full bg-sidebar shadow-2xl overflow-hidden ring-1 ring-black/5">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area Container */}
        <div className="flex flex-col flex-1 overflow-hidden p-2 pl-0">
          <main className="flex-1 overflow-y-auto bg-background rounded-[1.5rem] shadow-inner border border-black/5 relative">
            <Outlet />
          </main>
        </div>

      </div>
    </div>
  );
}
