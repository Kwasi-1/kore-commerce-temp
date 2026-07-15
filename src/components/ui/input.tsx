import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  labelPlacement?: "inside" | "outside"
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, labelPlacement = "outside", placeholder, error, ...props }, ref) => {
    const  baseClasses =
      "flex h-10 w-full border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg"

    if (label && labelPlacement === "inside") {
      return (
        <div className={cn("flex w-full flex-col", className)}>
          <div
            className={cn(
              "flex w-full flex-col border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              error && "border-destructive focus-within:ring-destructive",
            )}
          >
            <p className="text-xs uppercase text-muted-foreground" style={{ letterSpacing: '-0.8px' }}>
              {label}
            </p>
            <input
              type={type}
              className="rounded-xl mt-1 w-full border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              placeholder={placeholder}
              ref={ref}
              {...props}
            />
          </div>
          <div className="min-h-[1.25rem]">
            {error && (
              <p className="mt-1 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className={cn("flex w-full flex-col", className)}>
        {label && (
          <p
            className="mb-2 text-sm font-medium text-foreground"
            style={{ letterSpacing: "-0.8px" }}
          >
            {label}
          </p>
        )}
        <input
          type={type}
          className={cn(
            baseClasses,
            error &&
              "border-destructive focus-visible:ring-destructive rounded-xl"
          )}
          placeholder={placeholder}
          ref={ref}
          {...props}
        />
        <div className="min-h-[1.25rem]">
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    );
  }
)
Input.displayName = "Input"

export { Input }
