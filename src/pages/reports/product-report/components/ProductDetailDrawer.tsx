import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '@/api/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ProductReportFilters } from '../types';
import { SHARE_BAR_COLOR } from '../constants';
import { formatRangeLabel } from '../utils/dates';
import { formatMoney, formatQty } from '../utils/format';

export interface DrillTarget {
  variantId: string | null;
  productId: string | null;
  title: string;
}

interface Detail {
  product: { name: string; variant_label: string | null; brand: string | null; category: string | null; image: string | null };
  totals: { units: number; revenue: number; orders: number; avg_units_per_order: number; avg_unit_price: number; last_sold_at: string | null };
  bucket: 'day' | 'week' | 'month';
  trend: { date: string; units: number; revenue: number }[];
  channels: { channel: string; units: number; revenue: number; orders: number }[];
  cashiers: { id: string; name: string; units: number; revenue: number }[];
  heatmap: { dow: number; hour: number; units: number }[];
  price_history: { date: string; avg_unit_price: number; min_unit_price: number; max_unit_price: number }[];
  bought_with: { variant_id: string; name: string; variant_label: string | null; orders_together: number; attach_rate_pct: number }[];
  returns: { date: string | null; return_number: string | null; quantity: number; refund: number; reason: string; condition: string }[];
}

interface Props {
  target: DrillTarget | null;
  onClose: () => void;
  filters: ProductReportFilters;
  isMultiChannel: boolean;
}

// Monday-first rows; Postgres dow is 0 = Sunday
const DAYS = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--card-foreground)',
  fontSize: 12,
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

