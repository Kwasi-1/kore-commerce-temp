import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import { Icon } from '@iconify/react';
import { Spinner } from '@/components/ui/spinner';

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
  secondary?: boolean;

  // Global Infinite Scroll Support
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
  currentCount?: number;
  endMessage?: string;
}

export const MobileActivitySheet: React.FC<MobileActivitySheetProps> = ({
  title = "Recent Activity",
  viewAllLabel = "View all",
  onViewAll,
  tabs,
  activeTab,
  onTabChange,
  secondary,
  children,
  className,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  totalCount,
  currentCount,
  endMessage,
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "120px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Show end message only when infinite scroll is active, there's no more data, and items exist
  const showEndMessage = Boolean(
    onLoadMore &&
    !hasMore &&
    !isLoadingMore &&
    ((typeof currentCount === 'number' && currentCount > 0) || (typeof totalCount === 'number' && totalCount > 0))
  );

  const displayEndMessage = endMessage || (
    typeof totalCount === 'number'
      ? `All ${totalCount} items loaded`
      : 'All items loaded'
  );

  return (
    <div
      className={cn(
        "sticky top-[50px] z-20 flex flex-col h-[calc(100dvh-125px)] bg-background rounded-t-2xl p-4 space-y-3 custom-header overflow-hidden",
        secondary && " mx-1",
        className
      )}
    >
      {/* 1. Static Sheet Header (Title + Filter Tabs) */}
      {(title || onViewAll || (tabs && tabs.length > 0)) && (
        <div className="shrink-0 space-y-3 pb-1">
          {(title || onViewAll) && (
            <div className="flex items-center justify-between">
              {title && <h3 className="text-sm font-bold text-foreground !tracking-tighter">{title}</h3>}
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

      {/* 2. Internal Scrollable List with Smooth Top & Bottom Fade Mask */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50 pt-2 pr-1 scrollbar-hide min-h-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_20px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_20px,black_calc(100%-20px),transparent_100%)]">
        {children}

        {/* 3. Global Infinite Scroll Sentinel & Status Indicator */}
        {onLoadMore && (
          <div ref={sentinelRef} className="py-3 text-center !border-0">
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <Spinner className="h-4 w-4" />
                <span>Loading more...</span>
              </div>
            )}
            {showEndMessage && (
              <div className="text-[11px] text-muted-foreground font-medium py-2">
                {displayEndMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileActivitySheet;

