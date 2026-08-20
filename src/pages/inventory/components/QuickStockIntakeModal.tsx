import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, 
  Plus, 
  Minus, 
  ArrowUpDown, 
  Truck, 
  Coins 
} from "lucide-react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { 
  CustomInputTextField, 
  CustomSelectField, 
  CustomTextareaField 
} from "@/components/shared/text-field";
import apiClient from "@/api/client";
import toast from "react-hot-toast";

export interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit?: boolean;
  is_default_purchase_unit?: boolean;
}

export interface ProductStockItem {
  id: string;
  variantId: string;
  productId: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  base_unit_name: string;
  imageUrl?: string;
  packaging_tiers?: PackagingTier[];
  cost_price?: number;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface QuickStockIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductStockItem | null;
  onSuccess?: () => void;
}

export function QuickStockIntakeModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: QuickStockIntakeModalProps) {
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "reduce">("add");
  const [inputQuantity, setInputQuantity] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string>("base");
  const [reason, setReason] = useState("shipment");
  const [unitCost, setUnitCost] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Reset form when modal opens with a product
  useEffect(() => {
    if (isOpen && product) {
      setAdjustmentMode("add");
      setInputQuantity("");
      setSelectedTierId("base");
      setReason("shipment");
      setUnitCost(product.cost_price ? String(product.cost_price) : "");
      setSelectedSupplierId("");
      setNotes("");
    }
  }, [isOpen, product]);

  // Load suppliers
  useEffect(() => {
    if (isOpen) {
      apiClient
        .get("/tenant/suppliers?limit=100&status=active")
        .then((res) => {
          const list = res.data.success?.data?.suppliers || res.data.data?.suppliers || [];
          setSuppliers(list.filter((s: any) => (s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true))));
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Live Math Calculations for preview
  const previewMath = useMemo(() => {
    if (!product) return { delta: 0, newTotal: 0, unitsFactor: 1, tierName: "units" };

    const qtyNumber = parseFloat(inputQuantity) || 0;
    let unitsFactor = 1;
    let tierName = product.base_unit_name || "units";

    if (selectedTierId !== "base" && product.packaging_tiers) {
      const tier = product.packaging_tiers.find((t) => t.id === selectedTierId);
      if (tier && tier.units_per_tier > 0) {
        unitsFactor = tier.units_per_tier;
        tierName = tier.name;
      }
    }

    const calculatedBaseUnits = qtyNumber * unitsFactor;
    const signedDelta = adjustmentMode === "add" ? calculatedBaseUnits : -calculatedBaseUnits;
    const currentQty = product.quantity || 0;
    const newTotal = Math.max(0, currentQty + signedDelta);

    return {
      delta: signedDelta,
      calculatedBaseUnits,
      newTotal,
      unitsFactor,
      tierName,
      isNegativeExceeded: adjustmentMode === "reduce" && calculatedBaseUnits > currentQty,
    };
  }, [product, inputQuantity, selectedTierId, adjustmentMode]);

  // Submit Delta Stock Intake
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const qtyNum = parseFloat(inputQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    if (previewMath.isNegativeExceeded) {
      toast.error(
        `Cannot reduce stock by ${previewMath.calculatedBaseUnits} units. Current stock is ${product.quantity} units.`
      );
      return;
    }

    const signedInputDelta = adjustmentMode === "add" ? qtyNum : -qtyNum;

    setIsSubmitting(true);
    try {
      const payload: any = {
        variant_id: product.variantId,
        delta: signedInputDelta,
        packaging_tier_id: selectedTierId !== "base" ? selectedTierId : undefined,
        reason,
        notes: notes.trim() || undefined,
        supplier_id: selectedSupplierId || undefined,
      };

      if (unitCost && !isNaN(parseFloat(unitCost))) {
        payload.unit_cost = parseFloat(unitCost);
      }

      const response = await apiClient.post("/tenant/products/stock-intake", payload);
      const data = response.data.success?.data;

      const actionText = adjustmentMode === "add" ? "added to" : "removed from";
      toast.success(
        `✅ ${Math.abs(previewMath.calculatedBaseUnits)} units ${actionText} ${product.name} (New: ${
          data?.newQuantity ?? previewMath.newTotal
        })`
      );

      onClose();
      onSuccess?.();
      // Silently notify other POS/register components
      window.dispatchEvent(new CustomEvent("pos:transaction-completed"));
    } catch (err: any) {
      console.error("Stock intake failed:", err);
      toast.error(err.response?.data?.error?.message || "Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Packaging Tier Options
  const packagingTierOptions = useMemo(() => {
    if (!product) return [];
    const baseOpt = {
      label: `Base (${product.base_unit_name || "unit"}) - 1x`,
      value: "base",
    };
    const tierOpts = (product.packaging_tiers || []).map((t) => ({
      label: `${t.name} (${t.units_per_tier} ${product.base_unit_name || "units"})`,
      value: t.id,
    }));
    return [baseOpt, ...tierOpts];
  }, [product]);

  // Reason Options
  const reasonOptions = useMemo(() => {
    if (adjustmentMode === "add") {
      return [
        { label: "New Shipment / Supplier Delivery", value: "shipment" },
        { label: "Direct Store Purchase", value: "purchase" },
        { label: "Returned from Event / Warehouse", value: "returned" },
        { label: "Physical Count Correction (+)", value: "correction" },
        { label: "Initial Stock Balance", value: "initial_balance" },
        { label: "Other Reason", value: "other" },
      ];
    }
    return [
      { label: "Physical Count Correction (-)", value: "correction" },
      { label: "Damage / Spoilage Removal", value: "damage" },
      { label: "Internal Store Consumption", value: "internal_use" },
      { label: "Expired Goods Removal", value: "expired" },
      { label: "Loss / Shrinkage", value: "theft" },
      { label: "Other Reason", value: "other" },
    ];
  }, [adjustmentMode]);

  // Supplier Options
  const supplierOptions = useMemo(() => {
    return [
      { label: "None / Existing Supplier", value: "" },
      ...suppliers.map((s) => ({ label: s.name, value: s.id })),
    ];
  }, [suppliers]);

  if (!product) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      placement="right"
      classNames={{
        base: "sm:w-[460px]",
      }}
      header={
        <div className="pt-2 md:pt-3 md:px-2 border-b border-border/50 pb-2 ">
          <h2 className="text-xl font-bold flex items-center gap-2 !tracking-[-0.05rem]">
            {/* <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> */}
            Adjust Stock Level
          </h2>
          <p className="text-xs md:text-[13px] text-muted-foreground font-normal leading-[2] mt-1">
            Receive new shipments or record physical inventory changes.
          </p>
        </div>
      }
      body={
        <form onSubmit={handleSubmit} className="space-y-4 md:px-2 pb-6">
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
              <div className="flex items-center gap-1.5 mt-1 md:gap-2">
                <span className="text-xs text-muted-foreground">Current <span className="hidden sm:inline"> Stock</span>:</span>
                <span className="font-bold text-xs text-foreground bg-background px-1.5 py-0.5 rounded border">
                  {Number(product.quantity).toLocaleString()} {product.base_unit_name}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Toggle: Receive/Add (+) vs Reduce (-) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 p-1 border border-border/50 bg-muted/40 rounded-full">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentMode("add");
                  setReason("shipment");
                }}
                className={`py-2 sm:py-2.5 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                  adjustmentMode === "add"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground bg-transparent"
                }`}
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Receive / Add</span>
                <span className="hidden sm:inline"> Stock (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentMode("reduce");
                  setReason("correction");
                }}
                className={`py-2 sm:py-2.5 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                  adjustmentMode === "reduce"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground bg-transparent"
                }`}
              >
                <Minus className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Reduce / Remove</span>
                <span className="hidden sm:inline">(-)</span>
              </button>
            </div>
          </div>

          {/* Packaging Tier & Quantity Fields */}
          <div className="space-y-3">
            {product.packaging_tiers && product.packaging_tiers.length > 0 && (
              <CustomSelectField
                label="Packaging Unit"
                size="md"
                labelPlacement="inside"
                options={packagingTierOptions}
                value={selectedTierId}
                inputProps={{
                  onChange: (e) => setSelectedTierId(e.target.value),
                }}
              />
            )}

            <CustomInputTextField
              type="number"
              label={`Quantity ${
                selectedTierId !== "base"
                  ? `(${previewMath.tierName})`
                  : `(${product.base_unit_name || "units"})`
              }`}
              placeholder="e.g. 24"
              value={inputQuantity}
              onChange={(e) => setInputQuantity(e.target.value)}
              required={true}
              step="any"
            />
          </div>

          {/* LIVE CALCULATION PREVIEW BOX */}
          {parseFloat(inputQuantity) > 0 && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in duration-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-semibold text-foreground">
                  {Number(product.quantity).toLocaleString()} {product.base_unit_name}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Adjustment Delta:</span>
                <span
                  className={`font-bold ${
                    adjustmentMode === "add" ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {adjustmentMode === "add" ? "+" : "-"}
                  {Number(previewMath.calculatedBaseUnits).toLocaleString()}{" "}
                  {product.base_unit_name}
                  {previewMath.unitsFactor > 1 &&
                    ` (${inputQuantity} ${previewMath.tierName})`}
                </span>
              </div>
              <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                <span className="font-bold text-xs text-foreground">New Calculated Total:</span>
                <span
                  className={`font-extrabold text-sm ${
                    previewMath.isNegativeExceeded ? "text-destructive" : "dark:text-primary"
                  }`}
                >
                  {Number(previewMath.newTotal).toLocaleString()} {product.base_unit_name}
                </span>
              </div>
              {previewMath.isNegativeExceeded && (
                <p className="text-[11px] text-destructive font-semibold pt-1">
                  ⚠️ Reduction exceeds current available stock ({product.quantity} units).
                </p>
              )}
            </div>
          )}

          {/* Reason for Adjustment */}
          <CustomSelectField
            label="Reason for Adjustment *"
            size="md"
            labelPlacement="inside"
            options={reasonOptions}
            value={reason}
            inputProps={{
              onChange: (e) => setReason(e.target.value),
            }}
          />

          {/* Supplier & Unit Cost (Optional for additions) */}
          {adjustmentMode === "add" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomSelectField
                label="Supplier (Optional)"
                size="md"
                labelPlacement="inside"
                options={supplierOptions}
                value={selectedSupplierId}
                inputProps={{
                  onChange: (e) => setSelectedSupplierId(e.target.value),
                }}
              />
              <CustomInputTextField
                type="number"
                label="Unit Cost (GHS)"
                placeholder="e.g. 15.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                step="0.01"
              />
            </div>
          )}

          {/* Remarks / Notes */}
          <CustomTextareaField
            label="Remarks / Notes (Optional)"
            placeholder="Invoice number, batch code, or reason notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            height="min-h-[70px]"
          />

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !inputQuantity ||
                parseFloat(inputQuantity) <= 0 ||
                previewMath.isNegativeExceeded
              }
              className={`text-xs font-bold min-w-[140px]`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </div>
              ) : adjustmentMode === "add" ? (
                `+ Receive ${inputQuantity || 0} ${previewMath.tierName}`
              ) : (
                `- Reduce ${inputQuantity || 0} ${previewMath.tierName}`
              )}
            </Button>
          </div>
        </form>
      }
      footer={null}
    />
  );
}
