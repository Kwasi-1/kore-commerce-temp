import React from 'react';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import CartPanel from '@/components/pos/CartPanel';
import { useAuthStore } from '@/store/authStore';
import { Bell, Settings, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Register() {
  const staffUser = useAuthStore((state) => state.staffUser);

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-hidden">
      
      {/* Top Header */}
      <header className="flex items-center justify-between pb-6 shrink-0">
        <h1 className="text-[26px] font-bold text-foreground tracking-tight">Create Transaction</h1>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </Button>
          
          <div className="flex -space-x-2 mr-2">
            <div className="h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden">
               <img src="https://i.pravatar.cc/150?img=1" alt="staff" className="h-full w-full object-cover" />
            </div>
            <div className="h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden">
               <img src="https://i.pravatar.cc/150?img=2" alt="staff" className="h-full w-full object-cover" />
            </div>
            <div className="h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden">
               <img src="https://i.pravatar.cc/150?img=3" alt="staff" className="h-full w-full object-cover" />
            </div>
          </div>
          
          <Button variant="outline" className="flex items-center gap-2 rounded-full shadow-sm font-medium">
            <UserPlus className="h-4 w-4" />
            New Access
          </Button>
          
          <div className="h-10 w-10 rounded-full border-2 border-background bg-gray-200 overflow-hidden ml-2">
            <img src="https://i.pravatar.cc/150?img=11" alt="profile" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content: Split View */}
      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Left Panel: Products */}
        <div className="flex-1 min-w-0 flex flex-col bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <ProductSearchBar />
        </div>

        {/* Right Panel: Cart */}
        <div className="w-[420px] shrink-0 flex flex-col">
          <CartPanel />
        </div>

      </div>
    </div>
  );
}
