import React, { useState, useEffect, useMemo } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Search, Layers, Check, Plus, Package } from 'lucide-react';
import apiClient from '@/api/client';
import { CurrencyDisplay } from '@/hooks';
import { CustomSelectField } from '@/components/shared/text-field';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMap, setSelectedMap] = useState<Record<string, { quantity: number; tier_id: string; cost_price: number }>>({});

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
      setDebouncedSearchQuery('');
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

  const categoryOptions = useMemo(() => {
    return [
      { label: `All Categories (${products.length})`, value: 'all' },
      ...categories.map(cat => ({ label: cat, value: cat }))
    ];
  }, [categories, products.length]);

  // Filtered products list using debounced query
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCat) return false;

      if (!debouncedSearchQuery.trim()) return true;
      const q = debouncedSearchQuery.toLowerCase();
      return (
        p.product_name.toLowerCase().includes(q) ||
        p.variant_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, debouncedSearchQuery]);

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
      size="4xl"
      classNames={{
        base: 'min-h-[calc(100dvh-0.75rem)] md:min-h-[560px]',
      }}
      header={
        <div className="pt-2 px-2 border-b border-border/60 pb-3">
          <h2 className="text-lg font-bold !tracking-tight">Browse Product Catalogue</h2>
          <p className="text-xs md:text-[13px] text-muted-foreground">
            Search and select multiple items to add to your purchase order.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or attribute..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-sm bg-inherit hover:bg-muted/30 focus:bg-background border border-border focus:border-primary rounded-lg transition-colors outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="w-full sm:w-56 shrink-0">
              <CustomSelectField
                // size="sm"
                options={categoryOptions}
                value={selectedCategory}
                labelPlacement='outside'
                inputProps={{
                  onSelectionChange: (keys: any) => {
                    const val = Array.from(keys)[0] as string;
                    setSelectedCategory(val || 'all');
                  }
                }}
                placeholder="All Categories"
              />
            </div>
          </div>

          {/* Table of items with responsive columns & smooth horizontal scroll */}
          <div className="border border-border/60 overflow-x-auto max-h-[calc(100dvh-20.5rem)] md:max-h-[380px] overflow-y-auto bg-card">
            <table className="w-full text-left text-xs border-collapse min-w-[320px] md:min-w-full">
              <thead className="border-b border-border/60 font-semibold text-muted-foreground sticky top-0 bg-background z-10">
                <tr className="bg-muted/30">
                  <th className="p-3 w-10 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={filteredProducts.length > 0 && filteredProducts.every(p => !!selectedMap[p.variant_id])}
                        onCheckedChange={handleSelectAllFiltered}
                      />
                    </div>
                  </th>
                  <th className="p-3">Product / Variant</th>
                  <th className="p-3 hidden md:table-cell">SKU</th>
                  <th className="p-3 hidden sm:table-cell">Category</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 hidden lg:table-cell">Default Unit / Tier</th>
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
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(p)}
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground text-xs leading-snug">{p.variant_name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {p.category && (
                              <span className="sm:hidden text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium">
                                {p.category}
                              </span>
                            )}
                            {isAlreadyInPO && (
                              <span className="text-[10px] text-amber-500 font-medium">Already in order</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground hidden md:table-cell">{p.sku}</td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">{p.category}</td>
                        <td className="p-3 text-center font-medium">
                          <span>{p.current_stock}</span>
                          <span className="lg:hidden text-[10px] text-muted-foreground block font-normal">
                            {p.default_tier.name}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">
                          {p.default_tier.name}
                          {p.default_tier.units_per_tier > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              (×{p.default_tier.units_per_tier})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-foreground whitespace-nowrap">
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
            <Button variant="ghost" size="sm" onClick={onClose} className='hidden md:flex'>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="bg-primary text-xs md:text-sm text-primary-foreground font-semibold flex items-center gap-1.5 px-5"
            >
              Add Selected ({selectedCount})
            </Button>
          </div>
        </div>
      }
    />
  );
}
