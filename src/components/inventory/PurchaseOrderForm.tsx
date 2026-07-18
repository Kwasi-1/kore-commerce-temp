import React, { useState, useEffect } from 'react';
import { CustomInputTextField, CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import { Button, Switch } from '@nextui-org/react';
import { Plus, Trash2, CreditCard, Calendar } from 'lucide-react';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface POFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit: boolean;
  is_default_purchase_unit: boolean;
}

interface ProductVariant {
  id: string;
  sku: string;
  variant_attributes: Record<string, string>;
  base_unit_name: string;
  cost_price_per_base_unit: number | null;
  packaging_tiers: PackagingTier[];
}

interface ProductOption {
  id: string;
  name: string;
  has_variants: boolean;
  variants: ProductVariant[];
}

interface POItem {
  variant_id: string;
  packaging_tier_id: string;
  // display helpers
  product_name: string;
  variant_label: string;
  tier_name: string;
  tier_units_per_tier: number;
  quantity: number;
  cost_price: number;
}

/** Builds a human-readable variant label from attributes, falling back to SKU */
function buildVariantLabel(variant: ProductVariant): string {
  const attrs = variant.variant_attributes;
  if (attrs && Object.keys(attrs).length > 0) {
    return Object.values(attrs).join(' / ');
  }
  return variant.sku;
}

