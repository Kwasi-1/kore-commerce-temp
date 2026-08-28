/**
 * OfflineQueueDrawer.tsx
 * Top modal showing all offline-queued transactions.
 * Triggered by clicking the Network Status pill in RegisterHeader.
 */
import React, { useState, useMemo } from 'react';
import { useOfflineQueueStore, PendingTransaction } from '@/store/offlineQueueStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { WifiOff, Cloud, Clock, AlertTriangle, RefreshCw, ShoppingCart, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import CustomModal from '@/components/modals/modal';
import toast from 'react-hot-toast';

interface OfflineQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  return PAYMENT_LABELS[tx.payload?.paymentMethod] || tx.payload?.paymentMethod || 'Cash';
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  } = useOfflineQueueStore();

  const { isSyncing } = useOfflineSync();
  const [filterMode, setFilterMode] = useState<'all' | 'failed'>('all');

  const filteredQueue = useMemo(() => {
    if (filterMode === 'failed') return queue.filter(t => t.syncStatus === 'failed');
    return queue;
  }, [queue, filterMode]);

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      onClose={onClose}
      placement="top"
      size="md"
      classNames={{
        base: "!w-full !max-w-lg rounded-[18px] sm:rounded-[20px] border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
        header: "pb-2 border-b border-border/40 px-4 sm:px-5 pt-4",
        body: "py-3 px-4"
      }}
      header={
        <div className="flex items-center justify-between w-full pr-6 px-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-muted/70 flex items-center justify-center shrink-0">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">Offline Sales Queue</h3>
              <p className="text-xs text-muted-foreground">
                {pendingCount} pending &middot; {failedCount} failed
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto scrollbar-hide scroll-smooth py-1 px-1">
          {/* Segment Filter: only shown if there are failed transactions */}
          {failedCount > 0 && (
            <div className="flex w-full bg-secondary p-1 rounded-full shrink-0">
              {(['all', 'failed'] as const).map((mode) => {
                const count = mode === 'all' ? queue.length : failedCount;
                const isSelected = filterMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`flex-1 py-1 text-xs font-semibold capitalize rounded-full transition-all flex items-center justify-center gap-1 ${
                      isSelected 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{mode === 'all' ? 'All Orders' : 'Failed Only'}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Retry All banner if failed exist */}
          {failedCount > 0 && filterMode === 'all' && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs shrink-0">
              <span className="font-bold text-red-500">{failedCount} failed transaction{failedCount > 1 ? 's' : ''}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={retryAllFailed}
                disabled={isSyncing}
                className="h-7 px-3 text-xs font-semibold rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                Retry All
              </Button>
            </div>
          )}

          {/* Transaction list */}
          {filteredQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-[15px] font-semibold text-foreground">
                {queue.length === 0 ? 'No queued transactions' : 'No failed transactions'}
              </p>
              <p className="text-[12px] text-center max-w-[220px] text-muted-foreground !tracking-normal">
                Offline sales sync automatically with the server when internet is restored.
              </p>
            </div>
          ) : (
            filteredQueue.map((tx) => {
              const itemCount = getItemCount(tx);
              const total = getTotal(tx);
              const isFailed = tx.syncStatus === 'failed';
              const isSyncingItem = tx.syncStatus === 'syncing';

              return (
                <div
                  key={tx.localId}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all gap-3"
                >
                  {/* Left Column: Status Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
                      isFailed 
                        ? 'bg-destructive/5 border-red-500/20 text-red-500' 
                        : isSyncingItem
                          ? 'bg-blue-500/5 border-blue-500/20 text-blue-500'
                          : 'bg-secondary border-border text-muted-foreground'
                    }`}>
                      {isFailed ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : isSyncingItem ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">
                        {tx.payload?.customerName || `Offline Sale #${tx.localId.slice(-4)}`}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                        <span>&middot;</span>
                        <span>{getPaymentLabel(tx)}</span>
                        <span>&middot;</span>
                        <span>{formatTime(tx.createdAt)}</span>
                      </div>
                      {isFailed && tx.failureReason && (
                        <span className="text-[10px] text-red-500 truncate mt-0.5">
                          {tx.failureReason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Total + Action */}
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight whitespace-nowrap">
                      <CurrencyDisplay amount={total} showStyling={false} />
                    </span>
                    {isFailed ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-7 px-2.5 text-xs font-semibold text-red-500 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => retryTransaction(tx.localId)}
                          disabled={isSyncing}
                        >
                          Retry
                        </Button>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => {
                            removeTransaction(tx.localId);
                            toast.success("Discarded offline sale");
                          }}
                          title="Discard sale"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : isSyncingItem ? (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        Syncing
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary border border-border/60 px-2.5 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      }
    />
  );
}

