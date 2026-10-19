export type SortPreset = 'top_selling' | 'units_sold' | 'margin' | 'slow_movers' | 'low_stock' | 'decliners';
export type GroupBy = 'variant' | 'product' | 'brand' | 'category';
export type CompareMode = 'none' | 'previous_period' | 'previous_year';
export type Channel = 'all' | 'pos' | 'online';
export type Insight = 'restock' | 'healthy' | 'overstocked' | 'dead_stock' | 'inactive';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductReportRow {
  id: string;
  variant_id: string | null;
  product_id: string | null;
  name: string;
  variant_label: string | null;
  sku: string;
  category: string;
  brand: string | null;
  image: string | null;
  units_sold: number;
  /** Gross sales (before order discounts and refunds). */
  revenue: number;
  discounts: number;
  refunds: number;
  net_revenue: number;
  discount_pct: number | null;
  returned_units: number;
  return_rate_pct: number | null;
  cost_of_goods: number | null;
  cost_price: number | null;
  gross_profit: number;
  gross_margin: number | null;
  has_cost: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: StockStatus;
  units_share_pct: number;
  revenue_share_pct: number;
  velocity_per_day: number;
  days_of_cover: number | null;
  last_sold_at: string | null;
  insight: Insight;
  children_count: number;
  children_needing_restock: number;
  prev_units?: number;
  prev_revenue?: number;
  units_change_pct?: number | null;
  revenue_change_pct?: number | null;
}

export interface ProductReportSummary {
  total_revenue: number;
  total_discounts: number;
  total_refunds: number;
  total_net_revenue: number;
  total_returned_units: number;
  return_rate_pct: number;
  total_units_sold: number;
  total_cogs: number;
  total_gross_profit: number;
  overall_gross_margin_pct: number;
  cost_coverage_pct: number;
  unique_products_sold: number;
  total_catalog_products: number;
  filtered_item_count: number;
  restock_count: number;
  dead_stock_count: number;
  period_days: number;
  group_by: GroupBy;
  filters_applied: Record<string, any>;
  comparison: { mode: CompareMode; start_date: string; end_date: string } | null;
  prev_total_revenue?: number;
  prev_total_net_revenue?: number;
  net_revenue_change_pct?: number | null;
  prev_total_units_sold?: number;
  revenue_change_pct?: number | null;
  units_change_pct?: number | null;
}

export interface TrendSeries {
  id: string;
  label: string;
  total_units: number;
  points: { date: string; units: number; revenue: number }[];
}

export interface TrendData {
  bucket: 'day' | 'week' | 'month';
  buckets: string[];
  series: TrendSeries[];
}

export interface ProductGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  item_count: number;
  product_ids: string[];
  variant_ids: string[];
}

/** Everything that defines a report view. Mirrored 1:1 in the URL. */
export interface ProductReportFilters {
  range: string; // date shortcut id from CustomOnlyDateFilterComponent ('this_month', 'custom', ...)
  start: Date | null;
  end: Date | null;
  channel: Channel;
  categories: string[];
  brands: string[];
  groupId: string | null;
  variantIds: string[];
  productIds: string[];
  groupBy: GroupBy;
  compare: CompareMode;
  sort: SortPreset;
  search: string;
}

export interface PackagingTierOption {
  id: string;
  name: string;
  units_per_tier: number;
}

export interface ReorderSuggestion {
  variant_id: string;
  product_id: string | null;
  name: string;
  variant_label: string | null;
  sku: string;
  category: string;
  brand: string | null;
  stock_quantity: number;
  on_order_base_units: number;
  velocity_per_day: number;
  days_of_cover: number;
  needed_base_units: number;
  tier: PackagingTierOption;
  tiers: PackagingTierOption[];
  suggested_tier_qty: number;
  cost_per_tier: number | null;
  estimated_cost: number | null;
  last_supplier: { id: string; name: string } | null;
}
