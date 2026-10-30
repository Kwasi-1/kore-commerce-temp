import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import { useCan } from '@/hooks/usePermissions';
import { NEEDS_RESTOCK_URL, useCanManageNotifications, type StockSummary } from '@/hooks/useNotifications';

interface Props {
  summary: StockSummary;
  /** Smaller, for the header bell */
  compact?: boolean;
  /** Runs before navigating (e.g. close the bell popover) */
  onNavigate?: () => void;
}

/**
 * What's at or below its alert level right now. Counted live on every load, so it's always
 * current; it isn't a notification and doesn't add to the unread badge. Hidden when nothing is low.
 */
export default function StockStrip({ summary, compact, onNavigate }: Props) {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = useCanManageNotifications();
  const total = summary.low + summary.out;
  if (total === 0) return null;

  const parts = [summary.out > 0 && `${summary.out} out of stock`, summary.low > 0 && `${summary.low} running low`].filter(Boolean);
  const canOpen = canManage && can(['stock.adjust', 'products.edit']);

  return (
    <div
      className={clsx(
        // Neutral like the notification rows: it's on screen most of the time, so colour would turn into noise
        'flex items-center gap-3 border bg-card border-border',
        compact ? 'rounded-lg px-3 py-2' : 'rounded-xl p-4',
      )}
    >
      {compact ? (
        <Icon icon="solar:box-minimalistic-linear" className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <div className="p-2.5 rounded-[10px] border shrink-0 bg-muted/50 border-border/80">
          <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5 text-foreground/80" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={clsx('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {total} item{total === 1 ? '' : 's'} need{total === 1 ? 's' : ''} restocking
        </p>
        <p className={clsx('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{parts.join(' · ')}</p>
      </div>
      {canOpen && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            navigate(NEEDS_RESTOCK_URL);
          }}
          className={clsx('shrink-0 font-semibold text-foreground hover:underline', compact ? 'text-[11px]' : 'text-xs')}
        >
          View →
        </button>
      )}
    </div>
  );
}
