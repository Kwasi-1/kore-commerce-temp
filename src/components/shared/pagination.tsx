import { cn } from "@/lib/utils";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/utils/pageWindow";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const arrowClass =
  "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-35 disabled:pointer-events-none";

/**
 * Page controls for tables: ‹ 1 2 3 … 20 ›, ‹ 1 … 10 11 12 … 20 ›, ‹ 1 … 18 19 20 › on wider screens, and
 * ‹ 10 / 20 › on phones. Hidden when everything fits on one page.
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;
  const go = (page: number) => onPageChange(Math.min(totalPages, Math.max(1, page)));

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-0.5", className)}>
      <button type="button" className={arrowClass} onClick={() => go(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="hidden sm:flex items-center gap-0.5">
        {pageWindow(currentPage, totalPages).map((page) =>
          typeof page !== "number" ? (
            <span key={page} className="w-6 text-center text-xs text-muted-foreground select-none" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => go(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 px-2 rounded-md text-sm tabular-nums transition-colors",
                page === currentPage
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <span className="sm:hidden px-2 text-sm tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages}
      </span>

      <button type="button" className={arrowClass} onClick={() => go(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
};

export default Pagination;
