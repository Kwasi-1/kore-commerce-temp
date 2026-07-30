import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
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
import { Icon } from '@iconify/react';
import { CheckCircle2, AlertTriangle, Clock, UserCheck, FileText } from 'lucide-react';
import ZReportModal from '@/components/pos/ZReportModal';

export default function EndOfDay() {
  const { formatGHS } = useCurrency();
  const tenant = useAuthStore((state) => state.tenant);
  const isPosOnly = tenant?.plan === 'pos_only';

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

  const totalSales = eodData?.total_sales || 0;
  const expenseRecords = eodData?.expenses?.records || [];
  const totalExpenses = eodData?.expenses?.total || 0;
  const netRevenue = totalSales - totalExpenses;
  const avgOrderValue = eodData?.average_order_value || 0;

  const pb = eodData?.payment_breakdown || {};
  const paymentBreakdownChartData = [
    { name: 'Cash', value: pb.cash || 0, color: '#10B981' },
    { name: 'MoMo', value: pb.mobile_money || 0, color: '#EAB308' },
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

  return (
    <PageLayout
      title="End of Day Report"
      actions={
        <CustomOnlyDateFilterComponent
          value={dateFilter}
          onChange={(val) => setDateFilter(val)}
          defaultDate="today"
          showLabelOnMobile={true}
        />
      }
    >
      
      {!hasClosedShifts && !isLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-xl borde border-yellow-200 dark:border-yellow-900/30 mb-6 flex items-center justify-between shadowsm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="font-bold text-sm md:text-base">No Closed Shifts for Selected Period</h3>
              <p className="text-xs md:text-sm opacity-90 mt-0.5">Cashiers must close their shifts from the Register module for complete daily till reconciliation.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard
          title="Total Gross Sales"
          value={<CurrencyDisplay amount={totalSales} />}
          subvalue={`${(eodData?.pos?.transactions || 0) + (eodData?.ecommerce?.transactions || 0)} Total Transactions`}
          className="border border-border"
        />
        <DashboardCard
          title="Net Revenue"
          value={<CurrencyDisplay amount={netRevenue} />}
          subvalue="Gross Sales minus Expenses"
          className="border border-border"
        />
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
        
        {/* Dynamic Card: ATV for POS Only vs Channel Split for Full Suite */}
        {isPosOnly ? (
          <DashboardCard
            title="Avg Order Value"
            value={<CurrencyDisplay amount={avgOrderValue} />}
            subvalue="Revenue per POS transaction"
            className="border border-border"
          />
        ) : (
          <DashboardCard
            title="POS vs E-Commerce"
            value={`${eodData?.pos?.transactions || 0} / ${eodData?.ecommerce?.transactions || 0}`}
            subvalue="Transaction volume split"
            className="border border-border"
          />
        )}
      </div>

      {/* Closed Shifts Audit Log */}
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
                  const isClosed = shift.status === 'closed' || shift.status === 'force_closed';
                  const variance = shift.variance ?? 0;
                  const isOver = variance > 0;
                  const isShort = variance < 0;
                  const isBalanced = variance === 0 && isClosed;

                  const openedAtFormatted = shift.opened_at ? format(new Date(shift.opened_at), 'hh:mm a') : '—';
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
                          shift.status === 'closed' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : shift.status === 'force_closed'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            shift.status === 'closed' ? 'bg-emerald-500' : shift.status === 'force_closed' ? 'bg-purple-500' : 'bg-amber-500 animate-pulse'
                          }`} />
                          {shift.status === 'closed' ? 'Closed' : shift.status === 'force_closed' ? 'Auto-Closed' : 'Active Shift'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {openedAtFormatted} - {closedAtFormatted}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        <CurrencyDisplay amount={shift.opening_float || 0} />
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {isClosed ? <CurrencyDisplay amount={shift.expected_cash || 0} /> : '—'}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-foreground">
                        {isClosed && shift.closing_count !== null && shift.closing_count !== undefined ? <CurrencyDisplay amount={shift.closing_count} /> : '—'}
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
                        >
                          <FileText className="h-3.5 w-3.5" /> {shift.status === 'open' ? 'X-Report' : 'Z-Report'}
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
            <span className={`"bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-md borde border-red-500/20 flex items-center gap-1" ${totalExpenses == 0 && "bg-muted/60 text-foreground/60 border-none"}`}>
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
