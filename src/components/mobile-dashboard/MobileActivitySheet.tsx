import React from 'react';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import { Icon } from '@iconify/react';

export interface MobileTabOption {
  id: string;
  label: string;
  count?: number;
}

export interface MobileActivitySheetProps {
  title?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  tabs?: MobileTabOption[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const MobileActivitySheet: React.FC<MobileActivitySheetProps> = ({
  title = "Recent Activity",
  viewAllLabel = "View all",
  onViewAll,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "sticky top-[50px] z-20 flex flex-col h-[calc(100dvh-125px)] bg-background rounded-t-2xl p-4 space-y-3 custom-header overflow-hidden shadow-lg",
        className
      )}
    >
      {/* 1. Static Sheet Header (Title + Filter Tabs) */}
      {(title || onViewAll || (tabs && tabs.length > 0)) && (
        <div className="shrink-0 space-y-3 pb-1 border-b border-border/30">
          {(title || onViewAll) && (
            <div className="flex items-center justify-between">
              {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
              {onViewAll && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {viewAllLabel}
                  <Icon icon='akar-icons:chevron-right' />
                </button>
              )}
            </div>
          )}

          {tabs && tabs.length > 0 && onTabChange && (
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                      isActive
                        ? "bg-primary text-zinc-950 shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                      tab.count && tab.count > 0 && 'pr-1.5'
                    )}
                  >
                    {tab.label}
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span className="ml-1.5 bg-rose-500 text-white px-1.5 py-[2px] rounded-full text-[9px]">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Internal Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50 pt-1 pr-1 scrollbar-hide min-h-0">
        {children}
      </div>
    </div>
  );
};

export default MobileActivitySheet;
