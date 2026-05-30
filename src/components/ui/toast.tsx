import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

type ToastVariant = "default" | "destructive"

interface BaseToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border bg-background text-foreground",
  destructive: "border-red-200 bg-red-50 text-red-900",
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

export const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-x-0 bottom-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

export const Toast = React.forwardRef<HTMLDivElement, BaseToastProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
        variantStyles[variant],
        className
      )}
      role="status"
      {...props}
    />
  )
)
Toast.displayName = "Toast"

export const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = "ToastTitle"

export const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
ToastDescription.displayName = "ToastDescription"

export const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
      className
    )}
    aria-label="Dismiss notification"
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
))
ToastClose.displayName = "ToastClose"

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = "ToastAction"

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
export type ToastActionElement = React.ReactElement<typeof ToastAction>
