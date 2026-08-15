import React, { useState, useEffect, useMemo } from 'react';
import type { Selection } from '@nextui-org/react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CustomModal from '@/components/modals/modal';
import DashboardCard from '@/components/ui/dashboard-card';
import EnhancedTableComponent, { TableColumn } from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  CheckSquare, 
  AlertTriangle, 
  ClipboardCheck, 
  ArrowRightLeft, 
  RotateCcw,
  SlidersHorizontal,
  FileCheck2,
  CheckCircle2,
  Boxes,
  Calculator,
  Layers
} from 'lucide-react';

export interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit: boolean;
}

export interface ReconcileItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  base_unit_name: string;
  packaging_tiers?: PackagingTier[];
}

// Helper to format quantities up to 2 decimal places without trailing .00 on whole numbers
const formatQty = (num: number): string => {
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
};

// Helper to convert base units into human-readable packaging tier breakdown (e.g. 246 bottles -> 10 packs, 6 bottles)
const getTierBreakdown = (
  quantity: number,
  baseUnitName: string,
  tiers?: PackagingTier[]
): string | null => {
  if (!tiers || tiers.length <= 1) return null;

  const multiTiers = tiers
    .filter(t => t.units_per_tier > 1)
    .sort((a, b) => b.units_per_tier - a.units_per_tier);

  if (multiTiers.length === 0) return null;

  const primaryTier = multiTiers[0];
  const isNegative = quantity < 0;
  const absQty = Math.abs(quantity);

  const tierCount = Math.floor(absQty / primaryTier.units_per_tier);
  const remainder = Math.round((absQty % primaryTier.units_per_tier) * 100) / 100;

  if (tierCount === 0 && remainder === 0) {
    return null;
  }

  const parts: string[] = [];
  if (tierCount > 0) {
    const tierLabel = tierCount === 1 ? primaryTier.name : `${primaryTier.name}s`;
    parts.push(`${isNegative ? '-' : ''}${tierCount} ${tierLabel.toLowerCase()}`);
  }
  if (remainder > 0) {
    const baseLabel = remainder === 1 ? baseUnitName : `${baseUnitName}s`;
    parts.push(`${isNegative && tierCount === 0 ? '-' : ''}${formatQty(remainder)} ${baseLabel.toLowerCase()}`);
  }

  return parts.length > 0 ? parts.join(', ') : null;
};