export default function ProductDetailDrawer({ target, onClose, filters, isMultiChannel }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (target.variantId) params.set('variant_id', target.variantId);
    else if (target.productId) params.set('product_id', target.productId);
    if (filters.start) params.set('start_date', filters.start.toISOString());
    if (filters.end) params.set('end_date', filters.end.toISOString());
    if (isMultiChannel && filters.channel !== 'all') params.set('channel', filters.channel);
    setIsLoading(true);
    setError(null);
    setDetail(null);
    apiClient
      .get(`/tenant/reports/products/detail?${params.toString()}`)
      .then((r) => !cancelled && setDetail(r.data?.success?.data || null))
      .catch((e) => !cancelled && setError(e?.response?.data?.error?.message || 'Failed to load details'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [target, filters.start, filters.end, filters.channel, isMultiChannel]);

  const heat = useMemo(() => {
    const cells = new Map<string, number>();
    let max = 0;
    (detail?.heatmap || []).forEach((c) => {
      cells.set(`${c.dow}-${c.hour}`, c.units);
      max = Math.max(max, c.units);
    });
    // Busiest slot, for the hint line
    let peak: { dow: number; hour: number; units: number } | null = null;
    (detail?.heatmap || []).forEach((c) => {
      if (!peak || c.units > peak.units) peak = c;
    });
    return { cells, max, peak: peak as { dow: number; hour: number; units: number } | null };
  }, [detail]);

  const fmtBucket = (d: string) => {
    try {
      return format(parseISO(d), detail?.bucket === 'month' ? 'MMM yyyy' : 'd MMM');
    } catch {
      return d;
    }
  };

  const priceChanged = (detail?.price_history || []).some((p) => p.min_unit_price !== p.max_unit_price) ||
    new Set((detail?.price_history || []).map((p) => p.avg_unit_price)).size > 1;
  const totalChannelUnits = (detail?.channels || []).reduce((s, c) => s + c.units, 0);

  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-card text-card-foreground border-border overflow-y-auto p-0">
        <SheetHeader className="p-5 pb-3 border-b border-border text-left">
          <SheetTitle className="text-lg leading-tight pr-6">
            {detail?.product.name || target?.title}
            {detail?.product.variant_label && <span className="font-normal text-muted-foreground"> · {detail.product.variant_label}</span>}
          </SheetTitle>
          <SheetDescription>
            {[detail?.product.brand, detail?.product.category].filter(Boolean).join(' • ')}
            {detail?.product.brand || detail?.product.category ? ' · ' : ''}
            {formatRangeLabel(filters.range, filters.start, filters.end)}
          </SheetDescription>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          {detail && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Units" value={formatQty(detail.totals.units)} />
                <Stat label="Revenue" value={formatMoney(detail.totals.revenue)} />
                <Stat label="Orders" value={detail.totals.orders} />
                <Stat label="Per order" value={formatQty(detail.totals.avg_units_per_order)} />
              </div>
              <p className="text-xs text-muted-foreground -mt-3">
                Avg price {formatMoney(detail.totals.avg_unit_price)}
                {detail.totals.last_sold_at && ` · last sold ${format(new Date(detail.totals.last_sold_at), "d MMM yyyy 'at' HH:mm")}`}
              </p>

              <Section title="Units sold over time" hint={`Per ${detail.bucket}`}>
                <div className="text-muted-foreground">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={detail.trend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                      <XAxis dataKey="date" tickFormatter={fmtBucket} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} minTickGap={20} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(l: any) => fmtBucket(String(l))}
                        formatter={(v: any, _n: any, item: any) => [`${formatQty(Number(v))} units · ${formatMoney(item?.payload?.revenue || 0)}`, '']}
                      />
                      <Line type="monotone" dataKey="units" stroke={SHARE_BAR_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section
                title="When it sells"
                hint={
                  heat.peak
                    ? `Busiest: ${DAYS.find((d) => d.dow === heat.peak!.dow)?.label} around ${String(heat.peak.hour).padStart(2, '0')}:00 — useful for staffing and restock timing`
                    : 'No sales in this period'
                }
              >
                <div className="overflow-x-auto">
                  <div className="min-w-[440px]">
                    {DAYS.map((d) => (
                      <div key={d.dow} className="flex items-center gap-[2px] mb-[2px]">
                        <span className="w-9 shrink-0 text-[10px] text-muted-foreground">{d.label}</span>
                        {Array.from({ length: 24 }, (_, h) => {
                          const u = heat.cells.get(`${d.dow}-${h}`) || 0;
                          const intensity = heat.max > 0 ? u / heat.max : 0;
                          return (
                            <div
                              key={h}
                              title={`${d.label} ${String(h).padStart(2, '0')}:00 — ${formatQty(u)} units`}
                              className="flex-1 h-4 rounded-[2px] bg-muted/60"
                              style={u > 0 ? { backgroundColor: SHARE_BAR_COLOR, opacity: 0.15 + 0.85 * intensity } : undefined}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex items-center gap-[2px] mt-1">
                      <span className="w-9 shrink-0" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                          {h % 3 === 0 ? h : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {detail.channels.length > 0 && (
                <Section title="By channel">
                  <div className="space-y-2">
                    {detail.channels.map((c) => {
                      const pct = totalChannelUnits > 0 ? (c.units / totalChannelUnits) * 100 : 0;
                      return (
                        <div key={c.channel} className="text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{c.channel === 'pos' ? 'In-store (POS)' : 'Online store'}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatQty(c.units)} units · {formatMoney(c.revenue)} · {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SHARE_BAR_COLOR }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {detail.cashiers.length > 0 && (
                <Section title="Top cashiers" hint="Who sells this item most at the till">
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {detail.cashiers.map((c) => (
                      <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="capitalize">{c.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatQty(c.units)} units · {formatMoney(c.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detail.bought_with.length > 0 && (
                <Section title="Often bought with" hint="Share of this item's orders that also included…">
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {detail.bought_with.map((b) => (
                      <li key={b.variant_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="truncate">
                          {b.name}
                          {b.variant_label && <span className="text-muted-foreground"> · {b.variant_label}</span>}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {b.attach_rate_pct.toFixed(0)}% · {b.orders_together} orders
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detail.price_history.length > 0 && (
                <Section title="Selling price" hint={priceChanged ? 'Price varied in this period (wholesale, packs or price changes)' : 'Price was steady in this period'}>
                  <ul className="divide-y divide-border rounded-lg border border-border max-h-48 overflow-y-auto">
                    {[...detail.price_history].reverse().map((p) => (
                      <li key={p.date} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{fmtBucket(p.date)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          avg {formatMoney(p.avg_unit_price)}
                          {p.min_unit_price !== p.max_unit_price && ` (${formatMoney(p.min_unit_price)}–${formatMoney(p.max_unit_price)})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detail.returns.length > 0 && (
                <Section title="Recent returns">
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {detail.returns.map((r, i) => (
                      <li key={`${r.return_number}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span>
                          {r.date ? format(new Date(r.date), 'd MMM') : '—'}
                          <span className="text-muted-foreground">
                            {' '}· {r.reason.replace(/_/g, ' ')} · {r.condition}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatQty(r.quantity)} · {formatMoney(r.refund)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detail.totals.units === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Icon icon="lucide:info" className="w-4 h-4 shrink-0" />
                  No sales of this item in the selected period.
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
