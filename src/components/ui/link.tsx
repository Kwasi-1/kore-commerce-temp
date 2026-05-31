import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const linkVariants = cva(
  "inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/80",
        muted: "text-muted-foreground hover:text-foreground",
        destructive: "text-destructive hover:text-destructive/80",
        success: "text-green-600 hover:text-green-700",
        subtle: "text-muted-foreground hover:text-foreground",
      },
      underline: {
        none: "no-underline",
        hover: "no-underline hover:underline",
        always: "underline",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: "hover",
      size: "default",
      weight: "medium",
    },
  }
)

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean
  showExternalIcon?: boolean
  disabled?: boolean
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      className,
      variant,
      underline,
      size,
      weight,
      external = false,
      showExternalIcon = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const externalProps = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {}

    return (
      <a
        ref={ref}
        className={cn(linkVariants({ variant, underline, size, weight }), className)}
        aria-disabled={disabled}
        {...externalProps}
        {...props}
      >
        {children}
        {(external && showExternalIcon) && (
          <ExternalLink className="h-3 w-3" />
        )}
      </a>
    )
  }
)
Link.displayName = "Link"

export { Link, linkVariants }
