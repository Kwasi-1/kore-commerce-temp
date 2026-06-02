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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Icon } from '@iconify/react';
import CashierSwitcher from './CashierSwitcher';
import NewCashierModal from './NewCashierModal';
import SavedTransactionsHeader from './SavedTransactionsHeader';

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
    <header className="flex items-center justify-between pb-6 shrink-0 gap-4">
      <h1 className="text-[26px] font-bold text-foreground tracking-tight">Create Transaction</h1>
      
      <div className="flex items-center gap-2 md:gap-4 border md:border-0 px-1 py-1 rounded-full shrink-0">
        <SavedTransactionsHeader />
        <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground transition-colors h-8 w-8 md:h-10 md:w-10">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute top-1 right-1 md:top-2 md:right-2 h-2 w-2  rounded-full bg-red-500"></span>
        </Button>
        
        <Button variant="ghost" size="icon" className="hidden lg:flex rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        
        {/* Cashier Switcher */}
        <div className='hidden md:flex'>
          <CashierSwitcher />
        </div>
        
        {/* New Access Button */}
        {isAdminOrManager && <div className='hidden md:flex'> <NewCashierModal /></div>}

        
        
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 lg:pr-1 ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background rounded-full transition-all duration-300 hover:bg-muted/80">
              <div className="h-10 w-10 rounded-full border-2 border-background bg-[#0D8ABC] overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                {staffUser ? staffUser.name.substring(0, 2).toUpperCase() : 'AU'}
              </div>
              <Icon icon="mdi:chevron-down" className="hidden lg:flex h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[16px] shadow-md border-border/60">
            <DropdownMenuLabel className="flex flex-col py-2 px-3 border-b border-border/80 rounded-lg">
              <span className="font-bold text-foreground text-[14px] leading-tight">{staffUser?.name || 'Admin User'}</span>
              <span className="text-[12px] text-muted-foreground font-medium capitalize">{staffUser?.role || 'admin'}</span>
            </DropdownMenuLabel>
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium mt-1" onClick={toggleTheme}>
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
