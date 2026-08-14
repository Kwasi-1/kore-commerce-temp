/**
 * OfflineQueueDrawer.tsx
 * Slide-over drawer that shows all offline-queued transactions.
 * Triggered by clicking the Network Status pill in RegisterHeader.
 *
 * Features:
 * - Lists pending, syncing, synced, and failed transactions
 * - Shows item count, total, payment method, creation time, and failure reason
 * - "Retry All Failed" button to re-queue all failed transactions
 * - Individual "Retry" and "Discard" buttons per failed entry
 * - "Clear Synced" to remove already-synced entries from the list
 */
import React, { useMemo } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Clock, AlertTriangle, X, RotateCcw, Trash2 } from 'lucide-react';
import { useOfflineQueueStore, PendingTransaction } from '@/store/offlineQueueStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks';

interface OfflineQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,         color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/20' },
  syncing:  { label: 'Syncing',  icon: RefreshCw,     color: 'text-blue-500',   bg: 'bg-blue-500/10 border-blue-500/20' },
  synced:   { label: 'Synced',   icon: CheckCircle2,  color: 'text-emerald-500',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  failed:   { label: 'Failed',   icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20' },
} as const;

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile_money_manual: 'Manual MoMo',
  mobile_money: 'MoMo',
  card: 'Card',
  credit: 'Credit',
};

function getItemCount(tx: PendingTransaction): number {
  return (tx.payload?.items as any[])?.length ?? 0;
}

function getTotal(tx: PendingTransaction): number {
  const items = (tx.payload?.items as any[]) ?? [];
  return items.reduce((sum, item) => sum + ((item.unit_price ?? 0) * (item.quantity ?? 1)), 0);
}

function getPaymentLabel(tx: PendingTransaction): string {
  return PAYMENT_LABELS[tx.payload?.paymentMethod] || tx.payload?.paymentMethod || '—';
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function OfflineQueueDrawer({ isOpen, onClose }: OfflineQueueDrawerProps) {
  const {
    queue,
    pendingCount,
    failedCount,
    retryTransaction,
    removeTransaction,
    retryAllFailed,
    clearSynced,
  } = useOfflineQueueStore();

  const { isSyncing } = useOfflineSync();
  const { formatAmount } = useCurrency();

  const syncedCount = useMemo(() => queue.filter(t => t.syncStatus === 'synced').length, [queue]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-foreground text-base">Offline Sales Queue</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 px-5 py-3 shrink-0 border-b border-border/50">
          <Pill count={pendingCount} label="Pending" colorClass="text-amber-600 bg-amber-500/10 border-amber-500/20" />
          <Pill count={failedCount}  label="Failed"  colorClass="text-red-500 bg-red-500/10 border-red-500/20" />
          <Pill count={syncedCount}  label="Synced"  colorClass="text-emerald-600 bg-emerald-500/10 border-emerald-500/20" />
        </div>

        {/* Action bar */}
        {(failedCount > 0 || syncedCount > 0) && (
          <div className="flex gap-2 px-5 py-3 shrink-0 border-b border-border/40">
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={retryAllFailed}
                disabled={isSyncing}
                className="flex-1 gap-1.5 h-8 text-xs font-bold rounded-full border-border"
              >
                <RotateCcw className="h-3 w-3" />
                Retry All ({failedCount})
              </Button>
            )}
            {syncedCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSynced}
                className="flex-1 gap-1.5 h-8 text-xs font-bold rounded-full text-muted-foreground"
              >
                <Trash2 className="h-3 w-3" />
                Clear Synced
              </Button>
            )}
          </div>
        )}

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-hide">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
              <p className="text-sm font-semibold">No queued transactions</p>
              <p className="text-xs text-center max-w-[200px]">Offline sales you make will appear here and sync automatically when back online.</p>
            </div>
          ) : (
            queue.map((tx) => (
              <TransactionCard
                key={tx.localId}
                tx={tx}
                formatCurrency={formatAmount}
                onRetry={() => retryTransaction(tx.localId)}
                onDiscard={() => removeTransaction(tx.localId)}
                isSyncing={isSyncing}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 shrink-0">
          <p className="text-[11px] text-muted-foreground/60 text-center">
            All sales sync automatically when internet is restored. Each sale uses a unique idempotency key to prevent duplicates.
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ count, label, colorClass }: { count: number; label: string; colorClass: string }) {
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${colorClass}`}>
      <span className="font-black text-sm leading-none">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function TransactionCard({
  tx,
  formatCurrency,
  onRetry,
  onDiscard,
  isSyncing,
}: {
  tx: PendingTransaction;
  formatCurrency: (v: number) => string;
  onRetry: () => void;
  onDiscard: () => void;
  isSyncing: boolean;
}) {
  const cfg = STATUS_CONFIG[tx.syncStatus];
  const StatusIcon = cfg.icon;
  const itemCount = getItemCount(tx);
  const total = getTotal(tx);

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${cfg.bg}`}>
      {/* Top row: status + time */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${cfg.color}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${tx.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          <span>{cfg.label}</span>
          {tx.retryCount && tx.retryCount > 1 && (
            <span className="text-muted-foreground font-normal">(tried {tx.retryCount}×)</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatTime(tx.createdAt)}</span>
      </div>

      {/* Item info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">{getPaymentLabel(tx)}</span>
        </div>
        <span className="font-bold text-foreground text-sm">{formatCurrency(total)}</span>
      </div>

      {/* Failure reason */}
      {tx.syncStatus === 'failed' && tx.failureReason && (
        <div className="text-[11px] text-red-600 dark:text-red-400 font-medium bg-red-500/10 rounded-lg px-2.5 py-1.5 border border-red-500/20">
          {tx.failureReason}
        </div>
      )}

      {/* Actions for failed */}
      {tx.syncStatus === 'failed' && (
        <div className="flex gap-2 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isSyncing}
            className="flex-1 h-7 text-[11px] font-bold gap-1 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            className="flex-1 h-7 text-[11px] font-bold gap-1 rounded-full text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}
