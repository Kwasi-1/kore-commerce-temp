import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CompactPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** What the rows are, e.g. "days" or "shifts" */
  noun?: string;
  className?: string;
}

/** "1–15 of 304 days  ‹ ›" footer for tables paged in the browser. Hidden when everything fits. */
export default function CompactPagination({ page, pageSize, total, onPageChange, noun, className }: CompactPaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 py-3 border-t border-border/50 text-xs text-muted-foreground', className)}>
      <span>
        {from}–{to} of {total}{noun ? ` ${noun}` : ''}
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-1 tabular-nums">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
