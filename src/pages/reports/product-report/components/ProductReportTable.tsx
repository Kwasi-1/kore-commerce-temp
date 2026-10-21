import { useMemo } from 'react';
import type { Selection } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import EnhancedTableComponent, { type TopContentAction } from '@/components/shared/MainTableComponent';
import { CurrencyDisplay } from '@/hooks';
import { INSIGHT_META } from '../constants';
import type { ProductReportRow, ProductReportSummary } from '../types';
import { formatChange, formatCover, formatQty } from '../utils/format';

interface Props {
  rows: ProductReportRow[];
  summary: ProductReportSummary | null;
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (v: string) => void;
  selectedKeys: Selection;
  onSelectionChange: (keys: Selection | 'all') => void;
  selectionActions: TopContentAction[];
  onRowClick?: (rowId: string) => void;
}

function ChangeBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-[11px] text-muted-foreground">new</span>;
  const up = value >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {up ? '▲' : '▼'} {formatChange(value)}
    </span>
  );
}

export function InsightBadge({ row }: { row: ProductReportRow }) {
  const meta = INSIGHT_META[row.insight] || INSIGHT_META.healthy;
  const partialRestock = row.insight !== 'restock' && row.children_count > 1 && row.children_needing_restock > 0;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.className}`}>
        <Icon icon={meta.icon} className="w-3 h-3" />
        {meta.label}
      </span>
      {partialRestock && (
        <span className="text-[11px] text-rose-600 dark:text-rose-400">
          {row.children_needing_restock} of {row.children_count} need restock
        </span>
      )}
    </div>
  );
}

export default function ProductReportTable({
  rows,
  summary,
  isLoading,
  searchValue,
  onSearchChange,
  selectedKeys,
  onSelectionChange,
  selectionActions,
  onRowClick,
}: Props) {
  const comparing = !!summary?.comparison;
  const groupBy = summary?.group_by || 'variant';

  const columns = [
    { key: 'product', label: groupBy === 'brand' ? 'Brand' : groupBy === 'category' ? 'Category' : 'Product & SKU' },
    { key: 'units_sold', label: comparing ? 'Units Sold · vs prev' : 'Units Sold · Share' },
    { key: 'revenue', label: 'Net Revenue' },
    { key: 'profit_margin', label: 'Gross Profit / Margin' },
    { key: 'stock', label: 'Stock · Cover' },
    { key: 'insight', label: 'Insight' },
  ];

  const tableRows = useMemo(
    () =>
      rows.map((p) => {
        const marginVal = p.gross_margin;
        const stockStatus = p.stock_status || 'in_stock';
        const isRollup = groupBy !== 'variant';

        return {
          id: p.id,
          product: (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon
                    icon={groupBy === 'brand' ? 'lucide:tag' : groupBy === 'category' ? 'lucide:folder' : 'lucide:package'}
                    className="w-5 h-5 text-muted-foreground/60"
                  />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground text-sm truncate">
                  {p.name}
                  {p.variant_label && <span className="font-normal text-muted-foreground"> · {p.variant_label}</span>}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={isRollup ? '' : 'font-mono'}>{p.sku || '—'}</span>
                  {groupBy !== 'category' && p.category && (
                    <>
                      <span>&bull;</span>
                      <span className="truncate">{p.category}</span>
                    </>
                  )}
                  {groupBy !== 'brand' && p.brand && (
                    <>
                      <span>&bull;</span>
                      <span className="truncate">{p.brand}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ),
          units_sold: (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground tabular-nums text-sm">
                {formatQty(p.units_sold || 0)}
                {(p.returned_units || 0) > 0 && (
                  <span
                    className={`ml-1.5 text-[11px] font-medium ${(p.return_rate_pct || 0) >= 10 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}
                    title={`${formatQty(p.returned_units)} returned`}
                  >
                    ↩ {(p.return_rate_pct ?? 0).toFixed(1)}%
                  </span>
                )}
              </span>
              {comparing ? (
                <span className="flex items-center gap-1.5">
                  <ChangeBadge value={p.units_change_pct} />
                  <span className="text-[11px] text-muted-foreground">from {formatQty(p.prev_units || 0)}</span>
                </span>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${Math.min(100, p.units_share_pct || 0)}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{(p.units_share_pct || 0).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ),
          revenue: (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">
                <CurrencyDisplay amount={p.net_revenue ?? p.revenue ?? 0} showStyling={false} />
              </span>
              {(p.discounts || 0) + (p.refunds || 0) > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  of <CurrencyDisplay amount={p.revenue || 0} showStyling={false} /> gross
                </span>
              )}
              {comparing ? (
                <ChangeBadge value={p.revenue_change_pct} />
              ) : p.has_cost && p.cost_of_goods !== null ? (
                <span className="text-[11px] text-muted-foreground">
                  COGS <CurrencyDisplay amount={p.cost_of_goods} showStyling={false} />
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground italic">Uncosted</span>
              )}
            </div>
          ),
          profit_margin: (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <CurrencyDisplay amount={p.gross_profit || 0} showStyling={false} />
                {marginVal !== null && <span className="text-xs font-normal text-muted-foreground">({marginVal.toFixed(1)}%)</span>}
              </div>
              {marginVal !== null ? (
                <div className="w-20 h-1 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(100, Math.max(0, marginVal))}%` }} />
                </div>
              ) : (
                !p.has_cost && <span className="text-[11px] text-muted-foreground italic">No cost price</span>
              )}
            </div>
          ),
          stock: (
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm tabular-nums">{formatQty(p.stock_quantity ?? 0)} on hand</span>
              <span
                className={`text-[11px] font-medium ${
                  stockStatus === 'out_of_stock'
                    ? 'text-rose-600 dark:text-rose-400'
                    : stockStatus === 'low_stock'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                }`}
              >
                {stockStatus === 'out_of_stock'
                  ? 'Out of stock'
                  : p.days_of_cover !== null
                    ? `~${formatCover(p.days_of_cover)} of cover`
                    : stockStatus === 'low_stock'
                      ? 'Low stock'
                      : 'In stock'}
              </span>
              {(p.wastage_cost || 0) > 0 && (
                <span className="text-[11px] text-rose-600 dark:text-rose-400" title="Damaged, expired, lost or stolen, at cost">
                  {formatQty(p.wasted_units || 0)} wasted · <CurrencyDisplay amount={p.wastage_cost || 0} showStyling={false} />
                </span>
              )}
            </div>
          ),
          insight: <InsightBadge row={p} />,
        };
      }),
    [rows, comparing, groupBy],
  );

  return (
    <EnhancedTableComponent
      columns={columns}
      rows={tableRows}
      isLoading={isLoading}
      title="Product Performance Breakdown"
      showSearch={true}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search product by name, SKU, brand or category..."
      showFilter={false}
      showAddButton={false}
      mobileFriendly={true}
      pageSize={15}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      selectionActions={selectionActions}
      onclick={onRowClick ? (key) => onRowClick(String(key)) : undefined}
      emptyStateTitle="No products match this view"
      emptyStateDescription="Try a different date range, or clear some filters."
    />
  );
}
