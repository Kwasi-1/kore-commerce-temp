import * as React from "react";
import { cn } from "@/lib/utils";
import { Legend, Tooltip } from "recharts";

type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartConfigContext = React.createContext<ChartConfig | null>(null);

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const style = React.useMemo(() => {
    const variables: React.CSSProperties = {};
    Object.entries(config).forEach(([key, value]) => {
      if (value?.color) {
        (variables as Record<string, string>)[`--color-${key}`] = value.color;
      }
    });
    return variables;
  }, [config]);

  return (
    <ChartConfigContext.Provider value={config}>
      <div className={cn("w-full", className)} style={style}>
        {children}
      </div>
    </ChartConfigContext.Provider>
  );
}

export function ChartTooltip(props: React.ComponentProps<typeof Tooltip>) {
  return <Tooltip {...props} />;
}

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string | number;
  labelFormatter?: (label: string | number | undefined) => React.ReactNode;
  formatter?: (
    value: number | string | undefined,
    name: string | undefined,
    item: any,
    index: number,
  ) => React.ReactNode | [React.ReactNode, React.ReactNode];
  hideLabel?: boolean;
  indicator?: "dot" | "line";
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  labelFormatter,
  formatter,
  indicator = "dot",
}: ChartTooltipContentProps) {
  const config = React.useContext(ChartConfigContext);

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const resolvedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-xs">
      {!hideLabel && resolvedLabel && (
        <p className="text-muted-foreground">{resolvedLabel}</p>
      )}
      <div className="mt-2 space-y-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config?.[String(item.dataKey ?? "")];
          const labelText = itemConfig?.label ?? item.name ?? item.dataKey;
          const color = itemConfig?.color ?? item.color ?? "#0f172a";
          const formatted = formatter
            ? formatter(item.value, item.name, item, index)
            : [item.value, labelText];
          const [valueText, nameText] = Array.isArray(formatted)
            ? formatted
            : [formatted, labelText];

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={cn(
                    "inline-block",
                    indicator === "line" ? "h-0.5 w-4" : "h-2 w-2 rounded-full",
                  )}
                  style={{ backgroundColor: color }}
                />
                <span>{nameText}</span>
              </div>
              <span className="font-semibold text-foreground">{valueText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend(props: React.ComponentProps<typeof Legend>) {
  return <Legend {...props} />;
}

export function ChartLegendContent({
  payload,
}: {
  payload?: Array<{
    dataKey?: string;
    color?: string;
    value?: string;
  }>;
}) {
  const config = React.useContext(ChartConfigContext);

  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {payload.map((entry, index) => {
        const key = String(entry.dataKey ?? entry.value ?? index);
        const itemConfig = config?.[String(entry.dataKey ?? "")];
        const labelText = itemConfig?.label ?? entry.value ?? entry.dataKey;
        const color = itemConfig?.color ?? entry.color ?? "#0f172a";

        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{labelText}</span>
          </div>
        );
      })}
    </div>
  );
}
