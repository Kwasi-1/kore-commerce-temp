import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import { useCan } from '@/hooks/usePermissions';
import { NEEDS_RESTOCK_URL, useCanManageNotifications, useRestockItems, type RestockItem, type StockSummary } from '@/hooks/useNotifications';
import { useNotificationAction } from './useNotificationAction';

interface Props {
  summary: StockSummary;
  /** Smaller, for the header bell: shows the first 5 when opened */
  compact?: boolean;
  /** Runs before navigating (e.g. close the bell popover) */
  onNavigate?: () => void;
  /** Page search: filters the items and opens the stack when something matches */
  search?: string;
}

const qty = (n: number) => String(Number(n.toFixed(3)));

function ItemRow({ item, compact, canRestock, busy, onRestock }: {
  item: RestockItem;
  compact?: boolean;
  canRestock: boolean;
  busy: boolean;
  onRestock: () => void;
}) {
  const out = item.quantity <= 0;
  return (
    <div className={clsx('flex items-center gap-3', compact ? 'px-3 py-2' : 'px-4 py-2.5')}>
      <div className={clsx('rounded-md bg-muted/60 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center', compact ? 'h-7 w-7' : 'h-9 w-9')}>
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon icon="solar:box-minimalistic-linear" className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-foreground', compact ? 'text-xs' : 'text-[13px] font-medium')}>
          {item.name}
          {item.variant && <span className="text-muted-foreground font-normal"> · {item.variant}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {out ? 'Out of stock' : `${qty(item.quantity)} ${item.quantity === 1 ? item.unit : `${item.unit}s`} left`}
          {!compact && ` · alert at ${qty(item.alert_level)}`}
          {!compact && item.sku && <span className="font-mono"> · {item.sku}</span>}
        </p>
      </div>
      {canRestock && (
        <button
          type="button"
          onClick={onRestock}
          disabled={busy}
          className={clsx(
            'shrink-0 rounded-md border border-border font-semibold text-foreground hover:bg-muted disabled:opacity-50',
            compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
          )}
        >
          {busy ? 'Opening…' : 'Restock'}
        </button>
      )}
    </div>
  );
}

/**
 * "N items need restocking", counted live (not a notification, not in the badge). Collapsed it's a
 * stack, like grouped iPhone notifications; tapping unfolds the items, out of stock first, with
 * Restock for people allowed to. Hidden when nothing is low.
 */
export default function StockStrip({ summary, compact, onNavigate, search = '' }: Props) {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = useCanManageNotifications();
  const reduceMotion = useReducedMotion();
  const { openRestock, canRestock, restockModal, loadingId } = useNotificationAction();
  const [open, setOpen] = useState(false);
  const searching = !!search.trim();

  // A search that matches items opens the stack, so matches are never hidden inside it
  useEffect(() => {
    if (searching) setOpen(true);
  }, [searching]);

  const perPage = compact ? 5 : 20;
  const items = useRestockItems(open, search, perPage);
  const loaded = items.data?.pages.flatMap((p) => p.items) ?? [];
  const matchTotal = items.data?.pages[0]?.total ?? 0;

  const total = summary.low + summary.out;
  if (total === 0) return null;
  // Searching and nothing in the stack matches: stay out of the way
  if (searching && items.isSuccess && matchTotal === 0) return null;

  const parts = [summary.out > 0 && `${summary.out} out of stock`, summary.low > 0 && `${summary.low} running low`].filter(Boolean);
  const canOpenStockLevels = canManage && can(['stock.adjust', 'products.edit']);
  const goToStockLevels = () => {
    onNavigate?.();
    navigate(NEEDS_RESTOCK_URL);
  };
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 36 };

  return (
    <div className="relative">
      {/* The peeking cards behind a closed stack */}
      <AnimatePresence initial={false}>
        {!open &&
          [2, 1].map((depth) => (
            <motion.div
              key={depth}
              aria-hidden
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: depth * (compact ? 4 : 6) }}
              exit={{ opacity: 0, y: 0 }}
              transition={spring}
              className={clsx('absolute inset-x-0 top-0 border border-border bg-card', compact ? 'rounded-lg bottom-2' : 'rounded-xl bottom-3')}
              style={{ scale: 1 - depth * 0.035, transformOrigin: 'bottom center', zIndex: 0 }}
            />
          ))}
      </AnimatePresence>

      <motion.div layout={!reduceMotion} transition={spring} className={clsx('relative z-10 border border-border bg-card overflow-hidden', compact ? 'rounded-lg' : 'rounded-xl')}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={clsx('w-full flex items-center gap-3 text-left', compact ? 'px-3 py-2' : 'p-4')}
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
          <span className={clsx('shrink-0 font-semibold text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
            {open ? 'Show less' : 'Show'}
          </span>
          <Icon icon={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="items"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={spring}
              className="border-t border-border/70"
            >
              {items.isLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : items.isError ? (
                <p className="py-5 text-center text-xs text-muted-foreground">Couldn't load the items.</p>
              ) : (
                <motion.div
                  className="divide-y divide-border/50"
                  initial="hidden"
                  animate="shown"
                  variants={{ shown: { transition: { staggerChildren: reduceMotion ? 0 : 0.025 } } }}
                >
                  {loaded.map((item) => (
                    <motion.div
                      key={item.variant_id}
                      variants={{ hidden: { opacity: 0, y: reduceMotion ? 0 : -8 }, shown: { opacity: 1, y: 0 } }}
                    >
                      <ItemRow
                        item={item}
                        compact={compact}
                        canRestock={canRestock}
                        busy={loadingId === item.variant_id}
                        onRestock={() => openRestock(item.product_id, item.variant_id, item.variant_id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {(items.hasNextPage || canOpenStockLevels) && !items.isLoading && (
                <div className={clsx('flex items-center justify-between gap-3 border-t border-border/50', compact ? 'px-3 py-1.5' : 'px-4 py-2')}>
                  {!compact && items.hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => items.fetchNextPage()}
                      disabled={items.isFetchingNextPage}
                      className="text-xs font-semibold text-foreground hover:underline disabled:opacity-50"
                    >
                      {items.isFetchingNextPage ? 'Loading…' : `Show more (${matchTotal - loaded.length} left)`}
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {compact && matchTotal > loaded.length ? `+${matchTotal - loaded.length} more` : ''}
                    </span>
                  )}
                  {canOpenStockLevels && (
                    <button type="button" onClick={goToStockLevels} className={clsx('font-semibold text-foreground hover:underline', compact ? 'text-[11px]' : 'text-xs')}>
                      Open in Stock Levels →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* Room for the peeking cards under a closed stack */}
      {!open && <div className={compact ? 'h-2' : 'h-3'} aria-hidden />}
      {restockModal}
    </div>
  );
}
