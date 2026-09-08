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
import { CheckCircle2, AlertTriangle, Clock, UserCheck, FileText, Store, Calendar, ArrowRight } from 'lucide-react';
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
      setEodData(response.data.success.data.summary);
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
  const netRevenue = netSales - totalExpenses;
  const avgOrderValue = parseVal(eodData?.average_order_value);

  const pb = eodData?.payment_breakdown || {};
  const paymentBreakdownChartData = [
    { name: 'Cash', value: pb.cash || 0, color: '#10B981' },
    { name: 'MoMo', value: (pb.mobile_money || 0) + (pb.mobile_money_manual || 0), color: '#EAB308' },
    { name: 'Card', value: pb.card || 0, color: '#3B82F6' },
    { name: 'Credit', value: pb.credit || 0, color: '#A855F7' }
  ].filter(item => item.value > 0);

  // Fallback pie chart data if no sales recorded yet
  const chartDataToRender = paymentBreakdownChartData.length > 0
    ? paymentBreakdownChartData
    : [{ name: 'No Sales', value: 1, color: '#9CA3AF' }];

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
      
      {!isLoading && !shiftTrackingEnabled && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-blue-700 dark:text-blue-300 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold">Shift Enforcement is Turned Off</p>
              <p className="opacity-90 mt-0.5">
                Register checkouts are processed directly without mandatory opening floats or cashier shift reconciliations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/pos')}
            className="font-bold hover:underline shrink-0 text-xs text-primary flex items-center gap-1"
          >
            POS Settings <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLoading && shiftTrackingEnabled && !hasClosedShifts && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">No shifts were formally reconciled for this date.</p>
            <p className="opacity-90 mt-0.5">Below figures are calculated directly from registered sales and payments.</p>
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
          className="border border-border"
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
          className="border border-border"
        />
        {shiftTrackingEnabled ? (
          <DashboardCard
            title="Shift Till Variance"
            value={
              <span className={(eodData?.shifts?.total_variance || 0) < 0 ? 'text-red-500 font-bold' : (eodData?.shifts?.total_variance || 0) > 0 ? 'text-blue-500 font-bold' : 'text-emerald-500 font-bold'}>
                {(eodData?.shifts?.total_variance || 0) > 0 ? '+' : ''}<CurrencyDisplay amount={eodData?.shifts?.total_variance || 0} />
              </span>
            }
            subvalue="Expected vs Actual Cash"
            className="border border-border"
          />
        ) : (
          <DashboardCard
            title="Cash in Register"
            value={<CurrencyDisplay amount={(pb.cash || 0) + (eodData?.total_paid_in || 0) - totalExpenses} />}
            subvalue="Cash Sales + Float In - Expenses"
            className="border border-border"
          />
        )}
        
        {/* Dynamic Card: ATV for POS Only vs Channel Split for Full Suite */}
        {isPosOnly ? (
          <DashboardCard
            title="Avg Order Value"
            value={<CurrencyDisplay amount={avgOrderValue} />}
            className="border border-border"
          />
        ) : (
          <DashboardCard
            title="POS vs E-Commerce"
            value={`${eodData?.pos?.transactions || 0} / ${eodData?.ecommerce?.transactions || 0}`}
            className="border border-border"
          />
        )}
      </div>

      {/* Multi-Day: Day-by-Day Performance Breakdown */}
      {isMultiDay && dailyBreakdown.length > 0 && (
        <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-xl border border-border dark:border-border/60 overflow-hidden mb-6 shadow-sm">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Day-by-Day Performance Breakdown</h3>
                <p className="text-xs text-muted-foreground">Daily sales, payment collection methods, expenses, and individual day Z-reports</p>
              </div>
            </div>
            <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-md border border-border/50">
              {dailyBreakdown.length} {dailyBreakdown.length === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">Orders</th>
                  <th className="px-5 py-3 text-right">Gross Sales</th>
                  <th className="px-5 py-3 text-right">Cash</th>
                  <th className="px-5 py-3 text-right">MoMo / Card</th>
                  <th className="px-5 py-3 text-right">Expenses</th>
                  <th className="px-5 py-3 text-right">Net Sales</th>
                  <th className="px-5 py-3 text-center">Day Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {dailyBreakdown.map((day: any) => {
                  const parsedDate = new Date(day.date + 'T00:00:00');
                  const formattedDate = format(parsedDate, 'EEE, MMM d, yyyy');
                  const digital = (day.mobile_money || 0) + (day.card || 0);

                  return (
                    <tr key={day.date} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-bold text-foreground">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-4 text-center font-semibold">
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                          {day.transactions || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-foreground">
                        <CurrencyDisplay amount={day.gross_sales || 0} />
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        <CurrencyDisplay amount={day.cash || 0} showStyling={false} />
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                        <CurrencyDisplay amount={digital} showStyling={false} />
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-destructive">
                        {day.expenses > 0 ? (
                          <span>-<CurrencyDisplay amount={day.expenses} showStyling={false} /></span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-foreground">
                        <CurrencyDisplay amount={day.net_sales || 0} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZReportShiftId(day.shift_id);
                            setIsZReportOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-muted-foreground text-xs font-bold transition-all"
                        >
                          <FileText className="h-3.5 w-3.5" /> Day Z-Report
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
        <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-xl border border-border dark:border-border/60 overflow-hidden mb-6 shadow-sm">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Register Financial Audit</h3>
                <p className="text-xs text-muted-foreground">Aggregated POS register totals and cash closing reconciliation</p>
              </div>
            </div>
            <span className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded border border-emerald-500/10 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Register Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-border/60 font-medium">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-bold text-foreground flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground/70">
                      POS
                    </div>
                    <div>
                      <span>All Point of Sale Terminals</span>
                      <p className="text-[10px] text-muted-foreground font-normal">Direct checkout mode</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Reconciled
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold">
                    {eodData?.pos?.transactions || 0}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-foreground">
                    <CurrencyDisplay amount={grossSales} />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    <CurrencyDisplay amount={pb.cash || 0} showStyling={false} />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-destructive">
                    {totalExpenses > 0 ? (
                      <span>-<CurrencyDisplay amount={totalExpenses} showStyling={false} /></span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-extrabold text-foreground">
                    <CurrencyDisplay amount={(pb.cash || 0) + (eodData?.total_paid_in || 0) - totalExpenses} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const shiftId = shiftRecords[0]?.id || `daily-${format(dateFilter.start_date || new Date(), 'yyyyMMdd')}`;
                        setSelectedZReportShiftId(shiftId);
                        setIsZReportOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" /> Daily Z-Report
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
        <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-xl border border-border dark:border-border/60 overflow-hidden mb-6 shadow-sm">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Cashier Shift Reconciliation Audit</h3>
                <p className="text-xs text-muted-foreground">Individual shift closures, floats, expected cash, and till variances</p>
              </div>
            </div>
            <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-md border border-border/50">
              {shiftRecords.length} {shiftRecords.length === 1 ? 'Shift Record' : 'Shift Records'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-border/60 font-medium">
                {shiftRecords.length > 0 ? (
                  shiftRecords.map((shift: any) => {
                    // API returns uppercase: 'OPEN', 'CLOSED', 'FORCE_CLOSED'
                    const status = (shift.status || '').toUpperCase();
                    const isClosed = status === 'CLOSED' || status === 'FORCE_CLOSED';
                    const rawVariance = parseVal(shift.variance);
                    const variance = rawVariance ?? 0;
                    const isOver = variance > 0;
                    const isShort = variance < 0;
                    const isBalanced = variance === 0 && isClosed;

                    // Show date prefix when shift is not from today (multi-day range view)
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
                      <tr key={shift.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-foreground flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground/70">
                            {shift.cashier_name ? shift.cashier_name.substring(0, 2).toUpperCase() : 'CS'}
                          </div>
                          <span>{shift.cashier_name || 'Cashier'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                            status === 'CLOSED'
                              ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                              : status === 'FORCE_CLOSED'
                              ? 'bg-purple-500/5 text-purple-600 dark:text-purple-400'
                              : 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              status === 'CLOSED' ? 'bg-emerald-500' : status === 'FORCE_CLOSED' ? 'bg-purple-500' : 'bg-amber-500 animate-pulse'
                            }`} />
                            {status === 'CLOSED' ? 'Closed' : status === 'FORCE_CLOSED' ? 'Auto-Closed' : 'Active Shift'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {openedAtFormatted} - {closedAtFormatted}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold">
                          <CurrencyDisplay amount={parseVal(shift.opening_float)} />
                        </td>
                        <td className="px-5 py-4 text-right font-semibold">
                          {isClosed ? <CurrencyDisplay amount={parseVal(shift.expected_cash)} /> : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-foreground">
                          {isClosed && shift.closing_count !== null && shift.closing_count !== undefined ? <CurrencyDisplay amount={parseVal(shift.closing_count)} /> : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold">
                          {!isClosed ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : isBalanced ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                            </span>
                          ) : (
                            <span className={isShort ? 'text-red-500 font-extrabold' : 'text-blue-500 font-extrabold'}>
                              {isOver ? '+' : ''}<CurrencyDisplay amount={variance} showStyling={false}/>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground max-w-[200px] truncate">
                          {shift.notes ? (
                            <span className="italic text-foreground/80">"{shift.notes}"</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedZReportShiftId(shift.id);
                              setIsZReportOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/20 hover:bg-primary/20 text-muted-foreground text-xs font-bold transition-all"
                          >
                            <FileText className="h-3.5 w-3.5" /> {status === 'OPEN' ? 'X-Report' : 'Z-Report'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-muted-foreground font-medium">
                      No cashier shift records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Methods Pie Chart */}
        <div className="lg:col-span-1 bg-card/60 backdrop-blur-md text-card-foreground p-6 rounded-xl border border-border dark:border-border/60 h-[360px] flex flex-col shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-1">Payment Method Distribution</h3>
          <p className="text-xs text-muted-foreground mb-3">Revenue share by payment type</p>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataToRender}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartDataToRender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => formatGHS(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-card/60 backdrop-blur-md text-card-foreground rounded-xl border border-border dark:border-border/60 overflow-hidden flex flex-col shadow-sm">
          <div className="p-5 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-foreground">Logged Operational Expenses</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Petty cash and store payouts</p>
            </div>
            <span className={`bg-red-300/10 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-md borde border-red-500/20 flex items-center gap-1 ${totalExpenses == 0 && "bg-muted/60 text-foreground/60 border-none"}`}>
              Total: <CurrencyDisplay amount={totalExpenses} showStyling={false} />
            </span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Cashier / Reason</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {expenseRecords.length > 0 ? (
                  expenseRecords.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground capitalize">{exp.category}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <span className="font-semibold text-foreground">{exp.cashier_name}: </span>
                        {exp.reason}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-destructive">
                        -<CurrencyDisplay amount={exp.amount} showStyling={false}/>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground font-medium">No expenses recorded for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
