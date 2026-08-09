import React from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CheckCircle2, Printer, ExternalLink, Banknote, Calendar, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaySlipDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  disbursal: any;
}

export default function PaySlipDrawer({ isOpen, onClose, disbursal }: PaySlipDrawerProps) {
  const navigate = useNavigate();
  if (!disbursal) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleViewExpense = () => {
    onClose();
    navigate('/expenses');
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="lg"
      classNames={{ base: "sm:w-[500px]" }}
      header={
        <div className="pt-4 px-2 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Disbursal Pay Slip</h2>
            <p className="text-xs text-muted-foreground font-normal">Official Salary Disbursal Record</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-400/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Disbursed & Logged
          </span>
        </div>
      }
      body={
        <div className="space-y-6 pb-4">
          {/* Main Amount Card */}
          <div className="p-4 rounded-md bg-card border border-border flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net Salary Payout</span>
            <div className="text-3xl font-extrabold text-foreground mt-1">
              <CurrencyDisplay amount={disbursal.amount} />
            </div>
            <span className="text-xs text-muted-foreground mt-1 font-medium">
              Period: <strong className="text-foreground">{disbursal.pay_period || disbursal.period || 'Current Period'}</strong>
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient Details</h3>
            
            <div className="p-3.5 bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <User className="h-3.5 w-3.5" /> Staff Recipient
                </span>
                <span className="font-bold text-foreground">{disbursal.staff_name || disbursal.recipient_name}</span>
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
                  {disbursal.date_paid ? format(new Date(disbursal.date_paid), 'MMMM dd, yyyy - hh:mm a') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Accounting & Expense Link */}
          <div className="p-3.5 rounded-md bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Accounting Expense Sync:</span>
              <span className="text-xs font-bold text-primary">Posted to Expense Log</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This salary disbursement has been automatically logged under <strong className="text-foreground">Salaries Expense</strong>.
            </p>
            <button
              type="button"
              onClick={handleViewExpense}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer pt-1"
            >
              View Expense Log <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print Pay Slip
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      }
    />
  );
}
