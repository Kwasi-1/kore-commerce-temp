import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'supplies', label: 'Store Supplies' },
  { value: 'utilities', label: 'Utilities & Bills' },
  { value: 'food', label: 'Food & Meals' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'float_topup', label: 'Float Top-up' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export default function CashMovementModal({ isOpen, onClose, onSuccess }: CashMovementModalProps) {
  const [movementType, setMovementType] = useState<'paid_out' | 'paid_in'>('paid_out');
  const [category, setCategory] = useState('supplies');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason or note for this movement.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/pos/shifts/current/movements', {
        type: movementType,
        category,
        amount,
        reason: reason.trim(),
      });

      toast.success(
        movementType === 'paid_out'
          ? 'Paid out expense logged successfully'
          : 'Paid in float added successfully'
      );

      setAmountStr('');
      setReason('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Cash movement error:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to record cash movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      header={
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Drawer Cash Movement</h3>
            <p className="text-xs font-semibold text-muted-foreground">
              Log petty cash expenses (Paid Out) or float additions (Paid In)
            </p>
          </div>
        </div>
      }
      body={
        <div className="flex flex-col gap-5 pt-4">
          {/* Movement Type Toggle */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/60 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => {
                setMovementType('paid_out');
                setCategory('supplies');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                movementType === 'paid_out'
                  ? 'bg-card text-destructive shadow-sm border border-destructive/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Paid Out (Expense)
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementType('paid_in');
                setCategory('float_topup');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                movementType === 'paid_in'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Paid In (Float Top-up)
            </button>
          </div>

          {/* Amount Field */}
          <CustomInputTextField
            type="number"
            label="Amount (GHS) *"
            labelPlacement="outside"
            placeholder="0.00"
            value={amountStr}
            onChange={(e: any) => setAmountStr(e.target.value)}
            className="h-12 text-base font-bold"
            autoFocus
          />

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Notes */}
          <Textarea
            label="Reason / Description *"
            labelPlacement="outside"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              movementType === 'paid_out'
                ? 'e.g. Receipt paper roll, Electricity token, Lunch allowance...'
                : 'e.g. Added GHS 100 extra cash float to drawer...'
            }
            textareaClassName="bg-background focus:ring-primary/50"
          />
        </div>
      }
      footer={
        <div className="flex justify-between w-full pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={onClose} className="rounded-full font-bold px-6">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amountStr || !reason.trim()}
            className={`rounded-full font-bold px-8 shadow-lg ${
              movementType === 'paid_out'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? 'Recording...' : movementType === 'paid_out' ? 'Log Paid Out' : 'Add Paid In'}
          </Button>
        </div>
      }
    />
  );
}