export default function PurchaseOrderForm({ onSuccess, onCancel }: POFormProps) {
  const { formatAmount } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVariants, setIsFetchingVariants] = useState(false);

  const [suppliers, setSuppliers] = useState<{ label: string; value: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; has_variants: boolean }[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    reference_number: '',
    notes: '',
    is_credit_purchase: false,
    credit_due_date: '',
  });

  // ── Line-item builder state ─────────────────────────────────────────────────
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadedProductDetail, setLoadedProductDetail] = useState<ProductOption | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [lineQty, setLineQty] = useState('');
  const [lineCostPrice, setLineCostPrice] = useState('');

  // ── Confirmed line items ────────────────────────────────────────────────────
  const [items, setItems] = useState<POItem[]>([]);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    apiClient
      .get('/tenant/suppliers?limit=100')
      .then((res) => {
        const active = res.data.success?.data?.suppliers || [];
        setSuppliers(active.map((s: any) => ({ label: s.name, value: s.id })));
      })
      .catch(console.error);

    apiClient
      .get('/tenant/products?limit=200')
      .then((res) => {
        setProducts(res.data.success?.data?.products || []);
      })
      .catch(console.error);
  }, []);

  // ── When product changes, fetch its full detail (variants + tiers) ──────────
  const handleProductSelect = async (keys: any) => {
    const pId = Array.from(keys)[0] as string;
    setSelectedProductId(pId);
    setSelectedVariantId('');
    setSelectedTierId('');
    setLineCostPrice('');
    setLoadedProductDetail(null);

    if (!pId) return;

    setIsFetchingVariants(true);
    try {
      const res = await apiClient.get(`/tenant/products/${pId}`);
      const prod = res.data.success?.data?.product as ProductOption;
      setLoadedProductDetail(prod);

      // If simple product (single variant), auto-select it
      const activeVariants = prod.variants?.filter((v: any) => v.is_active !== false) || [];
      if (activeVariants.length === 1) {
        const solo = activeVariants[0];
        setSelectedVariantId(solo.id);
        autofillTierAndCost(solo);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load product details');
    } finally {
      setIsFetchingVariants(false);
    }
  };

  const autofillTierAndCost = (variant: ProductVariant) => {
    // Auto-select default purchase tier (or base unit)
    const defaultTier =
      variant.packaging_tiers.find((t) => t.is_default_purchase_unit) ||
      variant.packaging_tiers.find((t) => t.is_base_unit) ||
      variant.packaging_tiers[0];

    if (defaultTier) {
      setSelectedTierId(defaultTier.id);
    }

    if (variant.cost_price_per_base_unit != null) {
      setLineCostPrice(variant.cost_price_per_base_unit.toString());
    } else {
      setLineCostPrice('');
    }
  };

  const handleVariantSelect = (keys: any) => {
    const vId = Array.from(keys)[0] as string;
    setSelectedVariantId(vId);
    setSelectedTierId('');
    setLineCostPrice('');

    const variant = loadedProductDetail?.variants.find((v) => v.id === vId);
    if (variant) autofillTierAndCost(variant);
  };

  const handleTierSelect = (keys: any) => {
    const tId = Array.from(keys)[0] as string;
    setSelectedTierId(tId);
  };

  // ── Derived options ─────────────────────────────────────────────────────────
  const activeVariants = loadedProductDetail?.variants.filter((v: any) => v.is_active !== false) || [];

  const variantOptions = activeVariants.map((v) => ({
    label: `${buildVariantLabel(v)} (SKU: ${v.sku})`,
    value: v.id,
  }));

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);
  const tierOptions = (selectedVariant?.packaging_tiers || []).map((t) => ({
    label: `${t.name} (×${t.units_per_tier}${t.is_base_unit ? ' — base unit' : ''})`,
    value: t.id,
  }));

  const selectedTier = selectedVariant?.packaging_tiers.find((t) => t.id === selectedTierId);

  // ── Add line item ───────────────────────────────────────────────────────────
  const addLineItem = () => {
    if (!selectedProductId || !selectedVariantId || !selectedTierId || !lineQty || !lineCostPrice) {
      toast.error('Please select a product, variant, packaging tier, quantity, and cost price.');
      return;
    }

    const qty = parseInt(lineQty, 10);
    const cost = parseFloat(lineCostPrice);

    if (isNaN(qty) || qty < 1) {
      toast.error('Quantity must be a positive number.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error('Cost price must be a valid number.');
      return;
    }

    const productName = loadedProductDetail?.name || '';
    const variantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : '';
    const tierName = selectedTier?.name || '';
    const tierUnits = selectedTier?.units_per_tier ?? 1;

    // Unique key: variant + tier combo
    const existsIdx = items.findIndex(
      (i) => i.variant_id === selectedVariantId && i.packaging_tier_id === selectedTierId
    );

    if (existsIdx >= 0) {
      const newItems = [...items];
      newItems[existsIdx].quantity += qty;
      newItems[existsIdx].cost_price = cost;
      setItems(newItems);
    } else {
      setItems((prev) => [
        ...prev,
        {
          variant_id: selectedVariantId,
          packaging_tier_id: selectedTierId,
          product_name: productName,
          variant_label: variantLabel,
          tier_name: tierName,
          tier_units_per_tier: tierUnits,
          quantity: qty,
          cost_price: cost,
        },
      ]);
    }

    // Reset line-item builder
    setSelectedProductId('');
    setLoadedProductDetail(null);
    setSelectedVariantId('');
    setSelectedTierId('');
    setLineQty('');
    setLineCostPrice('');
  };

  const removeLineItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Form handlers ───────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData((prev) => ({ ...prev, supplier_id: val }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    if (!formData.reference_number.trim()) {
      toast.error('Reference number is required');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (formData.is_credit_purchase && !formData.credit_due_date) {
      toast.error('Credit due date is required for credit purchases');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        supplier_id: formData.supplier_id,
        reference_number: formData.reference_number.trim(),
        notes: formData.notes,
        is_credit_purchase: formData.is_credit_purchase,
        items: items.map((i) => ({
          variant_id: i.variant_id,
          packaging_tier_id: i.packaging_tier_id,
          quantity: i.quantity,
          cost_price: i.cost_price,
        })),
      };

      if (formData.is_credit_purchase && formData.credit_due_date) {
        payload.credit_due_date = formData.credit_due_date;
      }

      await apiClient.post('/tenant/purchase-orders', payload);
      toast.success('Draft Purchase Order created');
      onSuccess();
    } catch (error: any) {
      console.error('Create PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create PO');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPoValue = items.reduce((sum, item) => sum + item.quantity * item.cost_price, 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white p-6 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-2">

        {/* ── PO Header ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-800">PO Details</h3>

          <CustomSelectField
            label="Supplier"
            options={suppliers}
            value={formData.supplier_id}
            inputProps={{ onSelectionChange: handleSupplierSelect }}
            placeholder="Select a supplier"
            required
          />

          <CustomInputTextField
            label="Reference Number (Invoice / Receipt)"
            name="reference_number"
            value={formData.reference_number}
            onChange={handleChange}
            required
            placeholder="e.g. INV-2026-001"
            inputProps={{ required: true }}
          />
        </div>

        {/* ── Credit Purchase ────────────────────────────────────────────── */}
        <div className="space-y-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Credit Purchase</span>
            </div>
            <Switch
              isSelected={formData.is_credit_purchase}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, is_credit_purchase: val, credit_due_date: val ? prev.credit_due_date : '' }))
              }
              size="sm"
              color="warning"
            />
          </div>
          {formData.is_credit_purchase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due Date
              </label>
              <input
                type="date"
                name="credit_due_date"
                value={formData.credit_due_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                required={formData.is_credit_purchase}
              />
            </div>
          )}
        </div>

        {/* ── Line Item Builder ──────────────────────────────────────────── */}
        <div className="space-y-4 bg-gray-50 dark:bg-[#1f1f1f] p-4 rounded-xl border border-border dark:border-gray-800">
          <h3 className="font-semibold text-sm">Add Line Item</h3>

          {/* Step 1: Select Product */}
          <CustomSelectField
            label="1. Select Product"
            options={products.map((p) => ({ label: p.name, value: p.id }))}
            value={selectedProductId}
            inputProps={{ onSelectionChange: handleProductSelect }}
            placeholder="Search products..."
          />

          {/* Step 2: Select Variant (only if product loaded + has variants) */}
          {selectedProductId && isFetchingVariants && (
            <p className="text-xs text-muted-foreground animate-pulse">Loading variants…</p>
          )}

          {selectedProductId && !isFetchingVariants && variantOptions.length > 1 && (
            <CustomSelectField
              label="2. Select Variant"
              options={variantOptions}
              value={selectedVariantId}
              inputProps={{ onSelectionChange: handleVariantSelect }}
              placeholder="Choose a variant…"
            />
          )}

          {/* Step 3: Select Packaging Tier */}
          {selectedVariantId && tierOptions.length > 1 && (
            <CustomSelectField
              label="3. Select Packaging Tier"
              options={tierOptions}
              value={selectedTierId}
              inputProps={{ onSelectionChange: handleTierSelect }}
              placeholder="Choose a tier…"
            />
          )}

          {/* Qty + Cost */}
          {selectedVariantId && (
            <div className="grid grid-cols-2 gap-3">
              <CustomInputTextField
                label="Qty Ordered"
                type="number"
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
                placeholder="0"
                inputProps={{ min: '1' }}
              />
              <CustomInputTextField
                label="Cost / Tier"
                type="number"
                value={lineCostPrice}
                onChange={(e) => setLineCostPrice(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: '0', step: '0.01' }}
              />
            </div>
          )}

          {selectedVariantId && selectedTier && (
            <p className="text-xs text-muted-foreground">
              Each <strong>{selectedTier.name}</strong> = {selectedTier.units_per_tier} base unit
              {selectedTier.units_per_tier !== 1 ? 's' : ''}.
              {lineQty && ` Receiving ${parseInt(lineQty, 10) * selectedTier.units_per_tier} base units.`}
            </p>
          )}

          <Button
            type="button"
            onPress={addLineItem}
            className="w-full bg-gray-200 dark:bg-gray-700 text-foreground font-semibold"
            startContent={<Plus className="h-4 w-4" />}
          >
            Add to Order
          </Button>
        </div>

        {/* ── Line Items Table ───────────────────────────────────────────── */}
        {items.length > 0 && (
          <div className="border border-border dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 font-medium">Product / Variant</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="bg-white dark:bg-gray-900">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{item.product_name}</div>
                      {item.variant_label && (
                        <div className="text-xs text-muted-foreground">{item.variant_label}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {item.tier_name}
                      {item.tier_units_per_tier > 1 && (
                        <span className="ml-1 text-gray-400">(×{item.tier_units_per_tier})</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatAmount(item.cost_price)}</td>
                    <td className="px-3 py-2 font-medium">{formatAmount(item.quantity * item.cost_price)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-[#1f1f1f] font-bold">
                  <td colSpan={4} className="px-3 py-3 text-right">Grand Total:</td>
                  <td colSpan={2} className="px-3 py-3 text-primary">
                    <CurrencyDisplay amount={totalPoValue} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <CustomTextareaField
          label="Order Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions for this order…"
          rows={2}
        />
      </div>

      <div className="pt-4 border-t border-border dark:border-gray-800 flex justify-end gap-3 mt-auto">
        <Button
          variant="flat"
          onPress={onCancel}
          className="bg-gray-100 dark:bg-gray-800 text-gray-700 font-medium px-6"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          className="bg-primary text-primary-foreground font-bold px-6"
        >
          Create PO
        </Button>
      </div>
    </form>
  );
}
