import React, { useState, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Selection,
} from "@nextui-org/react";
import { capitalize } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import CustomContainerComponent from "@/components/shared/custom.container.component";
import CustomTableComponent from "@/components/shared/table.component";
import { Key } from "react";
import { DateFilter } from "@/components/ui/date-filter";
import { Button as UIbutton } from "../ui/button";


// Types for the enhanced table
export interface TableColumn {
  key: string;
  label: string;
}

export interface TableAction {
  key: string;
  label: string;
  icon?: string;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  className?: string;
  disabled?: boolean;
  startContent?: React.ReactNode;
}

export interface FilterOption {
  name: string;
  uid: string;
}

export interface TopContentAction {
  title?: string;
  icon?: any;
  loading?: boolean;
  variant?:
    | "solid"
    | "bordered"
    | "light"
    | "flat"
    | "faded"
    | "shadow"
    | "ghost";
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  className?: string;
  onPress?: () => void;
  customComponent?: React.ReactNode;
}

export interface EnhancedTableProps {
  // Table core props
  columns: TableColumn[];
  rows: Array<any>;
  isLoading?: boolean;
  isFetching?: boolean;

  // Pagination props
  isPaginated?: boolean;
  params?: {
    limit: number;
    count: number;
    page: number;
  };
  setParams?: (params: any) => void;

  // Expandable row props
  enableRowExpansion?: boolean;
  renderDetailView?: (selectedRow: any) => React.ReactNode;
  columnsToHideOnExpansion?: number; // Number of columns to hide from the end (e.g., 2 = last 2 columns)

  // Table styling
  classNames?: Partial<{
    base: string;
    table: string;
    thead: string;
    tbody: string;
    tr: string;
    th: string;
    td: string;
    tfoot: string;
    sortIcon: string;
    emptyWrapper: string;
  }>;

  // Mobile support
  mobileFriendly?: boolean;
  mobileHeaders?: Array<{ key: string; label: any } | string>;
  mobileHeadersClassname?: string;
  bottomContentOnMobile?: (props: any) => React.ReactNode;

  // Click handlers
  onclick?: (key: Key) => void;
  onRowActionClick?: (actionKey: string, rowData: any) => void;

  // Top content props - making it fully customizable
  showTopContent?: boolean;
  title?: string;

  // Search functionality
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchIcon?: string;

  // Filter functionality
  showDateFilter?: boolean;
  showFilter?: boolean;
  filterLabel?: string;
  filterOptions?: FilterOption[];
  filterValue?: Selection;
  onFilterChange?: (selection: Selection) => void;

  // Additional filters for multiple filter support
  additionalFilters?: Array<{
    label: string;
    options: FilterOption[];
    value: Selection;
    onChange: (selection: Selection) => void;
  }>;

  // Action buttons in top content
  topActions?: TopContentAction[];

  // Action buttons for selection mode (floating bar)
  selectionActions?: TopContentAction[];

  // Add button
  showAddButton?: boolean;
  addButtonText?: string;
  addButtonIcon?: string;
  onAddButtonClick?: () => void;

  // Row actions dropdown
  rowActions?: TableAction[];
  rowActionsDisabledKeys?: string[];

  // Container styles
  containerStyles?: string;
  containerMinHeight?: string;

  // Additional modals or components
  additionalModals?: React.ReactNode;

  // Refresh callback
  onRefresh?: () => void;

  // Client-side pagination
  pageSize?: number;

  // Selection props
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Selection | "all";
  onSelectionChange?: (keys: Selection | "all") => void;

  // Inline accordion props
  enableInlineAccordion?: boolean;
  expandedRowIds?: Record<string, boolean>;
  onRowExpandToggle?: (rowId: string) => void;
  renderInlineAccordion?: (row: any) => React.ReactNode;
}

