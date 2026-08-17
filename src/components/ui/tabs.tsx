import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsContext = React.createContext<{ variant?: "soft" | "top" }>({
  variant: "soft",
})

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: "soft" | "top"
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = "soft", children, ...props }, ref) => (
  <TabsContext.Provider value={{ variant }}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center text-muted-foreground",
        variant === "soft" && "h-10 justify-center rounded-md bg-muted p-1",
        variant === "top" && "w-full justify-start gap-8 border-b border-border pb-0",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  </TabsContext.Provider>
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: "soft" | "top"
  badge?: React.ReactNode
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant: propVariant, badge, children, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  const variant = propVariant ?? context.variant ?? "soft"

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "soft" &&
          "justify-center rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground",
        variant === "top" &&
          "gap-2 border-b-2 border-transparent -mb-[1px] px-1 pb-3 text-muted-foreground hover:text-foreground data-[state=active]:border-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {badge !== undefined && badge !== null && (
        <span className="hidden inlineflex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-none tabular-nums text-primary-foreground">
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
