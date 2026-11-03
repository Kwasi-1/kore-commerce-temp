import { forwardRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartTooltipStyle } from '@/lib/chart';
import { cn } from '@/lib/utils';
import { OTHERS_COLOR, SERIES_COLORS } from '../constants';
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
  onPlanRestock?: () => void;
}

const SHARE_LIMIT = 12;
/** Width of the PDF chart copy in px: about 9pt text once fitted to the page */
const PRINT_WIDTH = 1040;

/*
 * Share bars: the text colour, strongest for the top item. Opacity rather than a mixed colour
 * because html2canvas draws the chart as an image for the PDF, where CSS variables don't exist;
 * nothing sits behind the bars, so they still read as solid.
 */
const shareOpacity = (i: number, count: number) => (count <= 1 ? 0.85 : 0.85 - (0.55 * i) / (count - 1));

const toneClass: Record<Highlight['tone'], string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-muted-foreground',
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Shown when the report is narrowed to a set of products (brand, category, group or selection). */
const ProductCompareView = forwardRef<HTMLDivElement, Props>(function ProductCompareView(
  { title, rows, summary, trend, isTrendLoading, highlights, onPlanRestock },
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

  /** The two chart cards; `print` is the fixed-size copy captured for the PDF */
  const renderCharts = (print: boolean) => {
    const text = print ? 13 : 11;
    return (
      <>
        {/* Share of units */}
        <div className="rounded-lg border border-border p-3 md:p-4">
          <h3 className={cn('font-semibold text-foreground', print ? 'text-base' : 'text-sm')}>Share of units sold</h3>
          <p className={cn('text-muted-foreground mb-3', print ? 'text-[13px]' : 'text-xs')}>
            Which items carry the volume{hiddenSold > 0 ? ` · top ${SHARE_LIMIT} shown` : ''}
          </p>
          {shareData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <div className="text-muted-foreground">
              <ResponsiveContainer width="100%" height={Math.max(print ? 100 : 160, shareData.length * (print ? 32 : 30) + 20)}>
                <BarChart data={shareData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={6}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={print ? 190 : 150}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: text, fill: 'currentColor' }}
                  />
                  {!print && (
                  <Tooltip
                    cursor={false}
                    contentStyle={chartTooltipStyle}
                    formatter={(v: any, _n: any, item: any) => [`${Number(v).toFixed(1)}% · ${formatQty(item?.payload?.units)} units`, 'Share']}
                    labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.fullLabel || ''}
                  />
                  )}
                  <Bar dataKey="share" fill="currentColor" radius={4} maxBarSize={print ? 20 : 18} isAnimationActive={false}>
                    {shareData.map((d, i) => (
                      <Cell key={d.fullLabel + i} className="text-foreground" fillOpacity={shareOpacity(i, shareData.length)} />
                    ))}
                    <LabelList dataKey="share" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: text, fill: 'currentColor' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Trend */}
        <div className="rounded-lg border border-border p-3 md:p-4">
          <h3 className={cn('font-semibold text-foreground', print ? 'text-base' : 'text-sm')}>Units sold over time</h3>
          <p className={cn('text-muted-foreground mb-3', print ? 'text-[13px]' : 'text-xs')}>
            Per {trend?.bucket || 'period'} · top {Math.min(series.length, 7)} items{series.some((s) => s.id === 'others') ? ' + others' : ''}
          </p>
          {isTrendLoading ? (
            <div className="h-[260px] rounded-md bg-muted/40 animate-pulse" />
          ) : series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <>
              <div className="text-muted-foreground">
                <ResponsiveContainer width="100%" height={print ? 240 : 260}>
                  <LineChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                    <XAxis dataKey="date" tickFormatter={fmtBucket} tickLine={false} axisLine={false} tick={{ fontSize: text, fill: 'currentColor' }} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: text, fill: 'currentColor' }} allowDecimals={false} />
                    {!print && <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(l: any) => fmtBucket(String(l))} formatter={(v: any, name: any) => [formatQty(Number(v)), name]} />}
                    {series.map((s, i) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        name={s.label}
                        stroke={colorOf(s.id, i)}
                        strokeWidth={print ? 2.5 : 2}
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
                  <li key={s.id} className={cn('flex items-center gap-1.5 text-foreground', print ? 'text-[13px]' : 'text-xs')}>
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colorOf(s.id, i) }} />
                    <span className={print ? undefined : 'truncate max-w-[180px]'} title={s.label}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <section className="bg-card text-card-foreground rounded-xl border border-border p-4 md:p-5 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Comparing</p>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {summary?.filtered_item_count ?? rows.length} items · {formatQty(summary?.total_units_sold || 0)} units sold
            {unsold > 0 && ` · ${unsold} with no sales`}
          </p>
          {onPlanRestock && (summary?.restock_count || 0) > 0 && (
            <button
              type="button"
              onClick={onPlanRestock}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90"
            >
              <Icon icon="lucide:package-plus" className="w-3.5 h-3.5" />
              Restock {summary?.restock_count}
            </button>
          )}
        </div>
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

      <div className="grid gap-5 lg:grid-cols-2">{renderCharts(false)}</div>

      {/*
        Print copy for the PDF export, captured by html2canvas: a fixed width and print-sized text,
        so the charts come out the same size whatever the screen, and full legend names (truncated
        ones clip html2canvas's slightly lower text).
      */}
      <div aria-hidden className="fixed left-0 top-0 h-0 w-0 overflow-hidden pointer-events-none">
        <div ref={chartsRef} style={{ width: PRINT_WIDTH }} className="grid grid-cols-2 gap-5 bg-card text-card-foreground">
          {renderCharts(true)}
        </div>
      </div>
    </section>
  );
});

export default ProductCompareView;
