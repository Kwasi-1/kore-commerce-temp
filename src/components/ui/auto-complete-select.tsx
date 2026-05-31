import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Loader2, Search, ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AutoCompleteSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface AutoCompleteSelectProps {
  options: AutoCompleteSelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  label?: string;
  labelPlacement?: "inside" | "outside";
  placeholder?: string;
  loading?: boolean;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
  onCreateOption?: () => void;
  createOptionLabel?: string;
  error?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  hideChevron?: boolean;
  showHelperText?: boolean;
  disabled?: boolean;
}

export function AutoCompleteSelect({
  options,
  value,
  defaultValue = null,
  onChange,
  label = "Autocomplete",
  labelPlacement = "inside",
  placeholder = "Start typing...",
  loading = false,
  onSearchChange,
  showSearch = true,
  onCreateOption,
  createOptionLabel = "Create new option",
  error,
  emptyMessage = "No matches found",
  className,
  triggerClassName,
  hideChevron = false,
  showHelperText = true,
  disabled = false,
}: AutoCompleteSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue,
  );
  const selectedValue = isControlled ? value! : internalValue;
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search, showSearch]);

  const handleSelect = (option: AutoCompleteSelectOption) => {
    if (!isControlled) {
      setInternalValue(option.value);
    }
    onChange?.(option.value);
    setSearch("");
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch("");
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn("flex w-full flex-col", className)}>
        {labelPlacement === "outside" && label && (
          <p className="mb-2 text-sm font-medium text-foreground" style={{ letterSpacing: '-0.8px' }}>{label}</p>
        )}
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-[2.5rem] w-full items-center justify-between border border-input bg-background px-3 py-2 text-left text-sm focus:outline-none",
              error && "border-destructive",
              disabled && "cursor-not-allowed opacity-50",
              triggerClassName,
            )}
          >
            {labelPlacement !== "outside" ? (
              <div className="flex-1 text-left">
                <p className="text-xs uppercase text-muted-foreground" style={{ letterSpacing: '-0.8px' }}>
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm text-foreground",
                    !selectedOption && "text-muted-foreground",
                  )}
                >
                  {selectedOption ? selectedOption.label : placeholder}
                </p>
              </div>
            ) : (
              <span
                className={cn(
                  "text-sm text-foreground",
                  !selectedOption && "text-muted-foreground",
                )}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            )}
            {!hideChevron &&
              (loading ? (
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              ))}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            className="w-[320px] bg-white p-4 shadow-2xl"
          >
              <div className="space-y-3">
                {showSearch && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        onSearchChange?.(event.target.value);
                      }}
                      className="flex h-10 w-full border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

              <div className="max-h-64 space-y-1.5 overflow-y-auto custom-scrollbar">
                {loading && (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                )}
                {!loading && filteredOptions.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </p>
                )}
                {!loading &&
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                        option.value === selectedValue &&
                          "bg-primary/10 text-primary",
                      )}
                    >
                      <span className="font-semibold leading-none">{option.label}</span>
                      {option.description && (
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
              {onCreateOption && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateOption();
                    setSearch("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 text-base font-medium text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  {createOptionLabel}
                </button>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
        {showHelperText && (
          <div className="min-h-[1.25rem]">
            {error && (
              <p className="mt-1 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </Popover.Root>
  );
}
