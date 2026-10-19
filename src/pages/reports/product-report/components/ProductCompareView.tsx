import { forwardRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OTHERS_COLOR, SERIES_COLORS, SHARE_BAR_COLOR } from '../constants';
import type { ProductReportRow, ProductReportSummary, TrendData } from '../types';
import type { Highlight } from '../utils/insights';
import { formatQty, rowDisplayName } from '../utils/format';

interface Props {
  title: string;
  rows: ProductReportRow[];
  summary: ProductReportSummary | null;
  trend: TrendData | null;
  isTrendLoading: boolean;
  highlights: Highlight[];
}

const SHARE_LIMIT = 12;

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--card-foreground)',
  fontSize: 12,
};

const toneClass: Record<Highlight['tone'], string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-muted-foreground',
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Shown when the report is narrowed to a set of products (brand, category, group or selection). */
const ProductCompareView = forwardRef<HTMLDivElement, Props>(function ProductCompareView(
  { title, rows, summary, trend, isTrendLoading, highlights },
  chartsRef,
) {
  const shareData = useMemo(
    () =>
      [...rows]
        .filter((r) => r.units_sold > 0)
        .sort((a, b) => b.units_sold - a.units_sold)
        .slice(0, SHARE_LIMIT)
        .map((r) => ({ label: truncate(rowDisplayName(r), 28), fullLabel: rowDisplayName(r), share: r.units_share_pct, units: r.units_sold })),
    [rows],
  );
  const hiddenSold = rows.filter((r) => r.units_sold > 0).length - shareData.length;
  const unsold = rows.filter((r) => r.units_sold <= 0).length;

  const series = useMemo(() => trend?.series || [], [trend]);
  const colorOf = (id: string, i: number) => (id === 'others' ? OTHERS_COLOR : SERIES_COLORS[i % SERIES_COLORS.length]);
  const trendData = useMemo(() => {
    if (!trend) return [];
    return trend.buckets.map((b, bi) => {
      const point: Record<string, any> = { date: b };
      series.forEach((s) => {
        point[s.id] = s.points[bi]?.units ?? 0;
      });
      return point;
    });
  }, [trend, series]);

  const bucketFormat = trend?.bucket === 'month' ? 'MMM yyyy' : 'd MMM';
  const fmtBucket = (d: string) => {
    try {
      return format(parseISO(d), bucketFormat);
    } catch {
      return d;
    }
  };

  return (
    <section className="bg-card text-card-foreground rounded-xl border border-border p-4 md:p-5 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Comparing</p>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {summary?.filtered_item_count ?? rows.length} items · {formatQty(summary?.total_units_sold || 0)} units sold
          {unsold > 0 && ` · ${unsold} with no sales`}
        </p>
      </header>

      {highlights.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
              <Icon icon={h.icon} className={`w-4 h-4 mt-0.5 shrink-0 ${toneClass[h.tone]}`} />
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Captured by html2canvas for the PDF export */}
      <div ref={chartsRef} className="grid gap-5 lg:grid-cols-2 bg-card">
        {/* Share of units */}
        <div className="rounded-lg border border-border p-3 md:p-4">
          <h3 className="text-sm font-semibold text-foreground">Share of units sold</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Which items carry the volume{hiddenSold > 0 ? ` · top ${SHARE_LIMIT} shown` : ''}
          </p>
          {shareData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <div className="text-muted-foreground">
              <ResponsiveContainer width="100%" height={Math.max(160, shareData.length * 30 + 20)}>
                <BarChart data={shareData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={6}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'currentColor', opacity: 0.06 }}
                    contentStyle={tooltipStyle}
                    formatter={(v: any, _n: any, item: any) => [`${Number(v).toFixed(1)}% · ${formatQty(item?.payload?.units)} units`, 'Share']}
                    labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.fullLabel || ''}
                  />
                  <Bar dataKey="share" fill={SHARE_BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                    <LabelList dataKey="share" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 11, fill: 'currentColor' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Trend */}
        <div className="rounded-lg border border-border p-3 md:p-4">
          <h3 className="text-sm font-semibold text-foreground">Units sold over time</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Per {trend?.bucket || 'period'} · top {Math.min(series.length, 7)} items{series.some((s) => s.id === 'others') ? ' + others' : ''}
          </p>
          {isTrendLoading ? (
            <div className="h-[260px] rounded-md bg-muted/40 animate-pulse" />
          ) : series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <>
              <div className="text-muted-foreground">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                    <XAxis dataKey="date" tickFormatter={fmtBucket} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l: any) => fmtBucket(String(l))} formatter={(v: any, name: any) => [formatQty(Number(v)), name]} />
                    {series.map((s, i) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        name={s.label}
                        stroke={colorOf(s.id, i)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {series.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-1.5 text-xs text-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colorOf(s.id, i) }} />
                    <span className="truncate max-w-[180px]" title={s.label}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
});

export default ProductCompareView;
