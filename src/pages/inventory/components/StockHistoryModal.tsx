import React, { useState, useEffect } from "react";
import { 
  History, 
  Package, 
  PlusCircle, 
  MinusCircle, 
  Truck, 
  AlertTriangle, 
  User, 
  Calendar,
  Layers,
  Clock
} from "lucide-react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import { format } from "date-fns";
import { ProductStockItem } from "./QuickStockIntakeModal";

interface HistoryItem {
  id: string;
  type: "shipment" | "adjustment";
  isAddition: boolean;
  quantity: number;
  packagingTierName?: string | null;
  unitsPerTier?: number | null;
  packageQuantity?: number | null;
  baseUnitName?: string | null;
  previousQuantity?: number;
  newQuantity?: number;
  reason: string;
  notes?: string;
  staffName: string;
  status: string;
  date: string;
}

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductStockItem | null;
  onAdjustClick?: (product: ProductStockItem) => void;
}

export function StockHistoryModal({
  isOpen,
  onClose,
  product,
  onAdjustClick,
}: StockHistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && product) {
      setIsLoading(true);
      apiClient
        .get(`/tenant/products/variants/${product.variantId}/stock-history`)
        .then((res) => {
          setHistory(res.data.success?.data?.history || []);
        })
        .catch((err) => {
          console.error("Failed to load variant stock history:", err);
          setHistory([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      placement="right"
      classNames={{
        base: "sm:w-[480px]",
      }}
      header={
        <div className="pt-3 md:px-2 border-b border-border/50 pb-3">
          <h2 className="text-xl font-bold flex items-center gap-2 !tracking-[-0.05rem]">
            Stock Audit Trail
          </h2>
          <p className="text-xs md:text-[13px] text-muted-foreground font-normal leading-relaxed mt-1">
            Historical log of shipments, intakes, and write-off adjustments.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 md:px-2 pb-6">
          {/* Product Header Summary Card */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-md bg-muted/30">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-12 w-12 rounded-lg object-cover border bg-background flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted border flex items-center justify-center text-muted-foreground flex-shrink-0">
                <Package className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate capitalize">
                {product.name}
              </h4>
              <p className="text-xs font-mono text-muted-foreground truncate">{product.sku}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">Current Stock:</span>
                <span className="font-bold text-xs text-foreground bg-background px-2 py-0.5 rounded border">
                  {Number(product.quantity).toLocaleString()} {product.base_unit_name}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Adjustment Timeline
            </h5>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs">Loading audit history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center border border-dashed rounded-xl p-6 bg-muted/10 space-y-2">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No adjustments logged yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  New shipment deliveries or stock count adjustments for this item will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {history.map((item) => {
                  const isAdd = item.isAddition;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-md ${
                              isAdd
                                ? "bg-green-500/5 text-green-600"
                                : "bg-destructive/5 text-destructive"
                            }`}
                          >
                            {isAdd ? (
                              <PlusCircle className="h-4 w-4" />
                            ) : (
                              <MinusCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-foreground capitalize">
                              {item.reason}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {item.type === "shipment" ? "Intake / Shipment" : "Write-Off / Adjustment"}
                            </span>
                          </div>
                        </div>

                        {/* Delta Badge */}
                        <div className="text-right flex flex-col items-end">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isAdd
                                ? "bg-green-400/5 border-green-500/20 text-green-600"
                                : "bg-destructive/5 border-destructive/20 text-destructive"
                            }`}
                          >
                            {isAdd ? "+" : "-"}
                            {item.packageQuantity && item.packagingTierName
                              ? `${item.packageQuantity} ${item.packagingTierName}`
                              : `${Number(typeof item.quantity === 'object' && item.quantity !== null ? ((item.quantity as any)?.parsedValue ?? (item.quantity as any)?.source ?? 0) : item.quantity).toLocaleString()} ${item.baseUnitName || product.base_unit_name}`}
                          </span>
                          {/* {item.packageQuantity && item.packagingTierName && (
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                              ({isAdd ? "+" : "-"}{Number(typeof item.quantity === 'object' && item.quantity !== null ? ((item.quantity as any)?.parsedValue ?? (item.quantity as any)?.source ?? 0) : item.quantity).toLocaleString()} {item.baseUnitName || product.base_unit_name})
                            </span>
                          )} */}
                        </div>
                      </div>

                      {/* Notes if present */}
                      {item.notes && item.notes.trim() && (
                        <div className="p-2 rounded bg-muted/20 text-[11px] text-muted-foreground italic">
                          "{item.notes}"
                        </div>
                      )}

                      {/* Meta footer: Staff & Date */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.staffName || "Staff User"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.date ? format(new Date(item.date), "MMM d, yyyy h:mm a") : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>          
        </div>
      }
      footer={
        <div className="flex gap-3 justify-end pt-4 border-t w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
          {onAdjustClick && (
            <Button
              type="button"
              onClick={() => {
                onClose();
                onAdjustClick(product);
              }}
              className="text-xs font-bold"
            >
              Adjust Stock
            </Button>
          )}
        </div>
      }
/>
  );
}
