import type { CompareMode, GroupBy, Insight, SortPreset } from './types';

export const SORT_PRESETS: { key: SortPreset; label: string; icon: string; requiresCompare?: boolean }[] = [
  { key: 'top_selling', label: 'Top Revenue', icon: 'lucide:trending-up' },
  { key: 'units_sold', label: 'Highest Volume', icon: 'lucide:layers' },
  { key: 'margin', label: 'Highest Margin', icon: 'lucide:percent' },
  { key: 'slow_movers', label: 'Slow Moving (0 Sales)', icon: 'lucide:clock' },
  { key: 'low_stock', label: 'Low Stock Alert', icon: 'lucide:alert-triangle' },
  { key: 'decliners', label: 'Biggest Decline', icon: 'lucide:trending-down', requiresCompare: true },
];

export const GROUP_BY_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'variant', label: 'Variant / SKU' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'category', label: 'Category' },
];

export const COMPARE_OPTIONS: { key: CompareMode; label: string }[] = [
  { key: 'none', label: 'No comparison' },
  { key: 'previous_period', label: 'Previous period' },
  { key: 'previous_year', label: 'Same period last year' },
];

/**
 * Status colors (reserved — never reused as series colors). Always rendered with an icon + label.
 * `pdf` is the RGB used in the exported PDF.
 */
export const INSIGHT_META: Record<Insight, { label: string; icon: string; className: string; pdf: [number, number, number] }> = {
  restock: {
    label: 'Restock',
    icon: 'lucide:package-plus',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    pdf: [208, 59, 59],
  },
  dead_stock: {
    label: 'Dead stock',
    icon: 'lucide:package-x',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    pdf: [201, 133, 0],
  },
  overstocked: {
    label: 'Overstocked',
    icon: 'lucide:warehouse',
    className: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
    pdf: [217, 89, 38],
  },
  healthy: {
    label: 'Healthy',
    icon: 'lucide:check-circle-2',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    pdf: [12, 130, 12],
  },
  inactive: {
    label: 'No activity',
    icon: 'lucide:circle-dashed',
    className: 'bg-muted text-muted-foreground border-border',
    pdf: [120, 120, 120],
  },
};

/** Validated categorical order (dataviz reference palette). Assigned in order, never cycled. */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const OTHERS_COLOR = '#9a9993';
export const SHARE_BAR_COLOR = '#2a78d6';
