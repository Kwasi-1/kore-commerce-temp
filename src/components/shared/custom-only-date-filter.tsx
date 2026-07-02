/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import { DateRange, DayPicker } from "react-day-picker";
import {
  endOfMonth,
  endOfToday,
  endOfYear,
  format,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
  subDays,
  subYears,
  setMonth,
  setYear,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  ChevronUp,
} from "lucide-react";

export interface DateFilterValue {
  active: string;
  start_date: Date | null;
  end_date: Date | null;
}

interface IDateFilter {
  color?:
    | "success"
    | "default"
    | "secondary"
    | "primary"
    | "warning"
    | "danger";
  defaultDate?:
    | "today"
    | "this_week"
    | "this_month"
    | "last_month"
    | "this_year"
    | "last_year"
    | "all_time";
  value?: DateFilterValue;
  onChange?: (val: DateFilterValue) => void;
}

interface DateShortcutConfig {
  id: string;
  label: string;
}

const DATE_SHORTCUTS: DateShortcutConfig[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_year", label: "This year" },
  { id: "last_year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

export const CustomOnlyDateFilterComponent = ({
  color = "default",
  defaultDate = "today",
  value,
  onChange,
}: IDateFilter) => {
  const [date, setDate] = useState<DateRange | undefined>(
    value?.active === "custom" && value.start_date
      ? { from: value.start_date, to: value.end_date || undefined }
      : undefined,
  );
  const [dismissDatePopup, setDismissDatePopup] = useState(true);
  const [activeShortcut, setActiveShortcut] = useState<string>(
    value?.active || defaultDate,
  );
  const [currentMonth, setCurrentMonth] = useState(
    value?.start_date || new Date(),
  );
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [yearNavigator, setYearNavigator] = useState(
    (value?.start_date || new Date()).getFullYear(),
  );
  const [popupPosition, setPopupPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});

  const divRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const dateMap: any = {
    today: {
      start_date: startOfToday(),
      end_date: endOfToday(),
    },
    yesterday: {
      start_date: subDays(new Date(), 1),
      end_date: subDays(new Date(), 1),
    },
    last_month: {
      start_date: startOfMonth(subDays(startOfMonth(new Date()), 1)),
      end_date: endOfMonth(subDays(startOfMonth(new Date()), 1)),
    },
    this_week: {
      start_date: startOfWeek(new Date()),
      end_date: endOfToday(),
    },
    last_week: {
      start_date: startOfWeek(subDays(new Date(), 7)),
      end_date: subDays(startOfWeek(new Date()), 1),
    },
    this_month: {
      start_date: startOfMonth(new Date()),
      end_date: endOfMonth(new Date()),
    },
    this_year: {
      start_date: startOfYear(new Date()),
      end_date: endOfYear(new Date()),
    },
    last_year: {
      start_date: startOfYear(subDays(startOfYear(new Date()), 1)),
      end_date: endOfYear(subYears(new Date(), 1)),
    },
    custom: {
      start_date: date?.from || value?.start_date,
      end_date: date?.to || value?.end_date,
    },
    all_time: {
      start_date: null,
      end_date: null,
    },
  };

  // Calculate popup position based on available space
  const calculatePosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 500; // Approximate width of popup (140 + 320 + padding)
    const popupHeight = 450; // Approximate height of popup

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceRight = viewportWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    const position: any = {};

    // Horizontal positioning
    if (spaceRight >= popupWidth) {
      // Position to the right of button
      position.left = 0;
    } else if (spaceLeft >= popupWidth) {
      // Position to the left of button
      position.right = 0;
    } else {
      // Not enough space on either side, align to left edge
      position.left = 0;
    }

    // Vertical positioning
    if (spaceBelow >= popupHeight) {
      // Position below button
      position.top = buttonRect.height + 4;
    } else if (spaceAbove >= popupHeight) {
      // Position above button
      position.bottom = buttonRect.height + 4;
    } else {
      // Not enough space, position below anyway
      position.top = buttonRect.height + 4;
    }

    setPopupPosition(position);
  };

  const getButtonLabel = () => {
    const activeFilter = value?.active || activeShortcut;

    if (activeFilter === "custom") {
      if (date?.from) {
        if (date.to) {
          return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
        }
        return format(date.from, "LLL dd, y");
      }
      return "Custom Date";
    }

    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      this_week: "This Week",
      last_week: "Last Week",
      this_month: "This Month",
      last_month: "Last Month",
      this_year: "This Year",
      last_year: "Last Year",
      all_time: "All Time",
    };

    return labels[activeFilter as string] || "Today";
  };

  const handleFilterChange = (key: string, range?: DateRange) => {
    setActiveShortcut(key);

    if (key === "custom") {
      onChange?.({
        active: "custom",
        start_date: range?.from || date?.from || null,
        end_date: range?.to || date?.to || null,
      });
    } else {
      onChange?.({
        active: key,
        start_date: dateMap[key].start_date,
        end_date: dateMap[key].end_date,
      });
      setDismissDatePopup(true);
    }
  };

  const handleShortcutClick = (shortcutId: string) => {
    if (shortcutId === "custom") {
      handleFilterChange("custom");
    } else {
      const start = dateMap[shortcutId].start_date;
      const end = dateMap[shortcutId].end_date;
      const range = { from: start, to: end };
      setDate(range);
      if (start) {
        setCurrentMonth(start);
        setYearNavigator(start.getFullYear());
      }
      handleFilterChange(shortcutId, range);
    }
  };

  // Initialize with default date on mount if no value provided
  useEffect(() => {
    if (!value?.active && onChange) {
      onChange({
        active: defaultDate,
        start_date: dateMap[defaultDate]?.start_date,
        end_date: dateMap[defaultDate]?.end_date,
      });
    }
  }, []);

  // Update custom date filter when date changes
  useEffect(() => {
    if (date !== undefined && activeShortcut === "custom") {
      onChange?.({
        active: "custom",
        start_date: date.from || null,
        end_date: date.to || null,
      });
    }
  }, [date]);

  // Calculate position when popup opens
  useEffect(() => {
    if (!dismissDatePopup) {
      calculatePosition();

      // Recalculate on window resize
      const handleResize = () => calculatePosition();
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    }
  }, [dismissDatePopup]);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        divRef.current &&
        !divRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDismissDatePopup(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [divRef, buttonRef]);

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        ref={buttonRef}
        onClick={() => setDismissDatePopup(!dismissDatePopup)}
        className="flex items-center gap-2 px-4 py-2 bg-primary-gray/20 border rounded-md hover:bg-gray-200/30  transition-colors"
      >
        <Calendar className="w-4 h-4 text-ash-text" />
        <span className="text-sm">{getButtonLabel()}</span>
        {/* <ChevronDown className="w-4 h-4" /> */}
      </button>

      {/* Date Picker Popup */}
      <style>{css}</style>
      {!dismissDatePopup && (
        <div
          ref={divRef}
          onMouseLeave={() => setDismissDatePopup(true)}
          style={{
            top:
              popupPosition.top !== undefined
                ? `${popupPosition.top}px`
                : "auto",
            bottom:
              popupPosition.bottom !== undefined
                ? `${popupPosition.bottom}px`
                : "auto",
            left:
              popupPosition.left !== undefined
                ? `${popupPosition.left}px`
                : "auto",
            right:
              popupPosition.right !== undefined
                ? `${popupPosition.right}px`
                : "auto",
          }}
          className="absolute bg-white dark:bg-primary-gray z-50 border rounded mt-1 shadow-lg flex flex-col md:flex-row max-w-[95vw] sm:max-w-none"
        >
          {/* Left sidebar with shortcuts (Desktop) */}
          <div className="hidden md:block py-6 px-4 min-w-[140px] tracking-tighter border-r border-zinc-100 dark:border-zinc-800">
            <div className="space-y-3">
              {DATE_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => handleShortcutClick(shortcut.id)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                    value?.active === shortcut.id
                      ? "bg-primary/20 text-primary-foreground font-bold"
                      : ""
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-4 min-w-[320px]">
            {/* Custom Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (view === "days") {
                    setCurrentMonth(subDays(startOfMonth(currentMonth), 1));
                  } else {
                    setCurrentMonth(subYears(currentMonth, 1));
                  }
                }}
                className={`${view === "years" ? "hidden" : "inline-flex"} h-9 w-9 items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors`}
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  if (view === "days") {
                    setYearNavigator(currentMonth.getFullYear());
                    setView("years");
                  } else {
                    setView("days");
                  }
                }}
                className="flex items-center mx-auto gap-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors font-bold text-base text-zinc-800 dark:text-zinc-100"
              >
                {view === "days" && format(currentMonth, "MMM yyyy")}
                {view === "years" && format(currentMonth, "MMM yyyy")}
                {view === "years" ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => {
                  if (view === "days") {
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1,
                      ),
                    );
                  } else {
                    setCurrentMonth(
                      setYear(currentMonth, currentMonth.getFullYear() + 1),
                    );
                  }
                }}
                className={`${view === "years" ? "hidden" : "inline-flex"} h-9 w-9 items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors`}
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Views */}
            {view === "days" && (
              <div className="-ml-4 text-ash-text font-[400]">
                <DayPicker
                  mode="range"
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={1}
                  classNames={{
                    caption: "hidden",
                    caption_label: "hidden",
                    nav: "hidden",
                    month_caption: "hidden",
                    // v9 layout
                    month_grid: "w-full border-collapse space-y-1",
                    weekdays: "flex justify-center",
                    weekday:
                      "text-ash-text/70 rounded-md w-9 font-normal text-[0.72rem] text-center dark:text-zinc-500",
                    week: "flex w-full mt-2 justify-center",
                    day: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day_button:
                      "h-9 w-9 p-0 text-xs font-normal hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md flex items-center justify-center aria-selected:opacity-100 transition-colors text-inherit bg-transparent",
                    // v8/compatibility layout
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex justify-center",
                    head_cell:
                      "text-ash-text/70 rounded-md w-9 font-normal text-[0.72rem] text-center dark:text-zinc-500",
                    row: "flex w-full mt-2 justify-center",
                    cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  }}
                  modifiersClassNames={{
                    selected: "my-selected",
                    today: "my-today",
                  }}
                  modifiersStyles={{
                    disabled: { fontSize: "70%" },
                  }}
                />
              </div>
            )}

            {view === "years" && (
              <div className="space-y-6 text-gray-600">
                {/* Year Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 pb-3">
                    <button
                      onClick={() => {
                        setYearNavigator(yearNavigator - 3);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                      aria-label="Previous years"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }, (_, i) => {
                        const year = yearNavigator - 1 + i;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentMonth(setYear(currentMonth, year));
                              setYearNavigator(year);
                            }}
                            className="py-2 px-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        setYearNavigator(yearNavigator + 3);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                      aria-label="Next years"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Month Selection */}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = setMonth(currentMonth, i);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentMonth(monthDate);
                          setView("days");
                        }}
                        className="py-3 px-2 font-medium rounded-md hover:bg-[#e4eef084] dark:hover:bg-white/5 transition-colors"
                      >
                        {format(monthDate, "MMM")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile bottom shortcuts */}
          <div className="block md:hidden border-t border-zinc-100 dark:border-zinc-800 py-3 px-4 max-w-full overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {DATE_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => handleShortcutClick(shortcut.id)}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    value?.active === shortcut.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-zinc-100/60 dark:bg-zinc-800/60 text-ash-text"
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  .my-selected:not([disabled]) { 
    font-weight: bold; 
    border: 1px solid var(--border);
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 0 !important;
  }
  
  .rdp-day_range_start:not([disabled]) {
    border-radius: 5px 0 0 5px !important;
    border-left: 1px solid var(--border);
  }

  .rdp-day_range_end:not([disabled]) {
    border-radius: 0 5px 5px 0 !important;
    border-right: 1px solid var(--border);
  }

  .rdp-day_range_start.rdp-day_range_end:not([disabled]) {
    border-radius: 5px !important;
  }

  .rdp-day:not([disabled]):not(.my-selected):hover {
    background-color: #e4eef050 !important;
    color: #075056 !important;
    border-radius: 5px !important;
  }

  .rdp-day:not([disabled]):not(.my-selected):hover .rdp-day_button {
    background-color: transparent !important;
    color: #075056 !important;
  }

  .my-selected:hover:not([disabled]) {
    background-color: #e4eef0 !important;
    border-color: #e4eef0 !important;
    color: black !important;
  }

  .my-today { 
    font-weight: bold;
    font-size: 140%; 
    color: white;
    background-color: black;
    border-radius: 5px;
  }
`;
