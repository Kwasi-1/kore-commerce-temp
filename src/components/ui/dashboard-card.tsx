import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
  collapsibleContent?: React.ReactNode;
  toggleIcon?: React.ReactNode;
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
  collapsibleContent,
  toggleIcon,
  ...props
}: DashboardCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (collapsibleContent) {
      setIsExpanded(!isExpanded);
    }
    if (onClick) onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "flex h-full min-h-[100px] flex-col justify-between rounded-xl md:rounded-[10px] bg-card p-4 md:p-5 border md:shadow-sm text-card-foreground transition-all duration-300 ease-in-out",
        (onClick || collapsibleContent) && "cursor-pointer hover:border-foreground/50",
        subvalue ? "md:min-h-[140px]" : "md:min-h-[120px]",
        isActive ? "border-foreground/20 bg-secondary/30 hover:md:ring-1 ring-foreground/10" : "border-border",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide md:tracking-wider text-muted-foreground font-header">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action ? (
          <div className="flex-shrink-0">{action}</div>
        ) : collapsibleContent ? (
          <div className="flex-shrink-0 p-1 hover:bg-muted-foreground/10 rounded-full transition-colors">
            {toggleIcon ? toggleIcon : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <div className="flex">
          <p className={`text-[1.3rem] md:text-2xl lg:text-[1.75rem] xl:text-3xl font-semibold text-ink textforeground ${valueStyle}`}>
            {value}
          </p>
          {valueTrailing}
        </div>
        {subvalue && <div className="text-xs text-muted-foreground">{subvalue}</div>}
      </div>

      {collapsibleContent && (
        <div
          onClick={(e) => e.stopPropagation()} // prevent double toggling when clicking content
          className={cn(
            "transition-all duration-500 ease-in-out overflow-hidden origin-top",
            isExpanded ? "max-h-[500px] opacity-100 mt-4 border-t pt-4 border-border/50" : "max-h-0 opacity-0"
          )}
        >
          {collapsibleContent}
        </div>
      )}
    </div>
  );
}

export default DashboardCard;
