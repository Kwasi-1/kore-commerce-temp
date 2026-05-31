import * as React from "react";
import { useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export type DateSelectorMode = "single" | "range";

export type DateSelectorValue =
  | {
      mode: "single";
      date: string | null;
    }
  | {
      mode: "range";
      startDate: string | null;
      endDate: string | null;
    };

type Preset = {
  label: string;
  description: string;
  getRange: () => { start: string; end: string };
};

interface DateSelectorProps {
  defaultMode?: DateSelectorMode;
  defaultValue?: DateSelectorValue;
  presets?: Preset[];
  onChange?: (value: DateSelectorValue) => void;
  className?: string;
  triggerClassName?: string;
  label?: string;
  labelPlacement?: "inside" | "outside";
  placeholder?: string;
  lockMode?: boolean;
  hideLabel?: boolean;
  variant?: "default" | "compact";
  popoverSide?: "top" | "right" | "bottom" | "left";
  popoverAlign?: "start" | "center" | "end";
  minDate?: string | null;
}

const formatISODate = (date: Date) => format(date, "yyyy-MM-dd");

const defaultPresets: Preset[] = [
  {
    label: "Today",
    description: "Current day",
    getRange: () => {
      const iso = formatISODate(new Date());
      return { start: iso, end: iso };
    },
  },
  {
    label: "Yesterday",
    description: "Previous day",
    getRange: () => {
      const iso = formatISODate(addDays(new Date(), -1));
      return { start: iso, end: iso };
    },
  },
  {
    label: "Last 7 days",
    description: "Including today",
    getRange: () => {
      const end = formatISODate(new Date());
      const start = formatISODate(addDays(new Date(), -6));
      return { start, end };
    },
  },
  {
    label: "Last 30 days",
    description: "Past month rolling window",
    getRange: () => {
      const end = formatISODate(new Date());
      const start = formatISODate(addDays(new Date(), -29));
      return { start, end };
    },
  },
  {
    label: "This month",
    description: "Month to date",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      return { start: formatISODate(start), end: formatISODate(end) };
    },
  },
];

