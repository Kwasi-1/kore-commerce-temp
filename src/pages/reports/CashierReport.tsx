import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Icon } from '@iconify/react';

type CashierSortPreset = 'highest_sales' | 'most_txns' | 'highest_ticket' | 'till_variance' | 'refunds';

export default function CashierReport() {
  // Global Date Filter
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  // Sorting preset
  const [sortPreset, setSortPreset] = useState<CashierSortPreset>('highest_sales');
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

      const response = await apiClient.get(`/tenant/reports/cashiers?${params.toString()}`);
      const data = response.data?.success?.data || response.data?.data || {};

      setReportData(data.cashiers || data.cashier_performance || []);
      setSummaryData(data.summary || {});
    } catch (error) {
      console.error('Failed to fetch cashier report:', error);
      toast.error('Failed to load cashier metrics');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, sortPreset]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = summaryData || {};

  const columns = [
    { key: 'cashier', label: 'Staff Member' },
    { key: 'transaction_count', label: 'Completed Sales' },
    { key: 'total_sales', label: 'Total Revenue' },
    { key: 'avg_transaction', label: 'Avg Ticket (AOV)' },
    { key: 'payment_breakdown', label: 'Payment Method Breakdown' },
    { key: 'refunds', label: 'Refunds Handled' },
    { key: 'shifts_variance', label: 'Till Discrepancy' },
  ];

  const rows = useMemo(() => {
    return reportData.map((c: any) => {
      const variance = c.till_variance || 0;
      const initials = (c.first_name?.[0] || '') + (c.last_name?.[0] || '');

      return {
        id: c.staff_id,
        cashier: (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/80 border border-border/60 flex items-center justify-center font-bold text-xs text-foreground uppercase shrink-0">
              {initials || <Icon icon="lucide:user" className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm truncate">{c.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase">
                  {c.role || 'Staff'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">{c.email || c.phone || 'No contact'}</span>
            </div>
          </div>
        ),
        transaction_count: (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm tabular-nums">
              {(c.completed_count || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {c.completed_count === 1 ? 'checkout' : 'checkouts'}
            </span>
          </div>
        ),
        total_sales: (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm">
              <CurrencyDisplay amount={c.total_sales || 0} showStyling={false} />
            </span>
          </div>
        ),
        avg_transaction: (
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-sm">
              <CurrencyDisplay amount={c.avg_ticket_value || 0} showStyling={false} />
            </span>
            <span className="text-[11px] text-muted-foreground">per sale</span>
          </div>
        ),
        payment_breakdown: (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Cash:</span>
              <span className="font-medium text-foreground">
                <CurrencyDisplay amount={c.payment_breakdown?.cash || 0} showStyling={false} />
              </span>
            </div>
            {((c.payment_breakdown?.mobile_money || 0) + (c.payment_breakdown?.mobile_money_manual || 0)) > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>MoMo:</span>
                <span className="font-medium text-foreground">
                  <CurrencyDisplay
                    amount={(c.payment_breakdown?.mobile_money || 0) + (c.payment_breakdown?.mobile_money_manual || 0)}
                    showStyling={false}
                  />
                </span>
              </div>
            )}
            {(c.payment_breakdown?.card || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Card:</span>
                <span className="font-medium text-foreground">
                  <CurrencyDisplay amount={c.payment_breakdown?.card || 0} showStyling={false} />
                </span>
              </div>
            )}
          </div>
        ),
        refunds: (
          <div className="flex flex-col">
            {c.refunded_count > 0 ? (
              <>
                <span className="font-medium text-destructive text-sm">
                  - <CurrencyDisplay amount={c.refunds_amount || 0} showStyling={false} />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {c.refunded_count} {c.refunded_count === 1 ? 'refund' : 'refunds'}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">None (0)</span>
            )}
          </div>
        ),
        shifts_variance: (
          <div className="flex flex-col">
            <span
              className={`font-semibold text-sm tabular-nums ${
                variance < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : variance > 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-foreground'
              }`}
            >
              {variance > 0 ? '+' : ''}
              <CurrencyDisplay amount={variance} showStyling={false} />
            </span>
            <span className="text-[11px] text-muted-foreground">
              {c.closed_shifts_count || 0} {c.closed_shifts_count === 1 ? 'shift closed' : 'shifts closed'}
            </span>
          </div>
        ),
      };
    });
  }, [reportData]);

  const presetTabs: { key: CashierSortPreset; label: string; icon: string }[] = [
    { key: 'highest_sales', label: 'Top Revenue', icon: 'lucide:trending-up' },
    { key: 'most_txns', label: 'Most Transactions', icon: 'lucide:activity' },
    { key: 'highest_ticket', label: 'Highest Ticket (AOV)', icon: 'lucide:award' },
    { key: 'till_variance', label: 'Till Discrepancies', icon: 'lucide:scale' },
    { key: 'refunds', label: 'Refunds Handled', icon: 'lucide:rotate-ccw' },
  ];

  return (
    <PageLayout
      title="Cashier Performance"
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
          
          {/* Card 1: Total Revenue Handled */}
          <DashboardCard
            title="Total Handled Sales"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_revenue || 0} />}
            subvalue={
              summary.active_cashiers > 0
                ? `Across ${summary.active_cashiers} active ${summary.active_cashiers === 1 ? 'cashier' : 'cashiers'}`
                : undefined
            }
          />

          {/* Card 2: Completed Transactions */}
          <DashboardCard
            title="Total Checkouts"
            value={isLoading ? '...' : (summary.total_transactions || 0).toLocaleString()}
            subvalue="Completed POS sales"
          />

          {/* Card 3: Overall Average Ticket Size */}
          <DashboardCard
            title="Avg Ticket Value (AOV)"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.overall_avg_ticket || 0} />}
            subvalue="Per checkout session"
          />

          {/* Card 4: Top Performer */}
          <DashboardCard
            title="Top Performer"
            value={isLoading ? '...' : summary.top_performer || '—'}
            subvalue="Highest revenue contributor"
          />
        </div>

        {/* Preset Sorting Segment Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-card text-card-foreground p-3 md:p-3.5 rounded-xl border border-border">
          {presetTabs.map((tab) => {
            const isActive = sortPreset === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSortPreset(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon icon={tab.icon} className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Enhanced Analytics Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Staff Performance & Audit Breakdown"
          showSearch={false}
          showFilter={false}
          showAddButton={false}
          mobileFriendly={true}
        />

      </div>
    </PageLayout>
  );
}
