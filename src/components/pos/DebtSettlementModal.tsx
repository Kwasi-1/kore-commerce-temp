import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { useCurrency } from '@/hooks';

interface DebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: any;
  onSettle: (amount: number, method: string) => Promise<void>;
}

export default function DebtSettlementModal({ isOpen, onClose, debtor, onSettle }: DebtSettlementModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatAmount } = useCurrency();

  const handleSettle = async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > debtor?.outstanding_debt) return;
    
    setIsSubmitting(true);
    await onSettle(amount, method);
    setIsSubmitting(false);
    setAmountStr('');
    setMethod('cash');
  };

  const handleSetFullAmount = () => {
    if (debtor) {
      setAmountStr(debtor.outstanding_debt.toString());
    }
  };

  const amount = parseFloat(amountStr);
  const isValid = !isNaN(amount) && amount > 0 && amount <= (debtor?.outstanding_debt || 0);

  return (
    <CustomModal 
      isOpen={isOpen} 
      onOpenChange={onClose} 
      placement="center"
      size="md"
      header={
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold">Settle Debt</span>
          <span className="text-sm font-normal text-muted-foreground">
            For {debtor?.name}
          </span>
        </div>
      }
      body={
        <div className="flex flex-col gap-6 py-2">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-muted-foreground font-medium">Outstanding Balance</span>
            <span className="text-xl font-bold">
              {debtor ? formatAmount(debtor.outstanding_debt) : 'GHS 0.00'}
            </span>
          </div>

          <div className="space-y-6">
            <CustomInputTextField
              type="number"
              label="Settlement Amount"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              startContent={<span className="text-muted-foreground text-sm font-medium">GHS</span>}
              endContent={
                <Button size="sm" variant="ghost" onClick={handleSetFullAmount} className="h-6 px-2 text-xs">
                  Max
                </Button>
              }
              labelPlacement="outside"
            />

            <CustomSelectField 
              label="Payment Method" 
              value={method}
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Mobile Money', value: 'mobile_money' },
                { label: 'Card / POS', value: 'card' },
                { label: 'Bank Transfer', value: 'bank_transfer' }
              ]}
              inputProps={{
                onChange: (e: any) => setMethod(e.target.value)
              }}
              labelPlacement="outside"
            />
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSettle} disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Processing...' : 'Process Payment'}
          </Button>
        </div>
      }
    />
  );
}
