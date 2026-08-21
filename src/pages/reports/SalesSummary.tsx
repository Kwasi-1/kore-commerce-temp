import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useFeaturesStore } from '@/store/featuresStore';
import { Icon } from '@iconify/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function SalesSummary() {
  const { hasModule } = useFeaturesStore();
  const hasPos = hasModule('pos');
  const hasEcommerce = hasModule('ecommerce');
  const isMultiChannel = hasPos && hasEcommerce;

  // Global Date Filter for Page Header
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  // Scoped Channel Filter for Charts & Stats
  const [channel, setChannel] = useState<'all' | 'pos' | 'online'>('all');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalesReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const startIso = dateFilter.start_date ? dateFilter.start_date.toISOString() : '';
      const endIso = dateFilter.end_date ? dateFilter.end_date.toISOString() : '';

      const params = new URLSearchParams();
      if (startIso) params.set('start_date', startIso);
      if (endIso) params.set('end_date', endIso);
      if (isMultiChannel && channel !== 'all') params.set('channel', channel);

      const response = await apiClient.get(`/tenant/reports/sales?${params.toString()}`);
      const data = response.data.success?.data || response.data.data || {};

      setSummaryData(data.summary || {});
      setTimeseriesData(data.timeseries || []);
      setPaymentDistribution(data.payment_distribution || []);
    } catch (error) {
      console.error('Failed to fetch sales summary:', error);
      toast.error('Failed to load sales report');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, channel]);

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  const summary = summaryData || {};
  const costCoveragePct = summary.cost_coverage_pct ?? 100;
  const isHighCoverage = costCoveragePct >= 80;

  // Chart formatters
  const formatGHS = (val: number) => `GHS ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PageLayout
      title="Sales Summary"
      actions={
        <CustomOnlyDateFilterComponent
          defaultDate="this_month"
          value={dateFilter}
          onChange={setDateFilter}
          align="end"
          showLabelOnMobile={true}
        />
      }
    >
      <div className="space-y-5">
        {/* 4 Enhanced Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Gross Revenue */}
          <DashboardCard
            title="Total Gross Revenue"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.gross_sales || 0} />}
            subvalue={
              summary.total_refunds > 0
                ? `${summary.total_orders || 0} transactions (${summary.completed_orders_count || 0} completed · ${summary.refunded_orders_count || 0} refunded)`
                : undefined
            }
            collapsibleContent={
              <div className="space-y-2 text-xs pt-0.5">
                {isMultiChannel ? (
                  <>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>POS Sales</span>
                      <span className="font-medium text-foreground">
                        <CurrencyDisplay amount={summary.breakdown_by_channel?.pos?.gross || summary.breakdown_by_channel?.pos?.total || 0} showStyling={false} />
                        <span className="text-muted-foreground/60 text-[11px] ml-1">({summary.breakdown_by_channel?.pos?.count || 0})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Online Sales</span>
                      <span className="font-medium text-foreground">
                        <CurrencyDisplay amount={summary.breakdown_by_channel?.online?.gross || summary.breakdown_by_channel?.online?.total || 0} showStyling={false} />
                        <span className="text-muted-foreground/60 text-[11px] ml-1">({summary.breakdown_by_channel?.online?.count || 0})</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{hasPos ? 'In-Store POS Sales' : 'Online Store Sales'}</span>
                    <span className="font-medium text-foreground">
                      <CurrencyDisplay amount={summary.gross_sales || 0} showStyling={false} />
                      <span className="text-muted-foreground/60 text-[11px] ml-1">({summary.total_orders || 0})</span>
                    </span>
                  </div>
                )}
                {summary.total_discounts > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground pt-1.5 border-t border-border/40">
                    <span>Total Discounts</span>
                    <span className="font-medium text-foreground">
                      <CurrencyDisplay amount={summary.total_discounts || 0} showStyling={false} />
                    </span>
                  </div>
                )}
              </div>
            }
          />

          {/* Card 2: Net Revenue */}
          <DashboardCard
            title="Net Revenue"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.net_sales || 0} />}
            subvalue={
              summary.total_refunds > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  Less -<CurrencyDisplay amount={summary.total_refunds} showStyling={false} /> in refunds
                </span>
              ) : undefined
            }
            collapsibleContent={
              <div className="space-y-2 text-xs pt-0.5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Gross Sales</span>
                  <span className="font-medium text-foreground">
                    <CurrencyDisplay amount={summary.gross_sales || 0} showStyling={false} />
                  </span>
                </div>
                {summary.total_refunds > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Less Refunds</span>
                    <span className="font-medium text-foreground">
                      - <CurrencyDisplay amount={summary.total_refunds || 0} showStyling={false} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-border/40 font-semibold text-foreground">
                  <span>Net Revenue</span>
                  <span>
                    <CurrencyDisplay amount={summary.net_sales || 0} showStyling={false} />
                  </span>
                </div>
              </div>
            }
          />

          {/* Card 3: Gross Profit & Cost Coverage */}
          <DashboardCard
            title="Gross Profit"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.gross_profit || 0} />}
            subvalue={
              <div className="space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {summary.gross_margin_pct || 0}% Margin
                  </span>
                  <span>
                    {costCoveragePct}% Cost Coverage
                  </span>
                </div>
                {/* Minimalist Monochrome Progress Line */}
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/70 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, costCoveragePct))}%` }}
                  />
                </div>
              </div>
            }
            collapsibleContent={
              <div className="space-y-2 text-xs pt-0.5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Tracked COGS</span>
                  <span className="font-medium text-foreground">
                    <CurrencyDisplay amount={summary.cogs || 0} showStyling={false} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Costed Items</span>
                  <span className="font-medium text-foreground">
                    {summary.costed_items_count || 0} items ({formatGHS(summary.costed_revenue || 0)})
                  </span>
                </div>
                {summary.uncosted_items_count > 0 && (
                  <div className="text-[11px] text-muted-foreground/80 pt-1.5 border-t border-border/30 italic">
                    * {summary.uncosted_items_count} items sold without recorded cost price ({formatGHS(summary.uncosted_revenue || 0)})
                  </div>
                )}
                {summary.period_expenses > 0 && (
                  <div className="pt-1.5 border-t border-border/40 space-y-1.5">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Operating Expenses</span>
                      <span className="font-medium text-foreground">
                        - <CurrencyDisplay amount={summary.period_expenses || 0} showStyling={false} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-semibold text-foreground">
                      <span>Net Operating Profit</span>
                      <span>
                        <CurrencyDisplay amount={summary.net_operating_profit || 0} showStyling={false} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            }
          />

          {/* Card 4: Total Orders & Sales Tickets */}
          <DashboardCard
            title="Total Orders"
            value={isLoading ? '...' : (summary.completed_orders_count || summary.total_orders || 0).toString()}
            subvalue={
              summary.refunded_orders_count > 0
                ? `${summary.refunded_orders_count} refunds excluded`
                : undefined
            }
            collapsibleContent={
              <div className="space-y-2 text-xs pt-0.5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Avg Order Value</span>
                  <span className="font-medium text-foreground">
                    <CurrencyDisplay amount={summary.average_order_value || 0} showStyling={false} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Highest Order Ticket</span>
                  <span className="font-medium text-foreground">
                    <CurrencyDisplay amount={summary.max_order_value || 0} showStyling={false} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground pt-1.5 border-t border-border/40">
                  <span>Total Items Sold</span>
                  <span className="font-medium text-foreground">
                    {(summary.costed_items_count || 0) + (summary.uncosted_items_count || 0)} units
                  </span>
                </div>
              </div>
            }
          />
        </div>

        {/* Visualizations Grid: Left (70%) Revenue Chart + Right (30%) Payment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Revenue by Day Chart Card */}
          <div className="lg:col-span-8 bg-card/60 backdrop-blur-md text-card-foreground p-5 md:p-6 rounded-xl border border-border dark:border-border/60 flex flex-col shadow-sm min-h-[420px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground">Revenue by Day</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Daily sales trend across selected date range</p>
              </div>

              {/* Scoped Channel Selector Switcher - Only shown when tenant has both POS & E-Commerce */}
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

            <div className="flex-1 min-h-[280px]">
              {timeseriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeseriesData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/30" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-muted-foreground"
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-muted-foreground"
                      tickFormatter={(val) => `${val}`}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'currentColor', opacity: 0.05 }}
                      formatter={(val: number) => formatGHS(val)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#00C853" radius={[4, 4, 0, 0]} maxBarSize={45} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <Icon icon="solar:chart-2-linear" className="h-10 w-10 mb-2 opacity-40" />
                  <span>No revenue recorded in this date range</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Distribution Donut Card */}
          <div className="lg:col-span-4 bg-card/60 backdrop-blur-md text-card-foreground p-5 md:p-6 rounded-xl border border-border dark:border-border/60 flex flex-col justify-between shadow-sm min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-foreground">Payment Distribution</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Top: {summary.top_payment_method || 'Cash'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Revenue share by payment type</p>
            </div>

            <div className="flex-1 min-h-[220px]">
              {paymentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {paymentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => formatGHS(val)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <Icon icon="solar:wallet-money-linear" className="h-10 w-10 mb-2 opacity-40" />
                  <span>No payment transactions recorded</span>
                </div>
              )}
            </div>

            {/* Payment List Breakdown */}
            {paymentDistribution.length > 0 && (
              <div className="pt-3 border-t border-border/40 space-y-1.5">
                {paymentDistribution.map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                      <span className="text-muted-foreground font-medium">{pm.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{formatGHS(pm.amount)}</span>
                      <span className="text-[11px] text-muted-foreground w-9 text-right font-semibold">({pm.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </PageLayout>
  );
}
