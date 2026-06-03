/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { updateGlobalState } from "@/store/features/global";
import { RootState } from "@/store/store";
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
import React, { useEffect, useRef, useState } from "react";
import { DateRange, DayPicker } from "react-day-picker";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  ChevronUp,
} from "lucide-react";

interface IDateFilter {
  color?:
    | "success"
    | "default"
    | "secondary"
    | "primary"
    | "warning"
    | "danger"
    | undefined;
  defaultDate?:
    | "today"
    | "this_week"
    | "this_month"
    | "last_month"
    | "this_year"
    | "last_year"
    | "all_time";
}

export const CustomOnlyDateFilterComponent = ({
  color = "default",
  defaultDate = "today",
}: IDateFilter) => {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [dismissDatePopup, setDismissDatePopup] = useState(true);
  const [activeShortcut, setActiveShortcut] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [yearNavigator, setYearNavigator] = useState(new Date().getFullYear());
  const [popupPosition, setPopupPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});

  const dispatch = useDispatch();
  const { dateFilter } = useSelector((state: RootState) => state.global);

  const divRef: any = useRef();
  const buttonRef: any = useRef();

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
      start_date: date?.from || dateFilter?.start_date,
      end_date: date?.to || dateFilter?.end_date,
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
    const activeFilter = dateFilter?.active;

    // For custom, show the date range if dates are selected
    if (activeFilter === "custom") {
      if (date?.from) {
        if (date.to) {
          return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
        }
        return format(date.from, "LLL dd, y");
      }
      return "Custom Date";
    }

    // For shortcuts, show their labels
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
      // For custom, just set the active filter
      dispatch(
        updateGlobalState({
          dateFilter: {
            active: "custom",
            start_date: range?.from || date?.from || null,
            end_date: range?.to || date?.to || null,
          },
        })
      );
    } else {
      // For shortcuts, use the dateMap values
      dispatch(
        updateGlobalState({
          dateFilter: {
            active: key,
            start_date: dateMap[key].start_date,
            end_date: dateMap[key].end_date,
          },
        })
      );
      setDismissDatePopup(true);
    }
  };

  // Initialize with default date on mount
  useEffect(() => {
    if (!dateFilter?.active) {
      dispatch(
        updateGlobalState({
          dateFilter: {
            active: defaultDate,
            start_date: dateMap[defaultDate]?.start_date,
            end_date: dateMap[defaultDate]?.end_date,
          },
        })
      );
    }
  }, []);

  // Update custom date filter when date changes
  useEffect(() => {
    if (date !== undefined && dateFilter?.active === "custom") {
      dispatch(
        updateGlobalState({
          dateFilter: {
            active: "custom",
            start_date: date.from,
            end_date: date.to,
          },
        })
      );
    }
  }, [date, dispatch]);

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
        !divRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
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
          className="absolute bg-white dark:bg-primary-gray z-50 border rounded mt-1 shadow-lg flex"
        >
          {/* Left sidebar with shortcuts */}
          <div className=" py-6 px-4 min-w-[140px]">
            <div className="space-y-3">
              <button
                onClick={() => {
                  const range = { from: startOfToday(), to: endOfToday() };
                  setDate(range);
                  setCurrentMonth(new Date());
                  setYearNavigator(new Date().getFullYear());
                  handleFilterChange("today", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "today"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const yesterday = subDays(new Date(), 1);
                  const range = {
                    from: yesterday,
                    to: yesterday,
                  };
                  setDate(range);
                  setCurrentMonth(yesterday);
                  setYearNavigator(yesterday.getFullYear());
                  handleFilterChange("yesterday", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "yesterday"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => {
                  const weekStart = startOfWeek(new Date());
                  const range = {
                    from: weekStart,
                    to: endOfToday(),
                  };
                  setDate(range);
                  setCurrentMonth(weekStart);
                  setYearNavigator(weekStart.getFullYear());
                  handleFilterChange("this_week", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "this_week"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                This week
              </button>
              <button
                onClick={() => {
                  const lastWeekStart = startOfWeek(subDays(new Date(), 7));
                  const range = {
                    from: lastWeekStart,
                    to: subDays(startOfWeek(new Date()), 1),
                  };
                  setDate(range);
                  setCurrentMonth(lastWeekStart);
                  setYearNavigator(lastWeekStart.getFullYear());
                  handleFilterChange("last_week", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "last_week"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Last week
              </button>
              <button
                onClick={() => {
                  const monthStart = startOfMonth(new Date());
                  const range = {
                    from: monthStart,
                    to: endOfMonth(new Date()),
                  };
                  setDate(range);
                  setCurrentMonth(monthStart);
                  setYearNavigator(monthStart.getFullYear());
                  handleFilterChange("this_month", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "this_month"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                This month
              </button>
              <button
                onClick={() => {
                  const lastMonthStart = startOfMonth(
                    subDays(startOfMonth(new Date()), 1)
                  );
                  const range = {
                    from: lastMonthStart,
                    to: endOfMonth(subDays(startOfMonth(new Date()), 1)),
                  };
                  setDate(range);
                  setCurrentMonth(lastMonthStart);
                  setYearNavigator(lastMonthStart.getFullYear());
                  handleFilterChange("last_month", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "last_month"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Last month
              </button>
              <button
                onClick={() => {
                  const yearStart = startOfYear(new Date());
                  const range = {
                    from: yearStart,
                    to: endOfYear(new Date()),
                  };
                  setDate(range);
                  setCurrentMonth(yearStart);
                  setYearNavigator(yearStart.getFullYear());
                  handleFilterChange("this_year", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "this_year"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                This year
              </button>
              <button
                onClick={() => {
                  const lastYearStart = startOfYear(subYears(new Date(), 1));
                  const range = {
                    from: lastYearStart,
                    to: endOfYear(subYears(new Date(), 1)),
                  };
                  setDate(range);
                  setCurrentMonth(lastYearStart);
                  setYearNavigator(lastYearStart.getFullYear());
                  handleFilterChange("last_year", range);
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "last_year"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Last year
              </button>
              <button
                onClick={() => {
                  handleFilterChange("custom");
                }}
                className={`w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ${
                  dateFilter?.active === "custom"
                    ? "bg-primary-gray/40 text-primary-green"
                    : ""
                }`}
              >
                Custom
              </button>
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
                className={`${view === "years" ? "hidden" : "inline-flex"} p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors`}
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
                className="flex items-center mx-auto gap-2 px-3 py-1.5 hover:bg-primary-gray/20 dark:hover:bg-white/5 rounded-none transition-colors font-bold text-xl"
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
                        1
                      )
                    );
                  } else {
                    setCurrentMonth(
                      setYear(currentMonth, currentMonth.getFullYear() + 1)
                    );
                  }
                }}
                className={`${view === "years" ? "hidden" : "inline-flex"} p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors`}
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
                  modifiersClassNames={{
                    selected: "my-selected",
                    today: "my-today",
                  }}
                  modifiersStyles={{
                    disabled: { fontSize: "70%" },
                  }}
                  components={{
                    Caption: () => null,
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
        </div>
      )}
    </div>
  );
};

const css = `
  .my-selected:not([disabled]) { 
    font-weight: bold; 
    border-top: 1px solid #e4eef084;
    border-bottom: 1px solid #e4eef084;
    border-left: 0px solid #e4eef084;
    border-right: 0px solid #e4eef084;
		background-color: #e4eef084;
    color: black;
    border-radius: 0 !important;
  }
  
  .rdp-day_range_start:not([disabled]) {
    border-radius: 5px 0 0 5px !important;
    border-left: 1px solid #e4eef084;
  }

  .rdp-day_range_end:not([disabled]) {
    border-radius: 0 5px 5px 0 !important;
    border-right: 1px solid #e4eef084;
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
