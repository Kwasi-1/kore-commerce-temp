import React from "react";
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, LogOut, User } from 'lucide-react';
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

interface PageLayoutProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  filterSlot?: React.ReactNode;
  subtitleStyles?: string;
  className?: string;
  children: React.ReactNode;
}

export default function PageLayout({
  title,
  subtitle,
  actions,
  filterSlot,
  subtitleStyles,
  className = "",
  children,
}: PageLayoutProps) {
  const { staffUser, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={`w-full min-h-full bg-background text-foreground overflow-x-hidden scrollbar-hide flex flex-col py-2 md:p-4 ${className}`}
    >
      {title && (
        <div className="w-full mb-4">
        <div className="flex items-center justify-between mb4 shrink-0 gap-2 md:gap-4">
          {/* Left: title + subtitle only */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-2xl md:text-[26px] font-bold text-foreground tracking-tighter font-header">{title}</h1>
            {subtitle && (
              <p className="text-[11px] md:text-xs text-muted-foreground font-medium hidden">{subtitle}</p>
            )}
          </div>

          {/* Right: filter + actions + notifications + profile */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            {/* Inline filter slot (e.g. date picker) */}
            {filterSlot && <div>{filterSlot}</div>}

            {/* Inline actions (e.g. export button) */}
            {actions && <div>{actions}</div>}

            {/* Notifications + profile pill */}
            <div className="flex items-center gap-1.5 md:gap-2 border rounded-full px-1 py-1">
              <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground transition-colors h-8 w-8 md:h-10 md:w-10">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                <span className="absolute top-1 right-1 md:top-2 md:right-2 h-2 w-2 rounded-full bg-red-500"></span>
              </Button>
              
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground transition-colors hidden md:flex h-8 w-8 md:h-10 md:w-10">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 lg:pr-1 ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background rounded-full transition-all duration-300 hover:bg-muted/80">
                  <div className="h-10 w-10 rounded-full border-2 border-background bg-[#0D8ABC] overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                    {staffUser ? staffUser.name.substring(0, 2).toUpperCase() : 'AU'}
                  </div>
                  <Icon icon="mdi:chevron-down" className="h-5 w-5 text-muted-foreground hidden md:flex" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-[16px] shadow-md border-border/60">
                <DropdownMenuLabel className="flex flex-col py-2 px-3">
                  <span className="font-bold text-foreground text-[14px] leading-tight">{staffUser?.name || 'Admin User'}</span>
                  <span className="text-[12px] text-muted-foreground font-medium capitalize">{staffUser?.role || 'admin'}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
          </div>
          </div>
          {subtitle && (
              <p className={`text-[12px] md:text-sm text-muted-foreground font-medium mb-2 ${subtitleStyles}`}>{subtitle}</p>
            )}
        </div>
      )}


      <div className="flex-1">{children}</div>
    </div>
  );
}
