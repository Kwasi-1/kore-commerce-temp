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
  onClick,
  ...props
}: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[160px] flex-col justify-between rounded-lg bg-card p-6 border shadow-sm text-card-foreground transition-all duration-200",
        onClick && "cursor-pointer hover:border-foreground/50",
        isActive ? "border-foreground bg-secondary/30 ring-1 ring-foreground" : "border-border",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <p className="text-4xl font-semibold text-foreground">
            {value}
          </p>
          {valueTrailing}
        </div>
        {subvalue && <div className="text-sm text-muted-foreground">{subvalue}</div>}
      </div>
    </div>
  );
}

export default DashboardCard;
