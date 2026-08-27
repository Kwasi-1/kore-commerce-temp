import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, LogOut, Power, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
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
import EndShiftModal from './EndShiftModal';
import CashMovementModal from './CashMovementModal';
import { useShift } from '@/hooks/useShift';
import { useFeaturesStore } from '@/store/featuresStore';
import { useRegisterPreferencesStore } from '@/store/registerPreferencesStore';
import { Switch } from '@/components/ui/switch';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import OfflineQueueDrawer from './OfflineQueueDrawer';
import { useNotificationStore } from '@/store/notificationStore';

interface RegisterHeaderProps {
  onOpenShiftModal?: () => void;
}

export default function RegisterHeader({ onOpenShiftModal }: RegisterHeaderProps) {
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const { currentShift } = useShift();
  const { posSettings } = useFeaturesStore();
  const isShiftRequired = Boolean(posSettings?.pos_shift_management_enabled);
  const { staffUser, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const unreadNotificationsCount = useNotificationStore((s) => s.unreadCount);
  
  const { 
    showProductImages, 
    showStockCount, 
    gridDensity, 
    defaultPriceType, 
    soundEffectsEnabled, 
    showSubPacks,
    quantityFormat,
    setPreference 
  } = useRegisterPreferencesStore();

  const { isOnline, pendingCount, failedCount } = useNetworkStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminOrManager = staffUser?.role === 'admin' || staffUser?.role === 'manager';

  return (
    <header className="flex items-center justify-between pb-6 shrink-0 gap-4">
      <h1 className="text-[26px] font-bold text-foreground tracking-tighter lg:tracking-normal fontheader">Create Transaction</h1>
      
      <div className="flex items-center gap-2 md:gap-4 border md:border-0 px-1 py-1 rounded-full shrink-0">
        <SavedTransactionsHeader />

        {/* Network Status Indicator */}
        {/* Failed badge always shown regardless of online status */}
        {failedCount > 0 && (
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-bold shrink-0 hover:bg-red-500/20 transition-colors cursor-pointer"
            title="View failed offline sales"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{failedCount} Failed</span>
          </button>
        )}
        {!isOnline ? (
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold shrink-0 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="View offline sales queue"
          >
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 ml-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ) : pendingCount > 0 ? (
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold shrink-0 hover:bg-blue-500/20 transition-colors cursor-pointer"
            title="Syncing offline sales…"
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing {pendingCount}</span>
          </button>
        ) : null}

        <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="hidden md:flex relative rounded-full text-muted-foreground hover:text-foreground transition-colors h-8 w-8 md:h-10 md:w-10">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 md:top-2 md:right-2 h-2 w-2 rounded-full bg-red-500"></span>
          )}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex rounded-full text-muted-foreground hover:text-foreground transition-colors h-8 w-8 md:h-10 md:w-10"
              title="Settings & Layout Preferences"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 hover:rotate-45" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[310px] md:w-[320px] p-4 rounded-xl shadow-xl border-border/60 bg-popover/95 backdrop-blur-md z-50">
            <DropdownMenuLabel className="px-1 py-1 font-bold text-foreground text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <span>Register Preferences</span>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Show Product Images */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5 max-w-[200px]">
                <span className="font-semibold text-xs text-foreground">Show Product Images</span>
                <span className="text-[10px] text-muted-foreground">Display product media on cards</span>
              </div>
              <Switch 
                checked={showProductImages} 
                onCheckedChange={(val) => setPreference('showProductImages', val)} 
              />
            </DropdownMenuItem>

            {/* Show Stock Count */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5 max-w-[200px]">
                <span className="font-semibold text-xs text-foreground">Show Stock Badge</span>
                <span className="text-[10px] text-muted-foreground">Display remaining stock levels</span>
              </div>
              <Switch 
                checked={showStockCount} 
                onCheckedChange={(val) => setPreference('showStockCount', val)} 
              />
            </DropdownMenuItem>
            
            {/* Sound Effects */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5 max-w-[200px]">
                <span className="font-semibold text-xs text-foreground">Chime Sound Effects</span>
                <span className="text-[10px] text-muted-foreground">Play tone on cart additions</span>
              </div>
              <Switch 
                checked={soundEffectsEnabled} 
                onCheckedChange={(val) => setPreference('soundEffectsEnabled', val)} 
              />
            </DropdownMenuItem>

            {/* Sub-Pack Presets */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5 max-w-[200px]">
                <span className="font-semibold text-xs text-foreground">Sub-Pack Presets (½, ¼)</span>
                <span className="text-[10px] text-muted-foreground">Show partial pack options in POS</span>
              </div>
              <Switch 
                checked={showSubPacks} 
                onCheckedChange={(val) => setPreference('showSubPacks', val)} 
              />
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Grid Density */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex flex-col items-start gap-2 py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <span className="font-semibold text-xs text-foreground">Grid Density</span>
              <div className="flex w-full bg-secondary p-0.5 rounded-full border border-border/50">
                {(['compact', 'normal', 'large'] as const).map((density) => (
                  <button
                    key={density}
                    onClick={() => setPreference('gridDensity', density)}
                    className={`flex-1 py-1 text-[10px] font-bold capitalize rounded-full transition-all ${
                      gridDensity === density 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </DropdownMenuItem>
            
            {/* Default Price Type */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex flex-col items-start gap-2 py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-xs text-foreground">Default Price Tier</span>
                <span className="text-[10px] text-muted-foreground">Standard pricing type for checkout</span>
              </div>
              <div className="flex w-full bg-secondary p-0.5 rounded-full border border-border/50">
                {(['retail', 'wholesale'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreference('defaultPriceType', mode)}
                    className={`flex-1 py-1 text-[10px] font-bold capitalize rounded-full transition-all ${
                      defaultPriceType === mode 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </DropdownMenuItem>

            {/* Receipt Quantity Format */}
            {/* <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex flex-col items-start gap-2 py-2 px-1 hover:bg-transparent focus:bg-transparent cursor-default">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-xs text-foreground">Receipt Quantity Display</span>
                <span className="text-[10px] text-muted-foreground">Display decimals as fractions (e.g. 1 ¼)</span>
              </div>
              <div className="flex w-full bg-secondary p-0.5 rounded-full border border-border/50">
                {([
                  { key: 'fraction', label: 'Fraction (1 ¼)' },
                  { key: 'decimal', label: 'Decimal (1.25)' }
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPreference('quantityFormat', item.key)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-full transition-all ${
                      quantityFormat === item.key 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* End / Start Shift Button */}
        {/* Cash In / Out (Drawer Movement) Button */}
        {(currentShift || !isShiftRequired) && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCashMovementOpen(true)}
            className="hidden md:flex rounded-full text-muted-foreground hover:text-foreground border-border/80 transition-colors h-8 w-8 md:h-10 md:w-10"
            title="Log Petty Cash / Paid In / Paid Out"
          >
            <Icon icon="solar:wallet-money-bold" className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
          </Button>
        )}

        {isShiftRequired && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (currentShift) {
                setIsEndShiftOpen(true);
              } else if (onOpenShiftModal) {
                onOpenShiftModal();
              }
            }}
            className={`hidden md:flex rounded-full transition-colors ${
              currentShift 
                ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' 
                : 'text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700'
            }`}
            title={currentShift ? "End Shift & Recon" : "Start Shift"}
          >
            {currentShift ? (
              <Power className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <Icon icon="solar:play-circle-bold" className="h-5 w-5" />
            )}
          </Button>
        )}

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
                {staffUser?.name ? staffUser.name.substring(0, 2).toUpperCase() : 'AU'}
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
            {isShiftRequired && (
              <DropdownMenuItem className=" md:hidden cursor-pointer gap-2 py-2.5 font-medium mt-1 rounded-xl" onClick={() => {
                if (currentShift) {
                  setIsEndShiftOpen(true);
                } else if (onOpenShiftModal) {
                  onOpenShiftModal();
                }
              }}>
                <Power className="h-4 w-4" />
                {currentShift ? 'End Shift & Recon' : 'Start Shift'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium rounded-xl" onClick={() => setIsCashMovementOpen(true)}>
              <Icon icon="solar:wallet-money-bold" className="h-4 w-4 text-amber-500" />
              Log Cash In / Out
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium mt-1 rounded-xl" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 font-medium rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EndShiftModal isOpen={isEndShiftOpen} onClose={() => setIsEndShiftOpen(false)} />
      <CashMovementModal isOpen={isCashMovementOpen} onClose={() => setIsCashMovementOpen(false)} />
      <OfflineQueueDrawer isOpen={isQueueDrawerOpen} onClose={() => setIsQueueDrawerOpen(false)} />
    </header>
  );
}
