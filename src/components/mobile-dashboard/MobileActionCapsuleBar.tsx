import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { 
  DateFilterValue, 
  CustomOnlyDateFilterComponent 
} from '@/components/shared/custom-only-date-filter';

export interface MobileActionItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  customRender?: React.ReactNode;
}

export interface MobileActionCapsuleSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface MobileActionCapsuleDateFilterConfig {
  value: DateFilterValue;
  onChange: (val: DateFilterValue) => void;
  showLabelOnMobile?: boolean;
  className?: string;
  excludeShortcuts?: string[];
}

export interface MobileActionCapsuleBarProps {
  actions?: MobileActionItem[];
  searchConfig?: MobileActionCapsuleSearchConfig;
  dateFilterConfig?: MobileActionCapsuleDateFilterConfig;
  children?: React.ReactNode;
  className?: string;
}

export const MobileActionCapsuleBar: React.FC<MobileActionCapsuleBarProps> = ({
  actions = [],
  searchConfig,
  dateFilterConfig,
  children,
  className,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(Boolean(searchConfig?.value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchConfig?.value) {
      setIsSearchActive(true);
    }
  }, [searchConfig?.value]);

  const handleOpenSearch = () => {
    setIsSearchActive(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCloseSearch = () => {
    if (searchConfig) {
      searchConfig.onChange('');
    }
    setIsSearchActive(false);
  };

  return (
    <div className={cn("bg-action-bridge text-white py-3 px-3 min-h-[58px] flex items-center justify-around shadow-xl gap-1.5 transition-all duration-300 relative overflow-x-auto scrollbar-hide", className)}>
      {searchConfig && isSearchActive ? (
        <div className="w-full flex items-center gap-2 px-1 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchConfig.value}
              onChange={(e) => searchConfig.onChange(e.target.value)}
              placeholder={searchConfig.placeholder || "Search..."}
              className="w-full h-9 pl-9 pr-8 rounded-full bg-white/10 text-white placeholder:text-white/50 text-xs font-medium border border-white/15 outline-none focus:border-primary/80 focus:bg-white/15 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCloseSearch();
                }
              }}
            />
            {searchConfig.value && (
              <button
                type="button"
                onClick={() => searchConfig.onChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCloseSearch}
            className="action-pill-button px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {dateFilterConfig && (
            <CustomOnlyDateFilterComponent
              value={dateFilterConfig.value}
              onChange={dateFilterConfig.onChange}
              showLabelOnMobile={dateFilterConfig.showLabelOnMobile ?? true}
              className={cn(
                "!rounded-full !bg-white/10 hover:!bg-white/15 !border-none !text-white !py-1.5 !px-3.5 !h-8 !text-xs font-bold transition-all actionpill-button shadow-none",
                dateFilterConfig.className
              )}
              excludeShortcuts={dateFilterConfig.excludeShortcuts}
            />
          )}

          {actions.map((action, idx) => {
            if (action.customRender) {
              return <React.Fragment key={action.id || idx}>{action.customRender}</React.Fragment>;
            }

            return (
              <button
                key={action.id || action.label || idx}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "action-pill-button flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all",
                  action.disabled && "opacity-50 pointer-events-none",
                  action.className
                )}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}

          {children}

          {searchConfig && (
            <button
              type="button"
              onClick={handleOpenSearch}
              title="Search"
              className="action-pill-button flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-primary hover:text-white transition-all shrink-0"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default MobileActionCapsuleBar;
