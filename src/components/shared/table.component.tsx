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
  const bottomContent =
    refetch || display_pagination ? (
      <div className="w-full flex justify-between items-center py-3 px-2 mt-[20px]">
        {refetch && (
          <button
            disabled={isFetching}
            onClick={() => refetch()}
            className="disabled:pointer-events-none gap-x-1 text-[23px]"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <Icon
              icon={isFetching ? "eos-icons:loading" : "solar:refresh-bold"}
            />
          </button>
        )}

        {display_pagination && (
          <Pagination
            currentPage={params?.page}
            totalPages={Math.ceil(params?.count / params?.limit)}
            onPageChange={(page) => setParams({ ...params, page: page })}
          />
        )}
      </div>
    ) : (
      <></>
    );

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
            <LogoComponent />
          ) : isEmpty(rows) ? (
            <>
              <div className="flex flex-col items-center text-xs">
                <Icon icon="gg:info" className="text-2xl mb-2" />
                <p className="text-muted-foreground font-medium">Nothing to show here.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => refetch && refetch()}
                >
                  Clear Filters / Refresh
                </Button>
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
                      "px-2 py-4 rounded-sm relative bg-card text-card-foreground border border-border shadow-sm transition-all duration-200"
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
            <div className="flex flex-col items-center text-xs py-8">
              <Icon icon="gg:info" className="text-2xl mb-2 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">Nothing to show here.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-4" 
                onClick={() => refetch && refetch()}
              >
                Clear Filters / Refresh
              </Button>
            </div>
          )
        }
        isLoading={isLoading}
        loadingContent={
          <div className="flex flex-col items-center justify-center min-h-[200px] w-full bg-background/50 backdrop-blur-sm z-10 absolute inset-0">
            <Spinner />
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
                  "bg-muted/50 relative z-10"
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


