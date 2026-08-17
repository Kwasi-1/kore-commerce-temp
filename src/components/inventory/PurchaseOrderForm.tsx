import React, { useState, useEffect } from 'react';
import { CustomInputTextField, CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import { Switch } from '@nextui-org/react';
import { Plus, Trash2, CreditCard, Calendar, FileSpreadsheet, Package, Upload } from 'lucide-react';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { POProductPickerModal, CatalogVariant } from './POProductPickerModal';
import { POImportCSVModal, POImportedItem } from './POImportCSVModal';

interface POFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit: boolean;
  is_default_purchase_unit?: boolean;
}

interface POItem {
  variant_id: string;
  packaging_tier_id: string;
  product_name: string;
  variant_label: string;
  tier_name: string;
  tier_units_per_tier: number;
  available_tiers?: PackagingTier[];
  quantity: number;
  cost_price: number;
}

export default function PurchaseOrderForm({ onSuccess, onCancel }: POFormProps) {
  const { formatAmount } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<{ label: string; value: string }[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    reference_number: '',
    notes: '',
    is_credit_purchase: false,
    credit_due_date: '',
  });

  // Modal controls
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [isImportCSVModalOpen, setIsImportCSVModalOpen] = useState(false);

  // Line items
  const [items, setItems] = useState<POItem[]>([]);

  // Initial suppliers fetch
  useEffect(() => {
    apiClient
      .get('/tenant/suppliers?limit=100')
      .then((res) => {
        const active = res.data.success?.data?.suppliers || [];
        setSuppliers(active.map((s: any) => ({ label: s.name, value: s.id })));
      })
      .catch(console.error);
  }, []);

  // Handlers for adding items
  const handleAddFromPicker = (
    selectedVariants: { variant: CatalogVariant; quantity: number; tier_id: string; cost_price: number }[]
  ) => {
    setItems((prev) => {
      const next = [...prev];
      selectedVariants.forEach((sel) => {
        const tier = sel.variant.packaging_tiers.find((t) => t.id === sel.tier_id) || sel.variant.default_tier;
        const existsIdx = next.findIndex(
          (i) => i.variant_id === sel.variant.variant_id && i.packaging_tier_id === tier.id
        );
        if (existsIdx >= 0) {
          next[existsIdx].quantity += sel.quantity;
          next[existsIdx].cost_price = sel.cost_price;
        } else {
          next.push({
            variant_id: sel.variant.variant_id,
            packaging_tier_id: tier.id,
            product_name: sel.variant.product_name,
            variant_label: sel.variant.variant_name !== sel.variant.product_name ? sel.variant.variant_name : `SKU: ${sel.variant.sku}`,
            tier_name: tier.name,
            tier_units_per_tier: tier.units_per_tier,
            available_tiers: sel.variant.packaging_tiers,
            quantity: sel.quantity,
            cost_price: sel.cost_price,
          });
        }
      });
      return next;
    });
    toast.success(`Added ${selectedVariants.length} item(s) to order.`);
  };

  const handleImportFromCSV = (imported: POImportedItem[]) => {
    setItems((prev) => {
      const next = [...prev];
      imported.forEach((imp) => {
        const existsIdx = next.findIndex(
          (i) => i.variant_id === imp.variant_id && i.packaging_tier_id === imp.packaging_tier_id
        );
        if (existsIdx >= 0) {
          next[existsIdx].quantity += imp.quantity;
          if (imp.cost_price > 0) next[existsIdx].cost_price = imp.cost_price;
        } else {
          next.push({
            variant_id: imp.variant_id,
            packaging_tier_id: imp.packaging_tier_id,
            product_name: imp.product_name,
            variant_label: imp.variant_label,
            tier_name: imp.tier_name,
            tier_units_per_tier: imp.tier_units_per_tier || 1,
            quantity: imp.quantity,
            cost_price: imp.cost_price,
          });
        }
      });
      return next;
    });
  };

  const handleUpdateItemQty = (idx: number, qtyStr: string) => {
    const val = Number(qtyStr);
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: isNaN(val) ? 0 : val } : item)));
  };

  const handleUpdateItemCost = (idx: number, costStr: string) => {
    const val = Number(costStr);
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, cost_price: isNaN(val) ? 0 : val } : item)));
  };

  const handleUpdateItemTier = (idx: number, tierId: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const tier = item.available_tiers?.find((t) => t.id === tierId);
        return {
          ...item,
          packaging_tier_id: tierId,
          tier_name: tier?.name || item.tier_name,
          tier_units_per_tier: tier?.units_per_tier || item.tier_units_per_tier,
        };
      })
    );
  };

  const removeLineItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData((prev) => ({ ...prev, supplier_id: val }));
  };

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

  const totalPoValue = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cost_price) || 0), 0);
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.tier_units_per_tier) || 1), 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full px-1 pb-4 md:px-2 space-y-5">
      <div className="flex-1 overflow-y-auto space-y-5 scrollbar-hide">
        {/* ── PO Header ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base border-b pb-2 dark:border-border">PO Details</h3>

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
        <div className="space-y-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Credit Purchase</span>
            </div>
            <Switch
              isSelected={formData.is_credit_purchase}
              onValueChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  is_credit_purchase: val,
                  credit_due_date: val ? prev.credit_due_date : '',
                }))
              }
              size="sm"
              color="warning"
            />
          </div>
          {formData.is_credit_purchase && (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due Date
              </label>
              <input
                type="date"
                name="credit_due_date"
                value={formData.credit_due_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                required={formData.is_credit_purchase}
              />
            </div>
          )}
        </div>

        {/* ── Order Line Items Section ───────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span>Order Items</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {items.length}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">Add products from your catalogue or import a spreadsheet.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPickerModalOpen(true)}
                className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 h-8 text-xs"
              >
                <Package className="h-3.5 w-3.5" />
                Browse Catalogue
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsImportCSVModalOpen(true)}
                className="font-semibold flex items-center gap-1.5 h-8 text-xs border-border hover:bg-muted"
              >
                <Upload className="h-3.5 w-3.5" />
                Import File
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="p-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-3 bg-muted/10">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">No items added yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Click <strong>Browse Catalogue</strong> to select products, or <strong>Import File</strong> to upload your supplier invoice.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPickerModalOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Products
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsImportCSVModalOpen(true)}
                  className="text-xs text-muted-foreground"
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground sticky top-0 bg-card z-10">
                    <tr>
                      <th className="p-2.5">Product / Variant</th>
                      <th className="p-2.5 w-32">Tier</th>
                      <th className="p-2.5 w-20 text-center">Qty</th>
                      <th className="p-2.5 w-24 text-right">Cost</th>
                      <th className="p-2.5 w-24 text-right">Subtotal</th>
                      <th className="p-2.5 w-10 text-center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-2.5">
                          <div className="font-semibold text-foreground">{item.product_name}</div>
                          {item.variant_label && (
                            <div className="text-[11px] text-muted-foreground">{item.variant_label}</div>
                          )}
                        </td>
                        <td className="p-2">
                          {item.available_tiers && item.available_tiers.length > 1 ? (
                            <select
                              value={item.packaging_tier_id}
                              onChange={(e) => handleUpdateItemTier(idx, e.target.value)}
                              className="w-full h-8 px-2 border rounded-md bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {item.available_tiers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (×{t.units_per_tier})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium px-1">
                              {item.tier_name}
                              {item.tier_units_per_tier > 1 && (
                                <span className="ml-1 text-gray-400 font-mono">(×{item.tier_units_per_tier})</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                            className="h-8 text-center text-xs font-semibold px-1 rounded-md"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.cost_price}
                            onChange={(e) => handleUpdateItemCost(idx, e.target.value)}
                            className="h-8 text-right text-xs font-semibold px-1 rounded-md"
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">
                          <CurrencyDisplay amount={(Number(item.quantity) || 0) * (Number(item.cost_price) || 0)} showStyling={false} />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Totals */}
              <div className="bg-muted/30 p-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Total Items: <strong>{items.length}</strong> · Total Base Units: <strong>{totalUnits}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Grand Total:</span>
                  <span className="text-sm font-bold text-primary">
                    <CurrencyDisplay amount={totalPoValue} showStyling={false} />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <CustomTextareaField
          label="Order Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions or supplier remarks…"
          rows={2}
        />
      </div>

      {/* ── Form Actions ─────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border flex justify-end gap-3 mt-auto">
        <Button variant="ghost" type="button" onClick={onCancel} className="font-medium px-5 text-xs">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || items.length === 0}
          className="bg-primary text-primary-foreground font-bold px-6 text-xs min-w-[120px]"
        >
          {isLoading ? 'Creating...' : 'Create Draft PO'}
        </Button>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <POProductPickerModal
        isOpen={isPickerModalOpen}
        onClose={() => setIsPickerModalOpen(false)}
        onSelectItems={handleAddFromPicker}
        existingVariantIds={items.map((i) => i.variant_id)}
      />

      <POImportCSVModal
        isOpen={isImportCSVModalOpen}
        onClose={() => setIsImportCSVModalOpen(false)}
        onImportItems={handleImportFromCSV}
      />
    </form>
  );
}
