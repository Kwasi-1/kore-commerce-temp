import * as React from "react"

import { cn } from "@/lib/utils"

interface TopographyProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string
  background?: string
}

export function Topography({
  className,
  children,
  color = "rgba(7, 80, 86, 0.15)",
  background = "transparent",
  ...props
}: TopographyProps) {
  const pattern = React.useMemo(
    () =>
      `linear-gradient(120deg, transparent 75%, ${color} 75%, ${color} 78%, transparent 78%),
       linear-gradient(60deg, transparent 75%, ${color} 75%, ${color} 78%, transparent 78%)`,
    [color],
  )

  return (
    <div
      className={cn("relative overflow-hidden border border-border", className)}
      style={{ background }}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: pattern,
          backgroundSize: "40px 40px",
          mixBlendMode: "multiply",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
