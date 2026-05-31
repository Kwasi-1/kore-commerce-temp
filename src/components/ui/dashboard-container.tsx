import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dashboardContainerVariants = cva("rounded-lg bg-white", {
  variants: {
    variant: {
      default: "",
      bordered: "border border-border",
      flat: "",
    },
    padding: {
      none: "",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
});

export interface DashboardContainerProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dashboardContainerVariants> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  center?: boolean;
  headerClassName?: string;
  contentClassName?: string;
  loading?: boolean;
}

export function DashboardContainer({
  title,
  subtitle,
  icon,
  trailing,
  center = false,
  children,
  variant,
  padding,
  className,
  headerClassName,
  contentClassName,
  loading = false,
  ...props
}: DashboardContainerProps) {
  const hasHeader = title || subtitle || icon || trailing;
  const shouldCenterHorizontally = center && title && !subtitle && !icon;
  const shouldAlignVertically = icon && title && !subtitle;

  return (
    <div
      className={cn(
        dashboardContainerVariants({ variant, padding }),
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex gap-4 mb-6",
            shouldCenterHorizontally
              ? "items-center justify-center"
              : shouldAlignVertically
                ? "items-center justify-between"
                : "items-start justify-between",
            headerClassName,
          )}
        >
          {shouldCenterHorizontally ? (
            <>
              {title && (
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              )}
            </>
          ) : (
            <>
              <div
                className={cn(
                  "flex gap-3 flex-1",
                  shouldAlignVertically ? "items-center" : "items-start",
                )}
              >
                {icon && (
                  <div
                    className={cn(
                      "flex-shrink-0",
                      !shouldAlignVertically && "mt-0.5",
                    )}
                  >
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="text-lg font-semibold text-foreground">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              </div>
              {trailing && <div className="flex-shrink-0">{trailing}</div>}
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="flex min-h-[120px] items-center justify-center">
          <img
            src="/images/logo-dark.svg"
            alt="Loading"
            className="h-8 w-auto animate-pulse"
          />
        </div>
      )}
      <div className={cn(contentClassName)}>{!loading && children}</div>
    </div>
  );
}

export default DashboardContainer;