function formatDisplay(value: string | null) {
  if (!value) {
    return "â€”";
  }

  const date = new Date(value);
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

export function DateSelector({
  defaultMode = "single",
  defaultValue,
  presets = defaultPresets,
  onChange,
  className,
  triggerClassName,
  label,
  labelPlacement = "inside",
  placeholder,
  lockMode = false,
  hideLabel,
  variant = "default",
  popoverSide,
  popoverAlign,
  minDate,
}: DateSelectorProps) {
  const minDateObj = minDate ? new Date(minDate) : null;
  const initialMode = defaultValue?.mode ?? defaultMode;
  const [mode, setMode] = React.useState<DateSelectorMode>(initialMode);
  const [singleDate, setSingleDate] = React.useState<string | null>(
    defaultValue?.mode === "single" ? (defaultValue.date ?? null) : null,
  );
  const [rangeDates, setRangeDates] = React.useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate:
      defaultValue?.mode === "range" ? (defaultValue.startDate ?? null) : null,
    endDate:
      defaultValue?.mode === "range" ? (defaultValue.endDate ?? null) : null,
  });
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    if (defaultValue?.mode === "single" && defaultValue.date) {
      return startOfMonth(new Date(defaultValue.date));
    }
    if (defaultValue?.mode === "range" && defaultValue.startDate) {
      return startOfMonth(new Date(defaultValue.startDate));
    }
    return startOfMonth(new Date());
  });

  const emitChange = React.useCallback(
    (value: DateSelectorValue) => {
      onChange?.(value);
    },
    [onChange],
  );

  const handleModeChange = (nextMode: DateSelectorMode) => {
    setMode(nextMode);
    if (nextMode === "single") {
      emitChange({ mode: "single", date: singleDate });
      if (singleDate) setVisibleMonth(startOfMonth(new Date(singleDate)));
    } else {
      emitChange({
        mode: "range",
        startDate: rangeDates.startDate,
        endDate: rangeDates.endDate,
      });
      if (rangeDates.startDate)
        setVisibleMonth(startOfMonth(new Date(rangeDates.startDate)));
    }
  };

  const handleDayClick = (day: Date) => {
    const iso = formatISODate(day);
    if (mode === "single") {
      setSingleDate(iso);
      emitChange({ mode: "single", date: iso });
      setVisibleMonth(startOfMonth(day));
      return;
    }

    setRangeDates((prev) => {
      if (!prev.startDate || (prev.startDate && prev.endDate)) {
        const next = { startDate: iso, endDate: null };
        emitChange({ mode: "range", ...next });
        return next;
      }

      const startDateObj = new Date(prev.startDate);
      if (isBefore(day, startDateObj)) {
        const next = { startDate: iso, endDate: prev.startDate };
        emitChange({ mode: "range", ...next });
        return next;
      }

      const next = { startDate: prev.startDate, endDate: iso };
      emitChange({ mode: "range", ...next });
      return next;
    });
  };

  const handlePresetSelect = (preset: Preset) => {
    const range = preset.getRange();
    setMode("range");
    setRangeDates({ startDate: range.start, endDate: range.end });
    emitChange({ mode: "range", startDate: range.start, endDate: range.end });
    setVisibleMonth(startOfMonth(new Date(range.start)));
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

  const hasValue =
    mode === "single"
      ? Boolean(singleDate)
      : Boolean(rangeDates.startDate && rangeDates.endDate);

  const displayValue =
    mode === "single"
      ? singleDate
        ? formatDisplay(singleDate)
        : "No date selected"
      : `${formatDisplay(rangeDates.startDate)} â†’ ${formatDisplay(rangeDates.endDate)}`;

  const inputLabel =
    label ?? (mode === "single" ? "Single date" : "Date range");
  const finalPlaceholder =
    placeholder ??
    (mode === "single" ? "Select a date" : "Select a date range");
  const effectiveHideLabel = hideLabel ?? variant === "compact";
  const showInsideLabel = labelPlacement !== "outside" && !effectiveHideLabel;
  const triggerSizeClasses =
    variant === "compact" ? "min-h-10 py-1" : "min-h-[2.5rem] py-2";

  return (
    <Popover.Root>
      <div className={cn("flex w-full flex-col", className)}>
        {labelPlacement === "outside" && !effectiveHideLabel && inputLabel && (
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
            className={cn(
              "flex w-full items-center justify-between border border-input bg-background px-3 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              triggerSizeClasses,
              triggerClassName,
            )}
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
            align={popoverAlign}
            side={popoverSide}
            sideOffset={8}
            className="w-[360px] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Select dates
                </p>
                <p className="text-xs text-muted-foreground">
                  {lockMode
                    ? `Select ${mode === "single" ? "a date" : "a date range"}.`
                    : "Toggle between single and range selection."}
                </p>
              </div>
              <div className="bg-primary/10 p-2 text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {!lockMode ? (
                <Tabs
                  value={mode}
                  onValueChange={(value) =>
                    handleModeChange(value as DateSelectorMode)
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Single</TabsTrigger>
                    <TabsTrigger value="range">Range</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="pt-4">
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
                      mode="single"
                      singleDate={singleDate}
                      rangeDates={rangeDates}
                      minDate={minDateObj}
                    />
                  </TabsContent>
                  <TabsContent value="range" className="pt-4">
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
                      mode="range"
                      singleDate={singleDate}
                      rangeDates={rangeDates}
                      minDate={minDateObj}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
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
                  mode={mode}
                  singleDate={singleDate}
                  rangeDates={rangeDates}
                  minDate={minDateObj}
                />
              )}

              {/*<div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick selections
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{displayValue}</p>
                {!hasValue && (
                  <p className="text-xs text-muted-foreground">
                    Pick a {mode === "single" ? "date" : "start date"} to begin.
                  </p>
                )}
                {mode === "range" && (
                  <p className="text-xs text-muted-foreground">
                    Choose a start date first, then an end date to complete the
                    range.
                  </p>
                )}
              </div>*/}
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
  singleDate,
  rangeDates,
  minDate,
}: {
  days: Date[];
  weekdayLabels: string[];
  visibleMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: Date) => void;
  mode: DateSelectorMode;
  singleDate: string | null;
  rangeDates: { startDate: string | null; endDate: string | null };
  minDate: Date | null;
}) {
  const startDateObj = rangeDates.startDate
    ? new Date(rangeDates.startDate)
    : null;
  const endDateObj = rangeDates.endDate ? new Date(rangeDates.endDate) : null;
  const singleDateObj = singleDate ? new Date(singleDate) : null;

  const getDayState = (day: Date) => {
    const inCurrentMonth = isSameMonth(day, visibleMonth);
    const isSingleSelected =
      mode === "single" && singleDateObj && isSameDay(day, singleDateObj);
    const isRangeStart =
      mode === "range" && startDateObj && isSameDay(day, startDateObj);
    const isRangeEnd =
      mode === "range" && endDateObj && isSameDay(day, endDateObj);
    const isBetween =
      mode === "range" &&
      startDateObj &&
      endDateObj &&
      isAfter(day, startDateObj) &&
      isBefore(day, endDateObj);

    return {
      inCurrentMonth,
      isSingleSelected,
      isRangeStart,
      isRangeEnd,
      isBetween,
      isSelected: isSingleSelected || isRangeStart || isRangeEnd,
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
          const isDisabled = Boolean(minDate && isBefore(day, minDate));

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex h-10 w-10 items-center justify-center text-sm transition",
                !state.inCurrentMonth && "text-muted-foreground/50",
                isDisabled && "cursor-not-allowed text-muted-foreground/40",
                state.isSelected && "bg-primary text-primary-foreground",
                state.isBetween && "bg-primary/10 text-primary",
                !state.isSelected &&
                  !state.isBetween &&
                  !isDisabled &&
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
