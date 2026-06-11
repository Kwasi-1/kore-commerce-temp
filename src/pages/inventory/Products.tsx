import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CustomModal from '@/components/modals/modal';
import ProductForm from '@/components/inventory/ProductForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  Package, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Archive, 
  Trash2, 
  Loader2, 
  Search, 
  Layers
} from 'lucide-react';
import { BulkProductUploadModal } from './components/BulkProductUploadModal';
import { Button } from '@/components/ui/button';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Row Actions state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accordion / cache state for variants
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [productVariantsCache, setProductVariantsCache] = useState<Record<string, any[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let url = '/tenant/products?limit=100';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;

      const response = await apiClient.get(url);
      const data = response.data.data.products || [];
      setProducts(data);
      
      // Extract categories for filter options
      const uniqueCats = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean))) as string[];
      setCategories(prev => {
        const union = Array.from(new Set([...prev, ...uniqueCats]));
        return union;
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, categoryFilter]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setProductVariantsCache({});
    fetchProducts();
  };

  const handleBulkSuccess = () => {
    setIsBulkModalOpen(false);
    setProductVariantsCache({});
    fetchProducts();
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenant/products/${productToDelete.id}`);
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (product: any, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/tenant/products/${product.id}/status`, { status: newStatus });
      toast.success(`Product marked as ${newStatus}`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Toggle variant row expansion and lazy-load details
  const handleToggleExpand = async (productId: string) => {
    const isExpanded = !!expandedProductIds[productId];
    
    setExpandedProductIds(prev => ({
      ...prev,
      [productId]: !isExpanded
    }));

    if (!isExpanded && !productVariantsCache[productId]) {
      setLoadingVariants(prev => ({ ...prev, [productId]: true }));
      try {
        const res = await apiClient.get(`/tenant/products/${productId}`);
        const productDetails = res.data.data.product;
        const variants = productDetails.variants || [];
        setProductVariantsCache(prev => ({
          ...prev,
          [productId]: variants
        }));
      } catch (err) {
        console.error("Failed to fetch product variants:", err);
        toast.error("Failed to load variants");
        setExpandedProductIds(prev => ({
          ...prev,
          [productId]: false
        }));
      } finally {
        setLoadingVariants(prev => ({ ...prev, [productId]: false }));
      }
    }
  };

  // Helper to compute stock display (flexible / unit / pack only)
  const getStockDisplay = (variant: any) => {
    const qty = variant.stock_quantity || 0;
    if (variant.sell_mode === 'pack_only') {
      const defaultPurchaseTier = variant.packaging_tiers?.find((t: any) => t.is_default_purchase_unit);
      if (defaultPurchaseTier && defaultPurchaseTier.units_per_tier > 0) {
        return {
          value: qty / defaultPurchaseTier.units_per_tier,
          unit: defaultPurchaseTier.name
        };
      }
    }
    return {
      value: qty,
      unit: variant.base_unit_name || 'unit'
    };
  };

  // Helper to determine the retail price
  const getRetailPrice = (variant: any) => {
    let tier = variant.packaging_tiers?.find((t: any) => t.is_default_sale_unit);
    if (!tier) {
      tier = variant.packaging_tiers?.find((t: any) => t.is_base_unit);
    }
    if (!tier && variant.packaging_tiers?.length > 0) {
      tier = variant.packaging_tiers[0];
    }
    if (tier) {
      const priceRec = tier.prices?.find((p: any) => p.price_type === 'retail');
      if (priceRec) return priceRec.price;
    }
    return variant.cost_price_per_base_unit || 0;
  };

  // Calculate metrics
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.total_stock_base_units === 0).length;
  const lowStockCount = products.filter(p => p.total_stock_base_units > 0 && p.total_stock_base_units <= 5).length;
  
  // Custom total value calculation based on average or base unit prices
  const totalValue = products.reduce((sum, p) => sum + (p.total_stock_base_units || 0), 0);

  // Status Filter Tabs
  const statuses = [
    { uid: 'all', name: 'All' },
    { uid: 'active', name: 'Active' },
    { uid: 'draft', name: 'Draft' },
    { uid: 'archived', name: 'Archived' }
  ];

  return (
    <PageLayout title="Products Inventory">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Total Products</p>
            <h3 className="text-2xl font-bold tracking-tight">{totalProducts}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Low Stock</p>
            <h3 className="text-2xl font-bold tracking-tight">{lowStockCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Out of Stock</p>
            <h3 className="text-2xl font-bold tracking-tight text-destructive">{outOfStockCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Total Base Units</p>
            <h3 className="text-2xl font-bold tracking-tight">
              {totalValue.toLocaleString()}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border rounded-[20px] shadow-sm overflow-hidden mb-6">
        {/* Toolbar */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder-muted-foreground"
            />
            <div className="absolute left-3 top-2.5 text-muted-foreground">
              <Search className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Category Select Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-xl bg-muted/50 text-sm focus:outline-none text-foreground font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <Button
              onClick={openNewProduct}
              className="gap-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm px-4"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(true)}
              className="gap-2 font-bold rounded-xl text-sm border-border text-foreground px-4"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </div>
        </div>

        {/* Status Tab list */}
        <div className="px-6 py-2.5 bg-muted/10 border-b border-border flex gap-2 overflow-x-auto scrollbar-hide">
          {statuses.map(s => (
            <button
              key={s.uid}
              onClick={() => setStatusFilter(s.uid)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === s.uid
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Package className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/5 text-xs text-muted-foreground font-semibold uppercase">
                  <th className="px-6 py-4 w-12"></th>
                  <th className="px-6 py-4 w-16">Image</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Variants</th>
                  <th className="px-6 py-4">Total Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map(p => {
                  const isExpanded = !!expandedProductIds[p.id];
                  const variants = productVariantsCache[p.id] || [];
                  const isLoadingVars = !!loadingVariants[p.id];

                  return (
                    <React.Fragment key={p.id}>
                      {/* Main Product Row */}
                      <tr 
                        onClick={() => handleToggleExpand(p.id)}
                        className="hover:bg-muted/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-muted border" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground text-sm">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium capitalize">
                          {p.category || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            {p.has_variants ? `${p.variant_count} variants` : 'Simple'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.total_stock_base_units === 0 ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                            : p.total_stock_base_units <= 5 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                            : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                          }`}>
                            {p.total_stock_base_units} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.status === 'active' ? 'text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20' : 'text-muted-foreground bg-muted border border-border'
                          }`}>
                            {p.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(p)}
                              className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
                              title="Edit Product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateStatus(p, p.status === 'active' ? 'draft' : 'active')}
                              className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
                              title={p.status === 'active' ? 'Archive Product' : 'Activate Product'}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setProductToDelete(p);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion content */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-muted/10 border-b border-border">
                            {isLoadingVars ? (
                              <div className="flex items-center justify-center py-6 gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Loading variants...</span>
                              </div>
                            ) : variants.length === 0 ? (
                              <div className="text-center py-4 text-xs text-muted-foreground">
                                No variants found for this product.
                              </div>
                            ) : (
                              <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/20 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                      <th className="px-4 py-2.5">Attributes</th>
                                      <th className="px-4 py-2.5">SKU</th>
                                      <th className="px-4 py-2.5">Sell Mode</th>
                                      <th className="px-4 py-2.5">Stock</th>
                                      <th className="px-4 py-2.5">Default Sale Tier</th>
                                      <th className="px-4 py-2.5">Retail Price</th>
                                      <th className="px-4 py-2.5 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border text-xs">
                                    {variants.map((v: any) => {
                                      const attrStr = Object.entries(v.variant_attributes || {})
                                        .map(([key, val]) => `${key}: ${val}`)
                                        .join(', ') || 'Default';
                                        
                                      const stockInfo = getStockDisplay(v);
                                      const defaultSaleTier = v.packaging_tiers?.find((t: any) => t.is_default_sale_unit);
                                      const defaultSaleTierName = defaultSaleTier ? defaultSaleTier.name : v.base_unit_name;
                                      const retailPrice = getRetailPrice(v);

                                      return (
                                        <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                                          <td className="px-4 py-2.5 font-bold text-foreground capitalize">
                                            {attrStr}
                                          </td>
                                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                                            {v.sku}
                                          </td>
                                          <td className="px-4 py-2.5 capitalize">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                                              {v.sell_mode?.replace('_', ' ')}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <span className={`font-semibold ${v.stock_quantity === 0 ? 'text-destructive font-bold' : 'text-foreground'}`}>
                                              {Number(stockInfo.value.toFixed(2))} {stockInfo.unit}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 capitalize">
                                            {defaultSaleTierName || '—'}
                                          </td>
                                          <td className="px-4 py-2.5 font-semibold text-foreground">
                                            GHS {Number(retailPrice).toFixed(2)}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            <div className="flex justify-end gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toast.success(`Edit variant ${v.sku}`)}
                                                className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                                                title="Edit Variant"
                                              >
                                                <Edit className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toast.success(`Manage tiers for ${v.sku}`)}
                                                className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                                                title="Manage Tiers"
                                              >
                                                <Layers className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Product Form Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{
          base: "sm:w-[500px]",
        }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-sm text-muted-foreground font-normal">Fill in the details below.</p>
          </div>
        }
        body={
          <div className="p-2 pb-6">
            <ProductForm 
              onSuccess={handleFormSuccess} 
              onCancel={() => setIsModalOpen(false)}
              initialData={editingProduct} 
            />
          </div>
        }
        footer={null}
      />

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={isDeleteModalOpen}
        onOpenChange={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        size="md"
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold text-destructive">Delete Product</h2>
            <p className="text-sm text-muted-foreground font-normal">This action cannot be undone.</p>
          </div>
        }
        body={
          <div className="p-2 py-4">
            <p className="text-sm text-foreground">
              Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This will remove it permanently from your inventory.
            </p>
          </div>
        }
        footer={
          <div className="flex gap-2 w-full justify-end px-2 pb-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </Button>
          </div>
        }
      />

      <BulkProductUploadModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />
    </PageLayout>
  );
}
