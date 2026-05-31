import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Search, ChevronDown, X, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type MultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  leading?: React.ReactNode;
};

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  labelPlacement?: "inside" | "outside";
  onCreateOption?: () => void;
  createOptionLabel?: string;
  emptyMessage?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = "Select options",
  label = "Multi select",
  labelPlacement = "inside",
  onCreateOption,
  createOptionLabel = "Create new option",
  emptyMessage = "No results found",
  className,
}: MultiSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] =
    React.useState<string[]>(defaultValue);
  const selected = isControlled ? value! : internalValue;
  const [search, setSearch] = React.useState("");

  const toggleValue = (val: string) => {
    const exists = selected.includes(val);
    const next = exists
      ? selected.filter((item) => item !== val)
      : [...selected, val];
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const clearSelection = () => {
    if (!isControlled) {
      setInternalValue([]);
    }
    onChange?.([]);
  };

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(search.toLowerCase()) ||
        option.description?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  const summaryLabel = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return (
        options.find((opt) => opt.value === selected[0])?.label ?? placeholder
      );
    }
    const first =
      options.find((opt) => opt.value === selected[0])?.label ?? "Option";
    return `${first} +${selected.length - 1} more`;
  }, [selected, options, placeholder]);

  const showInsideLabel = labelPlacement !== "outside";

  return (
    <Popover.Root>
      <div className={cn("flex w-full flex-col", className)}>
        {labelPlacement === "outside" && label && (
          <p
            className="mb-2 text-sm font-medium text-foreground"
            style={{ letterSpacing: "-0.8px" }}
          >
            {label}
          </p>
        )}
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex min-h-[2.5rem] w-full items-center justify-between border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {showInsideLabel ? (
              <div className="flex-1 text-left">
                <p
                  className="text-xs uppercase text-muted-foreground"
                  style={{ letterSpacing: "-0.8px" }}
                >
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm text-foreground",
                    selected.length === 0 && "text-muted-foreground",
                  )}
                >
                  {selected.length === 0 ? placeholder : summaryLabel}
                </p>
              </div>
            ) : (
              <span
                className={cn(
                  "text-sm text-foreground",
                  selected.length === 0 && "text-muted-foreground",
                )}
              >
                {selected.length === 0 ? placeholder : summaryLabel}
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {selected.length > 0 && <span>{selected.length}</span>}
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </div>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            className="w-[320px] bg-white p-4 shadow-2xl z-50"
          >
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selected.length} selected</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto custom-scrollbar">
                {filteredOptions.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </p>
                )}
                {filteredOptions.map((option) => {
                  const isChecked = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleValue(option.value)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        isChecked && "bg-primary/10 text-primary",
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => undefined}
                        tabIndex={-1}
                        className="pointer-events-none mt-0.5"
                      />
                      <div className="flex flex-1 flex-col gap-1.5 text-sm">
                        <span className="font-semibold leading-none text-foreground">
                          {option.leading && (
                            <span className="mr-2 inline-flex items-center text-muted-foreground">
                              {option.leading}
                            </span>
                          )}
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs leading-relaxed text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {onCreateOption && (
                <button
                  type="button"
                  onClick={onCreateOption}
                  className="flex w-full items-center gap-2 px-2 py-2 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  {createOptionLabel}
                </button>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}
