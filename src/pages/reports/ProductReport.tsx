import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import { useFeaturesStore } from '@/store/featuresStore';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Icon } from '@iconify/react';

type SortPreset = 'top_selling' | 'units_sold' | 'margin' | 'slow_movers' | 'low_stock';

export default function ProductReport() {
  const { hasModule } = useFeaturesStore();
  const hasPos = hasModule('pos');
  const hasEcommerce = hasModule('ecommerce');
  const isMultiChannel = hasPos && hasEcommerce;

  // Global Date Filter
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  // Performance Segment / Sort Mode
  const [sortPreset, setSortPreset] = useState<SortPreset>('top_selling');
  const [channel, setChannel] = useState<'all' | 'pos' | 'online'>('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const startStr = dateFilter.start_date ? dateFilter.start_date.toISOString() : '';
      const endStr = dateFilter.end_date ? dateFilter.end_date.toISOString() : '';

      const params = new URLSearchParams();
      if (startStr) params.set('start_date', startStr);
      if (endStr) params.set('end_date', endStr);
      params.set('sort', sortPreset);
      if (isMultiChannel && channel !== 'all') params.set('channel', channel);

      const response = await apiClient.get(`/tenant/reports/products?${params.toString()}`);
      const data = response.data?.success?.data || response.data?.data || {};

      setReportData(data.products || data.top_products || []);
      setSummaryData(data.summary || {});
    } catch (error) {
      console.error('Failed to fetch product report:', error);
      toast.error('Failed to load product report');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, sortPreset, channel, isMultiChannel]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = summaryData || {};
  const costCoveragePct = summary.cost_coverage_pct ?? 100;
  const isHighCoverage = costCoveragePct >= 80;

  const columns = [
    { key: 'product', label: 'Product & SKU' },
    { key: 'units_sold', label: 'Units Sold' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'cogs', label: 'COGS' },
    { key: 'profit_margin', label: 'Gross Profit / Margin' },
    { key: 'stock', label: 'Current Stock' },
  ];

  const rows = useMemo(() => {
    return reportData.map((p: any) => {
      const hasCost = p.has_cost;
      const marginVal = p.gross_margin;
      const units = p.units_sold || 0;
      const revenue = p.revenue || 0;
      const profit = p.gross_profit || 0;
      const stockQty = p.stock_quantity ?? 0;
      const stockStatus = p.stock_status || 'in_stock';

      return {
        id: p.id,
        product: (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <Icon icon="lucide:package" className="w-5 h-5 text-muted-foreground/60" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-sm truncate">{p.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{p.sku || '—'}</span>
                {p.category && (
                  <>
                    <span>&bull;</span>
                    <span className="truncate">{p.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ),
        units_sold: (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground tabular-nums text-sm">
              {units.toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {units === 1 ? 'unit sold' : 'units sold'}
            </span>
          </div>
        ),
        revenue: (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm">
              <CurrencyDisplay amount={revenue} showStyling={false} />
            </span>
          </div>
        ),
        cogs: (
          <div className="flex flex-col">
            {hasCost ? (
              <>
                <span className="font-medium text-foreground text-sm">
                  <CurrencyDisplay amount={p.cost_of_goods || 0} showStyling={false} />
                </span>
                {p.cost_price !== null && (
                  <span className="text-[11px] text-muted-foreground">
                    @ <CurrencyDisplay amount={p.cost_price} showStyling={false} /> / unit
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Uncosted</span>
            )}
          </div>
        ),
        profit_margin: (
          <div className="flex flex-col">
            {hasCost ? (
              <>
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                  <CurrencyDisplay amount={profit} showStyling={false} />
                  {marginVal !== null && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({marginVal.toFixed(1)}%)
                    </span>
                  )}
                </div>
                {marginVal !== null && (
                  <div className="w-20 h-1 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${Math.min(100, Math.max(0, marginVal))}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="font-semibold text-foreground text-sm">
                <CurrencyDisplay amount={revenue} showStyling={false} />
              </span>
            )}
          </div>
        ),
        stock: (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm tabular-nums">
                {stockQty.toLocaleString()} on hand
              </span>
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
                  ? 'Out of Stock'
                  : stockStatus === 'low_stock'
                  ? 'Low Stock'
                  : 'In Stock'}
              </span>
            </div>
          </div>
        ),
      };
    });
  }, [reportData]);

  const presetTabs: { key: SortPreset; label: string; icon: string }[] = [
    { key: 'top_selling', label: 'Top Revenue', icon: 'lucide:trending-up' },
    { key: 'units_sold', label: 'Highest Volume', icon: 'lucide:layers' },
    { key: 'margin', label: 'Highest Margin', icon: 'lucide:percent' },
    { key: 'slow_movers', label: 'Slow Moving (0 Sales)', icon: 'lucide:clock' },
    { key: 'low_stock', label: 'Low Stock Alert', icon: 'lucide:alert-triangle' },
  ];

  return (
    <PageLayout
      title="Product Performance"
      actions={
        <CustomOnlyDateFilterComponent
          value={dateFilter}
          onChange={(newVal) => setDateFilter(newVal)}
        />
      }
    >
      <div className="space-y-5">
        
        {/* Top Monochromatic Executive Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Product Revenue */}
          <DashboardCard
            title="Product Revenue"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_revenue || 0} />}
            subvalue={
              summary.unique_products_sold > 0
                ? `${summary.unique_products_sold} unique products sold`
                : undefined
            }
          />

          {/* Card 2: Units Sold */}
          <DashboardCard
            title="Units Moved"
            value={isLoading ? '...' : (summary.total_units_sold || 0).toLocaleString()}
            subvalue={
              summary.total_catalog_products > 0
                ? `Across ${summary.total_catalog_products} catalog items`
                : undefined
            }
          />

          {/* Card 3: Tracked COGS */}
          <DashboardCard
            title="Tracked COGS"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_cogs || 0} />}
            subvalue={
              summary.cost_coverage_pct !== undefined
                ? `${summary.cost_coverage_pct}% cost coverage`
                : undefined
            }
          />

          {/* Card 4: Gross Profit & Margin */}
          <DashboardCard
            title="Product Gross Profit"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_gross_profit || 0} />}
            subvalue={
              <div className="space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {summary.overall_gross_margin_pct || 0}% Realized Margin
                  </span>
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

        {/* Filter Segment Tabs & Omnichannel Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card text-card-foreground p-3 md:p-3.5 rounded-xl border border-border">
          
          {/* Preset Sorting Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presetTabs.map((tab) => {
              const isActive = sortPreset === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSortPreset(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'dark:bg-foreground bg-sidebar text-background shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon icon={tab.icon} className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Channel Selector for Omnichannel merchants */}
          {isMultiChannel && (
            <div className="inline-flex p-1 rounded-lg bg-muted/50 border border-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChannel('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  channel === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Channels
              </button>
              <button
                type="button"
                onClick={() => setChannel('pos')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  channel === 'pos'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                POS
              </button>
              <button
                type="button"
                onClick={() => setChannel('online')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  channel === 'online'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Online
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Analytics Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Product Performance Breakdown"
          showSearch={true}
          searchPlaceholder="Search product by name, SKU or category..."
          showFilter={false}
          showAddButton={false}
          mobileFriendly={true}
        />

      </div>
    </PageLayout>
  );
}
