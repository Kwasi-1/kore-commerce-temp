import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';
import { useFeaturesStore } from '@/store/featuresStore';
import CashCountInput from './CashCountInput';
import { CashCount, cashCountPayload, cashCountTotal } from '@/utils/cashCount';

interface ShiftModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShift: (float: number, breakdown?: Record<string, number>) => Promise<boolean>;
  isOpening: boolean;
}

export default function ShiftModal({ isOpen, onOpenChange, onOpenShift, isOpening }: ShiftModalProps) {
  const [openingFloatStr, setOpeningFloatStr] = useState('');
  const byDenomination = useFeaturesStore((st) => !!st.posSettings?.pos_cash_count_by_denomination);
  const [count, setCount] = useState<CashCount>({});

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setOpeningFloatStr('');
      setCount({});
    }
  }, [isOpen]);

  const floatAmount = byDenomination ? cashCountTotal(count) : parseFloat(openingFloatStr);
  const canStart = byDenomination || (openingFloatStr !== '' && !isNaN(floatAmount) && floatAmount >= 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canStart) return;
    if (byDenomination) {
      // An empty count is a float of 0
      await onOpenShift(floatAmount, cashCountPayload(count));
      return;
    }
    await onOpenShift(floatAmount);
  };

  const modalBody = (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 pb-4">
      {byDenomination ? (
        <CashCountInput value={count} onChange={setCount} />
      ) : (
        <CustomInputTextField
          label="Cash in drawer (GHS)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={openingFloatStr}
          onChange={(e) => setOpeningFloatStr(e.target.value)}
          className="text-lg font-bold"
          autoFocus
          required
        />
      )}

      <Button
        type="submit"
        disabled={isOpening || !canStart}
        className="w-full h-12 rounded-full font-semibold text-[15px] bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isOpening ? (
          'Starting…'
        ) : canStart && floatAmount > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            Start Shift · <CurrencyDisplay amount={floatAmount} showStyling={false} />
          </span>
        ) : byDenomination ? (
          'Start with no float'
        ) : (
          'Start Shift'
        )}
      </Button>
    </form>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => onOpenChange(!isOpen)}
      size={byDenomination ? 'lg' : 'md'}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-3">
          <h3 className="text-lg font-bold text-foreground">Start Shift</h3>
          <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
            {byDenomination ? 'Count the notes and coins in the drawer to start.' : 'Enter the cash in the drawer to start.'}
          </p>
        </div>
      }
      body={modalBody}
    />
  );
}
