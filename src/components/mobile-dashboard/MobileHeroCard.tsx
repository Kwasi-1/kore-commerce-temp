import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface MobileHeroCardProps {
  title: string;
  badge?: React.ReactNode;
  value: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const MobileHeroCard: React.FC<MobileHeroCardProps> = ({
  title,
  badge,
  value,
  subtitle,
  isLoading = false,
  children,
  className,
}) => {
  return (
    <div className={cn("bg-background rounded-b-2xl p-5 shadow-sm text-center relative overflow-hidden space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {badge && (
          typeof badge === 'string' ? (
            <span className="text-[11px] font-bold bg-primary/20 text-primary-foreground px-2.5 py-0.5 rounded-full capitalize">
              {badge}
            </span>
          ) : (
            badge
          )
        )}
      </div>

      <div className="py-2">
        <h2 className="text-3xl font-extrabold font-header text-foreground tracking-tight">
          {isLoading ? <Spinner className="mx-auto my-1" /> : value}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 pt-2 -mx-1 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default MobileHeroCard;
