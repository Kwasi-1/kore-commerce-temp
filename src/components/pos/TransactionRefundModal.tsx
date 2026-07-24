import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface TransactionRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  onSuccess: () => void;
}

export default function TransactionRefundModal({ 
  isOpen, 
  onClose, 
  receiptData, 
  onSuccess 
}: TransactionRefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  const getVal = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object') {
      if (typeof val.parsedValue === 'number') return val.parsedValue;
      if (typeof val.source === 'string') return parseFloat(val.source) || 0;
    }
    return 0;
  };

  const totalAmount = getVal(
    receiptData?.totalAmount ?? receiptData?.total ?? receiptData?.summary?.total ?? receiptData?.summary?.totalAmount
  );

  const handleIssueRefund = async () => {
    if (!receiptData) return;
    
    setIsRefunding(true);
    try {
      const amount = refundType === 'full' ? totalAmount : parseFloat(partialRefundAmount);
      if (isNaN(amount) || amount <= 0 || amount > totalAmount) {
        toast.error("Invalid refund amount");
        setIsRefunding(false);
        return;
      }

      const txId = receiptData.id || receiptData.transactionId || receiptData.receiptNumber;
      await apiClient.post(`/pos/transactions/${txId}/refund`, {
        type: refundType,
        amount
      });
      
      toast.success("Refund processed successfully");
      onSuccess();
    } catch (error) {
      console.error("Refund failed:", error);
      toast.error("Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onOpenChange={onClose}
      placement="center"
      size="md"
      header={<span className="text-lg font-bold !tracking-tight">Process Refund</span>}
      body={
        <div className="flex flex-col gap-4 py-2">
          {/* Monochromatic Pill Tabs Container */}
          <div className="flex bg-secondary p-[3px] rounded-full border border-border/5">
            <button 
              type="button"
              className={`flex-1 text-[13px] font-semibold py-2 rounded-full transition-all ${
                refundType === 'full' 
                  ? 'bg-background shadow-sm text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setRefundType('full')}
            >
              Full Refund
            </button>
            <button 
              type="button"
              className={`flex-1 text-[13px] font-semibold py-2 rounded-full transition-all ${
                refundType === 'partial' 
                  ? 'bg-background shadow-sm text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setRefundType('partial')}
            >
              Partial Refund
            </button>
          </div>

          {refundType === 'full' ? (
            <div className="bg-muted/60 p-4 rounded-lg text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to completely refund this transaction? The total amount of{' '}
              <span className="font-bold text-foreground">
                <CurrencyDisplay amount={totalAmount} />
              </span>{' '}
              will be recorded as refunded.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Enter the custom amount to refund. Maximum allowed is{' '}
                <span className="font-bold text-foreground">
                  <CurrencyDisplay amount={totalAmount} />
                </span>.
              </p>
              <CustomInputTextField
                type="number"
                label="Refund Amount"
                placeholder="0.00"
                value={partialRefundAmount}
                onChange={(e) => setPartialRefundAmount(e.target.value)}
                startContent={<span className="text-muted-foreground text-sm font-medium">GHS</span>}
                labelPlacement="outside"
              />
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex gap-2.5 w-full justify-end pt-1">
          <Button 
            variant="outline" 
            className="rounded-full px-5 text-xs font-semibold" 
            onClick={onClose} 
            disabled={isRefunding}
          >
            Cancel
          </Button>
          <Button 
            className="rounded-full px-6 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm" 
            onClick={handleIssueRefund} 
            disabled={isRefunding}
          >
            {isRefunding ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </div>
      }
    />
  );
}
