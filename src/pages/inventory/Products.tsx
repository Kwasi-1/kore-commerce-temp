import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ProductForm from '@/components/inventory/ProductForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

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

  // Table Configuration
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price (GHS)' },
    { key: 'quantity', label: 'Stock' },
    { key: 'status', label: 'Status' }
  ];

  // Map rows for the table
  const rows = products.map((p: any) => ({
    id: p.id,
    name: (
      <div className="flex items-center gap-3">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-md object-cover bg-gray-100" />
        ) : (
          <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            P
          </div>
        )}
        <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
      </div>
    ),
    sku: <span className="text-gray-500 text-sm font-mono">{p.sku}</span>,
    category: <span className="capitalize">{p.category || '—'}</span>,
    price: <span className="font-medium">{(p.price || 0).toFixed(2)}</span>,
    quantity: (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        p.quantity > 10 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
        : p.quantity > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {p.quantity}
      </span>
    ),
    status: (
      <span className={`capitalize inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        p.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
      }`}>
        {p.status}
      </span>
    ),
    rowActions: [
      { key: 'edit', label: 'Edit', icon: 'mdi:pencil' },
      // { key: 'delete', label: 'Delete', icon: 'mdi:trash', className: 'text-danger' }
    ],
    // keep original record attached for handlers
    __record: p 
  }));

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit') {
      handleEdit(row.__record);
    }
  };

  return (
    <PageLayout title="Inventory Products">
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
            <p className="text-sm text-gray-500 font-normal">Fill in the details below.</p>
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
