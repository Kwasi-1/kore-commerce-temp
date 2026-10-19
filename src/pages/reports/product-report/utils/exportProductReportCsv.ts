import Papa from 'papaparse';
import { format } from 'date-fns';
import { INSIGHT_META } from '../constants';
import type { ProductReportFilters, ProductReportRow, ProductReportSummary } from '../types';

/** Raw numbers (not formatted strings) so the file works directly in Excel / Google Sheets. */
export function exportProductReportCsv(rows: ProductReportRow[], summary: ProductReportSummary, filters: ProductReportFilters, scopeLabel: string | null): string {
  const comparing = !!summary.comparison;
  const data = rows.map((r, i) => ({
    Rank: i + 1,
    Product: r.name,
    Variant: r.variant_label || '',
    SKU: r.sku,
    Brand: r.brand || '',
    Category: r.category,
    'Units sold': r.units_sold,
    'Share of units (%)': r.units_share_pct,
    ...(comparing ? { 'Units sold (prev)': r.prev_units ?? 0, 'Units change (%)': r.units_change_pct ?? '' } : {}),
    'Gross sales (GHS)': r.revenue,
    'Discounts (GHS)': r.discounts ?? 0,
    'Refunds (GHS)': r.refunds ?? 0,
    'Net revenue (GHS)': r.net_revenue ?? r.revenue,
    'Units returned': r.returned_units ?? 0,
    'Return rate (%)': r.return_rate_pct ?? '',
    'Share of revenue (%)': r.revenue_share_pct,
    ...(comparing ? { 'Revenue (prev, GHS)': r.prev_revenue ?? 0, 'Revenue change (%)': r.revenue_change_pct ?? '' } : {}),
    'COGS (GHS)': r.cost_of_goods ?? '',
    'Gross profit (GHS)': r.gross_profit,
    'Gross margin (%)': r.gross_margin ?? '',
    'Stock on hand': r.stock_quantity,
    'Sales per day': r.velocity_per_day,
    'Days of cover': r.days_of_cover ?? '',
    'Stock status': r.stock_status.replace(/_/g, ' '),
    Insight: INSIGHT_META[r.insight]?.label || r.insight,
    'Last sold': r.last_sold_at ? format(new Date(r.last_sold_at), 'yyyy-MM-dd HH:mm') : '',
  }));

  // BOM so Excel opens UTF-8 (₵, accents, etc.) correctly
  const csv = '﻿' + Papa.unparse(data);
  const rangePart =
    filters.range === 'all_time' || !filters.start
      ? 'all-time'
      : `${format(filters.start, 'yyyy-MM-dd')}_${format(filters.end || filters.start, 'yyyy-MM-dd')}`;
  const scopePart = scopeLabel ? `_${scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}` : '';
  const filename = `product-report${scopePart}_${rangePart}.csv`;

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
