import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { DENOMINATIONS } from '@/utils/cashCount';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { cn } from '@/lib/utils';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Spinner } from '../ui/spinner';
import PaymentMethodVisual, { PaymentMethodType } from './PaymentMethodVisual';

interface ZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string | null;
  initialReportData?: any;
}

export default function ZReportModal({ isOpen, onClose, shiftId, initialReportData }: ZReportModalProps) {
  const [reportData, setReportData] = useState<any>(initialReportData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const posSettings = useFeaturesStore((st) => st.posSettings);
  const getEffectivePaymentMethods = useFeaturesStore((st) => st.getEffectivePaymentMethods);
  const tenant = useAuthStore((st) => st.tenant);
  const storeSettings = useSettingsStore((st) => st.storeSettings);
  const storeName = storeSettings?.name || tenant?.business_name || tenant?.name || 'Store';

  useEffect(() => {
    if (initialReportData) {
      setReportData(initialReportData);
      return;
    }

    if (isOpen && shiftId) {
      if (shiftId.startsWith('daily-')) {
        const fetchDailyZReport = async () => {
          setIsLoading(true);
          try {
            const dateStr = shiftId.replace('daily-', '');
            const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
            const res = await apiClient.get(`/tenant/reports/end-of-day?date=${formattedDate}`);
            const eod = res.data.success?.data?.summary;
            const pb = eod?.payment_breakdown || {};
            const exp = eod?.expenses?.records || [];
            const paidInRecs = eod?.paid_in?.records || [];
            const totalCashSales = pb.cash || 0;
            const totalPaidIn = eod?.paid_in?.total || 0;
            const totalPaidOut = eod?.expenses?.total || 0;
            // Cash handed back to customers that day comes out of the drawer too
            const totalCashRefunds = eod?.cash_refunds?.total || 0;
            // Debt repayments taken in cash that day went into the drawer
            const totalCashRepayments = eod?.cash_repayments?.total || 0;
            const expectedCash = totalCashSales + totalPaidIn - totalPaidOut - totalCashRefunds + totalCashRepayments;

            setReportData({
              shift: {
                id: shiftId,
                status: 'CLOSED',
                cashier_name: 'Calendar Day Summary',
                opened_at: `${formattedDate}T00:00:00Z`,
                closed_at: `${formattedDate}T23:59:59Z`,
                opening_float: 0,
                closing_cash: expectedCash,
                expected_cash: expectedCash,
                variance: 0,
              },
              summary: {
                gross_sales: eod?.total_sales || 0,
                total_transactions: (eod?.pos?.transactions || 0) + (eod?.ecommerce?.transactions || 0),
                net_sales: (eod?.total_sales || 0) - totalPaidOut,
              },
              payment_breakdown: pb,
              cash_reconciliation: {
                opening_float: 0,
                cash_sales: totalCashSales,
                paid_in: totalPaidIn,
                paid_out: totalPaidOut,
                cash_refunds: totalCashRefunds,
                cash_repayments: totalCashRepayments,
                expected_cash: expectedCash,
                closing_count: expectedCash,
                variance: 0,
              },
              cash_movements: [...paidInRecs, ...exp],
            });
          } catch (err) {
            console.error('Failed to fetch Daily Z-Report:', err);
          } finally {
            setIsLoading(false);
          }
        };
        fetchDailyZReport();
      } else {
        const fetchZReport = async () => {
          setIsLoading(true);
          try {
            const res = await apiClient.get(`/pos/shifts/${shiftId}/z-report`);
            setReportData(res.data.success?.data?.z_report || null);
          } catch (err) {
            console.error('Failed to fetch Z-Report:', err);
          } finally {
            setIsLoading(false);
          }
        };
        fetchZReport();
      }
    }
  }, [isOpen, shiftId, initialReportData]);

  const handlePrint = () => {
    window.print();
  };

  const shift = reportData?.shift;
  const isShiftOpen = shift?.status === 'OPEN' || shift?.status === 'open'; // handle both cases defensively
  const recon = reportData?.cash_reconciliation || {};
  const movements: any[] = reportData?.cash_movements || [];
  const counted = shift?.closing_breakdown && Object.keys(shift.closing_breakdown).length > 0 ? shift.closing_breakdown : null;

  // The calendar-day report keeps its totals under "summary" and gives plain amounts per method
  const grossSales = reportData?.gross_sales ?? reportData?.summary?.gross_sales ?? 0;
  const totalTransactions = reportData?.total_transactions ?? reportData?.summary?.total_transactions ?? 0;
  const averageSale = reportData?.average_order_value ?? (totalTransactions ? grossSales / totalTransactions : 0);
  const rawPb = reportData?.payment_breakdown || {};
  const pbLine = (...keys: string[]) => keys.reduce(
    (acc, k) => {
      const v = rawPb[k];
      if (typeof v === 'number') return { count: acc.count, total: acc.total + v, counted: false };
      return { count: acc.count + (v?.count || 0), total: acc.total + (v?.total || 0), counted: acc.counted };
    },
    { count: 0, total: 0, counted: true },
  );
  const enabledMethods = getEffectivePaymentMethods();
  const methodRows = [
    { key: 'cash', label: 'Cash', on: enabledMethods.includes('cash'), ...pbLine('cash') },
    { key: 'mobile_money', label: 'Mobile Money', on: enabledMethods.includes('mobile_money'), ...pbLine('mobile_money', 'mobile_money_manual') },
    { key: 'card', label: 'Card', on: enabledMethods.includes('card'), ...pbLine('card') },
    { key: 'credit', label: 'Credit', on: !!posSettings?.pos_credit_enabled, ...pbLine('credit') },
  ].filter((m) => m.on || m.total > 0 || m.count > 0);

  // Cash drawer: lines that are zero are left out so a simple shift reads short
  const drawerLines = [
    { label: 'Opening float', amount: recon.opening_float || 0, sign: '', always: true },
    { label: 'Cash sales', amount: recon.cash_sales || 0, sign: '+', always: true },
    { label: 'Debt repayments (cash)', amount: recon.cash_repayments || 0, sign: '+' },
    { label: 'Paid in', amount: recon.paid_in || 0, sign: '+' },
    { label: 'Paid out', amount: recon.paid_out || 0, sign: '−' },
    { label: 'Cash refunds', amount: recon.cash_refunds || 0, sign: '−' },
  ].filter((l) => l.always || l.amount > 0);
  const expected = recon.expected_cash ?? 0;
  const closingCount = recon.closing_count ?? shift?.closing_count;
  const hasCount = closingCount !== null && closingCount !== undefined && !isShiftOpen;
  const variance = recon.variance ?? shift?.variance ?? 0;
  const isBalanced = Math.abs(variance) < 0.005;
  const isShort = variance < 0 && !isBalanced;

  const fmtTime = (iso?: string | null) => (iso ? format(new Date(iso), 'p') : '');
  const duration = (() => {
    if (!shift?.opened_at) return '';
    const end = shift?.closed_at ? new Date(shift.closed_at).getTime() : Date.now();
    const mins = Math.max(0, Math.round((end - new Date(shift.opened_at).getTime()) / 60000));
    const h = Math.floor(mins / 60);
    return h ? `${h}h ${mins % 60}m` : `${mins}m`;
  })();
  const subtitle = shift
    ? `${shift.cashier_name || 'Staff'} · ${shift.opened_at ? format(new Date(shift.opened_at), 'EEE d MMM') : ''}, ${fmtTime(shift.opened_at)} – ${shift.closed_at ? fmtTime(shift.closed_at) : 'now'}${duration ? ` (${duration})` : ''}`
    : '';
  const money = (n: number) => (Number(n) || 0).toFixed(2);

  const listRow = (label: React.ReactNode, value: React.ReactNode, key?: string, muted = false) => (
    <div key={key} className="flex items-center justify-between gap-3 px-3.5 py-2">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
    </div>
  );

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="3xl"
        scrollBehavior="inside"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-3">
            <h3 className="text-lg font-bold text-foreground">{isShiftOpen ? 'X Report' : 'Z Report'}</h3>
            <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
              {isShiftOpen ? 'Shift still open · ' : ''}{subtitle}
            </p>
          </div>
        }
        body={
          <div className="pt-3 pb-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : !reportData ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No report for this shift.</div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* The result first */}
                {hasCount ? (
                  <div className={cn(
                    'rounded-xl border px-4 py-3 flex items-center justify-between gap-3',
                    isBalanced ? 'border-emerald-500/30 bg-emerald-500/5' : isShort ? 'border-destructive/30 bg-destructive/5' : 'border-blue-500/30 bg-blue-500/5',
                  )}>
                    <div>
                      <p className={cn('text-base font-bold', isBalanced ? 'text-emerald-600 dark:text-emerald-400' : isShort ? 'text-destructive' : 'text-blue-600 dark:text-blue-400')}>
                        {isBalanced ? 'Balanced' : isShort ? 'Short' : 'Over'}
                      </p>
                      <p className="text-[12px] text-muted-foreground tabular-nums">
                        Counted {money(closingCount)} · Expected {money(expected)}
                      </p>
                    </div>
                    {!isBalanced && (
                      <span className={cn('text-xl font-bold tabular-nums !font-sans', isShort ? 'text-destructive' : 'text-blue-600 dark:text-blue-400')}>
                        <CurrencyDisplay amount={Math.abs(variance)} showStyling={false} />
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 px-4 py-3 text-[12px] text-muted-foreground">
                    {isShiftOpen ? 'The drawer is counted when the shift ends.' : 'The drawer wasn’t counted for this period.'}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <section className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Sales</p>
                      <div className="rounded-xl border border-border/70 divide-y divide-border/60">
                        {listRow('Total sales', <CurrencyDisplay amount={grossSales} />)}
                        {listRow('Number of sales', totalTransactions, undefined, true)}
                        {listRow('Average sale', <CurrencyDisplay amount={averageSale} />, undefined, true)}
                      </div>
                    </section>

                    <section className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Payments</p>
                      <div className="rounded-xl border border-border/70 divide-y divide-border/60">
                        {methodRows.map((m) => (
                          <div key={m.key} className="flex items-center gap-3 px-3.5 py-2">
                            {m.key === 'credit' ? (
                              <span className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                                <Icon icon="solar:notebook-linear" className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <PaymentMethodVisual method={m.key as PaymentMethodType} size="md" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium leading-tight">{m.label}</p>
                              {m.counted && <p className="text-[11px] text-muted-foreground">{m.count} sale{m.count === 1 ? '' : 's'}</p>}
                            </div>
                            <span className="font-semibold tabular-nums"><CurrencyDisplay amount={m.total} /></span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Cash drawer</p>
                      <div className="rounded-xl border border-border/70 divide-y divide-border/60">
                        {drawerLines.map((l) => listRow(
                          `${l.sign ? `${l.sign} ` : ''}${l.label}`,
                          <CurrencyDisplay amount={l.amount} showStyling={false} />,
                          l.label,
                          true,
                        ))}
                        {listRow(<span className="font-semibold">Expected</span>, <CurrencyDisplay amount={expected} />)}
                        {hasCount && listRow(<span className="font-semibold">Counted</span>, <CurrencyDisplay amount={closingCount} />)}
                      </div>
                      {counted && (
                        <button
                          type="button"
                          onClick={() => setShowCount((v) => !v)}
                          className="text-[12px] font-semibold text-muted-foreground hover:text-foreground px-1"
                        >
                          {showCount ? 'Hide count' : 'View count'}
                        </button>
                      )}
                      {counted && showCount && (
                        <div className="rounded-xl border border-border/70 divide-y divide-border/60 text-[12px]">
                          {DENOMINATIONS.filter((d) => counted[d.key]).map((d) =>
                            listRow(`${counted[d.key]} × ${d.value >= 1 ? `₵${d.label}` : d.label}`, money(counted[d.key] * d.value), d.key, true),
                          )}
                          {counted.other ? listRow('Other', money(counted.other), 'other', true) : null}
                        </div>
                      )}
                    </section>

                    {movements.length > 0 && (
                      <section className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Paid in &amp; out</p>
                        <div className="rounded-xl border border-border/70 divide-y divide-border/60 text-[12px]">
                          {movements.map((m) => listRow(
                            <span>
                              <span className="capitalize">{m.category}</span>
                              {m.reason && <span className="block text-muted-foreground">{m.reason}</span>}
                            </span>,
                            <span className={m.movement_type === 'paid_out' ? 'text-destructive' : 'text-emerald-600'}>
                              {m.movement_type === 'paid_out' ? '−' : '+'}{money(m.amount)}
                            </span>,
                            m.id,
                          ))}
                        </div>
                      </section>
                    )}

                    {shift?.notes && (
                      <section className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Notes</p>
                        <p className="rounded-xl border border-border/70 px-3.5 py-2.5 text-[13px] whitespace-pre-wrap">{shift.notes}</p>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full pt-3 border-t border-border/50">
            <Button variant="outline" onClick={onClose} className="rounded-full font-semibold px-5">
              Close
            </Button>
            <Button onClick={handlePrint} disabled={!reportData} className="rounded-full font-semibold px-5 gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      {/* Print version: a narrow black-and-white slip for a receipt printer (see @media print) */}
      {isOpen && reportData && typeof document !== 'undefined' && createPortal(
        <div id="print-portal" className="hidden">
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#000', lineHeight: 1.45 }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{storeName}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{isShiftOpen ? 'X REPORT' : 'Z REPORT'}</div>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>{subtitle}</div>
            {[
              ['Total sales', money(grossSales)],
              ['Number of sales', String(totalTransactions)],
              ...methodRows.map((m) => [m.label, money(m.total)]),
              ['', ''],
              ...drawerLines.map((l) => [`${l.sign ? `${l.sign} ` : ''}${l.label}`, money(l.amount)]),
              ['Expected', money(expected)],
              ...(hasCount ? [['Counted', money(closingCount)], [isBalanced ? 'Balanced' : isShort ? 'Short' : 'Over', money(Math.abs(variance))]] : []),
            ].map(([a, b], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderTop: a === '' ? '1px dashed #000' : undefined, marginTop: a === '' ? 4 : 0, paddingTop: a === '' ? 4 : 0 }}>
                <span>{a}</span><span>{b}</span>
              </div>
            ))}
            {shift?.notes && <div style={{ marginTop: 6, borderTop: '1px dashed #000', paddingTop: 4 }}>Notes: {shift.notes}</div>}
            <div style={{ textAlign: 'center', marginTop: 8 }}>Printed {format(new Date(), 'PPp')}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
