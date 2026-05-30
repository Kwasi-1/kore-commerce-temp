import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pageTitleVariants = cva(
  "flex items-center justify-between gap-4",
  {
    variants: {
      variant: {
        default: "",
        filled: "bg-gray-50",
        elevated: "bg-white shadow-sm",
        bordered: "border rounded-lg bg-white",
        ghost: "",
      },
      size: {
        sm: "px-4 py-3",
        default: "px-6 py-4",
        lg: "px-8 py-6",
      },
      sticky: {
        true: "sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      sticky: false,
    },
  }
)

const titleVariants = cva(
  "font-semibold text-gray-900",
  {
    variants: {
      size: {
        sm: "text-lg",
        default: "text-2xl",
        lg: "text-3xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface PageTitleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageTitleVariants> {
  title: string
  description?: string
  trailing?: React.ReactNode
  badge?: React.ReactNode
}

export function PageTitle({
  title,
  description,
  trailing,
  badge,
  variant,
  size,
  sticky,
  className,
  ...props
}: PageTitleProps) {
  return (
    <div
      className={cn(pageTitleVariants({ variant, size, sticky }), className)}
      {...props}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className={titleVariants({ size })}>{title}</h1>
          {badge && <div className="flex items-center">{badge}</div>}
        </div>
        {description && (
          <p className={cn(
            "mt-1 text-muted-foreground",
            size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
          )}>
            {description}
          </p>
        )}
      </div>
      {trailing && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {trailing}
        </div>
      )}
    </div>
  )
}
