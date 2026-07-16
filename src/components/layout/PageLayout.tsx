import React from "react";
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, LogOut, User, ArrowLeft } from 'lucide-react';
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
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title?: React.ReactNode;
  titleClassName?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  filterSlot?: React.ReactNode;
  subtitleStyles?: string;
  className?: string;
  children: React.ReactNode;
  constrainHeight?: boolean;
  showBackButton?: boolean;
  backUrl?: string;
  onBackClick?: () => void;
}

export default function PageLayout({
  title,
  titleClassName,
  subtitle,
  actions,
  filterSlot,
  subtitleStyles,
  className = "",
  children,
  constrainHeight = false,
  showBackButton = false,
  backUrl,
  onBackClick,
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
      className={`w-full min-h-full ${constrainHeight ? "md:h-full md:overflow-hidden" : ""} text-foreground scrollbar-hide flex flex-col py-2 md:p-4 ${className}`}
    >
      {title && (
        <div className="w-full mb-4 flex flex-col gap-3 md:gap-4 shrink-0">
          {/* Row 1: Title & Back Button on left, Profile & Notifications Pill on right */}
          <div className="flex items-center justify-between w-full min-h-[44px] gap-3">
            {/* Left side */}
            <div className="flex items-center gap-2 min-w-0">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (onBackClick) onBackClick();
                    else if (backUrl) navigate(backUrl);
                    else navigate(-1);
                  }}
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full border bg-card shadow-sm hover:bg-muted text-foreground shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className={cn("text-2xl md:text-2xl lg:text-[26px] font-bold text-foreground tracking-tighter font-header truncate", showBackButton ? "text-xl" : "text-2xl", titleClassName)}>
                  {title}
                </h1>
                {/* {subtitle && (
                  <p className={`text-[11px] md:text-sm text-muted-foreground font-medium bloc mt-0.5 hidden ${subtitleStyles}`}>
                    {subtitle}
                  </p>
                )} */}
              </div>
            </div>

            {/* Right side: Actions (Desktop) + Profile Pill */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Inline filter slot (Desktop only) */}
              {filterSlot && <div className="hidden md:block shrink-0">{filterSlot}</div>}

              {/* Inline actions (Desktop only) */}
              {actions && <div className="hidden md:flex items-center gap-3">{actions}</div>}

              {/* Profile Pill container */}
              <div className="flex items-center gap-1.5 md:gap-2 border rounded-full px-1 py-1 shrink-0 bg-card">
                <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground transition-colors h-8 w-8 md:h-10 md:w-10">
                  <Bell className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="absolute top-1 right-1 md:top-2 md:right-2 h-2 w-2 rounded-full bg-red-500"></span>
                </Button>
                
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground transition-colors hidden md:flex h-8 w-8 md:h-10 md:w-10">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 lg:pr-1 ml-1 md:ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background rounded-full transition-all duration-300 hover:bg-muted/80">
                      <div className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-border/80 bg-[#0D8ABC] overflow-hidden flex items-center justify-center text-white font-bold text-xs md:text-sm">
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

          {/* Row 2: filterSlot + actions (Mobile only, hidden on desktop) */}
          {/* {(actions || filterSlot) && (
            <div className="flex md:hidden flex-wrap items-center gap-3 w-full justify-start mt-2">
              {filterSlot && <div className="shrink-0">{filterSlot}</div>}
              {actions && <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>}
            </div>
          )} */}
          {subtitle && (
              <p className={`text-[12px] md:text-sm text-muted-foreground font-medium -mt-4 mb-2 ${subtitleStyles}`}>{subtitle}</p>
            )}
        </div>
      )}


      <div className={`flex-1 ${constrainHeight ? "flex flex-col min-h-0 overflow-y-auto md:overflow-hidden" : ""}`}>{children}</div>
    </div>
  );
}
