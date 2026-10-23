import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';

const SOURCE_LABEL: Record<string, string> = {
  purchase_order: 'Purchase order received',
  stock_in: 'Stock in',
  production: 'Batch made',
  manual: 'Edited by hand',
  initial: 'Starting cost',
  import: 'Bulk import',
};

const money = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `GHS ${v.toFixed(2)}`);
const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Loading({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground space-y-2">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground text-xs space-y-2 border border-dashed border-border/70 rounded-xl">
      <Icon icon="solar:history-linear" className="h-8 w-8 mx-auto opacity-40" />
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="max-w-xs mx-auto">{text}</p>
    </div>
  );
}

/** Why the cost price moved: deliveries (averaged in), batches, and manual edits. */
export function CostHistoryList({ variantId, unitName }: { variantId: string | null; unitName: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!variantId) return;
    setLoading(true);
    apiClient
      .get(`/tenant/products/variants/${variantId}/cost-history`)
      .then((r) => {
        setRows(r.data?.success?.data?.history || []);
        setCurrent(r.data?.success?.data?.current_cost ?? null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [variantId]);

  if (loading) return <Loading text="Loading cost history..." />;
  if (rows.length === 0) return <Empty title="No cost changes yet" text="Deliveries, batches and cost edits will appear here." />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-0.5">
        Current cost: <b className="text-foreground">{money(current)}</b> per {unitName}
      </p>
      {rows.map((r) => {
        const up = r.old_cost !== null && r.new_cost !== null && r.new_cost > r.old_cost;
        const down = r.old_cost !== null && r.new_cost !== null && r.new_cost < r.old_cost;
        return (
          <div key={r.id} className="border border-border/70 rounded-lg p-2.5 space-y-1 bg-card/60">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs">{SOURCE_LABEL[r.source] || r.source}</span>
              <span className="text-[10px] text-muted-foreground">{date(r.date)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="tabular-nums">
                {money(r.old_cost)} →{' '}
                <b className={cn(up && 'text-rose-600 dark:text-rose-400', down && 'text-emerald-600 dark:text-emerald-400')}>{money(r.new_cost)}</b>
              </span>
              {r.received_quantity !== null && r.received_unit_cost !== null && r.source !== 'manual' && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {r.received_quantity} in at {money(r.received_unit_cost)}
                  {r.stock_before ? ` · ${r.stock_before} already in stock` : ''}
                </span>
              )}
            </div>
            {(r.note || r.staff_name) && (
              <p className="text-[11px] text-muted-foreground">
                {r.note}
                {r.note && r.staff_name ? ' · ' : ''}
                {r.staff_name && `by ${r.staff_name}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Batches made in-house for this product, with how the shared cost was split. */
export function BatchHistoryList({ productId }: { productId: string }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/tenant/products/${productId}/production-batches`)
      .then((r) => setBatches(r.data?.success?.data?.batches || []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <Loading text="Loading batches..." />;
  if (batches.length === 0) return <Empty title="No batches recorded" text="Use “Record Batch” on the Products page after making a batch." />;

  const basisLabel = (b: string) => (b === 'size' || b === 'volume' ? 'split by size' : b === 'price' ? 'split by price' : 'split equally');

  return (
    <div className="space-y-2">
      {batches.map((b) => (
        <div key={b.id} className="border border-border/70 rounded-lg p-2.5 space-y-1.5 bg-card/60">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-xs">
              {b.total_quantity} made · {money(b.total_cost)}
            </span>
            <span className="text-[10px] text-muted-foreground">{date(b.date)}</span>
          </div>
          <ul className="space-y-0.5">
            {(b.lines || []).map((l: any) => (
              <li key={l.variant_id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="capitalize truncate">
                  {l.label} × {l.quantity}
                </span>
                <span className="tabular-nums text-muted-foreground">{money(l.unit_cost)} each</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground">
            Materials {money(b.shared_cost)}
            {(b.lines || []).length > 1 ? `, ${basisLabel(b.allocation_basis)}` : ''}
            {b.notes ? ` · ${b.notes}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

const ACTION_STYLE: Record<string, { icon: string; className: string }> = {
  created: { icon: 'solar:add-circle-linear', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  updated: { icon: 'solar:pen-2-linear', className: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
  archived: { icon: 'solar:archive-linear', className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  restored: { icon: 'solar:restart-linear', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  deleted: { icon: 'solar:trash-bin-minimalistic-linear', className: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
};

const CHANGE_SOURCE_LABEL: Record<string, string> = {
  form: 'Product form',
  bulk_import: 'Bulk import',
  bulk_update: 'Update products',
  bulk_action: 'Bulk action',
  channel: 'Sales channel',
  images: 'Images',
  status: 'Status',
};

const dateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '—';

type ChangesListProps = { productId?: string; search?: string; showProduct?: boolean };

/** Who created or changed products and what changed (before → after). Stock isn't included. */
export function ProductChangesList(props: ChangesListProps) {
  // A new filter remounts the list, so paging starts again from page 1
  return <ChangesListInner key={`${props.productId || ''}|${props.search || ''}`} {...props} />;
}

function ChangesListInner({ productId, search, showProduct }: ChangesListProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/tenant/products/history', { params: { product_id: productId, search: search || undefined, page, per_page: 30 } })
      .then((r) => {
        if (cancelled) return;
        const data = r.data?.success?.data || {};
        setRows((prev) => (page === 1 ? data.items || [] : [...prev, ...(data.items || [])]));
        setHasMore(!!data.has_more);
      })
      .catch(() => {
        if (!cancelled && page === 1) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, search, page]);

  if (loading && page === 1) return <Loading text="Loading changes..." />;
  if (rows.length === 0)
    return (
      <Empty
        title={search ? 'No matching changes' : 'No changes recorded yet'}
        text="New products and edits to names, prices, pack sizes and settings will appear here. Stock changes are in Stock history."
      />
    );

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const style = ACTION_STYLE[r.action] || ACTION_STYLE.updated;
        const changes: any[] = r.changes || [];
        const expanded = open[r.id] ?? changes.length <= 3;
        const shown = expanded ? changes : changes.slice(0, 3);
        return (
          <div key={r.id} className="border border-border/70 rounded-lg p-2.5 space-y-1.5 bg-card/60">
            <div className="flex items-start gap-2">
              <span className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0', style.className)}>
                <Icon icon={style.icon} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-snug break-words">
                  {showProduct || r.action !== 'updated' ? r.summary : r.summary.replace(/^Updated “.*?”: /, 'Changed ')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {r.staff_name} · {dateTime(r.date)} · {CHANGE_SOURCE_LABEL[r.source] || r.source}
                </p>
              </div>
            </div>
            {changes.length > 0 && r.action !== 'created' && (
              <ul className="space-y-0.5 pl-8">
                {shown.map((c, i) => (
                  <li key={`${c.field}-${i}`} className="text-[11px] flex flex-wrap gap-x-1.5">
                    <span className="text-muted-foreground">{c.label}:</span>
                    {c.detail ? (
                      <span>{c.detail}</span>
                    ) : (
                      <span className="tabular-nums break-all">
                        <span className="line-through text-muted-foreground/80">{c.before}</span> → <b>{c.after}</b>
                      </span>
                    )}
                  </li>
                ))}
                {changes.length > 3 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: !expanded }))}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {expanded ? 'Show less' : `Show ${changes.length - 3} more`}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
      {hasMore && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setPage((p) => p + 1)}
          className="w-full h-9 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
