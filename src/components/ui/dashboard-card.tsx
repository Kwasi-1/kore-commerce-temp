import * as React from "react";
import { cn } from "@/lib/utils";

export interface DashboardCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  value: React.ReactNode;
  valueTrailing?: React.ReactNode;
  subvalue?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  isActive?: boolean;
  valueStyle?: string;
  onClick?: () => void;
}

export function DashboardCard({
  title,
  subtitle,
  value,
  valueTrailing,
  subvalue,
  action,
  className,
  isActive,
  valueStyle,
  onClick,
  ...props
}: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[100px] flex-col justify-between rounded-xl md:rounded-[14px] bg-card p-4 md:p-5 border shadow-sm text-card-foreground transition-all duration-200",
        onClick && "cursor-pointer hover:border-foreground/50", subvalue ? "md:min-h-[140px]" : "md:min-h-[120px]",
        isActive ? "border-foreground bg-secondary/30 ring-1 ring-foreground/10" : "border-border",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="">
          <p className={`text-[10px] md:text-xs font-medium uppercase tracking-wide md:tracking-wider text-muted-foreground font-header`}>{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <p className={`text-xl md:text-2xl lg:text-2xl xl:text-3xl font-semibold text-ink textforeground ${valueStyle}`}>
            {value}
          </p>
          {valueTrailing}
        </div>
        {subvalue && <div className="text-xs text-muted-foreground">{subvalue}</div>}
      </div>
    </div>
  );
}

export default DashboardCard;
