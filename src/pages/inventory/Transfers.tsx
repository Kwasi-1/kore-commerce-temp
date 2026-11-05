import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/shared/pagination';
import TransferFormModal from '@/components/inventory/TransferFormModal';
import TransferDetailModal from '@/components/inventory/TransferDetailModal';
import { TRANSFER_STATUS_LABELS, transferStatusClass } from '@/components/inventory/transferStatus';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import { useCan } from '@/hooks/usePermissions';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'requested', label: 'Requested' },
  { key: 'dispatched', label: 'In transit' },
  { key: 'received', label: 'Received' },
  { key: 'partially_received', label: 'Received short' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: '', label: 'All' },
];

/** Stock moving between locations: what's open, in transit and done. */
export default function Transfers() {
  const can = useCan();
  const [filter, setFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/tenant/transfers?status=${filter}&page=${page}&per_page=20`);
      const d = res.data?.success?.data || {};
      setRows(d.transfers || []);
      setPages(d.pagination?.pages || 1);
      setCounts(d.counts || {});
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Couldn't load transfers");
    } finally {
      setIsLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const countFor = (key: string) =>
    key === 'open'
      ? (counts.requested || 0) + (counts.approved || 0) + (counts.dispatched || 0)
      : key === ''
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : counts[key] || 0;

  return (
    <PageLayout
      title="Transfers"
      actions={
        can('stock.transfer') && (
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Icon icon="mdi:plus" className="h-4 w-4" />
            New transfer
          </Button>
        )
      }
    >
      <div className="space-y-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={cn(
                'h-8 px-3 rounded-full border text-xs font-medium transition-colors',
                filter === f.key ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{countFor(f.key)}</span>
            </button>
          ))}
          {can('stock.transfer') && (
            <Button onClick={() => setCreating(true)} className="gap-2 md:hidden ml-auto" size="sm">
              <Icon icon="mdi:plus" className="h-4 w-4" />
              New
            </Button>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-2 text-center">
              <Icon icon="solar:transfer-horizontal-linear" className="text-4xl text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No transfers here</p>
            </div>
          ) : (
            rows.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpenId(t.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t.fromLocationName} <span className="text-muted-foreground">→</span> {t.toLocationName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.reference} · {t.itemCount} item{t.itemCount === 1 ? '' : 's'} ·{' '}
                    {t.requestedAt ? format(new Date(t.requestedAt), 'd MMM yyyy') : ''}
                    {t.requestedBy ? ` · ${t.requestedBy}` : ''}
                  </p>
                </div>
                <span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md', transferStatusClass(t.status))}>
                  {TRANSFER_STATUS_LABELS[t.status] || t.status}
                </span>
              </button>
            ))
          )}
        </div>

        {pages > 1 && (
          <div className="flex justify-end">
            <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <TransferFormModal isOpen={creating} onClose={() => setCreating(false)} onCreated={load} />
      <TransferDetailModal transferId={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </PageLayout>
  );
}
