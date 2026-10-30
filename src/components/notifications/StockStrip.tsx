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
        'flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06]',
        compact ? 'px-3 py-2' : 'px-4 py-3',
      )}
    >
      <Icon icon="solar:box-minimalistic-linear" className={clsx('shrink-0 text-amber-600 dark:text-amber-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
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
