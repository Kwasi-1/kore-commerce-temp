import React, { useEffect, useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { APP_CONFIG } from '@/config/app.config';
import apiClient from '@/api/client';
import { Printer, FileText, CheckCircle2, AlertCircle, Clock, Store, User, Hash } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { format } from 'date-fns';

interface ZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string | null;
  initialReportData?: any;
}

export default function ZReportModal({ isOpen, onClose, shiftId, initialReportData }: ZReportModalProps) {
  const [reportData, setReportData] = useState<any>(initialReportData || null);
  const [isLoading, setIsLoading] = useState(false);

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
            const expectedCash = totalCashSales + totalPaidIn - totalPaidOut;

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
  const recon = reportData?.cash_reconciliation;
  const pb = reportData?.payment_breakdown || {};
  const movements = reportData?.cash_movements || [];

  const openedAt = shift?.opened_at ? format(new Date(shift.opened_at), 'PPP p') : '—';
  const closedAt = shift?.closed_at ? format(new Date(shift.closed_at), 'PPP p') : 'Active Open Shift';

  const variance = recon?.variance ?? shift?.variance ?? 0;
  const isBalanced = variance === 0 && !isShiftOpen;
  const isShort = variance < 0;
  const isOver = variance > 0;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="3xl"
      header={
        <div className="flex items-center justify-between pb-2 border-b border-border/50 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {isShiftOpen ? 'Mid-Shift X-Report' : 'End of Shift Z-Report'}
              </h3>
              <p className="text-xs font-semibold text-muted-foreground">
                {isShiftOpen ? 'Unclosed Live Shift Snapshot' : 'Official Shift Closure & Till Audit'}
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner />
            </div>
          ) : !reportData ? (
            <div className="text-center py-8 text-muted-foreground font-medium">
              No report data available for this shift.
            </div>
          ) : (
            <div className="space-y-6 printable-z-report">
              
              {/* Thermal Receipt Preview Container */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm max-w-xl mx-auto space-y-6 text-foreground">
                
                {/* Receipt Header */}
                <div className="text-center border-b border-dashed border-border pb-4 space-y-1">
                  <div className="flex justify-center items-center gap-1 text-primary font-black text-lg uppercase tracking-wider">
                    <Store className="h-5 w-5" /> {APP_CONFIG.name}
                  </div>
                  <h2 className="font-extrabold text-xl tracking-tight uppercase">
                    {isShiftOpen ? 'X-REPORT' : 'Z-REPORT'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {isShiftOpen ? 'Mid-Shift Sales Snapshot (Unclosed)' : 'Till Reconciliation & Final Audit'}
                  </p>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-dashed border-border pb-4">
                  <div>
                    <span className="text-muted-foreground font-semibold block">Cashier:</span>
                    <span className="font-bold">{shift?.cashier_name || 'Staff'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block">Shift Status:</span>
                    <span className="font-bold uppercase">{shift?.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block">Shift Opened:</span>
                    <span className="font-bold">{openedAt}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block">Shift Closed:</span>
                    <span className="font-bold">{closedAt}</span>
                  </div>
                </div>

                {/* Sales Summary */}
                <div className="space-y-2 border-b border-dashed border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sales Summary</h4>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Gross Sales</span>
                    <span><CurrencyDisplay showStyling={false} amount={reportData.gross_sales || 0} /></span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Total Transactions</span>
                    <span className="font-bold">{reportData.total_transactions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Average Order Value</span>
                    <span className="font-bold"><CurrencyDisplay showStyling={false} amount={reportData.average_order_value || 0} /></span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="space-y-2 border-b border-dashed border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method Breakdown</h4>
                  <div className="space-y-1 text-sm font-medium">
                    <div className="flex justify-between">
                      <span>Cash Sales</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={pb.cash?.total || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card Sales</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={pb.card?.total || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mobile Money</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={pb.mobile_money?.total || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Store Credit</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={pb.credit?.total || 0} /></span>
                    </div>
                  </div>
                </div>

                {/* Cash Reconciliation */}
                <div className="space-y-2.5 border-b border-dashed border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cash Drawer Reconciliation</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">(+) Opening Float</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={recon?.opening_float || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">(+) Cash Sales</span>
                      <span className="font-bold"><CurrencyDisplay showStyling={false} amount={recon?.cash_sales || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">(+) Paid In (Float additions)</span>
                      <span className="font-bold text-emerald-600"><CurrencyDisplay showStyling={false} amount={recon?.paid_in || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">(-) Paid Out (Expenses)</span>
                      <span className="font-bold text-destructive"><CurrencyDisplay showStyling={false} amount={recon?.paid_out || 0} /></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold bg-muted/40 p-2.5 rounded-lg">
                    <span>Expected Cash in Drawer</span>
                    <span className="text-base"><CurrencyDisplay showStyling={false} amount={recon?.expected_cash || 0} /></span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold bg-muted/40 p-2.5 rounded-lg">
                    <span>Actual Physical Cash Counted</span>
                    <span className="text-base">
                      {recon?.closing_count !== null && recon?.closing_count !== undefined ? (
                        <CurrencyDisplay showStyling={false} amount={recon.closing_count} />
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  {/* Discrepancy Banner */}
                  <div className={`p-3 rounded-lg flex items-center justify-between border ${
                    isBalanced ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' :
                    isOver ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' :
                    'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      Till Variance: {isBalanced ? 'BALANCED' : isOver ? 'OVERAGE' : 'SHORTAGE'}
                    </div>
                    <div className="text-base font-black">
                      {isOver ? '+' : ''}<CurrencyDisplay showStyling={false} amount={variance} />
                    </div>
                  </div>

                  {shift?.notes && (
                    <div className="text-xs italic text-muted-foreground p-2.5 bg-muted/30 rounded-lg">
                      <span className="font-bold not-italic text-foreground">Discrepancy Note: </span>"{shift.notes}"
                    </div>
                  )}
                </div>

                {/* Logged Petty Cash Movements */}
                {movements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logged Petty Cash Movements</h4>
                    <div className="divide-y divide-border/60 text-xs">
                      {movements.map((m: any) => (
                        <div key={m.id} className="py-1.5 flex justify-between items-center">
                          <div>
                            <span className="font-bold uppercase text-foreground">{m.category}</span>
                            <p className="text-muted-foreground">{m.reason}</p>
                          </div>
                          <span className={`font-bold ${m.movement_type === 'paid_out' ? 'text-destructive' : 'text-emerald-600'}`}>
                            {m.movement_type === 'paid_out' ? '-' : '+'}<CurrencyDisplay showStyling={false} amount={m.amount} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center text-[10px] text-muted-foreground font-semibold pt-4 border-t border-dashed border-border">
                  {isShiftOpen ? 'X-Report Generated • Live Mid-Shift Snapshot' : `Z-Report Generated • Final ${APP_CONFIG.name} Till Audit`}
                </div>

              </div>

            </div>
          )}
        </div>
      }
      footer={
        <div className="flex justify-between w-full pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={onClose} className="rounded-full font-bold px-6">
            Close
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!reportData}
            className="rounded-full font-bold px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> {isShiftOpen ? 'Print X-Report' : 'Print Z-Report'}
          </Button>
        </div>
      }
    />
  );
}