export default function StockReconciliation() {
  const [products, setProducts] = useState<ReconcileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [filterSelection, setFilterSelection] = useState<Selection>(new Set(['all']));
  const [categoryFilter, setCategoryFilter] = useState<Selection>(new Set(['all']));
  
  // Track physical counts: { [id]: number }
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('recon_draft_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Review confirmation modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState('');

  // Tier Calculator Modal State
  const [calculatingItem, setCalculatingItem] = useState<ReconcileItem | null>(null);
  const [tierCounts, setTierCounts] = useState<Record<string, string>>({});

  // Auto-persist uncommitted count drafts
  useEffect(() => {
    try {
      if (Object.keys(physicalCounts).length > 0) {
        localStorage.setItem('recon_draft_counts', JSON.stringify(physicalCounts));
      } else {
        localStorage.removeItem('recon_draft_counts');
      }
    } catch (e) {
      console.error('Failed to persist count draft', e);
    }
  }, [physicalCounts]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/products?limit=250');
      const rawProducts = response.data.success?.data?.products || [];
      
      const flatItems: ReconcileItem[] = [];
      rawProducts.forEach((p: any) => {
        const variants = p.variants || [];
        if (variants.length === 0) {
          flatItems.push({
            id: p.id,
            productId: p.id,
            name: p.name,
            category: p.category || 'General',
            sku: p.sku || 'N/A',
            quantity: p.stock_quantity ?? p.total_stock_base_units ?? 0,
            base_unit_name: p.base_unit_name || 'units',
            packaging_tiers: p.packaging_tiers || []
          });
        } else {
          variants.forEach((v: any) => {
            const attrVals = v.variant_attributes ? Object.values(v.variant_attributes).filter(Boolean) : [];
            const fullName = attrVals.length > 0 ? `${p.name} (${attrVals.join(', ')})` : p.name;
            flatItems.push({
              id: v.id,
              productId: v.id,
              name: fullName,
              category: p.category || 'General',
              sku: v.sku || p.sku || 'N/A',
              quantity: v.stock_quantity ?? 0,
              base_unit_name: v.base_unit_name || p.base_unit_name || 'units',
              packaging_tiers: v.packaging_tiers || p.packaging_tiers || []
            });
          });
        }
      });

      setProducts(flatItems);
    } catch (error) {
      console.error('Failed to fetch products for reconciliation:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCountChange = (id: string, newValue: string) => {
    if (newValue === '') {
      setPhysicalCounts(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      return;
    }

    const parsed = parseFloat(newValue);
    if (isNaN(parsed) || parsed < 0) return;
    
    setPhysicalCounts(prev => ({
      ...prev,
      [id]: Math.round((parsed + Number.EPSILON) * 100) / 100
    }));
  };

  const handleQuickMatch = (item: ReconcileItem) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [item.id]: item.quantity
    }));
  };

  const handleOpenTierCalculator = (item: ReconcileItem) => {
    setCalculatingItem(item);
    const currentCount = physicalCounts[item.id];
    const initialInputs: Record<string, string> = {};

    const multiTiers = (item.packaging_tiers || [])
      .filter(t => t.units_per_tier > 1)
      .sort((a, b) => b.units_per_tier - a.units_per_tier);

    if (currentCount !== undefined && multiTiers.length > 0) {
      const primaryTier = multiTiers[0];
      const packs = Math.floor(currentCount / primaryTier.units_per_tier);
      const loose = Math.round((currentCount % primaryTier.units_per_tier) * 100) / 100;
      if (packs > 0) initialInputs[primaryTier.id] = String(packs);
      if (loose > 0) initialInputs['base'] = String(loose);
    }
    setTierCounts(initialInputs);
  };

  const calculatedTotal = useMemo(() => {
    if (!calculatingItem) return 0;
    let total = 0;
    const baseQty = parseFloat(tierCounts['base'] || '0');
    if (!isNaN(baseQty) && baseQty > 0) total += baseQty;

    (calculatingItem.packaging_tiers || []).forEach(tier => {
      if (tier.units_per_tier > 1) {
        const val = parseFloat(tierCounts[tier.id] || '0');
        if (!isNaN(val) && val > 0) {
          total += val * tier.units_per_tier;
        }
      }
    });
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }, [calculatingItem, tierCounts]);

  const handleApplyTierCount = () => {
    if (!calculatingItem) return;
    setPhysicalCounts(prev => ({
      ...prev,
      [calculatingItem.id]: calculatedTotal
    }));
    const itemName = calculatingItem.name;
    const baseUnit = calculatingItem.base_unit_name;
    const breakdown = getTierBreakdown(calculatedTotal, baseUnit, calculatingItem.packaging_tiers);
    setCalculatingItem(null);
    toast.success(`Updated ${itemName}: ${calculatedTotal} ${baseUnit}${breakdown ? ` (${breakdown})` : ''}`);
  };

  const handleResetCounts = () => {
    if (Object.keys(physicalCounts).length === 0) return;
    if (window.confirm('Reset all entered counts for this session?')) {
      setPhysicalCounts({});
      localStorage.removeItem('recon_draft_counts');
      toast.success('Count session cleared');
    }
  };

  // Distinct categories for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const categoryFilterOptions = useMemo(() => {
    return [
      { uid: 'all', name: 'All Categories' },
      ...availableCategories.map(cat => ({ uid: cat, name: cat }))
    ];
  }, [availableCategories]);

  // Computed summary metrics
  const countedCount = Object.keys(physicalCounts).length;
  
  const discrepancyItems = useMemo(() => {
    return Object.entries(physicalCounts).map(([id, count]) => {
      const item = products.find(p => p.id === id);
      if (!item) return null;
      const rawVariance = count - item.quantity;
      const variance = Math.round((rawVariance + Number.EPSILON) * 100) / 100;
      if (variance === 0) return null;
      return {
        ...item,
        physicalCount: Math.round((count + Number.EPSILON) * 100) / 100,
        variance
      };
    }).filter(Boolean) as (ReconcileItem & { physicalCount: number; variance: number })[];
  }, [physicalCounts, products]);

  const totalSurplus = useMemo(() => {
    const sum = discrepancyItems
      .filter(d => d.variance > 0)
      .reduce((s, d) => s + d.variance, 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [discrepancyItems]);

  const totalShrinkage = useMemo(() => {
    const sum = discrepancyItems
      .filter(d => d.variance < 0)
      .reduce((s, d) => s + Math.abs(d.variance), 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [discrepancyItems]);

  // Filtered rows for the table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      const catVal = typeof categoryFilter === 'string' ? categoryFilter : Array.from(categoryFilter)[0];
      if (catVal && catVal !== 'all' && p.category !== catVal) {
        return false;
      }

      // Status filter
      const isCounted = physicalCounts[p.id] !== undefined;
      const hasVariance = isCounted && physicalCounts[p.id] !== p.quantity;

      const filterVal = typeof filterSelection === 'string' ? filterSelection : Array.from(filterSelection)[0];
      if (filterVal === 'counted' && !isCounted) return false;
      if (filterVal === 'uncounted' && isCounted) return false;
      if (filterVal === 'discrepancies' && !hasVariance) return false;

      // Text search
      const q = tableSearchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, physicalCounts, categoryFilter, filterSelection, tableSearchQuery]);

  const handleApplyReconciliation = async () => {
    if (discrepancyItems.length === 0 && countedCount === 0) {
      toast('No counted items to reconcile.', { icon: 'ℹ️' });
      return;
    }

    const updates = Object.entries(physicalCounts).map(([productId, quantity]) => {
      const item = products.find(p => p.id === productId);
      if (!item) return null;
      return {
        productId,
        quantity,
        notes: auditNotes.trim() || undefined
      };
    }).filter(Boolean);

    setIsSaving(true);
    try {
      const res = await apiClient.patch('/tenant/products/stock-update', { updates });
      const data = res.data?.success?.data;
      
      toast.success(
        `Reconciliation complete: ${data?.updatedCount || updates.length} items updated (${data?.discrepanciesCount ?? discrepancyItems.length} variances logged)`
      );
      
      setIsReviewModalOpen(false);
      setAuditNotes('');
      setPhysicalCounts({});
      fetchProducts();
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to apply stock reconciliation');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn[] = [
    { key: 'product', label: 'Product Variant' },
    { key: 'category', label: 'Category' },
    { key: 'system_stock', label: 'Expected (System)' },
    { key: 'physical_stock', label: 'Actual (Physical Count)' },
    { key: 'variance', label: 'Variance' },
  ];

  const rows = useMemo(() => {
    return filteredProducts.map((p) => {
      const isCounted = physicalCounts[p.id] !== undefined;
      const actualVal = isCounted ? physicalCounts[p.id] : '';
      const variance = isCounted ? (physicalCounts[p.id] - p.quantity) : 0;
      const hasTiers = (p.packaging_tiers || []).some(t => t.units_per_tier > 1);
      const systemTierBreakdown = getTierBreakdown(p.quantity, p.base_unit_name, p.packaging_tiers);
      const actualTierBreakdown = isCounted ? getTierBreakdown(Number(actualVal), p.base_unit_name, p.packaging_tiers) : null;
      const varianceTierBreakdown = isCounted && variance !== 0 ? getTierBreakdown(variance, p.base_unit_name, p.packaging_tiers) : null;

      return {
        id: p.id,
        product: (
          <div className="min-w-[180px]">
            <p className="font-semibold text-foreground capitalize text-sm">{p.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{p.sku}</p>
          </div>
        ),
        category: (
          <span className="text-sm text-muted-foreground font-medium capitalize">
            {p.category}
          </span>
        ),
        system_stock: (
          <div>
            <span className="font-medium text-foreground text-sm">
              {formatQty(p.quantity)}{' '}
              <span className="text-[12px] font-normal text-muted-foreground">{p.base_unit_name}</span>
            </span>
            {systemTierBreakdown && (
              <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">
                ({systemTierBreakdown})
              </p>
            )}
          </div>
        ),
        physical_stock: (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input 
                type="number"
                min="0"
                step="any"
                placeholder="Enter count..."
                className={`w-28 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                  isCounted 
                    ? 'border-border bg-background font-medium text-foreground' 
                    : 'border-border/60 bg-muted/40 text-muted-foreground'
                }`}
                value={actualVal}
                onChange={(e) => handleCountChange(p.id, e.target.value)}
              />
              {hasTiers && (
                <button
                  type="button"
                  onClick={() => handleOpenTierCalculator(p)}
                  title="Count by Packs / Boxes & Units"
                  className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1.5 rounded-md border border-border transition-colors shadow-sm"
                >
                  <Boxes className="h-3.5 w-3.5" />
                  <span>Tier Calc</span>
                </button>
              )}
              {!isCounted && (
                <button
                  type="button"
                  onClick={() => handleQuickMatch(p)}
                  title="Matches system count"
                  className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors border border-dashed border-border"
                >
                  Match
                </button>
              )}
            </div>
            {actualTierBreakdown && (
              <p className="text-[11px] text-muted-foreground/80 font-mono">
                ({actualTierBreakdown})
              </p>
            )}
          </div>
        ),
        variance: (
          <div className="flex flex-col gap-0.5">
            {!isCounted ? (
              <span className="text-muted-foreground font-normal text-xs">—</span>
            ) : variance === 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-muted-foreground bg-muted/30 w-fit">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                0 Match
              </span>
            ) : (
              <>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold font-mono w-fit ${
                  variance > 0 
                    ? 'text-green-600 bg-green-400/10 border-green-500/20' 
                    : 'text-destructive bg-destructive/5 border-destructive/20'
                }`}>
                  {variance > 0 ? `+${formatQty(variance)}` : formatQty(variance)} {p.base_unit_name}
                </span>
                {varianceTierBreakdown && (
                  <p className="text-[11px] text-muted-foreground/80 font-mono">
                    ({varianceTierBreakdown})
                  </p>
                )}
              </>
            )}
          </div>
        ),
        __record: p
      };
    });
  }, [filteredProducts, physicalCounts]);

  const countPercent = products.length > 0 ? Math.round((countedCount / products.length) * 100) : 0;

  return (
    <PageLayout 
      title="Stock Reconciliation" 
      constrainHeight={true}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-5 relative h-full md:h-full">
        {/* Metric summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Items Counted"
            value={
              isLoading ? (
                "..."
              ) : (
                <>
                  {countedCount}
                  <span className="text-[75%] font-normal text-muted-foreground ml-1.5">
                    / {products.length}
                  </span>
                </>
              )
            }
            subvalue={
              !isLoading && products.length > 0 ? (
                <div className="flex items-center gap-2.5 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground transition-all duration-300 rounded-full" 
                      style={{ width: `${countPercent}%` }} 
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {countPercent}%
                  </span>
                </div>
              ) : undefined
            }
            className="border border-border"
            action={<ClipboardCheck className="h-5 w-5 text-muted-foreground/50" />}
          />
          <DashboardCard
            title="Discrepancies Detected"
            value={
              isLoading ? (
                "..."
              ) : (
                <>
                  {discrepancyItems.length}
                  <span className="text-[75%] font-normal text-muted-foreground ml-1.5">
                    {discrepancyItems.length === 1 ? 'variance' : 'variances'}
                  </span>
                </>
              )
            }
            subvalue={
              <p className="text-[11px] text-muted-foreground mt-1">
                {countedCount === 0 
                  ? 'No items counted yet' 
                  : `${products.length - countedCount} uncounted remaining`}
              </p>
            }
            className="border border-border"
            valueStyle="text-foreground xl:text-2xl font-semibold"
            action={<AlertTriangle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Net Balance Impact"
            value={
              isLoading ? (
                "..."
              ) : (
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span>+{formatQty(totalSurplus)}</span>
                  <span className="text-muted-foreground font-normal text-sm">/</span>
                  <span>-{formatQty(totalShrinkage)}</span>
                  <span className="text-[75%] font-normal text-muted-foreground">units</span>
                </div>
              )
            }
            subvalue={
              <p className="text-[11px] text-muted-foreground mt-1">
                Surplus vs shrinkage units
              </p>
            }
            className="border border-border"
            action={<ArrowRightLeft className="h-5 w-5 text-muted-foreground/50" />}
          />
        </div>

        {/* Enhanced Table Component with Reconciliation Actions */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          showSearch={true}
          searchPlaceholder="Search product variant, SKU, or category..."
          searchValue={tableSearchQuery}
          onSearchChange={setTableSearchQuery}
          showFilter={true}
          filterLabel="Status"
          filterOptions={[
            { uid: 'all', name: 'All Status' },
            { uid: 'counted', name: 'Counted' },
            { uid: 'uncounted', name: 'Uncounted' },
            { uid: 'discrepancies', name: 'Variances Only' },
          ]}
          filterValue={filterSelection}
          onFilterChange={setFilterSelection}
          additionalFilters={[
            {
              label: 'Category',
              options: categoryFilterOptions,
              value: categoryFilter,
              onChange: setCategoryFilter
            }
          ]}
          showAddButton={false}
          topActions={[
            ...(countedCount > 0 ? [
              {
                customComponent: (
                  <Button
                    key="reset-counts"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetCounts}
                    className="h-[35px] md:h-[38px] px-3 text-xs gap-1.5 border-border rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )
              }
            ] : [])
          ]}
          customAddButton={
            <Button
              type="button"
              variant="outline"
              disabled={countedCount === 0}
              onClick={() => setIsReviewModalOpen(true)}
              className="h-[35px] md:h-[38px] px-4 rounded-md font-semibold text-[12px] gap-2 disabled:opacity-50 border border-foreground/20 disabled:border-border/50"
            >
              <CheckSquare className="h-4 w-4" />
              Review & Apply ({countedCount})
            </Button>
          }
          classNames={{
            base: "min-h-[350px]"
          }}
          onRefresh={fetchProducts}
          mobileFriendly={true}
        />
      </div>

      {/* MODAL 1: Tier Count Calculator */}
      <CustomModal
        isOpen={!!calculatingItem}
        onOpenChange={() => setCalculatingItem(null)}
        size="md"
        header={
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              <h3 className="text-sm md:text-base font-bold text-foreground">
                Count by Packaging Tiers
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {calculatingItem?.name} <span className="font-mono">({calculatingItem?.sku})</span>
            </p>
          </div>
        }
        body={
          <div className="space-y-4 py-1">
            <div className="p-3 bg-muted/40 rounded-md borde border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>Base Inventory Unit: <strong className="text-foreground">{calculatingItem?.base_unit_name}</strong></span>
              <span>Expected System Stock: <strong className="text-foreground">{calculatingItem ? formatQty(calculatingItem.quantity) : 0} {calculatingItem?.base_unit_name}</strong></span>
            </div>

            <div className="space-y-3">
              {/* Packaging Tiers Inputs */}
              {(calculatingItem?.packaging_tiers || [])
                .filter(t => t.units_per_tier > 1)
                .sort((a, b) => b.units_per_tier - a.units_per_tier)
                .map(tier => {
                  const val = tierCounts[tier.id] || '';
                  const subTotal = (parseFloat(val) || 0) * tier.units_per_tier;
                  return (
                    <div key={tier.id} className="p-3 border rounded-lg bg-card/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <label htmlFor={`tier-${tier.id}`}>
                          {tier.name} <span className="text-[11px] text-muted-foreground font-normal">({tier.units_per_tier} {calculatingItem?.base_unit_name}s each)</span>
                        </label>
                        <span className="font-mono text-xs text-muted-foreground">
                          = {formatQty(subTotal)} {calculatingItem?.base_unit_name}s
                        </span>
                      </div>
                      <Input
                        id={`tier-${tier.id}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder={`Number of ${tier.name.toLowerCase()}s...`}
                        value={val}
                        onChange={(e) => setTierCounts(prev => ({ ...prev, [tier.id]: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                  );
                })}

              {/* Loose Base Units Input */}
              <div className="p-3 border rounded-lg bg-card/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="tier-base">
                    Loose {calculatingItem?.base_unit_name}s <span className="text-[11px] text-muted-foreground font-normal">(individual base units)</span>
                  </label>
                  <span className="font-mono text-xs text-muted-foreground">
                    = {formatQty(parseFloat(tierCounts['base'] || '0') || 0)} {calculatingItem?.base_unit_name}s
                  </span>
                </div>
                <Input
                  id="tier-base"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`Loose ${calculatingItem?.base_unit_name}s...`}
                  value={tierCounts['base'] || ''}
                  onChange={(e) => setTierCounts(prev => ({ ...prev, base: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-3.5 rounded-lg border bg-muted/60 border-border/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Calculated Stock:</span>
                <span className="text-base font-bold text-foreground font-mono">
                  {formatQty(calculatedTotal)} {calculatingItem?.base_unit_name}
                </span>
              </div>
              {getTierBreakdown(calculatedTotal, calculatingItem?.base_unit_name || 'units', calculatingItem?.packaging_tiers) && (
                <p className="text-[11px] text-muted-foreground font-mono text-right">
                  Breakdown: {getTierBreakdown(calculatedTotal, calculatingItem?.base_unit_name || 'units', calculatingItem?.packaging_tiers)}
                </p>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCalculatingItem(null)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyTierCount}
              className="text-xs h-9 bg-primary text-primary-foreground font-semibold px-4"
            >
              Apply Count ({formatQty(calculatedTotal)} {calculatingItem?.base_unit_name})
            </Button>
          </div>
        }
      />

      {/* MODAL 2: Review & Commit Reconciliation */}
      <CustomModal
        isOpen={isReviewModalOpen}
        onOpenChange={() => setIsReviewModalOpen(false)}
        size="xl"
        header={
          <div className="pt-2 border-b border-border/50 pb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {/* <FileCheck2 className="h-5 w-5 text-primary" /> */}
              Confirm Stock Reconciliation
            </h2>
            <p className="text-xs text-muted-foreground font-normal">
              Review variances before committing changes to live stock and audit ledger.
            </p>
          </div>
        }
        body={
          <div className="space-y-4 py-2 pb-6">
            {/* Overview Alert */}
            <div className="p-3.5 border rounded-lg bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold">Inventory Balances Will Be Updated</p>
                <p className="mt-0.5">
                  You are about to reconcile <strong>{countedCount} products</strong>. The system will adjust stock quantities to match physical counts and automatically log <strong>{discrepancyItems.length} discrepancy adjustments</strong> in the Audit Ledger.
                </p>
              </div>
            </div>

            {/* Discrepancies Table Breakdown */}
            {discrepancyItems.length > 0 ? (
              <div className="border border-border/70 rounded-md overflow-hidden">
                <div className="p-2.5 bg-muted/40 border-b border-border/70 font-semibold text-xs text-foreground flex justify-between items-center">
                  <span>Variances to be Logged ({discrepancyItems.length})</span>
                  <span className="text-[11px] text-muted-foreground font-normal font-mono">
                    Surplus: +{formatQty(totalSurplus)} | Shrinkage: -{formatQty(totalShrinkage)}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-border/40 text-xs">
                  {discrepancyItems.map((item) => {
                    const prevTier = getTierBreakdown(item.quantity, item.base_unit_name, item.packaging_tiers);
                    const countTier = getTierBreakdown(item.physicalCount, item.base_unit_name, item.packaging_tiers);
                    const varTier = getTierBreakdown(item.variance, item.base_unit_name, item.packaging_tiers);

                    return (
                      <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <p className="font-semibold text-foreground capitalize">{item.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{item.sku}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="text-[11px] text-muted-foreground">
                            <div>
                              <span>Prev: {formatQty(item.quantity)}</span>
                              <span className="mx-1">→</span>
                              <span className="font-semibold text-foreground">Count: {formatQty(item.physicalCount)}</span>
                            </div>
                            {(prevTier || countTier) && (
                              <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                                {prevTier ? `(${prevTier})` : ''} → {countTier ? `(${countTier})` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              item.variance > 0
                                ? 'text-green-600 bg-green-500/5'
                                : 'text-destructive bg-destructive/5'
                            }`}>
                              {item.variance > 0 ? `+${formatQty(item.variance)}` : formatQty(item.variance)} {item.base_unit_name}
                            </span>
                            {varTier && (
                              <span className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                                ({varTier})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>All {countedCount} counted items match expected system counts perfectly. No discrepancies detected!</span>
              </div>
            )}

            {/* Audit Notes field */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Audit / Session Notes (Optional)
              </label>
              <Textarea
                rows={2}
                placeholder="e.g. Weekly routine floor audit, Aisle 2 stock count..."
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="rounded-md text-xs resize-none"
              />
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isSaving}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyReconciliation}
              disabled={isSaving}
              className="text-xs h-9 bg-primary text-primary-foreground min-w-[140px]"
            >
              {isSaving ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Applying...</span>
                </div>
              ) : (
                'Commit Adjustments'
              )}
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}
