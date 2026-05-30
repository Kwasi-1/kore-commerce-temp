import React, { useEffect } from 'react';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import CartPanel from '@/components/pos/CartPanel';
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const staffUser = useAuthStore((state) => state.staffUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleExit = () => {
    // Usually, cashiers don't logout entirely, they might just return to Pin login.
    // For now, let's just log them out or navigate to dashboard if they are an admin.
    if (staffUser?.role === 'owner' || staffUser?.role === 'manager') {
      navigate('/dashboard');
    } else {
      logout();
      navigate('/pin');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-pos-surface-app dark:bg-pos-dark-app text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Top Header */}
      <header className="h-16 shrink-0 bg-pos-sidebar-light dark:bg-pos-sidebar-dark text-white dark:text-pos-sidebar-light flex items-center justify-between px-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pos-accent text-pos-accent-text font-bold text-xl leading-none">
            H
          </div>
          <h1 className="text-xl font-bold tracking-tight">HeadlessPOS Register</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium opacity-80">Cashier</span>
            <span className="font-bold text-pos-accent">{staffUser?.name || 'Unknown'}</span>
          </div>
          
          <button 
            onClick={handleExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </button>
        </div>
      </header>

      {/* Main Content: Split View */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        
        {/* Left Panel: Products */}
        <div className="flex-1 min-w-0">
          <ProductSearchBar />
        </div>

        {/* Right Panel: Cart */}
        <div className="w-[400px] shrink-0">
          <CartPanel />
        </div>

      </div>
    </div>
  );
}
