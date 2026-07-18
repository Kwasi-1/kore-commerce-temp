import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Sparkles,
  Layers,
  Calendar,
  Lock,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import PageLayout from "@/components/layout/PageLayout";
import CustomModal from "@/components/modals/modal";
import { Switch } from "@/components/ui/switch";

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
        checked: true,
        // Match base variant tracking
        track_expiry: false // will be overwritten when POS products load
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
              trackExpirySetting = !!v.expiry_warning; // If expiry warning config is returned, it has tracking
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
    const units = checkedRows.reduce((sum, r) => sum + r.quantity_to_add, 0);
    const value = checkedRows.reduce((sum, r) => sum + (r.quantity_to_add * r.cost_price), 0);
    return { count, units, value };
  }, [matchedRows]);

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
      <PageLayout title="Shipment Stock Audit">
        <div className="flex flex-col items-center justify-center py-20 space-y-5 bg-card border rounded-[24px] max-w-xl mx-auto mt-12 p-8 shadow-md">
          <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Shipment Data Found</h2>
          <p className="text-sm text-muted-foreground text-center">
            You need to upload a shipment spreadsheet first before accessing the Stock Audit dashboard.
          </p>
          <Button onClick={() => navigate("/inventory/products")} className="rounded-xl bg-primary">
            Back to Products
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Shipment Stock Audit">
      {/* Page Header Metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/inventory/products")}
            className="h-9 w-9 rounded-xl border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Audit Stock Shipment</h1>
            <p className="text-xs text-muted-foreground">
              Review unmatched items, resolve duplicates, and update inventory changes.
            </p>
          </div>
        </div>

        {/* Credit Purchase indicator badge */}
        {creditDetails?.isCreditPurchase && (
          <div className="flex items-center gap-3 px-4 py-2 border rounded-xl bg-primary/5 border-primary/20 animate-pulse">
            <Lock className="h-4 w-4 text-primary" />
            <div className="text-xs text-left leading-tight">
              <p className="font-bold text-primary">Supplier Credit Purchase</p>
              <p className="text-muted-foreground font-normal">
                Supplier: <span className="font-semibold text-foreground">{creditDetails.supplierName}</span>
                {creditDetails.creditDueDate && ` · Due: ${creditDetails.creditDueDate}`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8 pb-32 w-full min-w-0">
        {/* SECTION 1: Ambiguous items (Needs Resolving) */}
        {ambiguousRows.length > 0 && (
          <div className="border border-orange-500/30 rounded-xl overflow-hidden bg-orange-500/5 shadow-sm">
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-orange-700 dark:text-orange-400">
                  Ambiguous Rows ({ambiguousRows.length})
                </h3>
              </div>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Multiple potential matches found in system. Please resolve.
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-orange-500/10 text-xs text-muted-foreground font-bold uppercase tracking-wider bg-orange-500/5">
                    <th className="px-5 py-3">Product Name in Sheet</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Suggest Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-500/10 text-xs">
                  {ambiguousRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-orange-500/10 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-foreground capitalize">
                        {row.row_data.product_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {row.row_data.sku || "—"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {row.row_data.quantity}
                      </td>
                      <td className="px-5 py-2.5">
                        <select
                          onChange={(e) => handleResolveAmbiguous(row, e.target.value)}
                          defaultValue=""
                          className="px-3 py-1.5 border rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
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
          <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-yellow-500/5 shadow-sm animate-in fade-in duration-300">
            <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <h3 className="font-bold text-yellow-700 dark:text-yellow-400">
                  Unmatched Rows ({unmatchedRows.length})
                </h3>
              </div>
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                Not found in your system. Create new product drafts or exclude.
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-yellow-500/10 text-xs text-muted-foreground font-bold uppercase tracking-wider bg-yellow-500/5">
                    <th className="px-5 py-3">Product Name in Sheet</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Cost Price</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10 text-xs">
                  {unmatchedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-yellow-500/10 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-foreground capitalize">
                        {row.row_data.product_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {row.row_data.sku || "—"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {row.row_data.quantity}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        GHS {(row.row_data.cost_price || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddProduct(row)}
                            className="h-8 rounded-lg border hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-xs flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add as New Product
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUnmatched(row)}
                            className="h-8 rounded-lg hover:bg-destructive/10 text-destructive text-xs flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        <div className="border border-green-500/30 rounded-xl overflow-hidden bg-background shadow-md">
          <div className="bg-green-500/15 border-b border-green-500/20 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-bold text-green-700 dark:text-green-400">
                Matched Rows ({matchedRows.length})
              </h3>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Mapped successfully. Ready to import.
            </span>
          </div>

          {matchedRows.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No matched products in shipment. Resolve ambiguous or unmatched items to populate this list.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                    <th className="px-4 py-3 w-10 text-center">
                      {/* Checkbox select all/none logic is handled by individual toggles */}
                    </th>
                    <th className="px-4 py-3">Product Variant</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3 w-36">Quantity to Add</th>
                    <th className="px-4 py-3 w-32">Packaging Tier</th>
                    <th className="px-4 py-3 w-36">Cost Price</th>
                    <th className="px-4 py-3">New Total</th>
                    {trackExpiryEnabled && (
                      <>
                        <th className="px-4 py-3 w-36">Expiry Date</th>
                        <th className="px-4 py-3 w-28">Batch Ref</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {matchedRows.map((row, idx) => {
                    const packagingTiers = getPackagingTiersForVariant(row.variant_id);
                    const unitsMultiplier = row.packaging_tier_id 
                      ? (packagingTiers.find(t => t.id === row.packaging_tier_id)?.units_per_tier || 1)
                      : 1;
                    const baseUnitsAdded = row.quantity_to_add * unitsMultiplier;
                    const newTotal = row.current_stock + baseUnitsAdded;

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-muted/10 transition-colors ${
                          !row.checked ? "opacity-50 bg-muted/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={() => handleToggleChecked(idx)}
                            className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="capitalize">{row.variant_name}</span>
                            {row.isNewProduct && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                New Product
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {row.sku}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.current_stock}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={row.quantity_to_add}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            disabled={!row.checked}
                            className="h-8 rounded-lg text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          {row.isNewProduct ? (
                            <span className="capitalize text-muted-foreground px-2">
                              {row.packaging_tier_name} (Base)
                            </span>
                          ) : (
                            <select
                              value={row.packaging_tier_id || ""}
                              onChange={(e) => handleTierChange(idx, e.target.value)}
                              disabled={!row.checked || loadingPOSProducts}
                              className="w-full h-8 px-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
                        <td className="px-2 py-2">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-muted-foreground text-[10px]">GHS</span>
                            <Input
                              type="number"
                              value={row.cost_price}
                              onChange={(e) => handleCostChange(idx, e.target.value)}
                              disabled={!row.checked}
                              className="h-8 pl-9 rounded-lg text-xs"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {newTotal}
                        </td>
                        
                        {trackExpiryEnabled && (
                          <>
                            <td className="px-2 py-2">
                              {row.track_expiry ? (
                                <Input
                                  type="date"
                                  value={row.expiry_date || ""}
                                  onChange={(e) => handleExpiryDateChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  className="h-8 text-xs p-1 rounded-lg"
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic px-2">
                                  Not Tracked
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {row.track_expiry ? (
                                <Input
                                  type="text"
                                  placeholder="Batch #"
                                  value={row.batch_reference || ""}
                                  onChange={(e) => handleBatchRefChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  className="h-8 text-xs rounded-lg"
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
      <div className="absolute bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-30 shadow-xl">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-left">
              <span className="text-xs text-muted-foreground font-medium block">Checked Rows</span>
              <span className="text-lg font-bold text-foreground">{summaryMetrics.count} Products</span>
            </div>
            <div className="h-8 w-[1px] bg-border hidden sm:block" />
            <div className="text-left">
              <span className="text-xs text-muted-foreground font-medium block">Total Shipment Qty</span>
              <span className="text-lg font-bold text-foreground">{summaryMetrics.units} Units</span>
            </div>
            <div className="h-8 w-[1px] bg-border hidden sm:block" />
            <div className="text-left">
              <span className="text-xs text-muted-foreground font-medium block">Total Value</span>
              <span className="text-lg font-bold text-primary">GHS {summaryMetrics.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/inventory/products")}
              disabled={isConfirming}
              className="rounded-xl border h-11 px-6 text-sm"
            >
              Cancel Audit
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isConfirming || summaryMetrics.count === 0}
              className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground min-w-[200px] h-11 px-8 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {isConfirming ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving Stock...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
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
        size="2xl"
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              Add Unmatched Product
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              Register this product inside your system. Values will be received locally.
            </p>
          </div>
        }
        body={
          <form onSubmit={handleAddProductSubmit} className="space-y-5 p-2 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Product Name *
                </label>
                <Input
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  SKU (Unique) *
                </label>
                <Input
                  required
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  className="rounded-xl h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Category
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full h-10 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="General">General</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Base Unit Label
                </label>
                <Input
                  value={newProdBaseUnit}
                  onChange={(e) => setNewProdBaseUnit(e.target.value)}
                  placeholder="e.g. piece, bottle"
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Retail Price (Base Unit) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={newProdRetailPrice}
                  onChange={(e) => setNewProdRetailPrice(e.target.value)}
                  placeholder="0.00"
                  className={`rounded-xl h-10 text-sm ${
                    newProdRetailPrice && newProdCostPrice && Number(newProdRetailPrice) < Number(newProdCostPrice)
                      ? "border-amber-500 bg-amber-500/5 focus-visible:ring-amber-500"
                      : ""
                  }`}
                />
                {newProdRetailPrice && newProdCostPrice && Number(newProdRetailPrice) < Number(newProdCostPrice) && (
                  <span className="text-[10px] text-amber-500 font-medium block mt-1">
                    ⚠️ Retail price is less than cost price (negative margin)
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Cost Price (Base Unit)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProdCostPrice}
                  onChange={(e) => setNewProdCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Quantity to Add
                </label>
                <Input
                  type="number"
                  value={newProdQty}
                  onChange={(e) => setNewProdQty(e.target.value)}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
            </div>

            {/* Expiry inputs inside product creation (conditional on settings) */}
            {trackExpiryEnabled && (
              <div className="border rounded-2xl p-4 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-foreground cursor-pointer" htmlFor="new-expiry-toggle">
                      Track Expiry for Variant
                    </label>
                    <p className="text-xs text-muted-foreground">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dashed animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Expiry Date
                      </label>
                      <Input
                        type="date"
                        value={newProdExpiryDate}
                        onChange={(e) => setNewProdExpiryDate(e.target.value)}
                        className="rounded-xl h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Batch Reference
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. LOT-A"
                        value={newProdBatchRef}
                        onChange={(e) => setNewProdBatchRef(e.target.value)}
                        className="rounded-xl h-10 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddProductOpen(false);
                  setSelectedUnmatchedRow(null);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-primary text-primary-foreground">
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
