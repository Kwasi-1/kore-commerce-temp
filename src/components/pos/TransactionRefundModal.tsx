import React, { useState, useEffect, useMemo } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  Check, 
  RotateCcw, 
  Package, 
  Plus, 
  Minus,
  Percent,
  SlidersHorizontal
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface TransactionRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  onSuccess: () => void;
}

interface ItemConditionState {
  selected: boolean;
  returnQuantity: number;
  maxQuantity: number;
  condition: 'sellable' | 'damaged';
}

const REASON_OPTIONS = [
  { id: 'defective', label: 'Defective / Damaged' },
  { id: 'wrong_item', label: 'Wrong Item' },
  { id: 'customer_change', label: 'Customer Change' },
  { id: 'expired', label: 'Expired Stock' },
  { id: 'other', label: 'Other Reason' },
];

const PERCENTAGE_PRESETS = [100, 75, 50, 25];

export default function TransactionRefundModal({ 
  isOpen, 
  onClose, 
  receiptData, 
  onSuccess 
}: TransactionRefundModalProps) {
  const [refundTab, setRefundTab] = useState<'full' | 'partial'>('full');
  const [enableCustomAdjustment, setEnableCustomAdjustment] = useState<boolean>(false);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [activePercentage, setActivePercentage] = useState<number>(100);
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

  // Reset or initialize item states when modal opens or receiptData changes
  useEffect(() => {
    if (rawItems.length > 0) {
      const initial: Record<number, ItemConditionState> = {};
      rawItems.forEach((item, idx) => {
        const originalQty = item.quantity || 1;
        initial[idx] = {
          selected: true,
          returnQuantity: originalQty,
          maxQuantity: originalQty,
          condition: 'sellable',
        };
      });
      setItemStates(initial);
      setRefundTab('full');
      setEnableCustomAdjustment(false);
      setCustomAmountInput('');
      setActivePercentage(100);
      setReason('defective');
      setNotes('');
    }
  }, [receiptData, isOpen]);

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
    setItemStates(prev => {
      const curr = prev[idx];
      if (!curr) return prev;
      return {
        ...prev,
        [idx]: {
          ...curr,
          selected: !curr.selected
        }
      };
    });
  };

  const updateItemQty = (idx: number, delta: number) => {
    setItemStates(prev => {
      const curr = prev[idx];
      if (!curr) return prev;
      const nextQty = Math.max(1, Math.min(curr.maxQuantity, curr.returnQuantity + delta));
      return {
        ...prev,
        [idx]: {
          ...curr,
          returnQuantity: nextQty,
          selected: true
        }
      };
    });
  };

  // Live calculation of selected items' total value
  const { selectedItemsValue, isFullSelection, selectedCount, totalItemCount } = useMemo(() => {
    let sum = 0;
    let selectedItems = 0;
    let totalPurchased = 0;
    let totalReturning = 0;

    rawItems.forEach((item, idx) => {
      const state = itemStates[idx];
      const unitPrice = getVal(item.unitPrice || item.price || (item.subtotal && item.quantity ? item.subtotal / item.quantity : 0));
      const originalQty = item.quantity || 1;
      totalPurchased += originalQty;

      if (state?.selected) {
        selectedItems += 1;
        totalReturning += state.returnQuantity;
        sum += unitPrice * state.returnQuantity;
      }
    });

    const isFull = selectedItems === rawItems.length && totalReturning === totalPurchased && sum >= (totalAmount - 0.05);

    return {
      selectedItemsValue: Number(sum.toFixed(2)),
      isFullSelection: isFull,
      selectedCount: selectedItems,
      totalItemCount: rawItems.length
    };
  }, [rawItems, itemStates, totalAmount]);

  // Handle Percentage Preset Click
  const handlePercentageClick = (pct: number) => {
    setActivePercentage(pct);
    const calculated = Number(((selectedItemsValue * pct) / 100).toFixed(2));
    setCustomAmountInput(calculated.toString());
  };

  // Compute final effective refund amount
  const effectiveRefundAmount = useMemo(() => {
    if (refundTab === 'full') {
      return totalAmount;
    }
    // Partial Refund mode:
    if (enableCustomAdjustment) {
      const custom = parseFloat(customAmountInput);
      return isNaN(custom) ? 0 : custom;
    }
    return selectedItemsValue;
  }, [refundTab, enableCustomAdjustment, customAmountInput, selectedItemsValue, totalAmount]);

  const handleIssueRefund = async () => {
    if (!receiptData) return;
    
    if (effectiveRefundAmount <= 0) {
      toast.error("Refund amount must be greater than 0");
      return;
    }

    if (refundTab === 'partial' && effectiveRefundAmount > selectedItemsValue + 0.01) {
      toast.error(`Refund amount cannot exceed selected items value of GHS ${selectedItemsValue.toFixed(2)}`);
      return;
    }

    if (effectiveRefundAmount > totalAmount + 0.01) {
      toast.error(`Refund amount cannot exceed original total of GHS ${totalAmount.toFixed(2)}`);
      return;
    }

    setIsRefunding(true);
    try {
      // Build structured return items payload
      const refundItems = rawItems
        .filter((_, idx) => (refundTab === 'full' ? true : itemStates[idx]?.selected !== false))
        .map((item, idx) => {
          const state = itemStates[idx] || { returnQuantity: item.quantity || 1, condition: 'sellable' };
          const qty = refundTab === 'full' ? (item.quantity || 1) : (state.returnQuantity || item.quantity || 1);
          const unitPrice = getVal(item.unitPrice || item.price || (item.subtotal && item.quantity ? item.subtotal / item.quantity : 0));
          
          return {
            variant_id: item.variantId || item.variant_id || item.id || `var-${idx}`,
            packaging_tier_id: item.packagingTierId || item.packaging_tier_id || null,
            product_name: item.productName || item.product_name || item.name || 'Item',
            packaging_tier_name: item.packagingTierName || item.packaging_tier_name || 'Unit',
            quantity: qty,
            unit_price: unitPrice,
            condition: state.condition || 'sellable'
          };
        });

      const txId = receiptData.id || receiptData.transactionId || receiptData.receiptNumber;
      const finalType = (refundTab === 'full' || (refundTab === 'partial' && isFullSelection && !enableCustomAdjustment)) ? 'full' : 'partial';

      await apiClient.post(`/pos/transactions/${txId}/refund`, {
        type: finalType,
        amount: effectiveRefundAmount,
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
      size="xl"
      classNames={
        {
          base: "max-w-[34rem]",
        }
      }
      header={
        <div className="pb-2 border-b border-border/50">        
          <h3 className="text-lg md:text-xl font-bold text-foreground !tracking-tighter">Process Refund</h3>
          <p className="text-xs text-muted-foreground font-normal leading-[2]">
            Receipt #{receiptData?.orderNumber || receiptData?.receiptNumber || receiptData?.id?.slice(0, 8)?.toUpperCase()}
          </p>
        </div>
      }
      body={
        <div className="flex flex-col gap-4 max-h-[calc(100vh-185px)] sm:max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-hide px-0.5">
          
          {/* Streamlined 2-Tab Navigation */}
          <div className="flex bg-secondary/80 p-[3px] rounded-full border border-border/10">
            <button 
              type="button"
              className={`flex-1 text-xs md:text-[12px] font-semibold py-2.5 rounded-full transition-all ${
                refundTab === 'full' 
                  ? 'bg-background shadow-sm text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setRefundTab('full');
                setEnableCustomAdjustment(false);
                // Select all items with max quantity
                const reset: Record<number, ItemConditionState> = {};
                rawItems.forEach((item, idx) => {
                  const originalQty = item.quantity || 1;
                  reset[idx] = {
                    selected: true,
                    returnQuantity: originalQty,
                    maxQuantity: originalQty,
                    condition: itemStates[idx]?.condition || 'sellable',
                  };
                });
                setItemStates(reset);
              }}
            >
              Full Refund
            </button>
            <button 
              type="button"
              className={`flex-1 text-xs md:text-[12px] font-semibold py-2.5 rounded-full transition-all ${
                refundTab === 'partial' 
                  ? 'bg-background shadow-sm text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setRefundTab('partial');
                if (!customAmountInput && selectedItemsValue > 0) {
                  setCustomAmountInput(selectedItemsValue.toString());
                }
              }}
            >
              Partial Refund
            </button>
          </div>

          {/* Dynamic Summary Card */}
          <div className="bg-muted/30 p-3.5 rounded flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium">Refund Amount to Issue:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-foreground">
                  <CurrencyDisplay amount={effectiveRefundAmount} />
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  (refundTab === 'full' || (refundTab === 'partial' && isFullSelection && !enableCustomAdjustment))
                    ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
                }`}>
                  {refundTab === 'full'
                    ? 'Full Order'
                    : enableCustomAdjustment
                    ? `Custom (${activePercentage}% of selected)`
                    : `Partial (${selectedCount} of ${totalItemCount} items)`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Original Total:</span>
              <span className="text-xs font-semibold text-foreground">
                <CurrencyDisplay amount={totalAmount} showStyling={false}/>
              </span>
            </div>
          </div>

          {/* Partial Refund Custom Amount & Percentage Controls */}
          {refundTab === 'partial' && (
            <div className="space-y-3 bg-muted/20 border border-border/60 p-3.5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Custom Refund Adjustment</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !enableCustomAdjustment;
                    setEnableCustomAdjustment(nextState);
                    if (nextState && !customAmountInput) {
                      setCustomAmountInput(selectedItemsValue.toString());
                      setActivePercentage(100);
                    }
                  }}
                  className={`text-[11px] font-medium px-2.5 py-0.5 pb-1.5 leading-normal rounded-md transition-all ${
                    enableCustomAdjustment
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {enableCustomAdjustment ? 'Custom Active' : 'Enable Custom % or GHS'}
                </button>
              </div>

              {enableCustomAdjustment && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  {/* Percentage Presets */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Quick %:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PERCENTAGE_PRESETS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handlePercentageClick(pct)}
                          className={`px-2.5 py-1 leading-normal rounded-lg text-xs font-semibold transition-all ${
                            activePercentage === pct
                              ? 'bg-foreground/90 text-background shadow-xs'
                              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom GHS Input Field */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Custom Refund Amount (GHS)</span>
                      <span className="text-muted-foreground text-[11px]">
                        Max: <span className="font-bold text-foreground"><CurrencyDisplay amount={selectedItemsValue} /></span>
                      </span>
                    </div>
                    <CustomInputTextField
                      type="number"
                      labelPlacement="outside"
                      placeholder="0.00"
                      value={customAmountInput}
                      onChange={(e) => {
                        setCustomAmountInput(e.target.value);
                        setActivePercentage(0); // custom value
                      }}
                      startContent={<span className="text-muted-foreground text-xs font-medium">GHS</span>}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Returned Items, Quantities & Restock Condition */}
          {rawItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Return Items & Restock Condition
                </label>
                {refundTab === 'partial' && (
                  <span className="text-[11px] text-muted-foreground">
                    Selected Value: <strong className="text-foreground"><CurrencyDisplay amount={selectedItemsValue} showStyling={false} /></strong>
                  </span>
                )}
              </div>

              <div className="border border-border/60 rounded-lg overflow-hidden text-xs bg-card">
                <div className="divide-y divide-border/50">
                  {rawItems.map((item, idx) => {
                    const state = itemStates[idx] || { selected: true, returnQuantity: item.quantity || 1, maxQuantity: item.quantity || 1, condition: 'sellable' };
                    const name = item.productName || item.product_name || item.name || 'Item';
                    const unitPrice = getVal(item.unitPrice || item.price || (item.subtotal && item.quantity ? item.subtotal / item.quantity : 0));
                    const maxQty = item.quantity || 1;
                    const lineRefundSum = unitPrice * state.returnQuantity;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 flex flex-col gap-2.5 transition-colors ${
                          state.selected ? 'bg-background/80' : 'bg-muted/20 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Checkbox & Product Info */}
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {refundTab === 'partial' && (
                              <Checkbox
                                checked={state.selected}
                                onCheckedChange={() => toggleItemSelection(idx)}
                              />
                            )}
                            
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-xs truncate">{name}</p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>Purchased: {maxQty}</span>
                                <span>•</span>
                                <span>@ <CurrencyDisplay amount={unitPrice} showStyling={false}/></span>
                              </div>
                            </div>
                          </div>

                          {/* Line Return Subtotal */}
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-foreground">
                              {state.selected ? <CurrencyDisplay amount={lineRefundSum} showStyling={false} /> : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Stepper & Condition Selector (Active when item is selected) */}
                        {state.selected && (
                          <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 ${refundTab === 'partial' ? 'pl-6.5' : ''}`}>
                            {/* Quantity Stepper (if purchased more than 1) */}
                            {maxQty > 1 && refundTab === 'partial' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground font-medium">Return Qty:</span>
                                <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
                                  <button
                                    type="button"
                                    disabled={state.returnQuantity <= 1}
                                    onClick={() => updateItemQty(idx, -1)}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background disabled:opacity-30 transition-all"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-8 text-center font-bold text-xs tabular-nums text-foreground">
                                    {state.returnQuantity}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={state.returnQuantity >= maxQty}
                                    onClick={() => updateItemQty(idx, 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background disabled:opacity-30 transition-all"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-[11px] text-muted-foreground">of {maxQty}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Qty returning: {state.returnQuantity}</span>
                            )}

                            {/* Restock Condition Toggle */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleItemCondition(idx, 'sellable')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                                  state.condition === 'sellable'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                                }`}
                              >
                                Sellable (Restock)
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleItemCondition(idx, 'damaged')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                                  state.condition === 'damaged'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                                }`}
                              >
                                Damaged (Write-off)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold shadow-xs'
                      : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {reason === opt.id && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              Remarks / Notes <span className="text-[10px] font-normal text-muted-foreground lowercase">(optional)</span>
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
            className="rounded-full px-5 text-xs font-semibold hidden sm:flex" 
            onClick={onClose} 
            disabled={isRefunding}
          >
            Cancel
          </Button>
          <Button 
            className="rounded-full px-6 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm w-full sm:w-fit" 
            onClick={handleIssueRefund} 
            disabled={isRefunding || effectiveRefundAmount <= 0}
          >
            {isRefunding ? 'Processing...' : `Confirm & Issue Refund (${effectiveRefundAmount > 0 ? `GHS ${effectiveRefundAmount.toFixed(2)}` : ''})`}
          </Button>
        </div>
      }
    />
  );
}
