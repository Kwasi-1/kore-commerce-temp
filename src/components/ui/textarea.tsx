import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  labelPlacement?: "inside" | "outside"
  error?: string
  textareaClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      textareaClassName,
      label,
      labelPlacement = "outside",
      placeholder,
      error,
      ...props
    },
    ref,
  ) => {
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
            <textarea
              className={cn(
                "mt-1 min-h-[80px] w-full border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-muted-foreground focus-visible:outline-none resize-none",
                textareaClassName,
              )}
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
          <p className="mb-2 text-sm font-medium text-gray-900" style={{ letterSpacing: '-0.8px' }}>
            {label}
          </p>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            error && "border-destructive focus-visible:ring-destructive",
            textareaClassName,
          )}
          placeholder={placeholder}
          ref={ref}
          {...props}
        />
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
)
Textarea.displayName = "Textarea"

export { Textarea }
