import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Printer,
  Banknote,
  Calendar,
  User,
  ShieldCheck,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import DisburalLineActions from '@/components/staff/DisburalLineActions';

interface PaySlipDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  disbursal: any;
  /** Called after a successful edit or reversal so parent can refresh the table */
  onSuccess?: () => void;
}

export default function PaySlipDrawer({ isOpen, onClose, disbursal, onSuccess }: PaySlipDrawerProps) {
  const [editingLine, setEditingLine] = useState<any>(null);
  const [reversingLine, setReversingLine] = useState<any>(null);

  if (!disbursal) return null;

  const isVoided = disbursal.status === 'voided';

  const handleSuccess = () => {
    onClose();
    onSuccess?.();
  };

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        placement="right"
        size="lg"
        classNames={{ base: 'sm:w-[500px]' }}
        header={
          <div className="pt-1 px-2 flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">Disbursal Pay Slip</h2>
              <p className="text-xs text-muted-foreground font-normal">Official Salary Disbursal Record</p>
            </div>
            {isVoided ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-rose-400/10 text-rose-600 dark:text-rose-400">
                <XCircle className="h-3.5 w-3.5" /> Voided
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-green-300/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Disbursed &amp; Logged
              </span>
            )}
          </div>
        }
        body={
          <div className="space-y-3 pb-4">
            {/* Voided banner */}
            {isVoided && (
              <div className="p-3 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
                <strong>Payment Reversed.</strong>{' '}
                {disbursal.reversal_reason ? (
                  <>Reason: <span className="italic">{disbursal.reversal_reason}</span></>
                ) : (
                  'This disbursal has been voided and is no longer active.'
                )}
              </div>
            )}

            {/* Main Amount Card */}
            <div className="p-4 rounded-md bg-card border border-border flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Net Salary Payout
              </span>
              <div className={`text-3xl font-extrabold mt-1 ${isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                <CurrencyDisplay amount={disbursal.amount} />
              </div>
              <span className="text-xs text-muted-foreground mt-1 font-medium">
                Period: <strong className="text-foreground">{disbursal.pay_period || disbursal.period || 'Current Period'}</strong>
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground">
                Recipient Details
              </h3>

              <div className="p-3.5 bg-muted/30 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <User className="h-3.5 w-3.5" /> Staff Recipient
                  </span>
                  <span className="font-bold text-foreground">
                    {disbursal.staff_name || disbursal.recipient_name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Staff Classification
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted/80 text-foreground">
                    {disbursal.is_off_platform ? 'External Staff / Contractor' : 'Platform POS Staff'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Banknote className="h-3.5 w-3.5" /> Payment Method
                  </span>
                  <span className="font-semibold text-foreground capitalize">
                    {disbursal.payment_method?.replace(/_/g, ' ') || 'Cash'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Calendar className="h-3.5 w-3.5" /> Disbursal Date
                  </span>
                  <span className="font-medium text-foreground">
                    {disbursal.date_paid
                      ? format(new Date(disbursal.date_paid), 'MMMM dd, yyyy — hh:mm a')
                      : '—'}
                  </span>
                </div>

                {disbursal.note && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground text-xs font-medium shrink-0">Note</span>
                    <span className="text-xs text-foreground italic text-right">{disbursal.note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
              {/* Left: Edit & Reverse (only when not voided) */}
              {!isVoided ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setEditingLine(disbursal)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Payout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-500/10 hover:text-rose-700"
                    onClick={() => setReversingLine(disbursal)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reverse
                  </Button>
                </div>
              ) : (
                <div />
              )}

              {/* Right: Print & Close */}
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                {/* <Button size="sm" onClick={onClose}>
                  Close
                </Button> */}
              </div>
            </div>
          </div>
        }
      />

      {/* Shared Edit & Reverse modals */}
      <DisburalLineActions
        editingLine={editingLine}
        reversingLine={reversingLine}
        onCloseEdit={() => setEditingLine(null)}
        onCloseReverse={() => setReversingLine(null)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