const EnhancedTableComponent: React.FC<EnhancedTableProps> = ({
  // Core table props
  columns,
  rows,
  isLoading = false,
  isFetching = false,

  // Pagination
  isPaginated = false,
  params,
  setParams,

  // Expandable row props
  enableRowExpansion = false,
  renderDetailView,
  columnsToHideOnExpansion = 0,

  // Styling
  classNames = {
    th: "bg-transparent font-semibold border-b dark:border-border",
    tbody: "divide-y",
  },

  // Mobile
  mobileFriendly = true,
  mobileHeaders = columns,
  mobileHeadersClassname = "grid grid-cols-[1fr,auto] items-center",
  bottomContentOnMobile,

  // Click handlers
  onclick,
  onRowActionClick,

  // Top content
  showTopContent = true,
  title = "",

  // Search
  showSearch = true,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  searchIcon = "si:search-line",

  showDateFilter = false,

  // Filter
  showFilter = true,
  filterLabel = "Status",
  filterOptions = [],
  filterValue = new Set(["all"]),
  onFilterChange,

  // Additional filters
  additionalFilters = [],

  // Actions
  topActions = [],
  selectionActions = [],

  // Add button
  showAddButton = true,
  addButtonText = "Add New",
  addButtonIcon = "fluent:add-24-filled",
  onAddButtonClick,

  // Row actions
  rowActions = [],
  rowActionsDisabledKeys = [],

  // Container
  containerStyles = "min-h-[540px] max-h-fit rounded-xl",

  // Additional
  additionalModals,

  // Refresh
  onRefresh,

  // Client-side pagination
  pageSize = 8,

  // Selection
  selectionMode,
  selectedKeys,
  onSelectionChange,

  // Inline accordion props
  enableInlineAccordion = false,
  expandedRowIds,
  onRowExpandToggle,
  renderInlineAccordion,
}) => {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const [localFilterValue, setLocalFilterValue] =
    useState<Selection>(filterValue);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle search change
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchValue(value);
      if (onSearchChange) {
        onSearchChange(value);
      }
    },
    [onSearchChange],
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    (selection: Selection) => {
      setLocalFilterValue(selection);
      if (onFilterChange) {
        onFilterChange(selection);
      }
    },
    [onFilterChange],
  );

  // Handle clearing all filters and search
  const handleClearFilters = useCallback(() => {
    setLocalSearchValue("");
    if (onSearchChange) onSearchChange("");

    const defaultSelection = new Set(["all"]);
    setLocalFilterValue(defaultSelection);
    if (onFilterChange) onFilterChange(defaultSelection);

    additionalFilters.forEach(f => {
      f.onChange(defaultSelection);
    });
    setCurrentPage(1);
  }, [onSearchChange, onFilterChange, additionalFilters]);

  // Detect if any filter/search is active
  const hasActiveFilters = useMemo(() => {
    if (localSearchValue && localSearchValue.trim() !== "") return true;
    const filterArr = localFilterValue instanceof Set
      ? Array.from(localFilterValue)
      : [];
    if (filterArr.length > 0 && filterArr[0] !== "all") return true;
    return additionalFilters.some(f => {
      const arr = f.value instanceof Set ? Array.from(f.value) : [];
      return arr.length > 0 && arr[0] !== "all";
    });
  }, [localSearchValue, localFilterValue, additionalFilters]);

  // Handle row click for expansion
  const handleRowClick = useCallback(
    (rowKey: Key, rowData: any, event: React.MouseEvent) => {
      // Prevent expansion if clicked on interactive elements
      const target = event.target as HTMLElement;
      const isInteractiveElement =
        target.closest("button") ||
        target.closest('[role="checkbox"]') ||
        target.closest(".dropdown") ||
        target.closest('[data-slot="trigger"]');

      if (isInteractiveElement || !enableRowExpansion) {
        // Call the original onclick if it exists
        if (onclick) {
          onclick(rowKey);
        }
        return;
      }

      // Get consistent row identifier - prioritize the same ID that table rows use
      const currentRowId = rowData.id || rowKey;
      const selectedRowId = selectedRow?.id;

      // Toggle selection: if same row is clicked, deselect it
      if (selectedRow && selectedRowId === currentRowId) {
        setSelectedRow(null);
      } else {
        setSelectedRow(rowData);
      }
    },
    [selectedRow, enableRowExpansion, onclick],
  );

  // Process rows to add actions dropdown if rowActions are provided
  const processedRows = useMemo(() => {
    if (rowActions.length === 0) return rows;

    return rows.map((row) => {
      // Use row-specific actions if available, otherwise use the global rowActions
      const actions = row.rowActions || rowActions;

      return {
        ...row,
        actions: (
          <div className="relative flex justify-end items-center gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="light">
                  <Icon
                    icon="ant-design:more-outlined"
                    className="text-[19px]"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disabledKeys={rowActionsDisabledKeys}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const [actionKey] = Array.from(keys);
                  if (onRowActionClick && actionKey) {
                    onRowActionClick(String(actionKey), row);
                  }
                }}
              >
                {actions.map((action) => (
                  <DropdownItem
                    key={action.key}
                    className={action.className}
                    startContent={
                      action.icon ? (
                        <Icon icon={action.icon} className="text-lg" />
                      ) : (
                        action.startContent || null
                      )
                    }
                  >
                    {action.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      };
    });
  }, [rows, rowActions, rowActionsDisabledKeys, onRowActionClick]);

  // Enhanced columns to include actions and handle column hiding
  const enhancedColumns = useMemo(() => {
    let baseColumns = columns;

    // Add actions column if rowActions are provided
    if (rowActions.length > 0) {
      const hasActionsColumn = columns.some((col) => col.key === "actions");
      if (!hasActionsColumn) {
        baseColumns = [...columns, { key: "actions", label: "" }];
      }
    }

    // Hide the last N columns if detail view is open and we have columns to hide
    if (enableRowExpansion && selectedRow && columnsToHideOnExpansion > 0) {
      baseColumns = baseColumns.slice(0, -columnsToHideOnExpansion);
    }

    return baseColumns;
  }, [
    columns,
    rowActions,
    enableRowExpansion,
    selectedRow,
    columnsToHideOnExpansion,
  ]);

  // Top content section
  const topContent = useMemo(() => {
    if (!showTopContent) return null;

    return (
      <div className="flex flex-col gap-3">
        {title && (
          <h4 className="capitalize text-muted-foreground font-semibold">
            {title}
          </h4>
        )}

        <div className="flex justify-between gap-3 lg:items-end flex-col lg:flex-row items-center mb-4">
          <div className="flex lg:flex-row lg:items-center flex-col items-center gap-2 w-full">
            {/* Search Input */}
            {showSearch && (
              <Input
                isClearable
                classNames={{
                  base: "w-full lg:w-[20rem] h-[2.5rem] text-xs placeholder-xs",
                  inputWrapper:
                    "border-1 border-border h-full",
                }}
                placeholder={searchPlaceholder}
                size="sm"
                startContent={
                  <Icon
                    icon={searchIcon}
                    className="text-[19px] text-gray-400"
                  />
                }
                value={localSearchValue}
                variant="bordered"
                onClear={() => handleSearchChange("")}
                onValueChange={handleSearchChange}
              />
            )}

            {/* Filter Dropdown */}
            {showFilter && filterOptions.length > 0 && (
              <Dropdown>
                <DropdownTrigger className="flex">
                  <Button
                    endContent={
                      <Icon icon="stash:chevron-down" className="text-[20px]" />
                    }
                    size="sm"
                    variant="flat"
                    className="flex items-center gap-2 pl-4 py-2 h-[38px] bg-muted border rounded-md transition-colors text-nowrap border-border"
                  >
                    {filterLabel}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection
                  aria-label="Filter Options"
                  closeOnSelect={false}
                  selectedKeys={localFilterValue}
                  selectionMode="single"
                  onSelectionChange={handleFilterChange}
                >
                  {filterOptions.map((option) => (
                    <DropdownItem key={option.uid} className="capitalize">
                      {capitalize(option.name)}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}

            {/* Additional Filters */}
            {additionalFilters.map((filter, index) => (
              <Dropdown key={index}>
                <DropdownTrigger className="flex">
                  <Button
                    endContent={
                      <Icon icon="stash:chevron-down" className="text-[20px]" />
                    }
                    size="sm"
                    variant="flat"
                    className="flex items-center gap-2 pl-4 py-2 h-[38px] bg-muted border rounded-md transition-colors text-nowrap border-border"
                  >
                    {filter.label}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection
                  aria-label={`${filter.label} Filter Options`}
                  closeOnSelect={false}
                  selectedKeys={filter.value}
                  selectionMode="single"
                  onSelectionChange={filter.onChange}
                >
                  {filter.options.map((option) => (
                    <DropdownItem key={option.uid} className="capitalize">
                      {capitalize(option.name)}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            ))}

            {/* Top Actions */}
            {topActions.map((action, index) => (
              <React.Fragment key={index}>
                {action.customComponent ? (
                  action.customComponent
                ) : (
                  <Button
                    isLoading={action.loading}
                    variant={action.variant || "light"}
                    radius="none"
                    color={action.color}
                    className={action.className || "text-primary-cct"}
                    startContent={
                      action.icon ? (
                        typeof action.icon === "string" ? (
                          <Icon icon={action.icon} className="text-[19px]" />
                        ) : (
                          action.icon
                        )
                      ) : undefined
                    }
                    onPress={action.onPress}
                  >
                    {action.title}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Add Button + Refresh */}
          <div className="flex gap-2 items-center">
            {onRefresh && (
              <Button
                isIconOnly
                variant="flat"
                size="sm"
                className="border border-border text-muted-foreground hover:text-foreground"
                onPress={onRefresh}
                title="Refresh"
              >
                <Icon icon="solar:refresh-bold" className="text-[16px]" />
              </Button>
            )}
            {showAddButton && (
              <Button
                variant="light"
                radius="none"
                className="text-primary-cct"
                startContent={
                  <Icon icon={addButtonIcon} className="text-[19px]" />
                }
                onPress={onAddButtonClick}
                size="md"
              >
                {addButtonText}
              </Button>
            )}
          </div>
          {showDateFilter && (
            <div className="flex justify-items-end">
              <DateFilter />
            </div>
          )}
        </div>

        {/* Additional Modals */}
        {additionalModals}

        {/* Floating Action Bar for Selection */}
        <AnimatePresence>
          {selectionActions.length > 0 &&
            ((selectedKeys === "all" && rows.length > 0) ||
              (selectedKeys instanceof Set && selectedKeys.size > 0)) && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-border dark:border-gray-700 shadow-xl rounded px-6 py-3 flex items-center gap-6 min-w-[300px] justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {selectedKeys === "all" ? rows.length : selectedKeys.size}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      selected
                    </span>
                  </div>
                  <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-muted-foreground hover:text-gray-700 rounded-none dark:hover:text-gray-200 min-w-0 px-2"
                    onPress={() =>
                      onSelectionChange && onSelectionChange(new Set([]))
                    }
                  >
                    Clear
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectionActions.map((action, index) => (
                    <React.Fragment key={index}>
                      {action.customComponent ? (
                        action.customComponent
                      ) : (
                        <Button
                          isLoading={action.loading}
                          variant={action.variant || "light"}
                          size="sm"
                          color={action.color || "default"}
                          className={
                            action.className || "rounded-none text-primary-cct"
                          }
                          startContent={
                            action.icon ? (
                              typeof action.icon === "string" ? (
                                <Icon
                                  icon={action.icon}
                                  className="text-[18px]"
                                />
                              ) : (
                                action.icon
                              )
                            ) : undefined
                          }
                          onPress={action.onPress}
                        >
                          {action.title}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
  }, [
    showTopContent,
    showDateFilter,
    title,
    showSearch,
    searchPlaceholder,
    searchIcon,
    localSearchValue,
    showFilter,
    filterLabel,
    filterOptions,
    localFilterValue,
    additionalFilters,
    topActions,
    showAddButton,
    addButtonText,
    addButtonIcon,
    onAddButtonClick,
    additionalModals,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    onRefresh,
  ]);

  // Client-side pagination
  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  return (
    <CustomContainerComponent styles={containerStyles}>
      {topContent}

      {/* Empty state with smart clear-filters */}
      {!isLoading && processedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Icon icon="ph:tray" className="text-6xl text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-muted-foreground font-medium">No results found</p>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground/70 mt-1">Your filters or search returned no results</p>
            )}
          </div>
          {hasActiveFilters && (
            <UIbutton
              size="sm"
              variant="outline"
              radius="default"
              className="border border-border "
              onClick={handleClearFilters}
            >
              <Icon icon="ph:x-circle" className="mr-1.5 text-base" />
              Clear filters
            </UIbutton>
          )}
        </div>
      )}

      {/* Main Layout Container */}
      {(isLoading || processedRows.length > 0) && (
        <div className="relative">
          {/* Table Container - Slides left when detail view opens */}
          <motion.div
            className="w-full"
            animate={{
              width: enableRowExpansion && selectedRow ? "60%" : "100%",
            }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {/* Scrollable table area with max height */}
            <div className="maxh-[520px] h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-hide scroll-smooth scrollbar-thumb-border">
              <CustomTableComponent
                columns={enhancedColumns}
                rows={paginatedRows}
                isLoading={isLoading}
                classNames={classNames}
                isFetching={isFetching}
                isPaginated={false}
                onclick={
                  enableRowExpansion
                    ? (key) => {
                        const rowData = paginatedRows.find(
                          (row) => (row.id || row.key) === key,
                        );
                        if (rowData) {
                          handleRowClick(key, rowData, {
                            target: document.body,
                          } as any);
                        }
                      }
                    : onclick
                }
                mobileHeaders={mobileHeaders}
                mobileFriendly={mobileFriendly}
                mobileHeadersClassname={mobileHeadersClassname}
                bottomContentOnMoblile={bottomContentOnMobile}
                selectionMode={selectionMode as any}
                selected={selectedKeys}
                onSelectionChange={onSelectionChange}
                selectedRowId={selectedRow ? selectedRow.id : undefined}
                enableInlineAccordion={enableInlineAccordion}
                expandedRowIds={expandedRowIds}
                onRowExpandToggle={onRowExpandToggle}
                renderInlineAccordion={renderInlineAccordion}
              />
            </div>

            {/* Client-side Pagination bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-4 pb-2 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    isDisabled={currentPage === 1}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="border border-border"
                  >
                    <Icon icon="ph:caret-left" className="text-base" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      isIconOnly
                      size="sm"
                      variant={currentPage === page ? "solid" : "flat"}
                      color={currentPage === page ? "primary" : "default"}
                      onPress={() => setCurrentPage(page)}
                      className={currentPage !== page ? "border border-border" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    isDisabled={currentPage === totalPages}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="border border-border"
                  >
                    <Icon icon="ph:caret-right" className="text-base" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Detail View Panel - Slides in from right */}
          <AnimatePresence>
            {enableRowExpansion && selectedRow && renderDetailView && (
              <motion.div
                initial={{ x: "-70%" }}
                animate={{ x: 0 }}
                exit={{ x: "0%" }}
                transition={{
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="absolute top-0 right-0 w-[39%] h-full bg-background border-l border-border rounded-xl overflow-hidden flex-shrink-0 z-10"
              >
                {/* Close Button */}
                <Button
                  isIconOnly
                  variant="light"
                  className="absolute top-4 right-4 z-20 hover:bg-gray-100 transition-colors duration-200 rounded-full"
                  onPress={() => setSelectedRow(null)}
                  size="sm"
                >
                  <Icon icon="mdi:close" className="text-lg text-muted-foreground" />
                </Button>

                {/* Detail Content */}
                <div className="h-full w-full">
                  {renderDetailView(selectedRow.__record || selectedRow)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </CustomContainerComponent>
  );
};

export default EnhancedTableComponent;
