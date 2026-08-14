import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent, { TableColumn } from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';
import { Selection } from '@nextui-org/react';
import { BulkStockUploadModal } from './components/BulkStockUploadModal';
import { QuickStockIntakeModal, ProductStockItem } from './components/QuickStockIntakeModal';
import { StockHistoryModal } from './components/StockHistoryModal';

export default function StockManagement() {
  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Search & Filter state
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

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/products?limit=150');
      const rawProducts = response.data.success?.data?.products || [];
      
      const flatItems: ProductStockItem[] = [];
      const catSet = new Set<string>();

      rawProducts.forEach((p: any) => {
        if (p.category) catSet.add(p.category);
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
            cost_price: p.cost_price_per_base_unit || 0
          });
        } else {
          variants.forEach((v: any) => {
            const attrVals = v.variant_attributes ? Object.values(v.variant_attributes).filter(Boolean) : [];
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
              cost_price: v.cost_price_per_base_unit || 0
            });
          });
        }
      });

      setProducts(flatItems);
      setCategories(Array.from(catSet));
    } catch (error) {
      console.error('Failed to fetch products for stock management:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
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

  // Filter products for table
  const filteredProducts = useMemo(() => {
    let result = products;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    const catVal = categoryFilter instanceof Set ? Array.from(categoryFilter)[0] : categoryFilter;
    if (catVal && catVal !== 'all') {
      result = result.filter(p => p.category === catVal);
    }

    // Stock status filter
    const stockVal = stockStatusFilter instanceof Set ? Array.from(stockStatusFilter)[0] : stockStatusFilter;
    if (stockVal === 'in_stock') {
      result = result.filter(p => p.quantity > 5);
    } else if (stockVal === 'low_stock') {
      result = result.filter(p => p.quantity > 0 && p.quantity <= 5);
    } else if (stockVal === 'out_of_stock') {
      result = result.filter(p => p.quantity <= 0);
    }

    return result;
  }, [products, searchQuery, categoryFilter, stockStatusFilter]);

  // EnhancedTableComponent columns
  const columns: TableColumn[] = [
    { key: 'image', label: 'Image' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current Stock' },
    { key: 'status', label: 'Stock Status' }
  ];

  // EnhancedTableComponent rows mapping
  const rows = useMemo(() => {
    return filteredProducts.map(p => {
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
          <span className="text-xs text-muted-foreground capitalize font-medium">{p.category}</span>
        ),
        sku: (
          <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
        ),
        current_stock: (
          <span className={`font-bold text-sm ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-500' : 'text-foreground'}`}>
            {Number(p.quantity).toLocaleString()} {p.base_unit_name}
          </span>
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
        __record: p
      };
    });
  }, [filteredProducts]);

  return (
    <PageLayout 
      title="Stock Management" 
      subtitle="Quickly adjust physical stock levels across all your inventory." 
      constrainHeight={true}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        {/* Enhanced Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Product Stock Directory"
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
              label: "Category",
              value: categoryFilter,
              onChange: (keys: any) => setCategoryFilter(keys),
              options: [
                { uid: "all", name: "All Categories" },
                ...categories.map((c) => ({ uid: c, name: c })),
              ],
            },
          ]}
          rowActions={[
            {
              key: "adjust",
              label: "Adjust Stock Level",
              icon: "fluent:arrow-swap-20-filled",
            },
            {
              key: "history",
              label: "View Audit Trail",
              icon: "fluent:history-20-filled",
            },
          ]}
          onRowActionClick={(actionKey, rowData) => {
            const originalProduct = rowData.__record;
            if (actionKey === "adjust") {
              handleOpenRestock(originalProduct);
            } else if (actionKey === "history") {
              handleOpenHistory(originalProduct);
            }
          }}
          showAddButton={true}
          addButtonText="Bulk Receive Stock"
          onAddButtonClick={() => setIsBulkStockModalOpen(true)}
          onRefresh={fetchProducts}
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
        onSuccess={fetchProducts}
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
        onSuccess={fetchProducts}
      />
    </PageLayout>
  );
}
