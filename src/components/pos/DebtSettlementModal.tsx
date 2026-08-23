import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';

interface DebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: any;
  onSettle: (amount: number, method: string) => Promise<void>;
}

export default function DebtSettlementModal({ 
  isOpen, 
  onClose, 
  debtor, 
  onSettle 
}: DebtSettlementModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDebt = debtor?.outstanding_debt || 0;

  useEffect(() => {
    if (isOpen && debtor) {
      setAmountStr(maxDebt > 0 ? maxDebt.toString() : '');
      setMethod('cash');
    }
  }, [isOpen, debtor, maxDebt]);

  const handleSettle = async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > maxDebt) return;
    
    setIsSubmitting(true);
    try {
      await onSettle(amount, method);
    } finally {
      setIsSubmitting(false);
      setAmountStr('');
      setMethod('cash');
    }
  };

  const handleSetFullAmount = () => {
    if (maxDebt > 0) {
      setAmountStr(maxDebt.toString());
    }
  };

  const amount = parseFloat(amountStr);
  const isValid = !isNaN(amount) && amount > 0 && amount <= maxDebt + 0.001;

  return (
    <CustomModal 
      isOpen={isOpen} 
      onOpenChange={onClose} 
      placement="center"
      size="md"
      classNames={{
        base: 'max-w-[28rem]',
      }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5 text-left">
          <h2 className="text-lg font-bold text-foreground">Settle Customer Debt</h2>
          <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
            Customer: <strong className="text-foreground">{debtor?.name}</strong>
          </p>
        </div>
      }
      body={
        <form id="settle-debt-form" onSubmit={(e) => { e.preventDefault(); handleSettle(); }} className="space-y-4 py-2 text-left">
          {/* Top Metric Header */}
          <div className="p-3.5 rounded-md bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Owed Balance
              </span>
              <span className="text-xl font-bold text-foreground mt-0.5 block">
                <CurrencyDisplay amount={maxDebt} />
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Account
              </span>
              <span className="text-xs font-semibold text-muted-foreground mt-0.5 block truncate max-w-[130px]">
                {debtor?.name || 'Customer'}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <CustomInputTextField
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={maxDebt.toString()}
            required
            value={amountStr}
            placeholder="0.00"
            onChange={(e: any) => setAmountStr(e?.target ? e.target.value : e)}
            endContent={
              <button
                type="button"
                onClick={handleSetFullAmount}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer pr-1"
              >
                Pay in Full
              </button>
            }
          />

          {/* Payment Method */}
          <CustomSelectField
            label="Payment Method"
            options={[
              { label: 'Cash Payment', value: 'cash' },
              { label: 'Mobile Money (MoMo)', value: 'mobile_money' },
              { label: 'Card / POS Terminal', value: 'card' },
              { label: 'Bank Transfer', value: 'bank_transfer' }
            ]}
            value={method}
            required
            inputProps={{
              onSelectionChange: (keys: any) => {
                const val = Array.from(keys)[0];
                if (val) setMethod(String(val));
              }
            }}
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            type="submit"
            form="settle-debt-form"
            disabled={isSubmitting || !isValid}
            className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full"
          >
            {isSubmitting && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>Process Payment</span>
          </Button>
        </div>
      }
    />
  );
}
