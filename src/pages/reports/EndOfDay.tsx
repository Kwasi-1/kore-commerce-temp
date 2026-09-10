import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import {
  CustomOnlyDateFilterComponent,
  DateFilterValue
} from '@/components/shared/custom-only-date-filter';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  FileText,
  Store,
  Calendar,
  ArrowRight,
  PieChart as PieChartIcon,
  Receipt
} from 'lucide-react';
import ZReportModal from '@/components/pos/ZReportModal';

export default function EndOfDay() {
  const navigate = useNavigate();
  const { formatGHS } = useCurrency();
  const tenant = useAuthStore((state) => state.tenant);
  const isPosOnly = tenant?.plan === 'starter' || tenant?.plan === 'standard';
  const posSettings = useFeaturesStore((state) => state.posSettings);
  const shiftTrackingEnabled = Boolean(posSettings?.pos_shift_management_enabled);

  const [eodData, setEodData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'today',
    start_date: new Date(),
    end_date: new Date(),
  });

  const [selectedZReportShiftId, setSelectedZReportShiftId] = useState<string | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  const fetchEOD = async (filter: DateFilterValue) => {
    setIsLoading(true);
    try {
      let queryParams = '';
      if (filter.active === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        queryParams = `date=${todayStr}`;
      } else if (filter.start_date && filter.end_date) {
        queryParams = `start_date=${filter.start_date.toISOString()}&end_date=${filter.end_date.toISOString()}`;
      } else if (filter.start_date) {
        queryParams = `start_date=${filter.start_date.toISOString()}`;
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        queryParams = `date=${todayStr}`;
      }

      const response = await apiClient.get(`/tenant/reports/end-of-day?${queryParams}`);
      setEodData(response.data.success?.data?.summary);
    } catch (error) {
      console.error('Failed to fetch EOD report:', error);
      toast.error('Failed to load End of Day summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEOD(dateFilter);
  }, [dateFilter]);

  // Helper: API interceptor wraps Decimal fields in {source, parsedValue} — unwrap safely
  const parseVal = (v: any): number => (v && typeof v === 'object' && 'parsedValue' in v ? v.parsedValue : (v ?? 0));
  const grossSales = parseVal(eodData?.pos?.gross_sales ?? eodData?.total_sales);
  const totalRefunds = parseVal(eodData?.pos?.refunds ?? 0);
  const netSales = parseVal(eodData?.total_sales);
  const expenseRecords = eodData?.expenses?.records || [];
  const totalExpenses = parseVal(eodData?.expenses?.total);
  const avgOrderValue = parseVal(eodData?.average_order_value);

  const pb = eodData?.payment_breakdown || {};
  const paymentBreakdownChartData = [
    { name: 'Cash', value: pb.cash || 0, color: '#059669' },
    { name: 'MoMo', value: (pb.mobile_money || 0) + (pb.mobile_money_manual || 0), color: '#4f46e5' },
    { name: 'Card', value: pb.card || 0, color: '#0284c7' },
    { name: 'Credit', value: pb.credit || 0, color: '#7c3aed' }
  ].filter(item => item.value > 0);

  const hasPayments = paymentBreakdownChartData.length > 0;

  const shiftRecords = eodData?.shifts?.records || [];
  const closedShiftsCount = eodData?.shifts?.closed_shifts || 0;
  const hasClosedShifts = closedShiftsCount > 0;

  const dailyBreakdown = eodData?.daily_breakdown || [];
  const startDateStr = dateFilter.start_date instanceof Date ? format(dateFilter.start_date, 'yyyy-MM-dd') : dateFilter.start_date ? format(new Date(dateFilter.start_date), 'yyyy-MM-dd') : '';
  const endDateStr = dateFilter.end_date instanceof Date ? format(dateFilter.end_date, 'yyyy-MM-dd') : dateFilter.end_date ? format(new Date(dateFilter.end_date), 'yyyy-MM-dd') : '';
  const isMultiDay = Boolean(
    dateFilter.active !== 'today' &&
    dateFilter.active !== 'yesterday' &&
    (
      (startDateStr && endDateStr && startDateStr !== endDateStr) ||
      ['this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'last_year'].includes(dateFilter.active)
    )
  );

  const rawVariance = parseVal(eodData?.shifts?.total_variance);
  const totalVariance = rawVariance ?? 0;

  return (
    <PageLayout
      title="End of Day Report"
      actions={
        <CustomOnlyDateFilterComponent
          value={dateFilter}
          onChange={(val) => setDateFilter(val)}
          defaultDate="today"
          showLabelOnMobile={true}
          excludeShortcuts={['all_time']}
        />
      }
    >
      
      {/* Shift Enforcement Notice (Minimal & Neutral) */}
      {!isLoading && !shiftTrackingEnabled && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
              <Store className="h-3.5 w-3.5" />
            </div>
            <div className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground mr-1.5">Direct Checkout Mode:</span>
              <span>Register checkouts are processed without shift floats or drawer reconciliations.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/pos')}
            className="font-medium hover:text-foreground text-xs text-muted-foreground flex items-center gap-1 shrink-0 transition-colors"
          >
            POS Settings <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {!isLoading && shiftTrackingEnabled && !hasClosedShifts && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-2xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold mr-1.5">No formal shift reconciliations:</span>
            <span className="opacity-90">Figures below are calculated directly from registered sales and payments.</span>
          </div>
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard
          title={isMultiDay ? "Period Gross Sales" : "Total Gross Sales"}
          value={<CurrencyDisplay amount={grossSales} />}
          subvalue={
            totalRefunds > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                {(eodData?.pos?.transactions || 0) + (eodData?.ecommerce?.transactions || 0)} Txns &bull; Refunded: <CurrencyDisplay amount={totalRefunds} symbolClassName="mr-1 text-destructive font-semibold" />
              </span>
            ) : undefined
          }
          className="border border-border shadow-2xs"
        />
        <DashboardCard
          title={isMultiDay ? "Period Net Revenue" : "Net Revenue"}
          value={<CurrencyDisplay amount={netSales} />}
          subvalue={
            totalRefunds > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Less <span className="text-destructive font-semibold">-<CurrencyDisplay amount={totalRefunds} symbolClassName="mr-0.5" /></span> in refunds
              </span>
            ) : undefined
          }
          className="border border-border shadow-2xs"
        />
        {shiftTrackingEnabled ? (
          <DashboardCard
            title="Shift Till Variance"
            value={
              <span className={totalVariance < 0 ? 'text-destructive font-bold' : totalVariance > 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'font-bold text-foreground'}>
                {totalVariance > 0 ? '+' : ''}<CurrencyDisplay amount={totalVariance} />
              </span>
            }
            subvalue="Expected vs Actual Cash"
            className="border border-border shadow-2xs"
          />
        ) : (
          <DashboardCard
            title="Cash in Register"
            value={<CurrencyDisplay amount={(pb.cash || 0) + (eodData?.total_paid_in || 0) - totalExpenses} />}
            subvalue="Cash sales + float in - expenses"
            className="border border-border shadow-2xs"
          />
        )}
        
        {/* Dynamic Card: ATV for POS Only vs Channel Split for Full Suite */}
        {isPosOnly ? (
          <DashboardCard
            title="Avg Order Value"
            value={<CurrencyDisplay amount={avgOrderValue} />}
            className="border border-border shadow-2xs"
          />
        ) : (
          <DashboardCard
            title="POS vs E-Commerce"
            value={`${eodData?.pos?.transactions || 0} / ${eodData?.ecommerce?.transactions || 0}`}
            className="border border-border shadow-2xs"
          />
        )}
      </div>

      {/* Multi-Day: Day-by-Day Performance Breakdown */}
      {isMultiDay && dailyBreakdown.length > 0 && (
        <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden mb-6 shadow-2xs">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Day-by-Day Breakdown</h3>
                <p className="text-xs text-muted-foreground">Daily sales, collections, expenses, and individual day Z-reports</p>
              </div>
            </div>
            <span className="bg-secondary text-muted-foreground text-xs font-medium px-2.5 py-1 rounded">
              {dailyBreakdown.length} {dailyBreakdown.length === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">Orders</th>
                  <th className="px-5 py-3 text-right">Gross Sales</th>
                  <th className="px-5 py-3 text-right">Cash</th>
                  <th className="px-5 py-3 text-right">MoMo / Card</th>
                  <th className="px-5 py-3 text-right">Expenses</th>
                  <th className="px-5 py-3 text-right">Net Sales</th>
                  <th className="px-5 py-3 text-center">Audit Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {dailyBreakdown.map((day: any) => {
                  const parsedDate = new Date(day.date + 'T00:00:00');
                  const formattedDate = format(parsedDate, 'EEE, MMM d, yyyy');
                  const digital = (day.mobile_money || 0) + (day.card || 0);

                  return (
                    <tr key={day.date} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground text-xs">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs font-mono text-muted-foreground">
                          {day.transactions || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">
                        <CurrencyDisplay amount={day.gross_sales || 0} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground/85">
                        <CurrencyDisplay amount={day.cash || 0} showStyling={false} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground/85">
                        <CurrencyDisplay amount={digital} showStyling={false} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium">
                        {day.expenses > 0 ? (
                          <span className="text-destructive font-medium">-<CurrencyDisplay amount={day.expenses} showStyling={false} /></span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">
                        <CurrencyDisplay amount={day.net_sales || 0} />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZReportShiftId(day.shift_id);
                            setIsZReportOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/80 bg-background hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-medium transition-colors shadow-2xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Day Z-Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Day & Shift Tracking OFF: Register Financial Audit */}
      {!isMultiDay && !shiftTrackingEnabled && (
        <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden mb-6 shadow-2xs">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Register Financial Audit</h3>
                <p className="text-xs text-muted-foreground">Aggregated POS register totals and cash closing reconciliation</p>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Reconciled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Register / Terminals</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Transactions</th>
                  <th className="px-5 py-3 text-right">Gross Sales</th>
                  <th className="px-5 py-3 text-right">Cash Received</th>
                  <th className="px-5 py-3 text-right">Expenses Paid Out</th>
                  <th className="px-5 py-3 text-right">Net Cash in Till</th>
                  <th className="px-5 py-3 text-center">Audit Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      POS
                    </div>
                    <div>
                      <span className="text-xs font-semibold">All Point of Sale Terminals</span>
                      <p className="text-[10px] text-muted-foreground font-normal">Direct checkout mode</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border/50">
                      Closed
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-muted-foreground">
                    {eodData?.pos?.transactions || 0}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-foreground">
                    <CurrencyDisplay amount={grossSales} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-foreground/85">
                    <CurrencyDisplay amount={pb.cash || 0} showStyling={false} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium">
                    {totalExpenses > 0 ? (
                      <span className="text-destructive font-medium">-<CurrencyDisplay amount={totalExpenses} showStyling={false} /></span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-foreground">
                    <CurrencyDisplay amount={(pb.cash || 0) + (eodData?.total_paid_in || 0) - totalExpenses} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const shiftId = shiftRecords[0]?.id || `daily-${format(dateFilter.start_date || new Date(), 'yyyyMMdd')}`;
                        setSelectedZReportShiftId(shiftId);
                        setIsZReportOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/80 bg-background hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-medium transition-colors shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Daily Z-Report
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Shifts Audit Log (when Shift Tracking is Enabled) */}
      {shiftTrackingEnabled && (
        <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden mb-6 shadow-2xs">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cashier Shift Reconciliation Audit</h3>
                <p className="text-xs text-muted-foreground">Individual shift closures, floats, expected cash, and till variances</p>
              </div>
            </div>
            <span className="bg-secondary text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-md border border-border/50">
              {shiftRecords.length} {shiftRecords.length === 1 ? 'Shift Record' : 'Shift Records'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Cashier</th>
                  <th className="px-5 py-3">Shift Status</th>
                  <th className="px-5 py-3">Shift Duration</th>
                  <th className="px-5 py-3 text-right">Float</th>
                  <th className="px-5 py-3 text-right">Expected Cash</th>
                  <th className="px-5 py-3 text-right">Actual Counted</th>
                  <th className="px-5 py-3 text-right">Variance</th>
                  <th className="px-5 py-3">Discrepancy Note</th>
                  <th className="px-5 py-3 text-center">Audit Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {shiftRecords.length > 0 ? (
                  shiftRecords.map((shift: any) => {
                    const status = (shift.status || '').toUpperCase();
                    const isClosed = status === 'CLOSED' || status === 'FORCE_CLOSED';
                    const rawShiftVariance = parseVal(shift.variance);
                    const shiftVariance = rawShiftVariance ?? 0;
                    const isOver = shiftVariance > 0;
                    const isShort = shiftVariance < 0;
                    const isBalanced = shiftVariance === 0 && isClosed;

                    const openedDate = shift.opened_at ? new Date(shift.opened_at) : null;
                    const today = new Date();
                    const isToday = openedDate ? (
                      openedDate.getFullYear() === today.getFullYear() &&
                      openedDate.getMonth() === today.getMonth() &&
                      openedDate.getDate() === today.getDate()
                    ) : true;
                    const datePrefix = openedDate && !isToday ? format(openedDate, 'MMM d · ') : '';

                    const openedAtFormatted = openedDate ? `${datePrefix}${format(openedDate, 'hh:mm a')}` : '—';
                    const closedAtFormatted = shift.closed_at ? format(new Date(shift.closed_at), 'hh:mm a') : 'Open';

                    return (
                      <tr key={shift.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {shift.cashier_name ? shift.cashier_name.substring(0, 2).toUpperCase() : 'CS'}
                          </div>
                          <span className="text-xs">{shift.cashier_name || 'Cashier'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {status === 'CLOSED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border/40">
                              Closed
                            </span>
                          ) : status === 'FORCE_CLOSED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Auto-Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {openedAtFormatted} - {closedAtFormatted}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-foreground/80">
                          <CurrencyDisplay amount={parseVal(shift.opening_float)} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-foreground/80">
                          {isClosed ? <CurrencyDisplay amount={parseVal(shift.expected_cash)} /> : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-foreground">
                          {isClosed && shift.closing_count !== null && shift.closing_count !== undefined ? <CurrencyDisplay amount={parseVal(shift.closing_count)} /> : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold">
                          {!isClosed ? (
                            <span className="text-muted-foreground/40">—</span>
                          ) : isBalanced ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Balanced
                            </span>
                          ) : isShort ? (
                            <div className="flex justify-end">
                              <span className="inline-flex items-center text-destructive font-semibold text-xs bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                                <CurrencyDisplay amount={shiftVariance} showStyling={false}/>
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <span className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold text-xs bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                +<CurrencyDisplay amount={shiftVariance} showStyling={false}/>
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">
                          {shift.notes ? (
                            <span className="italic text-foreground/80">"{shift.notes}"</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedZReportShiftId(shift.id);
                              setIsZReportOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/80 bg-background hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-medium transition-colors shadow-2xs"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> {status === 'OPEN' ? 'X-Report' : 'Z-Report'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground font-medium text-xs">
                      No cashier shift records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Section: Payment Distribution & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-1 bg-card text-card-foreground p-5 rounded-xl border border-border min-h-[340px] flex flex-col shadow-2xs">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Payment Distribution</h3>
            <p className="text-xs text-muted-foreground">Revenue share by payment method</p>
          </div>
          
          {hasPayments ? (
            <div className="flex-1 min-h-[220px] flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdownChartData}
                      cx="50%"
                      cy="48%"
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentBreakdownChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatGHS(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={32} 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground/60 mb-2.5">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">No payment data</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No transactions recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-xl border border-border overflow-hidden min-h-[340px] flex flex-col shadow-2xs">
          <div className="p-5 flex justify-between items-center border-b border-border/50">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Logged Operational Expenses</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Petty cash and store payouts</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1 ${
              totalExpenses > 0 
                ? 'bg-destructive/5 text-destructive border-destructive/10' 
                : 'bg-secondary text-muted-foreground border-border/40'
            }`}>
              Total: <CurrencyDisplay amount={totalExpenses} showStyling={false} />
            </span>
          </div>

          <div className="flex-1 flex flex-col">
            {expenseRecords.length > 0 ? (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Cashier / Reason</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-medium">
                    {expenseRecords.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-foreground text-xs capitalize">{exp.category}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{exp.cashier_name}: </span>
                          {exp.reason}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-destructive text-xs">
                          -<CurrencyDisplay amount={exp.amount} showStyling={false}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground/60 mb-2.5">
                  <Receipt className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground/80">No expenses recorded</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">No petty cash or store payouts logged for this period.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <ZReportModal
        isOpen={isZReportOpen}
        onClose={() => {
          setIsZReportOpen(false);
          setSelectedZReportShiftId(null);
        }}
        shiftId={selectedZReportShiftId}
      />

    </PageLayout>
  );
}

