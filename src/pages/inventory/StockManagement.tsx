import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@nextui-org/react';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Save, Package } from 'lucide-react';

export default function StockManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track changes locally before saving: { productId: newQuantity }
  const [stockChanges, setStockChanges] = useState<Record<string, number>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/products?limit=100');
      setProducts(response.data.data.products || []);
      setStockChanges({}); // Reset changes on fresh fetch
    } catch (error) {
      console.error('Failed to fetch products for stock management:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleQuantityChange = (productId: string, newValue: string) => {
    const parsed = parseInt(newValue, 10);
    if (isNaN(parsed) || parsed < 0) return; // Prevent invalid inputs
    
    setStockChanges(prev => ({
      ...prev,
      [productId]: parsed
    }));
  };

  const handleSaveChanges = async () => {
    const updates = Object.entries(stockChanges).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    if (updates.length === 0) {
      toast('No changes to save.', { icon: 'ℹ️' });
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch('/tenant/products/stock-update', { updates });
      toast.success(`Successfully updated stock for ${updates.length} items`);
      fetchProducts();
    } catch (error: any) {
      console.error('Stock update error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update stock');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current Stock' },
    { key: 'new_stock', label: 'New Stock Level' }
  ];

  const rows = products.map((p: any) => {
    const isChanged = stockChanges[p.id] !== undefined && stockChanges[p.id] !== p.quantity;
    const displayVal = stockChanges[p.id] !== undefined ? stockChanges[p.id] : p.quantity;

    return {
      id: p.id,
      product: (
        <div className="flex items-center gap-3">
          <div className="hidden w-10 h-10 rounded-lg bg-muted shrink-0 overflow-hidden md:flex items-center justify-center border">
            {p.imageUrl || (p.images && p.images[0]) ? (
              <img src={p.imageUrl || p.images[0]} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">{p.name}</p>
            <p className="hidden lg:block text-xs text-muted-foreground capitalize">{p.category}</p>
          </div>
        </div>
      ),
      sku: <span className="font-mono text-sm text-muted-foreground">{p.sku || 'N/A'}</span>,
      current_stock: (
        <span className={`font-semibold ${p.quantity <= 5 ? 'text-red-500' : 'text-foreground'}`}>
          {p.quantity} <span className="text-muted-foreground font-normal">units</span>
        </span>
      ),
      new_stock: (
        <div className="flex items-center gap-2">
          <input 
            type="number"
            min="0"
            className={`w-24 px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-0 focus:ring-primary transition-colors ${
              isChanged 
                ? 'border-border  bg-inherit' 
                : 'border-border bg-muted/60'
            }`}
            value={displayVal}
            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
          />
          {isChanged && <span className="text-xs text-accent font-medium">Modified</span>}
        </div>
      )
    };
  });

  const hasChanges = Object.keys(stockChanges).length > 0;

  return (
    <PageLayout title="Stock Management" constrainHeight={true}>
      <div className="flex flex-col flex-1 min-h-0 relative h-full md:h-full gap-4">
        
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bulk Stock Updates</h2>
            <p className="text-sm text-muted-foreground">Quickly adjust physical stock levels across all your inventory.</p>
          </div>
          <Button 
            onPress={handleSaveChanges}
            isLoading={isSaving}
            isDisabled={!hasChanges}
            className={`font-bold px-6 ${
              hasChanges 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-gray-200 text-muted-foreground dark:bg-gray-800 dark:text-muted-foreground'
            }`}
            startContent={!isSaving && <Save className="w-4 h-4" />}
          >
            Save Changes ({Object.keys(stockChanges).length})
          </Button>
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          showSearch={true}
          showFilter={false}
          mobileFriendly={true}
        />

      </div>
    </PageLayout>
  );
}
