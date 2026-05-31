import * as React from "react";
import { useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DateRangeMode = "single" | "range";

export interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

type QuickSelection = {
  label: string;
  description: string;
  getValue: () => DateRangeValue;
};

interface DateRangePickerProps {
  mode?: DateRangeMode;
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  className?: string;
  label?: string;
  labelPlacement?: "inside" | "outside";
  placeholder?: string;
}

// Quick selections for range mode
const rangeModeSelections: QuickSelection[] = [
  {
    label: "Today",
    description: "Current day start to end",
    getValue: () => {
      const today = new Date();
      return {
        startDate: startOfDay(today),
        endDate: endOfDay(today),
      };
    },
  },
  {
    label: "Yesterday",
    description: "Previous day start to end",
    getValue: () => {
      const yesterday = addDays(new Date(), -1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    },
  },
  {
    label: "Last 7 days",
    description: "7 days ago to today",
    getValue: () => {
      const today = new Date();
      const sevenDaysAgo = addDays(today, -6);
      return {
        startDate: startOfDay(sevenDaysAgo),
        endDate: endOfDay(today),
      };
    },
  },
  {
    label: "Last 30 days",
    description: "30 days ago to today",
    getValue: () => {
      const today = new Date();
      const thirtyDaysAgo = addDays(today, -29);
      return {
        startDate: startOfDay(thirtyDaysAgo),
        endDate: endOfDay(today),
      };
    },
  },
  {
    label: "This month",
    description: "First day of month to today",
    getValue: () => {
      const today = new Date();
      const firstDay = startOfMonth(today);
      return {
        startDate: startOfDay(firstDay),
        endDate: endOfDay(today),
      };
    },
  },
];

function formatDisplay(date: Date | null) {
  if (!date) {
    return "â€”";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  let cursor = start;

  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function DateRangePicker({
  mode,
  value,
  onChange,
  className,
  label,
  labelPlacement = "inside",
  placeholder,
}: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] =
    React.useState<DateRangeValue | null>(value ?? null);
  const [tempStartDate, setTempStartDate] = React.useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    if (value?.startDate) {
      return startOfMonth(value.startDate);
    }
    return startOfMonth(new Date());
  });

  // Sync selected range with value prop
  React.useEffect(() => {
    if (value) {
      setSelectedRange(value);
    }
  }, [value]);

  const currentMode = mode ?? "range";
  const quickSelections = currentMode === "range" ? rangeModeSelections : [];

  const emitChange = React.useCallback(
    (newValue: DateRangeValue) => {
      setSelectedRange(newValue);
      onChange?.(newValue);
    },
    [onChange],
  );

  const handleDayClick = (day: Date) => {
    if (currentMode === "single") {
      // Single mode: Create a full day range
      const newValue: DateRangeValue = {
        startDate: startOfDay(day),
        endDate: endOfDay(day),
      };
      emitChange(newValue);
      setVisibleMonth(startOfMonth(day));
      setTempStartDate(null);
      return;
    }

    // Range mode: Handle range selection
    if (!tempStartDate) {
      // First click: Set start date
      setTempStartDate(day);
      return;
    }

    // Second click: Complete the range
    const start = isBefore(day, tempStartDate) ? day : tempStartDate;
    const end = isBefore(day, tempStartDate) ? tempStartDate : day;

    const newValue: DateRangeValue = {
      startDate: startOfDay(start),
      endDate: endOfDay(end),
    };
    emitChange(newValue);
    setTempStartDate(null);
  };

  const handleQuickSelection = (selection: QuickSelection) => {
    const newValue = selection.getValue();
    emitChange(newValue);
    setVisibleMonth(startOfMonth(newValue.startDate));
    setTempStartDate(null);
  };

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, idx) =>
      format(addDays(start, idx), "EEE"),
    );
  }, []);

  const hasValue = Boolean(selectedRange?.startDate && selectedRange?.endDate);

  const displayValue = hasValue
    ? currentMode === "single"
      ? formatDisplay(selectedRange!.startDate)
      : `${formatDisplay(selectedRange!.startDate)} â†’ ${formatDisplay(selectedRange!.endDate)}`
    : "No date selected";

  const inputLabel =
    label ?? (currentMode === "single" ? "Single date" : "Date range");
  const finalPlaceholder =
    placeholder ??
    (currentMode === "single" ? "Select a date" : "Select a date range");
  const showInsideLabel = labelPlacement !== "outside";

  return (
    <Popover.Root>
      <div className={cn("flex w-full flex-col", className)}>
        {labelPlacement === "outside" && inputLabel && (
          <p
            className="mb-2 text-sm font-medium text-foreground"
            style={{ letterSpacing: "-0.8px" }}
          >
            {inputLabel}
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
                  {inputLabel}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm text-foreground",
                    !hasValue && "text-muted-foreground",
                  )}
                >
                  {displayValue}
                </p>
              </div>
            ) : (
              <span
                className={cn(
                  "text-sm text-foreground",
                  !hasValue && "text-muted-foreground",
                )}
              >
                {hasValue ? displayValue : finalPlaceholder}
              </span>
            )}
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            className="w-[360px] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Select dates
                </p>
                <p className="text-xs text-muted-foreground">
                  Select {currentMode === "single" ? "a date" : "a date range"}.
                </p>
              </div>
              <div className="bg-primary/10 p-2 text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <CalendarGrid
                days={calendarDays}
                weekdayLabels={weekdayLabels}
                visibleMonth={visibleMonth}
                onDayClick={handleDayClick}
                onPrevMonth={() =>
                  setVisibleMonth((prev) => addMonths(prev, -1))
                }
                onNextMonth={() =>
                  setVisibleMonth((prev) => addMonths(prev, 1))
                }
                mode={currentMode}
                selectedRange={selectedRange}
                tempStartDate={tempStartDate}
              />

              {currentMode === "range" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quick selections
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickSelections.map((selection) => (
                      <Button
                        key={selection.label}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickSelection(selection)}
                      >
                        {selection.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{displayValue}</p>
                {!hasValue && (
                  <p className="text-xs text-muted-foreground">
                    Pick a {currentMode === "single" ? "date" : "start date"} to
                    begin.
                  </p>
                )}
                {currentMode === "range" && tempStartDate && (
                  <p className="text-xs text-muted-foreground">
                    Start: {formatDisplay(tempStartDate)}. Now pick an end date.
                  </p>
                )}
                {currentMode === "range" && !tempStartDate && hasValue && (
                  <p className="text-xs text-muted-foreground">
                    Range selected. Click a date to start a new range.
                  </p>
                )}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}

function CalendarGrid({
  days,
  weekdayLabels,
  visibleMonth,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  mode,
  selectedRange,
  tempStartDate,
}: {
  days: Date[];
  weekdayLabels: string[];
  visibleMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: Date) => void;
  mode: DateRangeMode;
  selectedRange: DateRangeValue | null;
  tempStartDate: Date | null;
}) {
  const getDayState = (day: Date) => {
    const inCurrentMonth = isSameMonth(day, visibleMonth);

    if (mode === "single") {
      const isSingleSelected =
        selectedRange && isSameDay(day, selectedRange.startDate);
      return {
        inCurrentMonth,
        isSelected: isSingleSelected,
        isRangeStart: false,
        isRangeEnd: false,
        isBetween: false,
        isTempStart: false,
      };
    }

    // Range mode
    const isTempStart = tempStartDate && isSameDay(day, tempStartDate);
    const isRangeStart =
      selectedRange && isSameDay(day, selectedRange.startDate);
    const isRangeEnd = selectedRange && isSameDay(day, selectedRange.endDate);
    const isBetween =
      selectedRange &&
      isAfter(day, selectedRange.startDate) &&
      isBefore(day, selectedRange.endDate);

    return {
      inCurrentMonth,
      isSelected: isRangeStart || isRangeEnd,
      isRangeStart: isRangeStart,
      isRangeEnd: isRangeEnd,
      isBetween: isBetween,
      isTempStart: isTempStart,
    };
  };

  return (
    <div className="bg-muted/20">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button variant="ghost" size="icon" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <div className="text-sm font-semibold text-foreground">
          {format(visibleMonth, "MMMM yyyy")}
        </div>
        <Button variant="ghost" size="icon" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 border-b px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3 text-sm">
        {days.map((day) => {
          const state = getDayState(day);
          const isDisabled = false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex h-10 w-10 items-center justify-center text-sm transition rounded-md",
                !state.inCurrentMonth && "text-muted-foreground/50",
                state.isSelected &&
                  "bg-primary text-primary-foreground font-semibold",
                state.isBetween && "bg-primary/10 text-primary",
                state.isTempStart && "bg-primary/30 text-primary font-semibold",
                !state.isSelected &&
                  !state.isBetween &&
                  !state.isTempStart &&
                  "hover:bg-muted/60",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
