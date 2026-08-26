import React from 'react';
import { cn } from '@/lib/utils';

export interface MobileMetricPillProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconColorClass?: string;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export const MobileMetricPill: React.FC<MobileMetricPillProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColorClass = 'bg-primary/10 text-primary',
  className,
  onClick,
  isLoading = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "min-w-[130px] min-h-[95px] w-max shrink-0 bg-muted/40 border border-muted/40 rounded-xl p-3 text-left transition-all flex flex-col justify-between",
        onClick && "cursor-pointer active:scale-98 hover:bg-muted/60",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap tracking-wider">{title}</span>
        {icon && (
          <div className={cn("p-1 rounded-md shrink-0", iconColorClass)}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-auto pt-2">
        <div className="text-base font-extrabold text-foreground whitespace-nowrap capitalize leading-tight">
          {isLoading ? '...' : value}
        </div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default MobileMetricPill;
