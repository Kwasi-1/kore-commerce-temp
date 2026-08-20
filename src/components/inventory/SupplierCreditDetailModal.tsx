import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { Icon } from '@iconify/react/dist/iconify.js';
import { format } from 'date-fns';

export interface CreditPayment {
  id: string;
  reference: string;
  amount: number;
  payment_method: string;
  notes?: string;
  date_created: string;
}

export interface SupplierCreditRecord {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_order_id: string;
  purchase_order_ref: string;
  total_amount: number;
  amount_paid: number;
  balance_remaining: number;
  status: string;
  due_date: string;
  notes?: string;
  date_created: string;
  payments?: CreditPayment[];
}

interface SupplierCreditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCredit: SupplierCreditRecord | null;
  onRecordPayment: (credit: SupplierCreditRecord) => void;
  onDownloadPDF?: (payment: CreditPayment) => void;
}

export default function SupplierCreditDetailModal({
  isOpen,
  onClose,
  selectedCredit,
  onRecordPayment,
  onDownloadPDF,
}: SupplierCreditDetailModalProps) {
  if (!selectedCredit) return null;

  const isOverdue = new Date(selectedCredit.due_date).getTime() < Date.now() && selectedCredit.status !== 'settled';

  const methodLabels: Record<string, string> = {
    cash: 'Cash Payment',
    mobile_money: 'Mobile Money (MoMo)',
    bank_transfer: 'Bank Transfer',
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="lg"
      // classNames={{
      //   base: 'sm:w-[460px]',
      // }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground">Credit Ledger Details</h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                selectedCredit.status === 'settled'
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                  : selectedCredit.status === 'partial'
                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                  : 'text-destructive bg-destructive/5'
              }`}
            >
              {selectedCredit.status}
            </span>
          </div>
          <p className="text-[12px] md:text-sm text-muted-foreground mt-0.5">
            Supplier: <strong className="text-foreground">{selectedCredit.supplier_name}</strong> · PO:{' '}
            <span className="font-mono">{selectedCredit.purchase_order_ref}</span>
          </p>
        </div>
      }
      body={
        <div className="flex-1 overflow-y-auto px-1 pb-3 text-left space-y-4">
          {/* Top Balance Metric Card */}
          <div className="p-4 rounded-md bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase !tracking-wider">
                  Remaining Balance Owed
                </p>
                <p className="text-2xl font-bold text-foreground mt-1.5">
                  <CurrencyDisplay amount={selectedCredit.balance_remaining} />
                </p>
              </div>
              {selectedCredit.status !== 'settled' && (
                <Button
                  size="sm"
                  radius='sm'
                  variant='ghost'
                  onClick={() => onRecordPayment(selectedCredit)}
                  className="text-foreground font-semibold flex items-center gap-1.5 shadow-xs px-3"
                >
                  <Icon icon="solar:wallet-money-linear" className="h-4 w-4" />
                  {/* <span>Record Payment</span> */}
                </Button>
              )}
            </div>
          </div>

          {/* Invoice Summary Grid */}
          <div className="space-y-2">
            {/* <h4 className="text-xs font-bold text-muted-foreground uppercase !tracking-wider">
              Invoice Summary
            </h4> */}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded border border-border/70 bg-card text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Invoice Amount</span>
                <span className="font-semibold text-foreground text-sm">
                  <CurrencyDisplay amount={selectedCredit.total_amount} />
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Amount Settled</span>
                <span className="font-semibold text-foreground text-sm">
                  <CurrencyDisplay amount={selectedCredit.amount_paid} />
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Payment Due Date</span>
                <span
                  className={`font-semibold text-sm ${
                    isOverdue ? 'text-destructive font-bold' : 'text-foreground'
                  }`}
                >
                  {format(new Date(selectedCredit.due_date), 'MMM dd, yyyy')}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Logged On</span>
                <span className="font-semibold text-foreground text-sm">
                  {format(new Date(selectedCredit.date_created), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>

            {selectedCredit.notes && (
              <div className="p-3 rounded-xl border border-border/60 bg-muted/10">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase !tracking-wider mb-0.5">
                  Notes
                </span>
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  {selectedCredit.notes}
                </p>
              </div>
            )}
          </div>

          {/* Payments Timeline History */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase !tracking-wider">
                Payment History
              </h4>
              <span className="text-[11px] text-muted-foreground font-medium">
                {(selectedCredit.payments || []).length} payment{(selectedCredit.payments || []).length === 1 ? '' : 's'}
              </span>
            </div>

            {selectedCredit.payments && selectedCredit.payments.length > 0 ? (
              <div className="border border-border/70 rounded-md divide-y divide-border/50 bg-card overflow-hidden">
                {selectedCredit.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{payment.reference}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(payment.date_created), 'MMM dd, yyyy')} ·{' '}
                          {methodLabels[payment.payment_method] || payment.payment_method}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      <span className="font-bold text-foreground text-sm">
                        -<CurrencyDisplay amount={payment.amount} />
                      </span>
                      {onDownloadPDF && (
                        <button
                          type="button"
                          onClick={() => onDownloadPDF(payment)}
                          title="Download Receipt PDF"
                          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Icon icon="solar:download-minimalistic-linear" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/70 rounded-md p-4 bg-muted/5">
                No payments recorded against this credit purchase yet.
              </div>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          {/* <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="w-full font-medium"
          >
            Close
          </Button> */}
          {selectedCredit.status !== 'settled' && (
            <Button
              type="button"
              onClick={() => onRecordPayment(selectedCredit)}
              className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full"
            >
              <Icon icon="solar:wallet-money-linear" className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
          )}
        </div>
      }
    />
  );
}
