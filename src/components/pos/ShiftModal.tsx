import React, { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { useFeaturesStore } from '@/store/featuresStore';
import CashCountInput from './CashCountInput';
import { CashCount, cashCountIsEmpty, cashCountPayload, cashCountTotal } from '@/utils/cashCount';

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (byDenomination) {
      // An empty count is a float of 0
      await onOpenShift(cashCountTotal(count), cashCountPayload(count));
      return;
    }
    const floatVal = parseFloat(openingFloatStr);
    if (!isNaN(floatVal) && floatVal >= 0) {
      await onOpenShift(floatVal);
    }
  };

  const modalBody = (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-4">
      <div className="text-sm text-muted-foreground mb-4">
        You must open a shift to begin processing transactions. Enter the starting cash in the drawer.
      </div>

      {byDenomination ? (
        <CashCountInput value={count} onChange={setCount} />
      ) : (
      <CustomInputTextField
        label="Opening Float (GHS)"
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
        disabled={isOpening || (!byDenomination && !openingFloatStr)}
        className="w-full h-12 rounded-xl font-bold text-[15px] shadow-sm bg-primary text-black transition-colors"
      >
        {isOpening ? 'Starting Shift...' : byDenomination && cashCountIsEmpty(count) ? 'Start Shift with no float' : 'Start Shift'}
      </Button>
    </form>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => onOpenChange(!isOpen)}
      size="md"
      header={
        <div className="flex items-center gap-3 text-xl font-bold pt-2">
          <div className="p-2 bg-muted rounded-full">
            <PlayCircle className="h-5 w-5 text-foreground" />
          </div>
          Start New Shift
        </div>
      }
      body={modalBody}
    />
  );
}
