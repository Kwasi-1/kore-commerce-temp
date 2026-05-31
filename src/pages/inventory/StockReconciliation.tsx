import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@nextui-org/react';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CheckSquare, Calculator } from 'lucide-react';

export default function StockReconciliation() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track actual counted quantities: { productId: physicalCount }
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/products?limit=100');
      setProducts(response.data.data.products || []);
      setPhysicalCounts({});
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

  const handleCountChange = (productId: string, newValue: string) => {
    const parsed = parseInt(newValue, 10);
    if (isNaN(parsed) || parsed < 0) return;
    
    setPhysicalCounts(prev => ({
      ...prev,
      [productId]: parsed
    }));
  };

  const handleReconcile = async () => {
    const updates = Object.entries(physicalCounts).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      // Only send if the physical count is different from the system count
      if (product && product.quantity !== quantity) {
        return { productId, quantity };
      }
      return null;
    }).filter(Boolean);

    if (updates.length === 0) {
      toast('No variances found to reconcile.', { icon: '✅' });
      return;
    }

    if (!window.confirm(`You are about to adjust ${updates.length} products to match their physical counts. Continue?`)) {
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch('/tenant/products/stock-update', { updates });
      toast.success('Stock reconciliation completed successfully');
      fetchProducts();
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to reconcile stock');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'system_stock', label: 'Expected (System)' },
    { key: 'physical_stock', label: 'Actual (Physical)' },
    { key: 'variance', label: 'Variance' }
  ];

  const rows = products.map((p: any) => {
    const isCounted = physicalCounts[p.id] !== undefined;
    const actualVal = isCounted ? physicalCounts[p.id] : '';
    const variance = isCounted ? (physicalCounts[p.id] - p.quantity) : 0;

    return {
      id: p.id,
      product: <span className="font-semibold text-foreground">{p.name}</span>,
      sku: <span className="font-mono text-sm text-muted-foreground">{p.sku || 'N/A'}</span>,
      system_stock: <span className="text-muted-foreground">{p.quantity}</span>,
      physical_stock: (
        <input 
          type="number"
          min="0"
          placeholder="Enter count..."
          className={`w-32 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            isCounted 
              ? 'border-primary bg-primary/5 dark:bg-primary/10 ' 
              : 'border-border dark:border-gray-700 bg-white  '
          }`}
          value={actualVal}
          onChange={(e) => handleCountChange(p.id, e.target.value)}
        />
      ),
      variance: (
        <span className={`font-bold ${
          !isCounted ? 'text-gray-300 dark:text-gray-700' :
          variance > 0 ? 'text-green-600' : 
          variance < 0 ? 'text-red-600' : 'text-muted-foreground'
        }`}>
          {!isCounted ? '-' : variance > 0 ? `+${variance}` : variance}
        </span>
      )
    };
  });

  const countedItems = Object.keys(physicalCounts).length;

  return (
    <PageLayout title="Stock Reconciliation">
      <div className="flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-2 gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Audit & Reconcile</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Conduct a physical inventory count. Enter the actual counted quantities below, and the system will automatically calculate the variance and adjust the database to match reality.
            </p>
          </div>
          <Button 
            onPress={handleReconcile}
            isLoading={isSaving}
            isDisabled={countedItems === 0}
            className={`font-bold px-6 h-12 ${
              countedItems > 0 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-foreground' 
                : 'bg-gray-200 text-muted-foreground dark:bg-gray-800 dark:text-muted-foreground'
            }`}
            startContent={!isSaving && <CheckSquare className="w-4 h-4" />}
          >
            Apply Reconciliation ({countedItems})
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
