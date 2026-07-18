import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import PurchaseOrderForm from '@/components/inventory/PurchaseOrderForm';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { PackageCheck, CreditCard } from 'lucide-react';

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(new Set(['all']));
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPOs = async () => {
    setIsLoading(true);
    try {
      const statusArr = Array.from(statusFilter);
      let url = '/tenant/purchase-orders?limit=50';
      if (statusArr[0] !== 'all') {
        url += `&status=${statusArr[0]}`;
      }

      const response = await apiClient.get(url);
      setPurchaseOrders(response.data.success?.data?.purchaseOrders || []);
    } catch (error) {
      console.error('Failed to fetch POs:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [statusFilter]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchPOs();
  };

  const handleReceive = async (poId: string) => {
    if (!window.confirm('Are you sure you want to mark this PO as received? This will add the items to your inventory stock automatically.')) {
      return;
    }

    try {
      const response = await apiClient.post(`/tenant/purchase-orders/${poId}/receive`);
      const unitsAdded = response.data.success.data.unitsReceived;
      toast.success(`PO Received! ${unitsAdded} units added to stock.`);
      fetchPOs();
    } catch (error: any) {
      console.error('Receive PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to receive PO');
    }
  };

  const columns = [
    { key: 'reference', label: 'Ref Number' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'date', label: 'Date Created' },
    { key: 'total', label: 'Total Value' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' }
  ];

  const rows = purchaseOrders.map((po: any) => {
    const isReceivable = po.status !== 'received' && po.status !== 'cancelled';
    
    // Build row actions
    const rowActions = [];
    if (isReceivable) {
      rowActions.push({ key: 'receive', label: 'Mark Received', icon: 'mdi:check-circle', className: 'text-success' });
    }

    return {
      id: po.id,
      reference: <span className="font-semibold text-foreground">{po.reference_number}</span>,
      supplier: po.supplier ? po.supplier.name : 'Unknown Supplier',
      date: new Date(po.date_created).toLocaleDateString(),
      total: <span className="font-medium"><CurrencyDisplay amount={po.total_amount || 0} /></span>,
      type: po.is_credit_purchase ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400">
          <CreditCard className="h-3 w-3" />
          Credit
          {po.credit_due_date && (
            <span className="text-[10px] text-amber-500 ml-0.5">
              · due {new Date(po.credit_due_date).toLocaleDateString()}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Cash</span>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${
          po.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' 
          : po.status === 'draft' ? 'text-muted-foreground bg-gray-50 dark:bg-gray-800 '
          : po.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {po.status}
        </span>
      ),
      rowActions,
      __record: po
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'receive') {
      handleReceive(row.id);
    }
  };

  return (
    <PageLayout title="Purchase Orders">
      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Purchase Orders History"
        
        showSearch={false} // Backend endpoint doesn't implement search parameter
        
        showFilter={true}
        filterLabel="Status"
        filterOptions={[
          { uid: 'all', name: 'All Statuses' },
          { uid: 'draft', name: 'Draft' },
          { uid: 'ordered', name: 'Ordered' },
          { uid: 'received', name: 'Received' },
          { uid: 'cancelled', name: 'Cancelled' }
        ]}
        filterValue={statusFilter}
        onFilterChange={(keys: any) => setStatusFilter(keys)}
        
        showAddButton={true}
        addButtonText="New PO"
        onAddButtonClick={() => setIsModalOpen(true)}
        onRowActionClick={handleRowActionClick}
        
        mobileFriendly={true}
      />

      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[520px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PackageCheck className="h-6 w-6 text-primary" />
              Draft Purchase Order
            </h2>
            <p className="text-sm text-muted-foreground font-normal">Add line items to order from your suppliers.</p>
          </div>
        }
        body={
          <PurchaseOrderForm 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsModalOpen(false)} 
          />
        }
      />
    </PageLayout>
  );
}
