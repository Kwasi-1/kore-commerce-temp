import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationItem } from '@/hooks/useNotifications';
import { NotificationRow } from './NotificationRow';

const LABEL: Record<string, [string, string]> = {
  low_stock: ['stock alert', 'stock alerts'],
  inventory: ['inventory notification', 'inventory notifications'],
  orders: ['order notification', 'order notifications'],
  financial: ['payment notification', 'payment notifications'],
  system: ['system notification', 'system notifications'],
};

const ICON: Record<string, string> = {
  low_stock: 'solar:box-minimalistic-linear',
  inventory: 'solar:box-minimalistic-linear',
  orders: 'solar:bag-3-linear',
  financial: 'solar:wallet-money-linear',
  system: 'solar:shield-warning-linear',
};

interface Props {
  kind: string;
  items: NotificationItem[];
  actionFor: (n: NotificationItem) => { label: string; run: () => void } | null;
  loadingId: string | null;
}

/**
 * Three or more notifications of one kind, stacked like grouped iPhone notifications: the newest
 * on top with the rest peeking out underneath. Tapping unfolds them into their own rows.
 */
export default function NotificationGroup({ kind, items, actionFor, loadingId }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 36 };
  const [one, many] = LABEL[kind] || LABEL.system;
  const unread = items.filter((n) => !n.read).length;
  const newest = items[0];
  const when = (() => {
    try {
      return newest.timestamp ? formatDistanceToNow(new Date(newest.timestamp), { addSuffix: true }) : '';
    } catch {
      return '';
    }
  })();

  return (
    <div className="relative">
      <AnimatePresence initial={false} mode="popLayout">
        {!open ? (
          <motion.div key="stack" layout={!reduceMotion} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring} className="relative pb-3">
            {/* Cards peeking out from under the stack */}
            {[2, 1].map((depth) => (
              <div
                key={depth}
                aria-hidden
                className="absolute inset-x-0 top-0 bottom-3 rounded-xl border border-border bg-card"
                style={{ transform: `translateY(${depth * 6}px) scale(${1 - depth * 0.035})`, transformOrigin: 'bottom center', zIndex: 0 }}
              />
            ))}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={false}
              className={clsx(
                'relative z-10 w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-colors',
                unread ? 'bg-card border-foreground/20 shadow-xs' : 'bg-card border-border/70',
              )}
            >
              <div className="p-2.5 rounded-[10px] border shrink-0 bg-muted/50 border-border/80">
                <Icon icon={ICON[kind] || ICON.system} className="h-5 w-5 text-foreground/80" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {items.length} {items.length === 1 ? one : many}
                  </p>
                  {unread > 0 && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  {when && <span className="text-xs text-muted-foreground">· {when}</span>}
                </div>
                <p className="text-xs sm:text-[13px] text-muted-foreground truncate">
                  {newest.title}
                  {items.length > 1 && ` and ${items.length - 1} more`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">Show</span>
              <Icon icon="solar:alt-arrow-down-linear" className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="list" layout={!reduceMotion} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {items.length} {many}
              </p>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                Show less <Icon icon="solar:alt-arrow-up-linear" className="h-3.5 w-3.5" />
              </button>
            </div>
            {items.map((n, i) => (
              <motion.div
                key={n.id}
                initial={reduceMotion ? false : { opacity: 0, y: -Math.min(i, 3) * 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: reduceMotion ? 0 : Math.min(i, 8) * 0.025 }}
              >
                <NotificationRow item={n} action={actionFor(n)} busy={loadingId === n.id} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
