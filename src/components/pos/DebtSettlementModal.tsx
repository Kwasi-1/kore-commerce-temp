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
  }, [isOpen, debtor]);

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
        <div className="flex flex-col gap-0.5 pb-2 border-b border-border/50">
          <h3 className="text-lg font-bold text-foreground !tracking-tighter">Settle Customer Debt</h3>
          <p className="text-xs text-muted-foreground font-normal">
            Account: <strong className="text-foreground">{debtor?.name}</strong>
          </p>
        </div>
      }
      body={
        <div className="flex flex-col gap-4 py-1 text-left">
          {/* Outstanding Balance Info Box */}
          <div className="bg-muted/30 p-3.5 rounded flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Outstanding Balance:</span>
            <span className="text-base font-bold text-foreground">
              <CurrencyDisplay amount={maxDebt} />
            </span>
          </div>

          <div className="space-y-4">
            {/* Amount Field with Max Button */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Settlement Amount</span>
                <button
                  type="button"
                  onClick={handleSetFullAmount}
                  className="text-[11px] font-semibold text-foreground hover:underline"
                >
                  Pay Full ({maxDebt > 0 ? `GHS ${maxDebt.toFixed(2)}` : '0.00'})
                </button>
              </div>
              <CustomInputTextField
                type="number"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                startContent={<span className="text-muted-foreground text-xs font-medium">GHS</span>}
                labelPlacement="outside"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <CustomSelectField 
                label="Payment Method" 
                value={method}
                options={[
                  { label: 'Cash Payment', value: 'cash' },
                  { label: 'Mobile Money (MoMo)', value: 'mobile_money' },
                  { label: 'Card / POS Terminal', value: 'card' },
                  { label: 'Bank Transfer', value: 'bank_transfer' }
                ]}
                inputProps={{
                  onChange: (e: any) => setMethod(e.target.value)
                }}
                labelPlacement="inside"
              />
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2 w-full justify-end pt-2 border-t border-border/40">
          {/* <Button 
            variant="outline" 
            className="rounded-full px-5 text-xs font-semibold"
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button> */}
          <Button 
            variant="default" 
            className="px-5 w-full" 
            onClick={handleSettle} disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Processing...' : 'Process Payment'}
          </Button>
        </div>
      }
    />
  );
}
