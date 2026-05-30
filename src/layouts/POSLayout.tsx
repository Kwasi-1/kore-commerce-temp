import { Outlet } from 'react-router-dom';

export default function POSLayout() {
  return (
    <div className="min-h-screen bg-pos-surface-app dark:bg-pos-dark-app">
      <Outlet />
    </div>
  );
}
