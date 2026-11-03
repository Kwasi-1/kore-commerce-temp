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

/**
 * Where a column goes on the phone/tablet card. Once any column has a role, columns without one
 * are left off the card; a table with no roles keeps the old cell-by-cell card.
 * - thumb: an image or avatar on the left · title: the main identifier · subtitle: a quiet line under it
 * - value: the number that matters, right-aligned · badge: status chips under the value
 * - detail: a "label value" pair; under the title on phones, its own aligned column from md
 *   (`mobileWidth` sets that column's width, default 8rem) · action: the row's menu (the shared
 *   `actions` column gets this automatically) · hidden: kept off the card
 */
export type MobileRole = "thumb" | "title" | "subtitle" | "value" | "badge" | "detail" | "action" | "hidden";

export type TableColumnDef = { key: string; label: any; mobile?: MobileRole; mobileWidth?: string } | string;

interface ICustomTableComponent {
  columns: Array<TableColumnDef>;
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
  mobileHeaders?: Array<TableColumnDef>;
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
    // Columns by card role; the shared actions column always becomes the row's action
    type RoleColumn = { key: string; label: any; mobile?: MobileRole; mobileWidth?: string };
    const roleOf = (col: TableColumnDef): MobileRole | undefined =>
      typeof col === "string" ? undefined : col.mobile ?? (col.key === "actions" ? "action" : undefined);
    const roleColumns = headers.filter((col) => typeof col !== "string") as RoleColumn[];
    const usesRoles = roleColumns.some((col) => col.mobile);
    const byRole = (role: MobileRole) => roleColumns.filter((col) => roleOf(col) === role);
    const thumbs = byRole("thumb");
    const titles = byRole("title");
    const subtitles = byRole("subtitle");
    const values = byRole("value");
    const badges = byRole("badge");
    const details = byRole("detail");
    const actionCols = byRole("action");
    // From md, up to three details sit inline as fixed-width columns (so they line up row to
    // row); any more stay under the title, as on phones
    const inlineDetails = details.slice(0, 3);
    const extraDetails = details.slice(3);
    const clickable = !!onclick || !!bottomContentOnMoblile;

    const detailPair = (row: any, col: RoleColumn) => (
      <span key={col.key} className="inline-flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground">{col.label}</span>
        <span className="text-foreground">{getKeyValue(row, col.key)}</span>
      </span>
    );

    const listRow = (row: any) => (
      <>
        <div className="flex items-start gap-3">
          {thumbs.map((col) => (
            <div key={col.key} className="shrink-0">
              {getKeyValue(row, col.key)}
            </div>
          ))}
          <div className="min-w-0 flex-1 space-y-0.5">
            {titles.map((col) => (
              <div key={col.key} className="text-sm font-medium text-foreground break-words">
                {getKeyValue(row, col.key)}
              </div>
            ))}
            {subtitles.map((col) => (
              <div key={col.key} className="text-xs text-muted-foreground break-words">
                {getKeyValue(row, col.key)}
              </div>
            ))}
            {details.length > 0 && (
              <div className="md:hidden pt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {details.map((col) => detailPair(row, col))}
              </div>
            )}
            {extraDetails.length > 0 && (
              <div className="hidden md:flex pt-1.5 flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {extraDetails.map((col) => detailPair(row, col))}
              </div>
            )}
          </div>
          {inlineDetails.map((col) => (
            <div
              key={col.key}
              className="hidden md:block shrink-0 min-w-0 text-xs"
              style={{ width: col.mobileWidth || "8rem" }}
            >
              <p className="text-muted-foreground">{col.label}</p>
              <div className="text-foreground mt-0.5 break-words">{getKeyValue(row, col.key)}</div>
            </div>
          ))}
          {(values.length > 0 || badges.length > 0) && (
            <div className="shrink-0 flex flex-col items-end gap-1.5 text-right max-w-[45%] md:max-w-none md:w-36">
              {values.map((col) => (
                <div key={col.key} className="text-sm font-semibold text-foreground">
                  {getKeyValue(row, col.key)}
                </div>
              ))}
              {badges.map((col) => (
                <div key={col.key}>{getKeyValue(row, col.key)}</div>
              ))}
            </div>
          )}
          {actionCols.map((col) => (
            // The row menu handles its own taps; don't also open the row
            <div key={col.key} className="shrink-0 -mr-2 -mt-1" onClick={(e) => e.stopPropagation()}>
              {getKeyValue(row, col.key)}
            </div>
          ))}
          {clickable && actionCols.length === 0 && (
            <Icon icon="solar:alt-arrow-right-linear" className="shrink-0 self-center text-base text-muted-foreground" />
          )}
        </div>
      </>
    );

    return (
      // Bottom room so the floating mobile nav never covers the last row or the pagination
      <div className="pt-3 pb-24 lg:pb-0 relative">
        {isLoading || isFetching ? (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex justify-between gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 rounded bg-muted" />
                  <div className="h-3 w-3/5 rounded bg-muted" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : isEmpty(rows) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Icon icon="ph:tray" className="text-4xl text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium text-sm">Nothing to show here.</p>
          </div>
        ) : (
          // One list with dividers rather than boxed cards: reads straight down, no card-in-card
          <div className="rounded-xl border border-border bg-card text-card-foreground divide-y divide-border overflow-hidden">
            {rows?.map((row) => {
              const rowId = row?.id || row?.key;
              const isExpanded = expandedRows[rowId] || false;
              const onRowClick = () => {
                if (bottomContentOnMoblile) toggleExpanded(rowId);
                if (onclick) onclick(rowId);
              };

              return (
                <div
                  key={rowId}
                  className={cn(
                    "px-4 py-3.5 text-[13px] transition-colors",
                    clickable && "cursor-pointer hover:bg-muted/40 active:bg-muted/60",
                    selectedRowId === rowId && "bg-muted/50",
                  )}
                  onClick={onRowClick}
                >
                  {usesRoles ? (
                    listRow(row)
                  ) : (
                    <div className={cn(mobileHeadersClassname, "w-full")}>
                      {mobileHeaders?.map((header) => {
                        const headerKey = typeof header == "string" ? header : header.key;
                        return (
                          <div key={headerKey} className="px-1">
                            {getKeyValue(row, headerKey)}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isExpanded && bottomContentOnMoblile && (
                    <div className="bg-muted mt-3 p-3 rounded-lg border border-border/50" onClick={(e) => e.stopPropagation()}>
                      {bottomContentOnMoblile(row)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
                    key={columnKey}
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


