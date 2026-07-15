import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  getKeyValue,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import React, { Key, useMemo, useState } from "react";
import LogoComponent from "@/components/shared/logo.component";
import Pagination from "@/components/shared/pagination";
import useScreenSize from "@/hooks/useScreenSize";
import { isEmpty, isEqual } from "lodash";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "../ui/button";

interface ICustomTableComponent {
  columns: Array<{ key: string; label: any } | string>;
  customColumns?: boolean;
  rows: Array<any>;
  isLoading?: boolean;
  isPaginated?: boolean;
  isFetching?: boolean;
  isStriped?: boolean;
  isHeaderSticky?: boolean;
  classNames: Partial<{
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
  selectionMode?: SelectionMode;
  onclick?: (key: Key) => void;
  onSelectionChange?: (key: any) => void;
  refetch?: () => void;
  params?: any;
  setParams?: any;
  selected?: any;
  others?: any;
  mobileFriendly?: boolean;
  mobileHeaders?: Array<{ key: string; label: any } | string>;
  mobileHeadersClassname?: string;
  bottomContentOnMoblile?: (props: any) => React.ReactNode;
  enableSmartHiding?: boolean; // New prop to enable smart column hiding
  selectedRowId?: string | number; // New prop for highlighting selected row
  enableInlineAccordion?: boolean;
  expandedRowIds?: Record<string, boolean>;
  onRowExpandToggle?: (rowId: string) => void;
  renderInlineAccordion?: (row: any) => React.ReactNode;
}

const CustomTableComponent: React.FC<ICustomTableComponent> = ({
  columns,
  rows,
  isLoading = false,
  isFetching = false,
  classNames,
  isPaginated = false,
  isHeaderSticky = false,
  isStriped = false,
  selectionMode = "none",
  onclick,
  params = {},
  setParams,
  refetch,
  onSelectionChange,
  selected = [],
  others = {},
  mobileFriendly = false,
  mobileHeaders = [],
  mobileHeadersClassname = "",
  bottomContentOnMoblile,
  enableSmartHiding = true, // Default to true - enabled by default
  selectedRowId,
  enableInlineAccordion = false,
  expandedRowIds,
  onRowExpandToggle,
  renderInlineAccordion,
}) => {
  const headers = columns;
  const screenSize = useScreenSize();
  const display_pagination = params?.count > params?.limit && isPaginated;
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpanded = (index: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useMemo(() => {
    rows.forEach((row) =>
      setExpandedRows((prev) => ({
        ...prev,
        [row.id ? row.id : row?.key]: false,
      }))
    );
  }, [rows]);

  // Helper function to check if a cell value should be hidden
  const shouldHideCell = (rowIndex: number, columnKey: string) => {
    // Feature is disabled by default - must be explicitly enabled
    if (!enableSmartHiding) return false;

    if (rowIndex === 0) return false; // Always show first row

    // Only apply smart hiding to the first column
    const firstColumnKey =
      typeof headers[0] === "string" ? headers[0] : headers[0]?.key;

    if (columnKey !== firstColumnKey) return false;

    const currentRow = rows[rowIndex];
    const previousRow = rows[rowIndex - 1];

    // Try to get raw value first (for tables that store _raw values)
    const rawColumnKey = `${columnKey}_raw`;
    const currentValue =
      currentRow[rawColumnKey] !== undefined
        ? currentRow[rawColumnKey]
        : currentRow[columnKey];
    const previousValue =
      previousRow[rawColumnKey] !== undefined
        ? previousRow[rawColumnKey]
        : previousRow[columnKey];

    // Skip comparison for undefined or null
    if (
      currentValue === undefined ||
      previousValue === undefined ||
      currentValue === null ||
      previousValue === null
    ) {
      return false;
    }

    // Check if values are React elements
    const isCurrentReactElement =
      typeof currentValue === "object" &&
      (currentValue.$$typeof || currentValue.props);
    const isPreviousReactElement =
      typeof previousValue === "object" &&
      (previousValue.$$typeof || previousValue.props);

    // If either value is a React element, try to extract text content for comparison
    if (isCurrentReactElement || isPreviousReactElement) {
      // Try to get text content from React elements
      const getCurrentText = (val: any): string => {
        if (typeof val === "string" || typeof val === "number")
          return String(val);
        if (!val) return "";
        if (val.props?.children) {
          if (
            typeof val.props.children === "string" ||
            typeof val.props.children === "number"
          ) {
            return String(val.props.children);
          }
          if (Array.isArray(val.props.children)) {
            return val.props.children
              .map((child: any) => getCurrentText(child))
              .join("");
          }
          return getCurrentText(val.props.children);
        }
        return "";
      };

      const currentText = getCurrentText(currentValue).trim();
      const previousText = getCurrentText(previousValue).trim();

      // Only hide if both have text content and they match
      if (currentText && previousText && currentText === previousText) {
        return true;
      }
      return false;
    }

    // For primitive values, use simple equality
    if (typeof currentValue !== "object" && typeof previousValue !== "object") {
      return currentValue === previousValue;
    }

    // For objects/arrays, use lodash isEqual for deep comparison
    return isEqual(currentValue, previousValue);
  };
  const bottomContent = display_pagination ? (
    <div className="w-full flex justify-end items-center py-3 px-2 mt-2">
      <Pagination
        currentPage={params?.page}
        totalPages={Math.ceil(params?.count / params?.limit)}
        onPageChange={(page) => setParams({ ...params, page: page })}
      />
    </div>
  ) : <></>;

  if (screenSize != "desktop" && mobileFriendly) {
    return (
      <div className="p-2 relative">
        <div
          className={cn(
            " mt-4 mb-2   p-3 cursor-pointer uppercase font-medium  text-xs rounded-none",
            mobileHeadersClassname
          )}
        >
          {mobileHeaders.map((i) => (
            <h4 key={typeof i == "string" ? i : i.key} className="">
              {typeof i == "string" ? i : i.label}
            </h4>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 mt-4 mb-10">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Spinner withBackdrop={true} />
            </div>
          ) : isEmpty(rows) ? (
            <>
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Icon icon="ph:tray" className="text-4xl text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium text-sm">Nothing to show here.</p>
            </div>
          </>
          ) : (
            <>
              {rows?.map((row) => {
                const rowId = row?.id || row?.key;
                const isExpanded = expandedRows[rowId] || false;

                return (
                  <div
                    key={rowId}
                    className={cn(
                      "px-2 py-4 rounded-md relative bg-card text-card-foreground border border-border shadow-sm transition-all duration-200 text-[13px]"
                    )}
                    onClick={() => {
                      toggleExpanded(rowId);
                    }}
                  >
                    <div className={cn(mobileHeadersClassname, "w-full")}>
                      {mobileHeaders?.map((header) => {
                        const headerKey =
                          typeof header == "string" ? header : header.key;
                        const cellValue = getKeyValue(row, headerKey);

                        return (
                          <div
                            key={headerKey}
                            className={cn(
                              "px-3 transition-opacity duration-300 ease-in-out"
                            )}
                          >
                            {cellValue}
                          </div>
                        );
                      })}
                    </div>

                    {/* bottom Contente */}

                    {isExpanded && (
                      <div className="bg-muted mt-4 p-3 rounded-lg border border-border/50">
                        {bottomContentOnMoblile && bottomContentOnMoblile(row)}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        {bottomContent}
      </div>
    );
  }

  if (enableInlineAccordion) {
    return (
      <div className="w-full overflow-x-auto">
        <table className={cn("w-full text-left border-collapse", classNames?.table)}>
          <thead>
            <tr className={cn("border-b border-border bg-muted/5 text-xs text-muted-foreground font-semibold uppercase", classNames?.thead)}>
              <th className="px-6 py-4 w-12"></th>
              {headers.map((column: any) => {
                const colKey = typeof column === "string" ? column : column.key;
                const colLabel = typeof column === "string" ? column : column.label;
                return (
                  <th
                    key={colKey}
                    className={cn(
                      "px-6 py-4 uppercase font-medium text-xs text-muted-foreground text-left",
                      colKey === "paid_amount" && "text-right",
                      colKey === "actions" && "text-right",
                      classNames?.th
                    )}
                  >
                    {colLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-border", classNames?.tbody)}>
            {isLoading || isFetching ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-16">
                  <div className="flex items-center justify-center">
                    <Spinner withBackdrop={true} />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-16">
                  <div className="flex flex-col items-center justify-center text-center gap-3">
                    <Icon icon="ph:tray" className="text-5xl text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium text-sm">Nothing to show here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const rowId = row.id || row.key;
                const isExpanded = expandedRowIds ? !!expandedRowIds[rowId] : false;

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const isInteractiveElement =
                          target.closest("button") ||
                          target.closest('[role="checkbox"]') ||
                          target.closest(".dropdown") ||
                          target.closest('[data-slot="trigger"]');
                        if (isInteractiveElement) return;

                        if (onRowExpandToggle) {
                          onRowExpandToggle(rowId);
                        } else if (onclick) {
                          onclick(rowId);
                        }
                      }}
                      className={cn(
                        "hover:bg-muted/50 transition-colors cursor-pointer group border-b border-border/50 last:border-0",
                        selectedRowId === rowId && "bg-muted/50",
                        classNames?.tr
                      )}
                    >
                      <td className="px-6 py-4 w-12">
                        {isExpanded ? (
                          <Icon icon="lucide:chevron-up" className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                          <Icon icon="lucide:chevron-down" className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </td>
                      {headers.map((column: any) => {
                        const colKey = typeof column === "string" ? column : column.key;
                        const cellValue = getKeyValue(row, colKey);
                        const shouldHide = shouldHideCell(rowIndex, colKey);

                        return (
                          <td
                            key={colKey}
                            className={cn(
                              "px-6 py-4 text-sm text-foreground transition-all duration-300 ease-in-out group-hover:opacity-100",
                              shouldHide && "opacity-0 group-hover:opacity-100",
                              colKey === "actions" && "text-right",
                              classNames?.td
                            )}
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && renderInlineAccordion && (
                      <tr>
                        <td colSpan={headers.length + 1} className="px-6 py-4 bg-muted/10 border-b border-border">
                          {renderInlineAccordion(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        {bottomContent}
      </div>
    );
  }

  return (
    <Table
      aria-label="custom-table"
      className="h-full relative mt-1 flex flex-col text-[8px]"
      removeWrapper
      isStriped={isStriped}
      isHeaderSticky={isHeaderSticky}
      selectionMode={selectionMode as "none"}
      classNames={{
        wrapper: "bg-transparent shadow-none p-0",
        th: "bg-transparent text-muted-foreground border-b border-border",
        tr: "hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
        td: cn("py-3 text-sm text-foreground", classNames?.td),
        ...classNames,
      }}
      onRowAction={onclick ? (key) => onclick(key) : undefined}
      onSelectionChange={onSelectionChange}
      selectedKeys={selected}
      checkboxesProps={{
        radius: "none",
        classNames: {
          icon: "text-primary-cct",
          base: "bg-transparent after:bg-white",
          wrapper:
            "bg-transparent after:bg-transparent after:rounded-[2px] before:rounded-[2px] before:border-[1.5px] after:border-[1.5px] after:border-primary-cct",
        },
        size: "md",
      }}
      bottomContent={bottomContent}
      {...others}
    >
      <TableHeader columns={headers}>
        {(column: any) => (
          <TableColumn
            key={column.key}
            className={cn(
              "uppercase font-medium !border-b border-border text-xs rounded-none bg-transparent text-muted-foreground",
              column.key == "paid_amount" && "text-right"
            )}
          >
            <p className="">{column.label}</p>
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        items={rows}
        emptyContent={
          !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Icon icon="ph:tray" className="text-5xl text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium text-sm">Nothing to show here.</p>
            </div>
          )
        }
        isLoading={isLoading}
        loadingContent={
          <div className="flex items-center justify-center py-16">
            <Spinner withBackdrop={true}/>
          </div>
        }
      >
        {(row) => {
          const rowIndex = rows.findIndex(
            (r) => (r.id || r.key) === (row.id || row.key)
          );
          const rowId = row.id || row.key;

          return (
            <TableRow
              key={rowId}
              className={cn(
                "transition-all duration-200 ease-in-out hover:bg-secondary-gray/30 group hover:cursor-pointer",
                onclick && "hover:cursor-pointer",
                selectedRowId === rowId &&
                  "bg-muted/50 relative z-10",
                row.rowClassName
              )}
            >
              {(columnKey) => {
                const cellValue = getKeyValue(row, columnKey);
                const shouldHide = shouldHideCell(
                  rowIndex,
                  columnKey as string
                );

                return (
                  <TableCell
                    className={cn(
                      "transition-all duration-300 ease-in-out group-hover:opacity-100",
                      shouldHide &&
                        "opacity-0 group-hover:opacity-100 animate-in"
                    )}
                  >
                    {cellValue}
                  </TableCell>
                );
              }}
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
};

export default CustomTableComponent;


