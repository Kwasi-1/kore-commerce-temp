import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';

interface ReconcileItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  base_unit_name: string;
}

export default function StockReconciliation() {
  const [products, setProducts] = useState<ReconcileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [filterSelection, setFilterSelection] = useState<any>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
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
            base_unit_name: p.base_unit_name || 'units'
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
              base_unit_name: v.base_unit_name || p.base_unit_name || 'units'
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
      [id]: parsed
    }));
  };

  const handleQuickMatch = (item: ReconcileItem) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [item.id]: item.quantity
    }));
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

  // Computed summary metrics
  const countedCount = Object.keys(physicalCounts).length;
  
  const discrepancyItems = useMemo(() => {
    return Object.entries(physicalCounts).map(([id, count]) => {
      const item = products.find(p => p.id === id);
      if (!item) return null;
      const variance = count - item.quantity;
      if (variance === 0) return null;
      return {
        ...item,
        physicalCount: count,
        variance
      };
    }).filter(Boolean) as (ReconcileItem & { physicalCount: number; variance: number })[];
  }, [physicalCounts, products]);

  const totalSurplus = useMemo(() => {
    return discrepancyItems
      .filter(d => d.variance > 0)
      .reduce((sum, d) => sum + d.variance, 0);
  }, [discrepancyItems]);

  const totalShrinkage = useMemo(() => {
    return discrepancyItems
      .filter(d => d.variance < 0)
      .reduce((sum, d) => sum + Math.abs(d.variance), 0);
  }, [discrepancyItems]);

  // Filtered rows for the table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
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

      return {
        id: p.id,
        product: (
          <div className="min-w-[180px]">
            <p className="font-semibold text-foreground capitalize text-sm">{p.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
          </div>
        ),
        category: (
          <span className="text-xs text-muted-foreground font-medium capitalize bg-muted/40 px-2 py-0.5 rounded border border-border/40">
            {p.category}
          </span>
        ),
        system_stock: (
          <span className="font-semibold text-foreground text-sm">
            {p.quantity}{' '}
            <span className="text-xs font-normal text-muted-foreground">{p.base_unit_name}</span>
          </span>
        ),
        physical_stock: (
          <div className="flex items-center gap-2">
            <input 
              type="number"
              min="0"
              placeholder="Enter count..."
              className={`w-28 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                isCounted 
                  ? 'border-border bg-background font-semibold text-foreground' 
                  : 'border-border/60 bg-muted/40 text-muted-foreground'
              }`}
              value={actualVal}
              onChange={(e) => handleCountChange(p.id, e.target.value)}
            />
            {!isCounted && (
              <button
                type="button"
                onClick={() => handleQuickMatch(p)}
                title="Matches system count"
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors border border-dashed border-border"
              >
                Match
              </button>
            )}
          </div>
        ),
        variance: (
          <div className="flex items-center">
            {!isCounted ? (
              <span className="text-muted-foreground font-normal text-xs">—</span>
            ) : variance === 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/40">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                0 Match
              </span>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                variance > 0 
                  ? 'text-green-600 bg-green-400/10 border-green-500/20' 
                  : 'text-destructive bg-destructive/10 border-destructive/20'
              }`}>
                {variance > 0 ? `+${variance}` : variance} {p.base_unit_name}
              </span>
            )}
          </div>
        ),
        __record: p
      };
    });
  }, [filteredProducts, physicalCounts]);

  return (
    <PageLayout 
      title="Stock Reconciliation" 
      // subtitle="Conduct physical inventory counts. Enter counted numbers to automatically calculate variances and log discrepancy adjustments."
      constrainHeight={false}
      actions={
        <div className="flex items-center gap-2">
          {countedCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetCounts}
              className="h-9 px-3 text-xs gap-1.5 border-border rounded-md text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </Button>
          )}
          <Button
            type="button"
            disabled={countedCount === 0}
            onClick={() => setIsReviewModalOpen(true)}
            className="h-9 px-4 rounded-md font-semibold text-xs gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckSquare className="h-4 w-4" />
            Review & Apply ({countedCount})
          </Button>
        </div>
      }
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
                    / {products.length} SKUs
                  </span>
                </>
              )
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
                  <span className="text-[75%] font-normal ml-1">variances</span>
                </>
              )
            }
            className="border border-border"
            valueStyle={discrepancyItems.length > 0 ? "text-destructive xl:text-2xl" : "text-foreground xl:text-2xl"}
            action={<AlertTriangle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Net Balance Impact"
            value={
              isLoading ? (
                "..."
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">+{totalSurplus}</span>
                  <span className="text-muted-foreground font-normal text-sm">/</span>
                  <span className="text-destructive font-bold">-{totalShrinkage}</span>
                  <span className="text-xs font-normal text-muted-foreground">units</span>
                </div>
              )
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
            { uid: "all", name: "All Items" },
            { uid: "discrepancies", name: "Variances Only" },
            { uid: "counted", name: "Counted Items" },
            { uid: "uncounted", name: "Uncounted Items" },
          ]}
          filterValue={filterSelection}
          onFilterChange={(keys: any) => setFilterSelection(keys)}
          showAddButton={false}
          topActions={[
            {
              customComponent: (
                <div key="actions" className="flex items-center gap-2">
                  {/* Category cycle filter */}
                  {availableCategories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-[35px] md:h-[38px] px-3 py-1.5 border border-border rounded-md bg-muted text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Categories ({availableCategories.length})</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}

                  {/* Reset count button */}
                  {countedCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetCounts}
                      className="h-[35px] md:h-[38px] px-3 text-xs gap-1.5 border-border rounded-md text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          customAddButton={
            <Button
              type="button"
              // variant='outline'
              disabled={countedCount === 0}
              onClick={() => setIsReviewModalOpen(true)}
              className="h-[35px] md:h-[38px] px-4 rounded-md font-semibold text-xs gap-2 disabled:opacity-50"
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

      {/* MODAL: Review & Commit Reconciliation */}
      <CustomModal
        isOpen={isReviewModalOpen}
        onOpenChange={() => setIsReviewModalOpen(false)}
        size="lg"
        header={
          <div className="pt-2 border-b border-border/50 pb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
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
              <div className="border border-border/70 rounded-lg overflow-hidden">
                <div className="p-2.5 bg-muted/40 border-b border-border/70 font-semibold text-xs text-foreground flex justify-between items-center">
                  <span>Variances to be Logged ({discrepancyItems.length})</span>
                  <span className="text-[11px] text-muted-foreground font-normal font-mono">
                    Surplus: +{totalSurplus} | Shrinkage: -{totalShrinkage}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-border/40 text-xs">
                  {discrepancyItems.map((item) => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20">
                      <div>
                        <p className="font-semibold text-foreground capitalize">{item.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-[11px] text-muted-foreground">
                          <span>Prev: {item.quantity}</span>
                          <span className="mx-1">→</span>
                          <span className="font-semibold text-foreground">Count: {item.physicalCount}</span>
                        </div>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                          item.variance > 0
                            ? 'text-green-600 bg-green-400/10 border-green-500/20'
                            : 'text-destructive bg-destructive/10 border-destructive/20'
                        }`}>
                          {item.variance > 0 ? `+${item.variance}` : item.variance} {item.base_unit_name}
                        </span>
                      </div>
                    </div>
                  ))}
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
              className="rounded-md text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyReconciliation}
              disabled={isSaving}
              className="rounded-md text-xs h-9 bg-primary text-primary-foreground min-w-[140px]"
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
