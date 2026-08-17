import React, { useState, useEffect, useMemo } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Layers, Check, Plus, Package } from 'lucide-react';
import apiClient from '@/api/client';
import { CurrencyDisplay } from '@/hooks';

interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit: boolean;
  is_default_purchase_unit?: boolean;
}

export interface CatalogVariant {
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  category: string;
  current_stock: number;
  base_unit_name: string;
  cost_price: number;
  packaging_tiers: PackagingTier[];
  default_tier: PackagingTier;
}

interface POProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (selectedVariants: { variant: CatalogVariant; quantity: number; tier_id: string; cost_price: number }[]) => void;
  existingVariantIds?: string[];
}

export function POProductPickerModal({
  isOpen,
  onClose,
  onSelectItems,
  existingVariantIds = []
}: POProductPickerModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CatalogVariant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMap, setSelectedMap] = useState<Record<string, { quantity: number; tier_id: string; cost_price: number }>>({});

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiClient.get('/pos/products')
        .then((res) => {
          const rawProducts = res.data.success?.data?.products || [];
          const flatList: CatalogVariant[] = [];

          rawProducts.forEach((prod: any) => {
            (prod.variants || []).forEach((v: any) => {
              const attrValues = v.variant_attributes ? Object.values(v.variant_attributes).filter(Boolean) : [];
              const combinedName = attrValues.length > 0 
                ? `${prod.name} (${attrValues.join(' / ')})`
                : prod.name;

              const tiers: PackagingTier[] = (v.packaging_tiers || []).map((t: any) => ({
                id: String(t.id || t.tier_id),
                name: t.name || 'Unit',
                units_per_tier: Number(t.units_per_tier) || 1,
                is_base_unit: Boolean(t.is_base_unit),
                is_default_purchase_unit: Boolean(t.is_default_purchase_unit)
              }));

              const defaultTier = tiers.find(t => t.is_default_purchase_unit) || tiers.find(t => t.is_base_unit) || tiers[0] || {
                id: '',
                name: v.base_unit_name || 'Unit',
                units_per_tier: 1,
                is_base_unit: true
              };

              const rawCost = Number(v.cost_price_per_base_unit ?? v.cost_price ?? 0);
              const costForTier = defaultTier.units_per_tier ? rawCost * defaultTier.units_per_tier : rawCost;

              flatList.push({
                variant_id: String(v.variant_id || v.id),
                product_id: String(prod.id || prod.product_id),
                product_name: prod.name,
                variant_name: combinedName,
                sku: v.sku || '—',
                category: prod.category || 'General',
                current_stock: Number(v.stock_quantity ?? 0),
                base_unit_name: v.base_unit_name || 'unit',
                cost_price: costForTier,
                packaging_tiers: tiers,
                default_tier: defaultTier
              });
            });
          });

          setProducts(flatList);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setSelectedMap({});
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.product_name.toLowerCase().includes(q) ||
        p.variant_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const handleToggleSelect = (variant: CatalogVariant) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[variant.variant_id]) {
        delete next[variant.variant_id];
      } else {
        next[variant.variant_id] = {
          quantity: 1,
          tier_id: variant.default_tier.id,
          cost_price: variant.cost_price
        };
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allSelected = filteredProducts.every(p => !!selectedMap[p.variant_id]);
    setSelectedMap(prev => {
      const next = { ...prev };
      if (allSelected) {
        filteredProducts.forEach(p => {
          delete next[p.variant_id];
        });
      } else {
        filteredProducts.forEach(p => {
          if (!next[p.variant_id]) {
            next[p.variant_id] = {
              quantity: 1,
              tier_id: p.default_tier.id,
              cost_price: p.cost_price
            };
          }
        });
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleConfirm = () => {
    const result = Object.entries(selectedMap).map(([vId, config]) => {
      const variant = products.find(p => p.variant_id === vId);
      return {
        variant: variant!,
        quantity: config.quantity || 1,
        tier_id: config.tier_id || variant?.default_tier.id || '',
        cost_price: config.cost_price ?? variant?.cost_price ?? 0
      };
    }).filter(item => item.variant);

    onSelectItems(result);
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="3xl"
      header={
        <div className="pt-2 px-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Browse Product Catalogue</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Search and select multiple items to add to your purchase order.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or attribute..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 border rounded-lg bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Table of items */}
          <div className="border rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/40 border-b border-border/60 font-semibold text-muted-foreground sticky top-0 bg-card z-10">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => !!selectedMap[p.variant_id])}
                      onChange={handleSelectAllFiltered}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Product / Variant</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Current Stock</th>
                  <th className="p-3">Default Unit / Tier</th>
                  <th className="p-3 text-right">Cost Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading product catalogue...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = !!selectedMap[p.variant_id];
                    const isAlreadyInPO = existingVariantIds.includes(p.variant_id);

                    return (
                      <tr
                        key={p.variant_id}
                        onClick={() => handleToggleSelect(p)}
                        className={`hover:bg-muted/20 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(p)}
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{p.variant_name}</div>
                          {isAlreadyInPO && (
                            <span className="text-[10px] text-amber-500 font-medium">Already in order</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{p.sku}</td>
                        <td className="p-3 text-muted-foreground">{p.category}</td>
                        <td className="p-3 text-center font-medium">{p.current_stock}</td>
                        <td className="p-3 text-muted-foreground">
                          {p.default_tier.name}
                          {p.default_tier.units_per_tier > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              (×{p.default_tier.units_per_tier})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-foreground">
                          <CurrencyDisplay amount={p.cost_price} showStyling={false} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-2">
          <span className="text-xs text-muted-foreground">
            <strong>{selectedCount}</strong> {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Selected ({selectedCount})
            </Button>
          </div>
        </div>
      }
    />
  );
}
