import type { ProductReportRow, ProductReportSummary } from '../types';
import { formatChange, formatCover, rowDisplayName } from './format';

export interface Highlight {
  tone: 'good' | 'warning' | 'critical' | 'neutral';
  icon: string;
  text: string;
}

/**
 * Plain-language takeaways for the current view, shown above the compare charts
 * and at the top of the exported PDF.
 */
export function buildHighlights(rows: ProductReportRow[], summary: ProductReportSummary | null, itemNoun = 'items'): Highlight[] {
  if (!summary || rows.length === 0) return [];
  const out: Highlight[] = [];
  const sold = rows.filter((r) => r.units_sold > 0);

  const top = [...sold].sort((a, b) => b.units_sold - a.units_sold)[0];
  if (top && sold.length > 1) {
    out.push({
      tone: 'good',
      icon: 'lucide:trophy',
      text: `${rowDisplayName(top)} leads with ${top.units_share_pct.toFixed(1)}% of units sold.`,
    });
  }

  const restock = rows.filter((r) => r.insight === 'restock').sort((a, b) => (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0));
  if (restock.length > 0) {
    const names = restock.slice(0, 3).map((r) => `${rowDisplayName(r)} (${formatCover(r.days_of_cover)} left)`);
    out.push({
      tone: 'critical',
      icon: 'lucide:package-plus',
      text: `${restock.length} ${restock.length === 1 ? 'item needs' : `${itemNoun} need`} restocking: ${names.join(', ')}${restock.length > 3 ? '…' : ''}.`,
    });
  }

  const dead = rows.filter((r) => r.insight === 'dead_stock');
  if (dead.length > 0) {
    out.push({
      tone: 'warning',
      icon: 'lucide:package-x',
      text: `${dead.length} ${dead.length === 1 ? 'item has' : `${itemNoun} have`} stock but no sales in this period${
        dead.length <= 3 ? `: ${dead.map(rowDisplayName).join(', ')}` : ''
      }. Consider a promotion or pausing reorders.`,
    });
  }

  if (summary.comparison) {
    const withChange = rows.filter((r) => r.units_change_pct !== null && r.units_change_pct !== undefined && (r.prev_units ?? 0) > 0);
    const worst = [...withChange].sort((a, b) => (a.units_change_pct ?? 0) - (b.units_change_pct ?? 0))[0];
    const best = [...withChange].sort((a, b) => (b.units_change_pct ?? 0) - (a.units_change_pct ?? 0))[0];
    if (summary.units_change_pct !== null && summary.units_change_pct !== undefined) {
      out.push({
        tone: summary.units_change_pct >= 0 ? 'good' : 'warning',
        icon: summary.units_change_pct >= 0 ? 'lucide:trending-up' : 'lucide:trending-down',
        text: `Units sold ${summary.units_change_pct >= 0 ? 'up' : 'down'} ${formatChange(summary.units_change_pct)} vs the comparison period.`,
      });
    }
    if (best && (best.units_change_pct ?? 0) > 0) {
      out.push({ tone: 'good', icon: 'lucide:arrow-up-right', text: `Fastest growing: ${rowDisplayName(best)} (${formatChange(best.units_change_pct)}).` });
    }
    if (worst && (worst.units_change_pct ?? 0) < 0) {
      out.push({ tone: 'warning', icon: 'lucide:arrow-down-right', text: `Biggest drop: ${rowDisplayName(worst)} (${formatChange(worst.units_change_pct)}).` });
    }
  }

  const highReturns = rows
    .filter((r) => (r.return_rate_pct ?? 0) >= 10 && r.returned_units >= 2)
    .sort((a, b) => (b.return_rate_pct ?? 0) - (a.return_rate_pct ?? 0));
  if (highReturns.length > 0) {
    out.push({
      tone: 'warning',
      icon: 'lucide:undo-2',
      text: `High return rate: ${highReturns
        .slice(0, 3)
        .map((r) => `${rowDisplayName(r)} (${(r.return_rate_pct ?? 0).toFixed(0)}%)`)
        .join(', ')}. Check quality or the supplier.`,
    });
  }

  if ((summary.total_discounts || 0) > 0 && summary.total_revenue > 0) {
    const pct = (summary.total_discounts / summary.total_revenue) * 100;
    if (pct >= 5) {
      out.push({
        tone: 'neutral',
        icon: 'lucide:badge-percent',
        text: `Discounts gave away ${pct.toFixed(1)}% of gross sales in this view.`,
      });
    }
  }

  const overstocked = rows.filter((r) => r.insight === 'overstocked');
  if (overstocked.length > 0) {
    out.push({
      tone: 'neutral',
      icon: 'lucide:warehouse',
      text: `${overstocked.length} ${overstocked.length === 1 ? 'item has' : `${itemNoun} have`} more than 90 days of stock on hand.`,
    });
  }

  return out;
}
