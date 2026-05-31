import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CashierSwitcher from './CashierSwitcher';
import NewCashierModal from './NewCashierModal';

export default function RegisterHeader() {
  const { staffUser, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminOrManager = staffUser?.role === 'admin' || staffUser?.role === 'manager';

  return (
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
        
        {/* Cashier Switcher */}
        <CashierSwitcher />
        
        {/* New Access Button */}
        {isAdminOrManager && <NewCashierModal />}
        
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 w-10 rounded-full border-2 border-background bg-gray-200 overflow-hidden ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background transition-all">
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" alt="profile" className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-[16px] shadow-md border-border/60">
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
