import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ProductForm from '@/components/inventory/ProductForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Package, AlertTriangle, XCircle, DollarSign } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(new Set(['all']));
  const [categoryFilter, setCategoryFilter] = useState(new Set(['all']));
  const [categories, setCategories] = useState<string[]>([]);
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Get filters
      const statusArr = Array.from(statusFilter);
      const categoryArr = Array.from(categoryFilter);
      
      let url = '/tenant/products?limit=50';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (statusArr[0] !== 'all') url += `&status=${statusArr[0]}`;
      if (categoryArr[0] !== 'all') url += `&category=${categoryArr[0]}`;

      const response = await apiClient.get(url);
      const data = response.data.data.products || [];
      setProducts(data);
      
      // Extract categories for filter options if we haven't already
      if (categories.length === 0) {
        const uniqueCats = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean))) as string[];
        setCategories(uniqueCats);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Adding a small debounce to search
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, categoryFilter]);

  // Handle Form Submission Success
  const handleFormSuccess = () => {
    setIsModalOpen(false);
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

  // Calculate metrics
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.reorder_point || 5)).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);

  // Table Configuration
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price (GHS)' },
    { key: 'stock_quantity', label: 'Stock' },
    { key: 'status', label: 'Status' }
  ];

  // Map rows for the table
  const rows = products.map((p: any) => {
    const stock = p.stock_quantity || 0;
    const isOutOfStock = stock === 0;
    const isLowStock = stock > 0 && stock <= (p.reorder_point || 5);

    return {
      id: p.id,
      name: (
        <div className="flex items-center gap-3 py-1">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-xl object-cover bg-muted border" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border">
              <Package className="h-5 w-5" />
            </div>
          )}
          <span className="font-bold text-foreground text-sm">{p.name}</span>
        </div>
      ),
      sku: <span className="text-muted-foreground text-sm font-mono">{p.sku}</span>,
      category: <span className="capitalize font-medium text-sm">{p.category || '—'}</span>,
      price: <span className="font-bold text-sm">{(p.price || 0).toFixed(2)}</span>,
      stock_quantity: (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
          isOutOfStock ? 'bg-destructive/10 text-destructive border border-destructive/20' 
          : isLowStock ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
          : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
        }`}>
          {stock} in stock
        </span>
      ),
      status: (
        <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
          p.status === 'active' ? 'text-primary bg-primary/10 border border-primary/20' : 'text-muted-foreground bg-muted border border-border'
        }`}>
          {p.status || 'Active'}
        </span>
      ),
      rowActions: [
        { key: 'edit', label: 'Edit', icon: 'mdi:pencil' },
      ],
      // keep original record attached for handlers
      __record: p 
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit') {
      handleEdit(row.__record);
    }
  };

  return (
    <PageLayout title="Inventory Products">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Total Products</p>
            <h3 className="text-2xl font-bold tracking-tight">{totalProducts}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Low Stock</p>
            <h3 className="text-2xl font-bold tracking-tight">{lowStockCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Out of Stock</p>
            <h3 className="text-2xl font-bold tracking-tight text-destructive">{outOfStockCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-card border rounded-[20px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-1">Inventory Value</p>
            <h3 className="text-2xl font-bold tracking-tight">
              <span className="text-sm font-normal text-muted-foreground mr-1">GHS</span>
              {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Products List"
        
        showSearch={true}
        searchPlaceholder="Search by name or SKU..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        
        // Status Filter
        showFilter={true}
        filterLabel="Status"
        filterOptions={[
          { uid: 'all', name: 'All Statuses' },
          { uid: 'active', name: 'Active' },
          { uid: 'draft', name: 'Draft' }
        ]}
        filterValue={statusFilter}
        onFilterChange={(keys: any) => setStatusFilter(keys)}
        
        // Category Filter
        additionalFilters={[
          {
            label: 'Category',
            value: categoryFilter,
            onChange: (keys: any) => setCategoryFilter(keys),
            options: [
              { uid: 'all', name: 'All Categories' },
              ...categories.map(c => ({ uid: c, name: c }))
            ]
          }
        ]}
        
        // Actions
        showAddButton={true}
        addButtonText="New Product"
        addButtonIcon="lucide:plus"
        onAddButtonClick={openNewProduct}
        onRowActionClick={handleRowActionClick}
        
        // Mobile compatibility
        mobileFriendly={true}
      />

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
          <ProductForm 
            initialData={editingProduct} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsModalOpen(false)} 
          />
        }
      />
    </PageLayout>
  );
}
