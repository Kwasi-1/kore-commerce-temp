import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';

export default function POSLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-pos-surface-app dark:bg-pos-dark-app text-foreground transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
