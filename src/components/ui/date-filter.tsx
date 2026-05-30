import * as React from "react";
import { addDays, endOfMonth, startOfMonth, addMonths } from "date-fns";
import { DateSelector, DateSelectorValue } from "@/components/ui/date-selector";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RelativeRange = {
  label: string;
  description: string;
  getValue: () => DateSelectorValue;
};

interface DateFilterProps {
  value?: DateFilterValue | null;
  onChange?: (value: DateFilterValue) => void;
  onApply?: (value: DateFilterValue) => void;
  defaultMode?: DateFilterMode;
  selectionMode?: "single" | "range";
  className?: string;
}

type DateFilterMode = "custom" | "relative";

export type DateFilterValue = {
  mode: DateFilterMode;
  custom?: DateSelectorValue;
  relativeKey?: string;
  description?: string;
};

const singleDateRanges: Record<string, RelativeRange> = {
  today: {
    label: "Today",
    description: "Current day",
    getValue: () => ({
      mode: "single",
      date: new Date().toISOString().slice(0, 10),
    }),
  },
  yesterday: {
    label: "Yesterday",
    description: "Previous day",
    getValue: () => {
      const iso = addDays(new Date(), -1).toISOString().slice(0, 10);
      return { mode: "single", date: iso };
    },
  },
  twoDaysAgo: {
    label: "2 days ago",
    description: "Two days before today",
    getValue: () => {
      const iso = addDays(new Date(), -2).toISOString().slice(0, 10);
      return { mode: "single", date: iso };
    },
  },
  threeDaysAgo: {
    label: "3 days ago",
    description: "Three days before today",
    getValue: () => {
      const iso = addDays(new Date(), -3).toISOString().slice(0, 10);
      return { mode: "single", date: iso };
    },
  },
  lastWeek: {
    label: "Last week",
    description: "7 days ago",
    getValue: () => {
      const iso = addDays(new Date(), -7).toISOString().slice(0, 10);
      return { mode: "single", date: iso };
    },
  },
  firstOfMonth: {
    label: "First of this month",
    description: "First day of current month",
    getValue: () => ({
      mode: "single",
      date: startOfMonth(new Date()).toISOString().slice(0, 10),
    }),
  },
};

const dateRangeRanges: Record<string, RelativeRange> = {
  last7: {
    label: "Last 7 days",
    description: "Rolling 7-day window including today",
    getValue: () => ({
      mode: "range",
      startDate: addDays(new Date(), -6).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
  },
  last14: {
    label: "Last 14 days",
    description: "Rolling 14-day window including today",
    getValue: () => ({
      mode: "range",
      startDate: addDays(new Date(), -13).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
  },
  last30: {
    label: "Last 30 days",
    description: "Rolling 30-day window including today",
    getValue: () => ({
      mode: "range",
      startDate: addDays(new Date(), -29).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
  },
  last90: {
    label: "Last 90 days",
    description: "Rolling 90-day window including today",
    getValue: () => ({
      mode: "range",
      startDate: addDays(new Date(), -89).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
  },
  thisMonth: {
    label: "This month",
    description: "Month to date",
    getValue: () => ({
      mode: "range",
      startDate: startOfMonth(new Date()).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
  },
  lastMonth: {
    label: "Last month",
    description: "Previous calendar month",
    getValue: () => {
      const start = startOfMonth(addMonths(new Date(), -1));
      const end = endOfMonth(start);
      return {
        mode: "range",
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    },
  },
};

export function DateFilter({
  value,
  onChange,
  onApply,
  defaultMode = "custom",
  selectionMode = "range",
  className,
}: DateFilterProps) {
  const [mode, setMode] = React.useState<DateFilterMode>(defaultMode);
  const initialCustomValue: DateSelectorValue =
    selectionMode === "single"
      ? { mode: "single", date: null }
      : { mode: "range", startDate: null, endDate: null };
  const [customValue, setCustomValue] =
    React.useState<DateSelectorValue>(initialCustomValue);
  const relativeRanges =
    selectionMode === "single" ? singleDateRanges : dateRangeRanges;
  const defaultKey = Object.keys(relativeRanges)[0];
  const [relativeKey, setRelativeKey] = React.useState<string>(defaultKey);
  const [label, setLabel] = React.useState("Custom Filter");
  const [description, setDescription] = React.useState("Unapplied changes");

  React.useEffect(() => {
    if (!value) {
      return;
    }

    setMode(value.mode);

    if (value.mode === "custom" && value.custom) {
      setCustomValue(value.custom);
    }

    if (value.mode === "relative" && value.relativeKey) {
      setRelativeKey(value.relativeKey);
    }

    if (value.description) {
      setDescription(value.description);
    }
  }, [value]);

  const handleApply = () => {
    const filterValue: DateFilterValue = {
      mode,
      custom: mode === "custom" ? customValue : undefined,
      relativeKey: mode === "relative" ? relativeKey : undefined,
      description,
    };
    onChange?.(filterValue);
    onApply?.(filterValue);
  };

  return (
    <div className={cn("w-full", className)}>
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as DateFilterMode)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom">
            {selectionMode === "single" ? "Custom Date" : "Custom Range"}
          </TabsTrigger>
          <TabsTrigger value="relative">Quick Select</TabsTrigger>
        </TabsList>
        <TabsContent value="custom" className="space-y-4 p-4">
          <DateSelector
            onChange={setCustomValue}
            defaultMode={selectionMode}
            lockMode={true}
            label={selectionMode === "single" ? "Select date" : "Date range"}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filter-label">Label</Label>
              <Input
                id="filter-label"
                placeholder="e.g. Quarterly review"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-description">Description</Label>
              <Input
                id="filter-description"
                placeholder="Optional description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="relative" className="space-y-4 p-4">
          <div className="grid gap-3">
            {Object.entries(relativeRanges).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRelativeKey(key)}
                className={cn(
                  "p-3 text-left rounded-md transition-colors",
                  relativeKey === key
                    ? "bg-primary/10 text-primary border border-primary"
                    : "hover:bg-muted/60 border border-transparent",
                )}
              >
                <p className="text-sm font-semibold text-gray-900">
                  {preset.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-muted-foreground">
            {mode === "relative"
              ? relativeRanges[relativeKey]?.description
              : description || "No description"}
          </p>
        </div>
        <Button onClick={handleApply}>Apply Filter</Button>
      </div>
    </div>
  );
}
