import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success:
          "border-transparent bg-green-100 text-green-700 hover:bg-green-200",
        warning:
          "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
        danger:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200",
        info:
          "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
        muted:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        "outline-primary":
          "border border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground",
        "outline-success":
          "border border-green-300 bg-background text-green-700 hover:bg-green-50",
        "outline-warning":
          "border border-yellow-300 bg-background text-yellow-700 hover:bg-yellow-50",
        "outline-danger":
          "border border-red-300 bg-background text-red-700 hover:bg-red-50",
      },
      size: {
        default: "h-5 min-w-[20px] px-2.5 py-0.5 text-xs",
        sm: "h-4 min-w-[16px] px-2 py-0 text-[10px]",
        lg: "h-6 min-w-[24px] px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode
}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
