import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  AlertCircle, 
  Check, 
  RotateCcw, 
  Package, 
  FileText, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';

interface TransactionRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  onSuccess: () => void;
}

interface ItemConditionState {
  selected: boolean;
  quantity: number;
  condition: 'sellable' | 'damaged';
}

const REASON_OPTIONS = [
  { id: 'defective', label: 'Defective / Damaged' },
  { id: 'wrong_item', label: 'Wrong Item' },
  { id: 'customer_change', label: 'Customer Change' },
  { id: 'expired', label: 'Expired Stock' },
  { id: 'other', label: 'Other Reason' },
];

export default function TransactionRefundModal({ 
  isOpen, 
  onClose, 
  receiptData, 
  onSuccess 
}: TransactionRefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('defective');
  const [notes, setNotes] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [itemStates, setItemStates] = useState<Record<number, ItemConditionState>>({});

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

  const rawItems: any[] = receiptData?.items || receiptData?.cartItems || [];

  // Reset or initialize item states when receiptData changes
  useEffect(() => {
    if (rawItems.length > 0) {
      const initial: Record<number, ItemConditionState> = {};
      rawItems.forEach((item, idx) => {
        initial[idx] = {
          selected: true,
          quantity: item.quantity || 1,
          condition: 'sellable',
        };
      });
      setItemStates(initial);
    }
  }, [receiptData]);

  const toggleItemCondition = (idx: number, condition: 'sellable' | 'damaged') => {
    setItemStates(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        condition
      }
    }));
  };

  const toggleItemSelection = (idx: number) => {
    setItemStates(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        selected: !prev[idx]?.selected
      }
    }));
  };

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

      // Build structured return items payload
      const refundItems = rawItems
        .filter((_, idx) => itemStates[idx]?.selected !== false)
        .map((item, idx) => {
          const state = itemStates[idx] || { quantity: item.quantity || 1, condition: 'sellable' };
          return {
            variant_id: item.variantId || item.variant_id || item.id || `var-${idx}`,
            product_name: item.productName || item.product_name || item.name || 'Item',
            packaging_tier_name: item.packagingTierName || item.packaging_tier_name || 'Unit',
            quantity: state.quantity || item.quantity || 1,
            unit_price: getVal(item.unitPrice || item.price),
            condition: state.condition || 'sellable'
          };
        });

      const txId = receiptData.id || receiptData.transactionId || receiptData.receiptNumber;
      await apiClient.post(`/pos/transactions/${txId}/refund`, {
        type: refundType,
        amount,
        reason,
        notes: notes.trim() || undefined,
        items: refundItems
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
      size="lg"
      header={
        <div className="pb-2 border-b border-border/50">        
          <h3 className="text-xl font-bold text-foreground !tracking-tight">Process Refund</h3>
          <p className="text-xs text-muted-foreground font-normal leading-[2]">
            Receipt #{receiptData?.receiptNumber || receiptData?.id?.slice(0, 8)}
          </p>
        </div>
      }
      body={
        <div className="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto px-0.5">
          {/* Monochromatic Pill Tabs Container */}
          <div className="flex bg-secondary/80 p-[3px] rounded-full border border-border/10">
            <button 
              type="button"
              className={`flex-1 text-xs md:text-[12px] font-semibold py-2.5 rounded-full transition-all ${
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
              className={`flex-1 text-xs md:text-[12px] font-semibold py-2.5 rounded-full transition-all ${
                refundType === 'partial' 
                  ? 'bg-background shadow-sm text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setRefundType('partial')}
            >
              Partial Refund
            </button>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Reason for Return <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReason(opt.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all flex items-center justify-between ${
                    reason === opt.id
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 font-semibold shadow-xs'
                      : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {reason === opt.id && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Refund Amount Area */}
          {refundType === 'full' ? (
            <div className="bg-muted/40 border border-border/50 p-3.5 rounded-xl text-xs text-muted-foreground leading-relaxed flex items-center justify-between">
              <span>Full Refund Amount:</span>
              <span className="text-base font-extrabold text-foreground">
                <CurrencyDisplay amount={totalAmount} />
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Custom Refund Amount</span>
                <span className="text-muted-foreground">
                  Max: <span className="font-bold text-foreground"><CurrencyDisplay amount={totalAmount} /></span>
                </span>
              </div>
              <CustomInputTextField
                type="number"
                label=""
                placeholder="0.00"
                value={partialRefundAmount}
                onChange={(e) => setPartialRefundAmount(e.target.value)}
                startContent={<span className="text-muted-foreground text-xs font-medium">GHS</span>}
              />
            </div>
          )}

          {/* Returned Items & Conditions */}
          {rawItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Items & Conditions
              </label>

              <div className="border border-border/60 rounded-xl overflow-hidden text-xs bg-card">
                <div className="divide-y divide-border/50">
                  {rawItems.map((item: any, idx: number) => {
                    const state = itemStates[idx] || { selected: true, quantity: item.quantity || 1, condition: 'sellable' };
                    const name = item.productName || item.product_name || item.name || 'Item';
                    const unitPrice = getVal(item.unitPrice || item.price);
                    
                    return (
                      <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background/50">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {refundType === 'partial' && (
                            <input 
                              type="checkbox"
                              checked={state.selected}
                              onChange={() => toggleItemSelection(idx)}
                              className="mt-0.5 rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs truncate">{name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                              <span>Qty: {item.quantity || 1}</span>
                              <span>•</span>
                              <span><CurrencyDisplay amount={unitPrice} /></span>
                            </div>
                          </div>
                        </div>

                        {/* Condition Selector */}
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] text-muted-foreground uppercase mr-1 hidden sm:inline">Condition:</span>
                          <button
                            type="button"
                            onClick={() => toggleItemCondition(idx, 'sellable')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              state.condition === 'sellable'
                                ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                          >
                            Sellable
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleItemCondition(idx, 'damaged')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              state.condition === 'damaged'
                                ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                          >
                            Damaged
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Notes / Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Add any specific context or remarks for this return..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all resize-none text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2.5 w-full justify-end pt-2 border-t border-border/40">
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
            {isRefunding ? 'Processing...' : 'Confirm & Issue Refund'}
          </Button>
        </div>
      }
    />
  );
}

