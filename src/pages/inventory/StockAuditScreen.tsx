import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import PageLayout from "@/components/layout/PageLayout";
import CustomModal from "@/components/modals/modal";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface MatchedRow {
  isNewProduct?: boolean;
  tempId?: string;
  variant_id: string;
  variant_name: string;
  sku: string;
  current_stock: number;
  quantity_to_add: number;
  cost_price: number;
  packaging_tier_id: string | null;
  packaging_tier_name: string;
  expiry_date?: string;
  batch_reference?: string;
  checked: boolean;
  track_expiry?: boolean;
}

interface UnmatchedRow {
  row_data: {
    product_name: string;
    sku?: string;
    quantity: number;
    cost_price?: number;
    packaging_tier_name?: string;
  };
  suggested_action: string;
}

interface AmbiguousRow {
  row_data: {
    product_name: string;
    sku?: string;
    quantity: number;
    cost_price?: number;
    packaging_tier_name?: string;
  };
  candidates: Array<{
    variant_id: string;
    name: string;
    sku: string;
  }>;
}

interface NewProductPayload {
  name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  retail_price: number;
  base_unit_name: string;
  category: string;
  track_expiry: boolean;
  expiry_date?: string;
  batch_reference?: string;
}

export default function StockAuditScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { parsedData, creditDetails } = state || {};

  // Form states for resolving items
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedRow[]>([]);
  const [ambiguousRows, setAmbiguousRows] = useState<AmbiguousRow[]>([]);
  const [newProducts, setNewProducts] = useState<NewProductPayload[]>([]);
  
  // Dialog/Modal states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [selectedUnmatchedRow, setSelectedUnmatchedRow] = useState<UnmatchedRow | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [trackExpiryEnabled, setTrackExpiryEnabled] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Lazy packaging tiers mapping from POS Products
  const [posProducts, setPosProducts] = useState<any[]>([]);
  const [loadingPOSProducts, setLoadingPOSProducts] = useState(true);

  // Load and initialize data
  useEffect(() => {
    if (parsedData) {
      const initialMatched = (parsedData.matched || []).map((row: any) => ({
        ...row,
        current_stock: Number(row.current_stock) || 0,
        quantity_to_add: Number(row.quantity_to_add) || 0,
        cost_price: Number(row.cost_price) || 0,
        checked: true,
        track_expiry: false
      }));
      setMatchedRows(initialMatched);
      setUnmatchedRows(parsedData.unmatched || []);
      setAmbiguousRows(parsedData.ambiguous || []);
    }

    // Fetch tenant categories
    apiClient.get("/tenant/products?limit=100")
      .then(res => {
        const prods = res.data.success?.data?.products || [];
        const cats = Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean))) as string[];
        setCategories(cats);
      })
      .catch(console.error);

    // Fetch tenant settings to see if track_expiry is globally active
    apiClient.get("/tenant/settings")
      .then(res => {
        const storeData = res.data.success?.data?.store || {};
        setTrackExpiryEnabled(storeData.track_expiry_enabled || false);
      })
      .catch(console.error);

    // Fetch full active products for offline hierarchy mappings (tiers, attributes, expiry config)
    apiClient.get("/pos/products")
      .then(res => {
        const productsList = res.data.success?.data?.products || [];
        setPosProducts(productsList);

        // Enhance matched list with track_expiry setting from variant details
        setMatchedRows(prev => prev.map(m => {
          let trackExpirySetting = false;
          for (const p of productsList) {
            const v = p.variants?.find((varObj: any) => varObj.variant_id === m.variant_id);
            if (v) {
              trackExpirySetting = !!v.expiry_warning;
              break;
            }
          }
          return { ...m, track_expiry: trackExpirySetting };
        }));
      })
      .catch(err => {
        console.error("Failed to load POS products:", err);
      })
      .finally(() => {
        setLoadingPOSProducts(false);
      });
  }, [parsedData]);

  // Dialog Form inputs
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdBaseUnit, setNewProdBaseUnit] = useState("unit");
  const [newProdRetailPrice, setNewProdRetailPrice] = useState("");
  const [newProdCostPrice, setNewProdCostPrice] = useState("");
  const [newProdQty, setNewProdQty] = useState("0");
  const [newProdTrackExpiry, setNewProdTrackExpiry] = useState(false);
  const [newProdExpiryDate, setNewProdExpiryDate] = useState("");
  const [newProdBatchRef, setNewProdBatchRef] = useState("");

  // Helper to retrieve packaging tiers of a variant
  const getPackagingTiersForVariant = (variantId: string) => {
    for (const p of posProducts) {
      const v = p.variants?.find((varObj: any) => varObj.variant_id === variantId);
      if (v) return v.packaging_tiers || [];
    }
    return [];
  };

  // Add unmatched row as a brand new product
  const handleOpenAddProduct = (row: UnmatchedRow) => {
    setSelectedUnmatchedRow(row);
    setNewProdName(row.row_data.product_name);
    setNewProdSku(row.row_data.sku || "");
    setNewProdQty(String(row.row_data.quantity || 0));
    setNewProdCostPrice(String(row.row_data.cost_price || 0));
    setNewProdRetailPrice("");
    setNewProdBaseUnit(row.row_data.packaging_tier_name || "unit");
    setNewProdCategory("General");
    setNewProdTrackExpiry(false);
    setNewProdExpiryDate("");
    setNewProdBatchRef("");
    setIsAddProductOpen(true);
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSku || !newProdRetailPrice) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const tempId = `temp-${newProdSku}`;
    
    // 1. Save new product payload
    const newProductPayload: NewProductPayload = {
      name: newProdName,
      sku: newProdSku,
      quantity: Number(newProdQty),
      cost_price: Number(newProdCostPrice),
      retail_price: Number(newProdRetailPrice),
      base_unit_name: newProdBaseUnit,
      category: newProdCategory,
      track_expiry: newProdTrackExpiry,
      expiry_date: newProdTrackExpiry && newProdExpiryDate ? newProdExpiryDate : undefined,
      batch_reference: newProdTrackExpiry && newProdBatchRef ? newProdBatchRef : undefined
    };
    
    setNewProducts(prev => [...prev, newProductPayload]);

    // 2. Put in matched rows list to represent visually
    const newMatchedRow: MatchedRow = {
      isNewProduct: true,
      tempId,
      variant_id: tempId,
      variant_name: newProdName,
      sku: newProdSku,
      current_stock: 0,
      quantity_to_add: Number(newProdQty),
      cost_price: Number(newProdCostPrice),
      packaging_tier_id: null,
      packaging_tier_name: newProdBaseUnit,
      expiry_date: newProdTrackExpiry && newProdExpiryDate ? newProdExpiryDate : undefined,
      batch_reference: newProdTrackExpiry && newProdBatchRef ? newProdBatchRef : undefined,
      checked: true,
      track_expiry: newProdTrackExpiry
    };

    setMatchedRows(prev => [...prev, newMatchedRow]);

    // 3. Remove from unmatched list
    if (selectedUnmatchedRow) {
      setUnmatchedRows(prev => prev.filter(r => r !== selectedUnmatchedRow));
    }
    
    setIsAddProductOpen(false);
    setSelectedUnmatchedRow(null);
    toast.success(`"${newProdName}" added locally. Ready to upload!`);
  };

  // Remove unmatched row entirely
  const handleRemoveUnmatched = (row: UnmatchedRow) => {
    setUnmatchedRows(prev => prev.filter(r => r !== row));
    toast.success("Removed row from list");
  };

  // Resolve ambiguous candidate selection
  const handleResolveAmbiguous = (row: AmbiguousRow, candidateId: string) => {
    const candidate = row.candidates.find(c => c.variant_id === candidateId);
    if (!candidate) return;

    // Search POS products details
    let currentStock = 0;
    let tiers: any[] = [];
    let trackExpiry = false;

    for (const p of posProducts) {
      const v = p.variants?.find((varObj: any) => varObj.variant_id === candidateId);
      if (v) {
        currentStock = v.stock_quantity || 0;
        tiers = v.packaging_tiers || [];
        trackExpiry = !!v.expiry_warning;
        break;
      }
    }

    const defaultTier = tiers.find(t => t.is_default_purchase_unit || t.is_base_unit) || tiers[0];

    const newMatched: MatchedRow = {
      variant_id: candidateId,
      variant_name: candidate.name,
      sku: candidate.sku,
      current_stock: currentStock,
      quantity_to_add: row.row_data.quantity || 0,
      cost_price: row.row_data.cost_price || (defaultTier ? defaultTier.prices?.retail : 0),
      packaging_tier_id: defaultTier ? defaultTier.id : null,
      packaging_tier_name: defaultTier ? defaultTier.name : (row.row_data.packaging_tier_name || "Unit"),
      expiry_date: undefined,
      batch_reference: undefined,
      checked: true,
      track_expiry: trackExpiry
    };

    setMatchedRows(prev => [...prev, newMatched]);
    setAmbiguousRows(prev => prev.filter(r => r !== row));
    toast.success(`Resolved to ${candidate.name}`);
  };

  // Row modifications in Matched Table
  const handleToggleChecked = (idx: number) => {
    setMatchedRows(prev => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r));
  };

  const handleToggleAllMatched = (checked: boolean) => {
    setMatchedRows(prev => prev.map(r => ({ ...r, checked })));
  };

  const handleCostChange = (idx: number, val: string) => {
    const num = Number(val);
    setMatchedRows(prev => prev.map((r, i) => i === idx ? { ...r, cost_price: isNaN(num) ? 0 : num } : r));
  };

  const handleQtyChange = (idx: number, val: string) => {
    const num = Number(val);
    setMatchedRows(prev => prev.map((r, i) => i === idx ? { ...r, quantity_to_add: isNaN(num) ? 0 : num } : r));
  };

  const handleTierChange = (idx: number, tierId: string) => {
    const row = matchedRows[idx];
    const tiers = getPackagingTiersForVariant(row.variant_id);
    const tier = tiers.find((t: any) => t.id === tierId);
    if (tier) {
      setMatchedRows(prev => prev.map((r, i) => i === idx ? {
        ...r,
        packaging_tier_id: tier.id,
        packaging_tier_name: tier.name
      } : r));
    }
  };

  const handleExpiryDateChange = (idx: number, val: string) => {
    setMatchedRows(prev => prev.map((r, i) => i === idx ? { ...r, expiry_date: val } : r));
  };

  const handleBatchRefChange = (idx: number, val: string) => {
    setMatchedRows(prev => prev.map((r, i) => i === idx ? { ...r, batch_reference: val } : r));
  };

  // Computations for Sticky Footer
  const summaryMetrics = useMemo(() => {
    const checkedRows = matchedRows.filter(r => r.checked);
    const count = checkedRows.length;
    const units = checkedRows.reduce((sum, r) => {
      const packagingTiers = getPackagingTiersForVariant(r.variant_id);
      const unitsMultiplier = r.packaging_tier_id 
        ? (packagingTiers.find(t => t.id === r.packaging_tier_id)?.units_per_tier || 1)
        : 1;
      return sum + (Number(r.quantity_to_add || 0) * unitsMultiplier);
    }, 0);
    const value = checkedRows.reduce((sum, r) => sum + (Number(r.quantity_to_add || 0) * Number(r.cost_price || 0)), 0);
    return { count, units, value };
  }, [matchedRows, posProducts]);

  const isAllMatchedChecked = matchedRows.length > 0 && matchedRows.every(r => r.checked);
  const isMatchedIndeterminate = matchedRows.some(r => r.checked) && !isAllMatchedChecked;

  // Final database submission
  const handleConfirmUpload = async () => {
    const checkedMatched = matchedRows.filter(r => r.checked);
    if (checkedMatched.length === 0) {
      toast.error("Please select at least one row to receive into stock.");
      return;
    }

    // Build payload items
    const matchedPayload = checkedMatched
      .filter(r => !r.isNewProduct)
      .map(r => ({
        variant_id: r.variant_id,
        quantity_to_add: r.quantity_to_add,
        cost_price: r.cost_price,
        packaging_tier_id: r.packaging_tier_id,
        expiry_date: r.expiry_date || undefined,
        batch_reference: r.batch_reference || undefined
      }));

    // Filter local new products to only verified checked SKUs
    const newProductsPayload = newProducts.filter(np => {
      const matchRow = matchedRows.find(r => r.isNewProduct && r.sku === np.sku);
      return matchRow && matchRow.checked;
    });

    const payload = {
      matched: matchedPayload,
      new_products: newProductsPayload,
      supplier_id: creditDetails?.isCreditPurchase ? creditDetails.supplierId : undefined,
      is_credit_purchase: !!creditDetails?.isCreditPurchase,
      credit_due_date: creditDetails?.creditDueDate || undefined
    };

    setIsConfirming(true);
    try {
      const res = await apiClient.post("/tenant/stock/confirm-upload", payload);
      const changes = res.data.success?.data || {};
      toast.success(
        `Received successfully! PO ref created. Updated ${changes.variants_updated || 0} variants.`
      );
      navigate("/inventory/products");
    } catch (err: any) {
      console.error("Confirm upload error:", err);
      const msg = err.response?.data?.error?.message || "Failed to confirm stock receive";
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!parsedData) {
    return (
      <PageLayout
        title="Audit Stock Shipment"
        subtitle="Review unmatched items, resolve duplicates, and update inventory changes."
        showBackButton={true}
        backUrl="/inventory/products"
      >
        <div className="flex flex-col items-center justify-center py-20 space-y-5 bg-card border border-border rounded-xl max-w-xl mx-auto mt-12 p-8 shadow-sm">
          <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
            <Icon icon="solar:danger-circle-linear" className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No Shipment Data Found</h2>
          <p className="text-xs text-muted-foreground text-center">
            You need to upload a shipment spreadsheet first before accessing the Stock Audit dashboard.
          </p>
          <Button onClick={() => navigate("/inventory/products")} className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
            Back to Products
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Audit Stock Shipment"
      subtitle="Review unmatched items, resolve duplicates, and update inventory changes."
      showBackButton={true}
      backUrl="/inventory/products"
      actions={
        creditDetails?.isCreditPurchase ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 border border-border rounded-lg bg-muted/40 text-xs">
            <Icon icon="solar:card-linear" className="h-4 w-4 text-foreground/70" />
            <div className="text-left leading-tight">
              <span className="font-semibold text-foreground">Credit Purchase: </span>
              <span className="text-muted-foreground">{creditDetails.supplierName}</span>
              {creditDetails.creditDueDate && <span className="text-muted-foreground"> · Due: {creditDetails.creditDueDate}</span>}
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 pb-32 w-full min-w-0">
        {/* SECTION 1: Ambiguous items (Needs Resolving) */}
        {ambiguousRows.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="bg-muted/40 border-b border-border/70 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:question-circle-linear" className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-xs text-foreground">
                  Ambiguous Rows ({ambiguousRows.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Multiple potential matches found in system. Please resolve.
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                    <th className="px-4 py-2.5">Product Name in Sheet</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Suggest Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {ambiguousRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-foreground capitalize">
                        {row.row_data.product_name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {row.row_data.sku || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        {row.row_data.quantity}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          onChange={(e) => handleResolveAmbiguous(row, e.target.value)}
                          defaultValue=""
                          className="w-full max-w-xs h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/20"
                        >
                          <option value="" disabled>Select match candidate...</option>
                          {row.candidates.map((c) => (
                            <option key={c.variant_id} value={c.variant_id}>
                              {c.name} [SKU: {c.sku}]
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: Unmatched items (Create New / Skip) */}
        {unmatchedRows.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="bg-muted/40 border-b border-border/70 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:danger-triangle-linear" className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-xs text-foreground">
                  Unmatched Rows ({unmatchedRows.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Not found in your system. Create new product drafts or exclude.
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                    <th className="px-4 py-2.5">Product Name in Sheet</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Cost Price</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {unmatchedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-foreground capitalize">
                        {row.row_data.product_name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {row.row_data.sku || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        {row.row_data.quantity}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        GHS {(row.row_data.cost_price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAddProduct(row)}
                            className="h-7 rounded-md border text-xs font-medium flex items-center gap-1 text-foreground hover:bg-muted"
                          >
                            <Icon icon="solar:add-circle-linear" className="h-3.5 w-3.5" />
                            Add as New Product
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUnmatched(row)}
                            className="h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs flex items-center gap-1"
                          >
                            <Icon icon="solar:trash-bin-trash-linear" className="h-3.5 w-3.5" />
                            Skip
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: Matched items (Ready to Receive) */}
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="bg-muted/40 border-b border-border/70 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-foreground/80" />
              <h3 className="font-bold text-xs text-foreground">
                Matched Rows ({matchedRows.length})
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Mapped successfully. Ready to import.
            </span>
          </div>

          {matchedRows.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No matched products in shipment. Resolve ambiguous or unmatched items to populate this list.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                    <th className="px-4 py-2.5 w-10 text-center">
                      <Checkbox
                        checked={isAllMatchedChecked ? true : isMatchedIndeterminate ? "indeterminate" : false}
                        onCheckedChange={(val) => handleToggleAllMatched(!!val)}
                        aria-label="Select all rows"
                      />
                    </th>
                    <th className="px-4 py-2.5">Product Variant</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Current Stock</th>
                    <th className="px-4 py-2.5 w-32">Quantity to Add</th>
                    <th className="px-4 py-2.5 w-36">Packaging Tier</th>
                    <th className="px-4 py-2.5 w-32 text-right">Cost Price</th>
                    <th className="px-4 py-2.5 text-right">New Total</th>
                    {trackExpiryEnabled && (
                      <>
                        <th className="px-4 py-2.5 w-32">Expiry Date</th>
                        <th className="px-4 py-2.5 w-28">Batch Ref</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {matchedRows.map((row, idx) => {
                    const packagingTiers = getPackagingTiersForVariant(row.variant_id);
                    const unitsMultiplier = row.packaging_tier_id 
                      ? (packagingTiers.find(t => t.id === row.packaging_tier_id)?.units_per_tier || 1)
                      : 1;
                    const qtyToAdd = Number(row.quantity_to_add || 0);
                    const baseUnitsAdded = qtyToAdd * unitsMultiplier;
                    const currentStockNum = Number(row.current_stock || 0);
                    const newTotal = currentStockNum + baseUnitsAdded;

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-muted/10 transition-colors ${
                          !row.checked ? "opacity-50 bg-muted/30" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-center">
                          <Checkbox
                            checked={row.checked}
                            onCheckedChange={() => handleToggleChecked(idx)}
                            aria-label={`Select ${row.variant_name}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="capitalize">{row.variant_name}</span>
                            {row.isNewProduct && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-foreground border border-border">
                                New Product
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {row.sku}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {currentStockNum}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            value={row.quantity_to_add}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            disabled={!row.checked}
                            className="w-full h-8 px-2 text-center border border-input rounded-md bg-background text-xs text-foreground font-semibold focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {row.isNewProduct ? (
                            <span className="capitalize text-muted-foreground px-2">
                              {row.packaging_tier_name} (Base)
                            </span>
                          ) : (
                            <select
                              value={row.packaging_tier_id || ""}
                              onChange={(e) => handleTierChange(idx, e.target.value)}
                              disabled={!row.checked || loadingPOSProducts}
                              className="w-full h-8 px-2 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                            >
                              {packagingTiers.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.units_per_tier}x)
                                </option>
                              ))}
                              {packagingTiers.length === 0 && (
                                <option value="">{row.packaging_tier_name || "Unit"}</option>
                              )}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.cost_price}
                            onChange={(e) => handleCostChange(idx, e.target.value)}
                            disabled={!row.checked}
                            className="w-full h-8 px-2 text-right border border-input rounded-md bg-background text-xs text-foreground font-semibold focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-foreground text-right">
                          {newTotal}
                        </td>
                        
                        {trackExpiryEnabled && (
                          <>
                            <td className="px-2 py-1.5">
                              {row.track_expiry ? (
                                <input
                                  type="date"
                                  value={row.expiry_date || ""}
                                  onChange={(e) => handleExpiryDateChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  className="w-full h-8 px-2 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic px-2">
                                  Not Tracked
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {row.track_expiry ? (
                                <input
                                  type="text"
                                  placeholder="Batch #"
                                  value={row.batch_reference || ""}
                                  onChange={(e) => handleBatchRefChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  className="w-full h-8 px-2 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic px-2">
                                  —
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md px-6 md:px-10 py-3.5 flex items-center justify-between z-30 shadow-lg">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-left">
              <span className="text-[11px] text-muted-foreground font-medium block">Checked Rows</span>
              <span className="text-base font-bold text-foreground">{summaryMetrics.count} Products</span>
            </div>
            <div className="h-6 w-[1px] bg-border hidden sm:block" />
            <div className="text-left">
              <span className="text-[11px] text-muted-foreground font-medium block">Total Shipment Qty</span>
              <span className="text-base font-bold text-foreground">{summaryMetrics.units} Units</span>
            </div>
            <div className="h-6 w-[1px] bg-border hidden sm:block" />
            <div className="text-left">
              <span className="text-[11px] text-muted-foreground font-medium block">Total Value</span>
              <span className="text-base font-bold text-foreground">GHS {summaryMetrics.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/inventory/products")}
              disabled={isConfirming}
              className="border-border h-9 px-5 text-xs md:text-[13px] font-medium"
            >
              Cancel Audit
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUpload}
              disabled={isConfirming || summaryMetrics.count === 0}
              className="bg-primary text-primary-foreground min-w-[180px] h-9 px-6 text-xs md:text-[13px] font-semibold flex items-center justify-center gap-1.5"
            >
              {isConfirming ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Saving Stock...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                  <span>Confirm & Update Stock</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL: Add as new Product */}
      <CustomModal
        isOpen={isAddProductOpen}
        onOpenChange={() => {
          setIsAddProductOpen(false);
          setSelectedUnmatchedRow(null);
        }}
        size="xl"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5 text-foreground/80" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Add Unmatched Product</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Register this product inside your system. Values will be received locally.
            </p>
          </div>
        }
        body={
          <form onSubmit={handleAddProductSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Product Name *
                </label>
                <input
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  SKU (Unique) *
                </label>
                <input
                  required
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  className="w-full h-8 px-2.5 font-mono border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Category
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                >
                  <option value="General">General</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Base Unit Label
                </label>
                <input
                  value={newProdBaseUnit}
                  onChange={(e) => setNewProdBaseUnit(e.target.value)}
                  placeholder="e.g. piece, bottle"
                  className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Retail Price (Base Unit) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newProdRetailPrice}
                  onChange={(e) => setNewProdRetailPrice(e.target.value)}
                  placeholder="0.00"
                  className={`w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15 ${
                    newProdRetailPrice && newProdCostPrice && Number(newProdRetailPrice) < Number(newProdCostPrice)
                      ? "border-amber-500 bg-amber-500/5"
                      : ""
                  }`}
                />
                {newProdRetailPrice && newProdCostPrice && Number(newProdRetailPrice) < Number(newProdCostPrice) && (
                  <span className="text-[10px] text-amber-500 font-medium block">
                    ⚠️ Retail price is less than cost price (negative margin)
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Cost Price (Base Unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProdCostPrice}
                  onChange={(e) => setNewProdCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  value={newProdQty}
                  onChange={(e) => setNewProdQty(e.target.value)}
                  className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                />
              </div>
            </div>

            {/* Expiry inputs inside product creation (conditional on settings) */}
            {trackExpiryEnabled && (
              <div className="bg-muted/30 rounded-md p-3.5 space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="new-expiry-toggle">
                      Track Expiry for Variant
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable batch expiry date warning for this specific item.
                    </p>
                  </div>
                  <Switch
                    id="new-expiry-toggle"
                    checked={newProdTrackExpiry}
                    onCheckedChange={setNewProdTrackExpiry}
                  />
                </div>

                {newProdTrackExpiry && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={newProdExpiryDate}
                        onChange={(e) => setNewProdExpiryDate(e.target.value)}
                        className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Batch Reference
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LOT-A"
                        value={newProdBatchRef}
                        onChange={(e) => setNewProdBatchRef(e.target.value)}
                        className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50 w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddProductOpen(false);
                  setSelectedUnmatchedRow(null);
                }}
                className="rounded-lg text-xs font-medium"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                Add Product
              </Button>
            </div>
          </form>
        }
        footer={null}
      />
    </PageLayout>
  );
}
