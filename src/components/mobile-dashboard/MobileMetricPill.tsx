import React from 'react';
import { cn } from '@/lib/utils';

export interface MobileMetricPillProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
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
        "min-w-[130px] flex-1 bg-muted/40 border border-muted/40 rounded-xl p-3 text-left shrink-0 transition-all",
        onClick && "cursor-pointer active:scale-98 hover:bg-muted/60",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">{title}</span>
        {icon && (
          <div className={cn("p-1 rounded-md", iconColorClass)}>
            {icon}
          </div>
        )}
      </div>
      <span className="text-base font-extrabold text-foreground">
        {isLoading ? '...' : value}
      </span>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
};

export default MobileMetricPill;
