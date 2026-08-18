import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/hooks';
import { Icon } from '@iconify/react/dist/iconify.js';

export interface ReceiveItemRow {
  variant_id: string;
  packaging_tier_id?: string;
  variant_name: string;
  variant_sku: string;
  tier_name: string;
  quantity_ordered: number;
  quantity_already_received: number;
  quantity_remaining: number;
  quantity_to_receive: number | string;
  cost_price_per_tier: number | string;
}

interface PurchaseOrderReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  poToReceive: any | null;
  receiveRows: ReceiveItemRow[];
  onReceiveQtyChange: (idx: number, val: string) => void;
  onReceiveCostChange: (idx: number, val: string) => void;
  onSetAllReceiveRemaining: () => void;
  onClearAllReceive: () => void;
  onConfirmReceive: () => void;
  isReceivingPO?: boolean;
}

export default function PurchaseOrderReceiveModal({
  isOpen,
  onClose,
  poToReceive,
  receiveRows,
  onReceiveQtyChange,
  onReceiveCostChange,
  onSetAllReceiveRemaining,
  onClearAllReceive,
  onConfirmReceive,
  isReceivingPO = false,
}: PurchaseOrderReceiveModalProps) {
  const totalUnitsReceiving = receiveRows.reduce((sum, r) => sum + (Number(r.quantity_to_receive) || 0), 0);
  const totalValueReceiving = receiveRows.reduce(
    (sum, r) => sum + (Number(r.quantity_to_receive) || 0) * (Number(r.cost_price_per_tier) || 0),
    0
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isReceivingPO) {
          onClose();
        }
      }}
      size="3xl"
      classNames={{
        base: "rounded-xl min-h-[450px] scrollbar-hide"
      }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5 text-primary" />

              Receive Stock Intake
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-md">
              {poToReceive?.referenceNumber || poToReceive?.reference_number || "PO"}
            </span>
          </div>
          <p className="text-xs md:text-[13px] !tracking-tight text-muted-foreground font-normal mt-0.5">
            Supplier: <strong className="text-foreground">{poToReceive?.supplierName || (poToReceive?.supplier ? (typeof poToReceive.supplier === 'object' ? poToReceive.supplier.name : poToReceive.supplier) : 'Supplier')}</strong> · Adjust received quantities if shipment is partial or damaged.
          </p>
        </div>
      }
      body={
        <div className="space-y-3 pb-2 text-xs">
          {/* Quick Bulk Presets */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium">
              Line Items ({receiveRows.length})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onSetAllReceiveRemaining}
                className="h-6 text-[11px] px-2 font-medium"
              >
                Fill All Remaining
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClearAllReceive}
                className="h-6 text-[11px] px-2 font-medium text-muted-foreground"
              >
                Clear (Set 0)
              </Button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-border/70 rounded overflow-hidden max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 font-semibold text-muted-foreground">
                  <th className="p-2.5">Item / Variant</th>
                  <th className="p-2.5">Tier</th>
                  <th className="p-2.5 text-center">Ordered</th>
                  <th className="p-2.5 text-center">Qty to Intake</th>
                  <th className="p-2.5 text-right">Unit Cost</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {receiveRows.map((row, idx) => {
                  const rowSubtotal = (Number(row.quantity_to_receive) || 0) * (Number(row.cost_price_per_tier) || 0);
                  return (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium text-foreground capitalize">
                        <div>{row.variant_name}</div>
                        <span className="text-[10px] font-mono text-muted-foreground">{row.variant_sku}</span>
                      </td>
                      <td className="p-2.5 text-muted-foreground font-medium">
                        {row.tier_name}
                      </td>
                      <td className="p-2.5 text-center font-medium text-muted-foreground">
                        {row.quantity_ordered}
                        {row.quantity_already_received > 0 && (
                          <span className="block text-[10px] text-green-600">({row.quantity_already_received} recvd)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <Input
                          type="number"
                          min="0"
                          max={row.quantity_remaining}
                          value={row.quantity_to_receive.toString()}
                          onChange={(e) => onReceiveQtyChange(idx, e.target.value)}
                          className="h-8 w-20 mx-auto text-center font-semibold rounded-md border-border text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.cost_price_per_tier.toString()}
                          onChange={(e) => onReceiveCostChange(idx, e.target.value)}
                          className="h-8 w-24 ml-auto text-right font-medium rounded-md border-border text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-right font-semibold text-foreground">
                        <CurrencyDisplay amount={rowSubtotal} showStyling={false} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Footer Card */}
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground font-medium block">Total Units to Add</span>
              <span className="font-bold text-foreground text-sm">{totalUnitsReceiving} units</span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[11px] text-muted-foreground font-medium block">Receiving Value</span>
              <span className="font-bold text-foreground text-base lg:text-lg">
                <CurrencyDisplay amount={totalValueReceiving} showStyling={true} />
              </span>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 w-full pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isReceivingPO}
            className="text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirmReceive}
            disabled={isReceivingPO || totalUnitsReceiving === 0}
            className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 min-w-[160px] justify-center"
          >
            {isReceivingPO ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Receiving Stock...</span>
              </>
            ) : (
              <>
                <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                <span>Confirm & Update Stock</span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
