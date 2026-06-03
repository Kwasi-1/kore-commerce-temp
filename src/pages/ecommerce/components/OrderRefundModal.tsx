import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface OrderRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: any;
  onSuccess: () => void;
}

export default function OrderRefundModal({ 
  isOpen, 
  onClose, 
  orderData, 
  onSuccess 
}: OrderRefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  const handleIssueRefund = async () => {
    if (!orderData) return;
    
    setIsRefunding(true);
    try {
      const amount = refundType === 'full' ? orderData.total_amount : parseFloat(partialRefundAmount);
      if (isNaN(amount) || amount <= 0 || amount > orderData.total_amount) {
        toast.error("Invalid refund amount");
        setIsRefunding(false);
        return;
      }

      await apiClient.post(`/tenant/orders/${orderData.id}/refund`, {
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
      header={<span className="text-lg font-semibold">Process Refund</span>}
      body={
        <div className="flex flex-col gap-6 py-4">
          <div className="flex gap-4">
            <Button 
              className="flex-1"
              variant={refundType === 'full' ? 'default' : 'outline'}
              onClick={() => setRefundType('full')}
            >
              Full Refund
            </Button>
            <Button 
              className="flex-1"
              variant={refundType === 'partial' ? 'default' : 'outline'}
              onClick={() => setRefundType('partial')}
            >
              Partial Refund
            </Button>
          </div>

          {refundType === 'full' ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm border border-destructive/20">
              Are you sure you want to completely refund this order? The total amount of <strong><CurrencyDisplay amount={orderData?.total_amount || 0} /></strong> will be recorded as refunded.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the custom amount to refund. Maximum allowed is <strong><CurrencyDisplay amount={orderData?.total_amount || 0} /></strong>.
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
        <div className="flex gap-2 w-full justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isRefunding}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleIssueRefund} disabled={isRefunding}>
            {isRefunding ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </div>
      }
    />
  );
}
