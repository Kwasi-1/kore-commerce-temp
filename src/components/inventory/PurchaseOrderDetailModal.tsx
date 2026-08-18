import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { Icon } from '@iconify/react/dist/iconify.js';

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: any | null;
  onEdit: (po: any) => void;
  onReceive: (po: any) => void;
  onCancel: (po: any) => void;
  onCloseEarly: (po: any) => void;
  isCancellingPO?: boolean;
  isReceivingPO?: boolean;
  isClosingPO?: boolean;
}

export default function PurchaseOrderDetailModal({
  isOpen,
  onClose,
  selectedPO,
  onEdit,
  onReceive,
  onCancel,
  onCloseEarly,
  isCancellingPO = false,
  isReceivingPO = false,
  isClosingPO = false,
}: PurchaseOrderDetailModalProps) {
  const [detailActiveTab, setDetailActiveTab] = useState<'items' | 'receipts'>('items');

  useEffect(() => {
    if (isOpen) {
      setDetailActiveTab('items');
    }
  }, [isOpen]);

  const handleClose = () => {
    setDetailActiveTab('items');
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size="3xl"
      classNames={{
        base: "rounded-xl min-h-[calc(100dvh-0.75rem)] md:min-h-[520px] scrollbar-hide"
      }}
      header={
        <div className="pt-2 px-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {selectedPO?.referenceNumber || selectedPO?.reference_number || "Purchase Order"}
            </h2>
            <div className="flex items-center gap-2">
              {selectedPO && (selectedPO.receipts?.length || 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailActiveTab(detailActiveTab === 'items' ? 'receipts' : 'items')}
                  className="h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 border-border/80 hover:bg-muted"
                >
                  {detailActiveTab === 'items' ? (
                    <>
                      <Icon icon="solar:history-linear" className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Receipts ({selectedPO.receipts.length})</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:box-minimalistic-linear" className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>View Items</span>
                    </>
                  )}
                </Button>
              )}
              {selectedPO && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                  selectedPO.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                  : selectedPO.status === 'partially_received' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                  : selectedPO.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : selectedPO.status === 'draft' ? 'text-muted-foreground bg-muted'
                  : 'text-destructive bg-destructive/5'
                }`}>
                  {selectedPO.status === 'partially_received' ? 'Partially Received' : selectedPO.status}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs md:text-[13px] text-muted-foreground font-normal">
            Supplier: <strong className="text-foreground">{selectedPO?.supplierName || (selectedPO?.supplier ? (typeof selectedPO.supplier === 'object' ? selectedPO.supplier.name : selectedPO.supplier) : 'Unknown')}</strong>
          </p>
        </div>
      }
      body={
        selectedPO && (
          <div className="space-y-4 py-2 text-sm">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-muted/20 border border-border/40">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Order Date</span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block">
                  {selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created
                    ? new Date(selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Payment Type</span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block">
                  {selectedPO.isCreditPurchase || selectedPO.is_credit_purchase ? "Credit" : "Cash"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Credit Due Date</span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block">
                  {selectedPO.creditDueDate || selectedPO.credit_due_date
                    ? new Date(selectedPO.creditDueDate || selectedPO.credit_due_date).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Total Amount</span>
                <span className="text-xs font-bold text-foreground mt-0.5 block">
                  <CurrencyDisplay amount={Number(selectedPO.totalAmount ?? selectedPO.total_amount ?? 0)} showStyling={false} />
                </span>
              </div>
            </div>

            {/* TAB 1: Line Items */}
            {detailActiveTab === 'items' && (
              <div className="space-y-3">
                <div className="border border-border/70 rounded-lg md:rounded-none overflow-hidden max-h-[calc(100dvh-24.5rem)] md:max-h-[340px] overflow-y-auto">
                  {/* Desktop View Table */}
                  <table className="hidden md:table w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/70 text-muted-foreground font-semibold text-[11px] uppercase !tracking-wider">
                        <th className="p-3 !tracking-wide">Item / Variant</th>
                        <th className="p-3 !tracking-wide">SKU</th>
                        <th className="p-3 !tracking-wide">Tier</th>
                        <th className="p-3 !tracking-wide text-center">Ordered</th>
                        <th className="p-3 !tracking-wide text-center">Fulfillment</th>
                        <th className="p-3 !tracking-wide text-right">Cost</th>
                        <th className="p-3 !tracking-wide text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(selectedPO.items || []).map((item: any, i: number) => {
                        const cost = typeof item.cost_price_per_tier === 'object' 
                          ? Number(item.cost_price_per_tier?.parsedValue ?? item.cost_price_per_tier?.source ?? 0)
                          : Number(item.cost_price_per_tier || 0);
                        const sub = typeof item.subtotal === 'object'
                          ? Number(item.subtotal?.parsedValue ?? item.subtotal?.source ?? 0)
                          : Number(item.subtotal || 0);
                        const qtyOrd = Number(item.quantity_ordered ?? item.quantityOrdered ?? 0);
                        const qtyRec = Number(item.quantity_received ?? item.quantityReceived ?? 0);
                        const pct = qtyOrd > 0 ? Math.min(100, Math.round((qtyRec / qtyOrd) * 100)) : 0;
                        const isFullyReceived = qtyRec >= qtyOrd && qtyOrd > 0;
                        const isPartiallyReceived = qtyRec > 0 && qtyRec < qtyOrd;

                        return (
                          <tr key={i} className="hover:bg-muted/10 transition-colors">
                            <td className="p-2.5 font-medium text-foreground capitalize">
                              {item.variant_name || item.variantName || "Unknown Variant"}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">
                              <span>
                                {item.variant_sku || item.variantSku || "—"}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {item.packaging_tier_name || item.packagingTierName || "Unit"}
                            </td>
                            <td className="p-3 text-center font-semibold text-foreground">
                              {qtyOrd}
                            </td>
                            <td className="p-3 text-center">
                              <div className="space-y-1.5 inline-block w-28 text-center">
                                <div className="flex items-center justify-between text-[11px] font-semibold">
                                  <span className={isFullyReceived ? 'text-foreground font-bold' : isPartiallyReceived ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                    {qtyRec} / {qtyOrd}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {pct}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden border border-border/30">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isFullyReceived
                                        ? 'bg-muted-foreground'
                                        : isPartiallyReceived
                                        ? 'bg-amber-500'
                                        : 'bg-transparent'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right text-muted-foreground font-medium">
                              <CurrencyDisplay amount={cost} showStyling={false} />
                            </td>
                            <td className="p-3 text-right font-semibold text-foreground">
                              <CurrencyDisplay amount={sub} showStyling={false} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile View Card List */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {(selectedPO.items || []).map((item: any, i: number) => {
                      const cost = typeof item.cost_price_per_tier === 'object' 
                        ? Number(item.cost_price_per_tier?.parsedValue ?? item.cost_price_per_tier?.source ?? 0)
                        : Number(item.cost_price_per_tier || 0);
                      const sub = typeof item.subtotal === 'object'
                        ? Number(item.subtotal?.parsedValue ?? item.subtotal?.source ?? 0)
                        : Number(item.subtotal || 0);
                      const qtyOrd = Number(item.quantity_ordered ?? item.quantityOrdered ?? 0);
                      const qtyRec = Number(item.quantity_received ?? item.quantityReceived ?? 0);
                      const pct = qtyOrd > 0 ? Math.min(100, Math.round((qtyRec / qtyOrd) * 100)) : 0;
                      const isFullyReceived = qtyRec >= qtyOrd && qtyOrd > 0;
                      const isPartiallyReceived = qtyRec > 0 && qtyRec < qtyOrd;

                      return (
                        <div key={i} className="p-3 space-y-2 dark:bg-muted/20 hover:bg-muted/10 transition-colors">
                          {/* Row 1: Name + Subtotal */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground text-xs leading-snug capitalize truncate">
                                {item.variant_name || item.variantName || "Item"}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono">{item.variant_sku || item.variantSku || "—"}</span>
                                <span>·</span>
                                <span>{item.packaging_tier_name || item.packagingTierName || "Unit"}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-foreground text-xs">
                                <CurrencyDisplay amount={sub} showStyling={false} />
                              </span>
                              <div className="text-[10px] text-muted-foreground">
                                <CurrencyDisplay amount={cost} showStyling={false} /> / unit
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Fulfillment Progress */}
                          <div className="pt-1 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                Fulfillment ({qtyOrd} ordered):
                              </span>
                              <span className={isFullyReceived ? 'text-foreground font-bold' : isPartiallyReceived ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground font-medium'}>
                                {qtyRec} / {qtyOrd} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden border border-border/30">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isFullyReceived
                                    ? 'bg-foreground'
                                    : isPartiallyReceived
                                    ? 'bg-amber-500'
                                    : 'bg-transparent'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedPO.notes && (
                  <div className="p-3 rounded border border-border/60 bg-muted/10 text-xs text-muted-foreground">
                    <strong className="text-foreground">Notes:</strong> {selectedPO.notes}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Delivery Receipts History */}
            {detailActiveTab === 'receipts' && (
              <div className="space-y-3">
                {(!selectedPO.receipts || selectedPO.receipts.length === 0) ? (
                  <div className="text-center py-10 text-muted-foreground text-xs space-y-2 border border-dashed border-border/70 rounded-xl">
                    <Icon icon="solar:box-minimalistic-linear" className="h-9 w-9 mx-auto opacity-40 text-muted-foreground" />
                    <p className="font-semibold text-foreground text-sm">No Delivery Receipts Yet</p>
                    <p className="text-xs md:text-[13px] max-w-sm mx-auto">When stock items are received, timestamped intake audit records will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {selectedPO.receipts.map((rcv: any, rIdx: number) => (
                      <div key={rIdx} className="border border-border/70 rounded-xl p-3.5 space-y-3 bg-card/60 shadow-xs">
                        {/* Receipt Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[11px] font-bold text-foreground bg-muted/50 px-2.5 py-1 rounded border border-border/60">
                              {rcv.receiptNumber || `Receipt #${rIdx + 1}`}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Icon icon="solar:calendar-linear" className="h-3.5 w-3.5" />
                              {rcv.dateReceived ? new Date(rcv.dateReceived).toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {rcv.receivedByName && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Icon icon="solar:user-circle-linear" className="h-3.5 w-3.5" />
                                <span>{rcv.receivedByName}</span>
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              Units: <strong className="text-foreground">{rcv.totalUnitsReceived}</strong>
                            </span>
                            <span className="font-bold text-foreground">
                              <CurrencyDisplay amount={Number(rcv.totalAmountReceived || 0)} showStyling={false} />
                            </span>
                          </div>
                        </div>

                        {/* Items in this Receipt */}
                        <div className="bg-muted/15 rounded-lg border border-border/40 divide-y divide-border/30 px-3 py-0.5 text-xs">
                          {(rcv.items || []).map((ritem: any, itemIdx: number) => (
                            <div key={itemIdx} className="py-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-foreground capitalize truncate">
                                  {ritem.variant_name || ritem.variantName || 'Item'}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                  {ritem.variant_sku || ritem.variantSku || '—'}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ({ritem.packaging_tier_name || ritem.packagingTierName || 'Unit'})
                                </span>
                              </div>
                              <div className="text-right flex items-center gap-3 shrink-0">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] border-emerald-200/50 dark:border-emerald-800/30">
                                  +{ritem.quantity_received} units
                                </span>
                                <span className="font-semibold text-foreground text-xs min-w-[70px] text-right">
                                  <CurrencyDisplay amount={Number(ritem.subtotal || 0)} showStyling={false} />
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }
      footer={
        selectedPO ? (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/50 w-full">
            <div className="flex items-center gap-2">
              {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onCancel(selectedPO)}
                  disabled={isCancellingPO || isReceivingPO || isClosingPO}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-medium flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                  {isCancellingPO ? "Cancelling..." : "Cancel PO"}
                </Button>
              )}
              {selectedPO.status === 'partially_received' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onCloseEarly(selectedPO)}
                  disabled={isCancellingPO || isReceivingPO || isClosingPO}
                  className="text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 w-full sm:w-auto justify-center"
                  title="Close PO early if supplier will not deliver remaining items"
                >
                  <Icon icon="solar:check-read-linear" className="h-4 w-4" />
                  Close Short
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClose}
                className="text-xs font-medium flex-1 sm:flex-none"
              >
                Close
              </Button>

              {selectedPO.status === 'draft' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEdit(selectedPO)}
                  className="text-xs font-semibold flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                >
                  <Icon icon="solar:pen-linear" className="h-3.5 w-3.5" />
                  Edit Draft
                </Button>
              )}

              {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                <Button 
                  size="sm" 
                  onClick={() => onReceive(selectedPO)}
                  disabled={isReceivingPO || isCancellingPO || isClosingPO}
                  className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                >
                  <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                  {selectedPO.status === 'partially_received' ? "Receive Remaining Stock" : "Mark as Received"}
                </Button>
              )}
            </div>
          </div>
        ) : null
      }
    />
  );
}
