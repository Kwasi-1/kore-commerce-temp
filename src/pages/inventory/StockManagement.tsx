import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent, { TableColumn } from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Package, Upload, Layers, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { Selection } from '@nextui-org/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { BulkStockUploadModal } from './components/BulkStockUploadModal';
import { QuickStockIntakeModal, ProductStockItem } from './components/QuickStockIntakeModal';
import { StockHistoryModal } from './components/StockHistoryModal';
import { PackagingStockDisplay } from '@/components/inventory/PackagingStockDisplay';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function StockManagement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<any>(null);

  // Search & Filter state (server-side)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Selection>(new Set(['all']));
  const [stockStatusFilter, setStockStatusFilter] = useState<Selection>(new Set(['all']));

  // Modals state
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);

  // History modal state
  const [historyProduct, setHistoryProduct] = useState<ProductStockItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  /** Flatten a raw products API page into ProductStockItem rows */
  const flattenProducts = (rawProducts: any[]): ProductStockItem[] => {
    const flatItems: ProductStockItem[] = [];
    rawProducts.forEach((p: any) => {
      const variants = p.variants || [];
      if (variants.length === 0) {
        flatItems.push({
          id: p.id,
          variantId: p.id,
          productId: p.id,
          name: p.name,
          category: p.category || 'General',
          sku: p.sku || '—',
          quantity: Number(p.stock_quantity ?? p.total_stock_base_units ?? 0),
          base_unit_name: p.base_unit_name || 'units',
          imageUrl: p.images?.[0] || p.imageUrl,
          packaging_tiers: p.packaging_tiers || [],
          cost_price: p.cost_price_per_base_unit || 0,
        });
      } else {
        variants.forEach((v: any) => {
          const attrVals = v.variant_attributes
            ? Object.values(v.variant_attributes).filter(Boolean)
            : [];
          const fullName = attrVals.length > 0 ? `${p.name} (${attrVals.join(', ')})` : p.name;
          flatItems.push({
            id: v.id,
            variantId: v.id,
            productId: p.id,
            name: fullName,
            category: p.category || 'General',
            sku: v.sku || p.sku || '—',
            quantity: Number(v.stock_quantity ?? 0),
            base_unit_name: v.base_unit_name || p.base_unit_name || 'units',
            imageUrl: p.images?.[0] || p.imageUrl,
            packaging_tiers: v.packaging_tiers || p.packaging_tiers || [],
            cost_price: v.cost_price_per_base_unit || 0,
          });
        });
      }
    });
    return flatItems;
  };

  /** Server-paginated fetch: search, category, and stock status are sent as query params */
  const fetchProducts = useCallback(async (pageNumber: number = 1) => {
    setIsLoading(true);
    try {
      let url = `/tenant/products?page=${pageNumber}&limit=20`;

      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const catVal = categoryFilter instanceof Set ? Array.from(categoryFilter)[0] : categoryFilter;
      if (catVal && catVal !== 'all') url += `&category=${encodeURIComponent(String(catVal))}`;

      // Stock status maps to the product status field on the server
      const stockVal = stockStatusFilter instanceof Set
        ? Array.from(stockStatusFilter)[0]
        : stockStatusFilter;
      if (stockVal && stockVal !== 'all') {
        // 'in_stock' / 'low_stock' / 'out_of_stock' are client-side concepts;
        // server only knows product status (active / inactive). We filter the
        // stock quantity client-side after receiving the page.
      }

      const response = await apiClient.get(url);
      const rawProducts = response.data.success?.data?.products || [];
      const pag = response.data.success?.data?.pagination || null;
      setPagination(pag);

      let flatItems = flattenProducts(rawProducts);

      // Apply stock status filter client-side (server doesn't have this concept)
      if (stockVal && stockVal !== 'all') {
        if (stockVal === 'in_stock') {
          flatItems = flatItems.filter(p => p.quantity > 5);
        } else if (stockVal === 'low_stock') {
          flatItems = flatItems.filter(p => p.quantity > 0 && p.quantity <= 5);
        } else if (stockVal === 'out_of_stock') {
          flatItems = flatItems.filter(p => p.quantity <= 0);
        }
      }

      setProducts(flatItems);
    } catch (error) {
      console.error('Failed to fetch products for stock management:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, stockStatusFilter]);

  /** Fetch all categories once from the dedicated endpoint */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/products/categories');
      setCategories(res.data.success?.data?.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Load categories once on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refetch products whenever search/filter changes (reset to page 1)
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Open Quick Restock Modal
  const handleOpenRestock = (product: ProductStockItem) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
  };

  // Open History Audit Modal
  const handleOpenHistory = (product: ProductStockItem) => {
    setHistoryProduct(product);
    setIsHistoryModalOpen(true);
  };

  // EnhancedTableComponent columns
  const columns: TableColumn[] = [
    { key: 'image', label: 'Image' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current Stock' },
    { key: 'status', label: 'Stock Status' },
  ];

  // EnhancedTableComponent rows mapping
  const rows = useMemo(() => {
    return products.map(p => {
      const isOutOfStock = p.quantity <= 0;
      const isLowStock = p.quantity > 0 && p.quantity <= 5;

      return {
        id: p.id,
        image: p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-muted border" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
            <Package className="h-5 w-5" />
          </div>
        ),
        name: (
          <div>
            <p className="font-semibold text-foreground capitalize text-sm">{p.name}</p>
          </div>
        ),
        category: (
          <span className="text-sm text-muted-foreground capitalize font-medium">{p.category}</span>
        ),
        sku: (
          <span className="font-mono text-sm text-muted-foreground">{p.sku}</span>
        ),
        current_stock: (
          <PackagingStockDisplay
            quantity={p.quantity}
            baseUnitName={p.base_unit_name}
            packagingTiers={p.packaging_tiers}
            primaryClassName={`font-bold text-sm ${
              isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-500' : 'text-foreground'
            }`}
          />
        ),
        status: (
          <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
            isOutOfStock
              ? 'text-destructive bg-destructive/10 border border-destructive/20'
              : isLowStock
                ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
                : 'text-green-600 bg-green-400/10'
          }`}>
            {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
          </span>
        ),
        __record: p,
      };
    });
  }, [products]);

  return (
    <PageLayout
      title="Stock Management"
      subtitle={
        <>
          <span className="hidden md:inline">
            Quickly adjust physical stock levels across all your inventory.
          </span>
          <span className="md:hidden">
            {products.length} product{products.length !== 1 ? 's' : ''} listed
          </span>
        </>
      }
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      {/* ========================================================================= */}
      {/* MOBILE STOCK MANAGEMENT VIEW (Hidden >= md, Block < md)                   */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* Action Capsule Bar (Search + Quick Actions) */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search by name, SKU, or category...",
          }}
          actions={[
            {
              label: 'Bulk Receive',
              icon: <Upload className="h-3.5 w-3.5 text-primary" />,
              onClick: () => setIsBulkStockModalOpen(true),
            },
            {
              label: 'Reconcile',
              icon: <Layers className="h-3.5 w-3.5 text-primary" />,
              onClick: () => navigate('/inventory/stock-reconciliation'),
            },
            {
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: () => fetchProducts(1),
            },
          ]}
        />

        {/* Stock List Activity Sheet */}
        <MobileActivitySheet
          title="Inventory Items"
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' },
            { id: 'in_stock', label: 'In Stock' },
          ]}
          activeTab={
            stockStatusFilter instanceof Set
              ? (Array.from(stockStatusFilter)[0] as string) || 'all'
              : (stockStatusFilter as string) || 'all'
          }
          onTabChange={(tabId) => setStockStatusFilter(new Set([tabId]))}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No products found matching your filter or search.
            </div>
          ) : (
            products.map((p) => {
              const isOutOfStock = p.quantity <= 0;
              const isLowStock = p.quantity > 0 && p.quantity <= 5;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenRestock(p)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors gap-3"
                >
                  {/* Left: Image + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden bg-muted flex items-center justify-center border border-border">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate max-w-[170px]">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                        {p.category || 'General'} &middot; <span className="font-mono">{p.sku}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Packaging Stock Display + Status Badge */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                    <PackagingStockDisplay
                      quantity={p.quantity}
                      baseUnitName={p.base_unit_name}
                      packagingTiers={p.packaging_tiers}
                      primaryClassName={`font-bold text-xs ${
                        isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-500' : 'text-foreground'
                      }`}
                    />
                    <span className={`capitalize inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isOutOfStock
                        ? 'text-destructive bg-destructive/10 border border-destructive/20'
                        : isLowStock
                          ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
                          : 'text-emerald-600 bg-emerald-500/10'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP STOCK MANAGEMENT VIEW (Hidden < md, Flex >= md)                   */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-6 relative h-full">
        {/* Enhanced Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          serverPagination={
            pagination
              ? {
                  ...pagination,
                  total: pagination.totalVariants ?? pagination.total,
                }
              : undefined
          }
          onPageChange={(page) => fetchProducts(page)}
          showSearch={true}
          searchPlaceholder="Search by name, SKU, or category..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showFilter={true}
          filterLabel="Stock Status"
          filterOptions={[
            { uid: 'all', name: 'All Statuses' },
            { uid: 'in_stock', name: 'In Stock (> 5)' },
            { uid: 'low_stock', name: 'Low Stock (1 - 5)' },
            { uid: 'out_of_stock', name: 'Out of Stock (0)' },
          ]}
          filterValue={stockStatusFilter}
          onFilterChange={(keys: any) => setStockStatusFilter(keys)}
          additionalFilters={[
            {
              label: 'Category',
              value: categoryFilter,
              onChange: (keys: any) => setCategoryFilter(keys),
              options: [
                { uid: 'all', name: 'All Categories' },
                ...categories.map((c) => ({ uid: c, name: c })),
              ],
            },
          ]}
          rowActions={[
            {
              key: 'adjust',
              label: 'Adjust Stock Level',
              icon: 'fluent:arrow-swap-20-filled',
            },
            {
              key: 'history',
              label: 'View Audit Trail',
              icon: 'fluent:history-20-filled',
            },
          ]}
          onRowActionClick={(actionKey, rowData) => {
            const originalProduct = rowData.__record;
            if (actionKey === 'adjust') {
              handleOpenRestock(originalProduct);
            } else if (actionKey === 'history') {
              handleOpenHistory(originalProduct);
            }
          }}
          showAddButton={true}
          addButtonText="Bulk Receive Stock"
          onAddButtonClick={() => setIsBulkStockModalOpen(true)}
          onRefresh={() => fetchProducts(1)}
          onclick={(key: any) => {
            const prod = products.find(p => p.id === key || p.id === key?.toString());
            if (prod) handleOpenRestock(prod);
          }}
          mobileFriendly={true}
        />
      </div>

      {/* QUICK RESTOCK MODAL */}
      <QuickStockIntakeModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => fetchProducts(pagination?.page || 1)}
      />

      {/* STOCK HISTORY & AUDIT TRAIL MODAL */}
      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryProduct(null);
        }}
        product={historyProduct}
        onAdjustClick={handleOpenRestock}
      />

      {/* BULK STOCK UPLOAD MODAL */}
      <BulkStockUploadModal
        isOpen={isBulkStockModalOpen}
        onClose={() => setIsBulkStockModalOpen(false)}
        onSuccess={() => fetchProducts(1)}
      />
    </PageLayout>
  );
}
