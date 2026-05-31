import * as React from "react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DetailTabsItem {
  id: string;
  label: string;
  fields: Array<{
    title: string;
    value: React.ReactNode;
  }>;
}

interface DetailTabsProps {
  items: DetailTabsItem[];
  className?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
}

export function DetailTabs({
  items,
  className,
  defaultValue,
  orientation = "horizontal",
}: DetailTabsProps) {
  const initialValue = defaultValue ?? items[0]?.id;

  return (
    <Tabs defaultValue={initialValue} className={cn("w-full", className)}>
      <TabsList
        variant="top"
        className={cn(
          "mb-4",
          orientation === "vertical" && "mb-0 flex-col border-l border-t-0",
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.id}
            variant="top"
            value={item.id}
            className={cn(
              orientation === "vertical" &&
                "justify-start border-b-0 border-l-2 px-3 py-2",
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent key={item.id} value={item.id} className="mt-0">
          <dl className="grid gap-4 md:grid-cols-2">
            {item.fields.map((field) => {
              const isPlain =
                typeof field.value === "string" ||
                typeof field.value === "number";

              return (
                <div key={field.title} className="space-y-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.title}
                  </dt>
                  <dd
                    className={cn(
                      "text-sm text-foreground",
                      isPlain && "font-semibold",
                    )}
                  >
                    {field.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </TabsContent>
      ))}
    </Tabs>
  );
}
