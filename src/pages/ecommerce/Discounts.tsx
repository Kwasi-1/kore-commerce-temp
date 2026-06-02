import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import DiscountForm from '@/components/ecommerce/DiscountForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CurrencyDisplay } from '@/hooks';

export default function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/discounts');
      setDiscounts(response.data.data.discounts || []);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleToggleActive = async (discount: any, checked: boolean) => {
    // Optimistic update
    setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, is_active: checked } : d));
    
    try {
      await apiClient.post(`/tenant/discounts/${discount.id}/toggle`, { is_active: checked });
    } catch (error) {
      // Revert on failure
      setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, is_active: !checked } : d));
      toast.error('Failed to toggle discount status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;
    
    try {
      await apiClient.delete(`/tenant/discounts/${id}`);
      toast.success('Discount deleted');
      fetchDiscounts();
    } catch (error) {
      toast.error('Failed to delete discount');
    }
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (discount: any) => {
    setEditingDiscount(discount);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchDiscounts();
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value' },
    { key: 'min_order', label: 'Min Order' },
    { key: 'uses', label: 'Uses' },
    { key: 'expiry', label: 'Expiry' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const rows = discounts.map((d: any) => {
    return {
      id: d.id,
      code: <span className="font-mono font-bold px-2 py-1 bg-muted/50 rounded-md text-foreground tracking-widest">{d.code}</span>,
      type: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${d.type === 'percentage' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
          {d.type}
        </span>
      ),
      value: <span className="font-semibold">{d.type === 'percentage' ? `${d.value}%` : <CurrencyDisplay amount={d.value} />}</span>,
      min_order: <span className="text-muted-foreground">{d.min_order_amount ? <CurrencyDisplay amount={d.min_order_amount} /> : 'None'}</span>,
      uses: (
        <div className="flex flex-col text-sm">
          <span>{d.uses_count} / {d.max_uses ? d.max_uses : '∞'}</span>
          {d.max_uses && <span className="text-[10px] text-muted-foreground">Uses left: {Math.max(0, d.max_uses - d.uses_count)}</span>}
        </div>
      ),
      expiry: <span className="text-muted-foreground">{d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'No expiry'}</span>,
      status: (
        <Switch
          checked={d.is_active}
          onCheckedChange={(checked) => handleToggleActive(d, checked)}
        />
      ),
      actions: (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(d)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(d.id)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      __record: d
    };
  });

  return (
    <PageLayout title="Discounts & Promotions">
      
      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Active Discounts"
        
        showAddButton={true}
        addButtonText="Create Discount"
        addButtonIcon="ph:plus-bold"
        onAddButtonClick={handleCreate}
        
        showSearch={true}
        searchPlaceholder="Search by code..."
        onRefresh={fetchDiscounts}
      />

      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="md"
        header={
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{editingDiscount ? 'Edit Discount' : 'Create Discount'}</h2>
          </div>
        }
        body={
          <DiscountForm
            discount={editingDiscount}
            onSuccess={handleSuccess}
            onCancel={() => setIsModalOpen(false)}
          />
        }
      />

    </PageLayout>
  );
}
