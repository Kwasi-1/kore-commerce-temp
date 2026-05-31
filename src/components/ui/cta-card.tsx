import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ctaCardVariants = cva("rounded-lg p-6 transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-white hover:shadow-md",
      primary: "bg-primary text-primary-foreground hover:shadow-lg",
      gradient:
        "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:shadow-lg",
      outlined: "bg-white border border-primary hover:bg-primary/5",
      muted: "bg-gray-50 hover:bg-gray-100",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CTACardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ctaCardVariants> {
  title: string;
  subtitle: string;
  ctaText: string;
  onCTAClick?: () => void;
  icon?: React.ReactNode;
  showArrow?: boolean;
}

export function CTACard({
  className,
  variant,
  title,
  subtitle,
  ctaText,
  onCTAClick,
  icon,
  showArrow = true,
  ...props
}: CTACardProps) {
  const isPrimaryVariant = variant === "primary" || variant === "gradient";

  return (
    <div className={cn(ctaCardVariants({ variant }), className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isPrimaryVariant ? "bg-white/20" : "bg-primary/10",
                )}
              >
                {icon}
              </div>
            )}
            <h3
              className={cn(
                "text-lg font-semibold",
                isPrimaryVariant ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {title}
            </h3>
          </div>
          <p
            className={cn(
              "text-sm",
              isPrimaryVariant
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        </div>
        <Button
          variant={isPrimaryVariant ? "secondary" : "default"}
          size="default"
          onClick={onCTAClick}
          className="flex-shrink-0"
        >
          {ctaText}
          {showArrow && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
