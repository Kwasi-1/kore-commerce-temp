import * as React from "react"
import { Check, Clock, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const STATUS_ICONS: Record<string, React.ElementType> = {
  success: Check,
  completed: Check,
  pending: Clock,
  processing: Loader2,
  cancelled: X,
  failed: X,
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  default: "bg-gray-100 text-gray-700",
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalized = status?.toLowerCase()
  const Icon = STATUS_ICONS[normalized] ?? null
  const styles = STATUS_STYLES[normalized] ?? STATUS_STYLES.default
  const label = status ? status.replace(/^\w/, (c) => c.toUpperCase()) : ""

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1  px-2.5 py-0.5 text-xs font-semibold",
        styles,
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}
