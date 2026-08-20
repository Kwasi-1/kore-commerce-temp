import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { CustomInputTextField, CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { SupplierCreditRecord } from './SupplierCreditDetailModal';

interface RecordSupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCredit: SupplierCreditRecord | null;
  onSuccess: (updatedCredit?: any) => void;
}

export default function RecordSupplierPaymentModal({
  isOpen,
  onClose,
  selectedCredit,
  onSuccess,
}: RecordSupplierPaymentModalProps) {
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && selectedCredit) {
      setPayAmount(selectedCredit.balance_remaining.toString());
      setPaymentMethod('cash');
      setPaymentRef('');
      setPaymentNotes('');
    }
  }, [isOpen, selectedCredit]);

  if (!selectedCredit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > selectedCredit.balance_remaining) {
      toast.error(`Please enter a valid amount between 0.01 and ${selectedCredit.balance_remaining}`);
      return;
    }

    const isReferenceRequired = paymentMethod !== 'cash';
    if (isReferenceRequired && !paymentRef.trim()) {
      toast.error(
        paymentMethod === 'mobile_money'
          ? 'Mobile Money transaction ID is required'
          : 'Bank reference / check number is required'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReference = paymentRef.trim() || `CSH-${Date.now().toString().slice(-6)}`;
      const response = await apiClient.post(`/tenant/supplier-credit/${selectedCredit.id}/payments`, {
        amount: amountNum,
        payment_method: paymentMethod,
        reference: finalReference,
        notes: paymentNotes.trim(),
      });

      toast.success('Payment recorded successfully');
      onSuccess(response.data.success?.data?.supplierCredit);
      onClose();
    } catch (err: any) {
      console.error('Failed to record supplier payment:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInFull = () => {
    setPayAmount(selectedCredit.balance_remaining.toString());
  };

  const paymentOptions = [
    { label: 'Cash Payment', value: 'cash' },
    { label: 'Mobile Money (MoMo)', value: 'mobile_money' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
  ];

  const getReferenceLabel = () => {
    switch (paymentMethod) {
      case 'mobile_money':
        return 'MoMo Transaction ID';
      case 'bank_transfer':
        return 'Bank Reference / Check Number';
      default:
        return 'Receipt / Voucher No. (Optional)';
    }
  };

  const getReferencePlaceholder = () => {
    switch (paymentMethod) {
      case 'mobile_money':
        return 'e.g. 19283746520...';
      case 'bank_transfer':
        return 'e.g. TXN-892348, Check #4021...';
      default:
        return 'e.g. Petty cash voucher #104 (optional)';
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isSubmitting) onClose();
      }}
      placement="right"
      size="lg"
      // classNames={{
      //   base: 'sm:w-[460px]',
      // }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">Record Supplier Payment</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Supplier: <strong className="text-foreground">{selectedCredit.supplier_name}</strong> · PO:{' '}
            <span className="font-mono">{selectedCredit.purchase_order_ref}</span>
          </p>
        </div>
      }
      body={
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4 pb-2 text-left">
          {/* Owed balance card */}
          <div className="p-3.5 rounded-md bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Owed Balance
              </span>
              <span className="text-xl font-bold text-foreground mt-0.5 block">
                <CurrencyDisplay amount={selectedCredit.balance_remaining} />
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Invoice Total
              </span>
              <span className="text-xs font-semibold text-muted-foreground mt-0.5 block">
                <CurrencyDisplay amount={selectedCredit.total_amount} />
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <CustomInputTextField
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={selectedCredit.balance_remaining.toString()}
            required
            value={payAmount}
            placeholder="0.00"
            onChange={(e: any) => setPayAmount(e?.target ? e.target.value : e)}
            endContent={
              <button
                type="button"
                onClick={handlePayInFull}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer pr-1"
              >
                Pay in Full
              </button>
            }
          />

          {/* Payment Method */}
          <CustomSelectField
            label="Payment Method"
            options={paymentOptions}
            value={paymentMethod}
            required
            inputProps={{
              onSelectionChange: (keys: any) => {
                const val = Array.from(keys)[0];
                if (val) setPaymentMethod(String(val));
              }
            }}
          />

          {/* Transaction Reference */}
          <CustomInputTextField
            label={getReferenceLabel()}
            required={paymentMethod !== 'cash'}
            placeholder={getReferencePlaceholder()}
            value={paymentRef}
            onChange={(e: any) => setPaymentRef(e?.target ? e.target.value : e)}
          />

          {/* Internal Notes */}
          <CustomTextareaField
            label="Internal Notes (Optional)"
            placeholder="Add cash voucher number, check number, or cashier notations..."
            value={paymentNotes}
            onChange={(e: any) => setPaymentNotes(e?.target ? e.target.value : e)}
            rows={2}
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          {/* <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full font-medium"
          >
            Cancel
          </Button> */}
          <Button
            type="submit"
            form="record-payment-form"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full"
          >
            {isSubmitting && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>Record Payment</span>
          </Button>
        </div>
      }
    />
  );
}
