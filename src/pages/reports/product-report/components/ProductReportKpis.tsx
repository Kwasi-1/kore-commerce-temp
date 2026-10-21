import { DashboardCard } from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import type { ProductReportSummary } from '../types';
import { formatChange, formatMoney, formatQty } from '../utils/format';

function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={`ml-2 self-end mb-1 text-xs font-semibold whitespace-nowrap ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {up ? '▲' : '▼'} {formatChange(value)}
    </span>
  );
}

export default function ProductReportKpis({ summary, isLoading, focused }: { summary: ProductReportSummary | null; isLoading: boolean; focused: boolean }) {
  const s: Partial<ProductReportSummary> = summary || {};
  const costCoveragePct = s.cost_coverage_pct ?? 100;
  const comparing = !!s.comparison;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard
        title="Net Product Revenue"
        value={isLoading ? '...' : <CurrencyDisplay amount={s.total_net_revenue ?? s.total_revenue ?? 0} />}
        valueTrailing={comparing && !isLoading ? <Delta value={s.net_revenue_change_pct ?? s.revenue_change_pct} /> : undefined}
        subvalue={
          (s.total_discounts || 0) > 0 || (s.total_refunds || 0) > 0 ? (
            <span>
              {formatMoney(s.total_revenue || 0)} gross
              {(s.total_discounts || 0) > 0 && <> · −{formatMoney(s.total_discounts || 0)} discounts</>}
              {(s.total_refunds || 0) > 0 && <> · −{formatMoney(s.total_refunds || 0)} refunds</>}
            </span>
          ) : (s.unique_products_sold || 0) > 0 ? (
            `${s.unique_products_sold} unique items sold`
          ) : undefined
        }
      />

      <DashboardCard
        title="Units Moved"
        value={isLoading ? '...' : formatQty(s.total_units_sold || 0)}
        valueTrailing={comparing && !isLoading ? <Delta value={s.units_change_pct} /> : undefined}
        subvalue={
          focused && s.filtered_item_count !== undefined
            ? `Across ${s.filtered_item_count} of ${s.total_catalog_products} catalog items`
            : (s.total_catalog_products || 0) > 0
              ? `Across ${s.total_catalog_products} catalog items`
              : undefined
        }
      />

      <DashboardCard
        title="Tracked COGS"
        value={isLoading ? '...' : <CurrencyDisplay amount={s.total_cogs || 0} />}
        subvalue={
          s.cost_coverage_pct !== undefined ? (
            <span>
              {s.cost_coverage_pct}% cost coverage
              {(s.total_wastage_cost || 0) > 0 && (
                <span className="text-rose-600 dark:text-rose-400" title="Damaged, expired, lost or stolen stock, at cost">
                  {' '}· −{formatMoney(s.total_wastage_cost || 0)} wasted
                </span>
              )}
            </span>
          ) : undefined
        }
      />

      <DashboardCard
        title="Product Gross Profit"
        value={isLoading ? '...' : <CurrencyDisplay amount={s.total_gross_profit || 0} />}
        subvalue={
          <div className="space-y-1.5 mt-0.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{s.overall_gross_margin_pct || 0}% Realized Margin</span>
              <span>{costCoveragePct}% Tracked</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, costCoveragePct))}%` }}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
