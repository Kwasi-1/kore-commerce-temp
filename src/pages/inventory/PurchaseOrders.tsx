import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import PurchaseOrderForm from '@/components/inventory/PurchaseOrderForm';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Button } from '@/components/ui/button';

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(new Set(['all']));
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<any | null>(null);

  // Detail Modal state
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReceivingPO, setIsReceivingPO] = useState(false);
  const [isCancellingPO, setIsCancellingPO] = useState(false);

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
    setEditingPO(null);
    fetchPOs();
  };

  const handleEdit = (po: any) => {
    setIsDetailModalOpen(false);
    setSelectedPO(null);
    setEditingPO(po);
    setIsModalOpen(true);
  };

  const handleCancel = async (poId: string, refNumber?: string) => {
    const confirmMsg = `Are you sure you want to cancel purchase order ${refNumber ? `"${refNumber}"` : ''}? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsCancellingPO(true);
    try {
      const response = await apiClient.post(`/tenant/purchase-orders/${poId}/cancel`);
      toast.success(response.data.success?.message || 'Purchase order cancelled');
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs();
    } catch (error: any) {
      console.error('Cancel PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to cancel PO');
    } finally {
      setIsCancellingPO(false);
    }
  };

  const handleReceive = async (poId: string) => {
    if (!window.confirm('Are you sure you want to mark this PO as received? This will add the items to your inventory stock automatically.')) {
      return;
    }

    setIsReceivingPO(true);
    try {
      const response = await apiClient.post(`/tenant/purchase-orders/${poId}/receive`);
      const unitsAdded = response.data.success?.data?.unitsReceived || 0;
      toast.success(`PO Received! ${unitsAdded} units added to stock.`);
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs();
    } catch (error: any) {
      console.error('Receive PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to receive PO');
    } finally {
      setIsReceivingPO(false);
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
    const isDraft = po.status === 'draft';
    
    // Build row actions
    const rowActions = [];
    if (isDraft) {
      rowActions.push({ key: 'edit', label: 'Edit Draft', icon: 'solar:pen-linear' });
    }
    if (isReceivable) {
      rowActions.push({ key: 'receive', label: 'Mark Received', icon: 'solar:check-circle-linear', className: 'text-success' });
      rowActions.push({ key: 'cancel', label: 'Cancel PO', icon: 'solar:close-circle-linear', className: 'text-destructive' });
    }

    const refNum = po.referenceNumber || po.reference_number || po.id?.slice(0, 8) || '—';
    const supplierName = po.supplierName || (po.supplier ? (typeof po.supplier === 'object' ? po.supplier.name : po.supplier) : 'Unknown Supplier');
    const rawDate = po.dateCreated || po.date_created || po.orderDate || po.order_date || po.created_at;
    const formattedDate = rawDate && !isNaN(new Date(rawDate).getTime()) 
      ? new Date(rawDate).toLocaleDateString() 
      : '—';
    const totalVal = Number(po.totalAmount ?? po.total_amount ?? 0);
    const isCredit = Boolean(po.isCreditPurchase ?? po.is_credit_purchase);
    const rawDueDate = po.creditDueDate || po.credit_due_date;
    const formattedDueDate = rawDueDate && !isNaN(new Date(rawDueDate).getTime())
      ? new Date(rawDueDate).toLocaleDateString()
      : null;

    return {
      id: po.id,
      reference: <span className="font-semibold text-foreground">{refNum}</span>,
      supplier: supplierName,
      date: formattedDate,
      total: <span className="font-medium"><CurrencyDisplay amount={totalVal} showStyling={false} /></span>,
      type: isCredit ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400">
          <Icon icon="solar:card-linear" className="h-3 w-3" />
          Credit
          {formattedDueDate && (
            <span className="text-[10px] text-amber-500 ml-0.5">
              · due {formattedDueDate}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground font-semibold">Cash</span>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${
          po.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' 
          : po.status === 'draft' ? 'text-muted-foreground bg-muted'
          : po.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-destructive bg-destructive/5'
        }`}>
          {po.status}
        </span>
      ),
      rowActions,
      __record: po
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    const po = row.__record || purchaseOrders.find((p: any) => p.id === row.id);
    if (actionKey === 'receive') handleReceive(row.id);
    if (actionKey === 'cancel') handleCancel(row.id, po?.referenceNumber || po?.reference_number);
    if (actionKey === 'edit' && po) handleEdit(po);
  };

  const handleRowClick = (keyOrRow: any) => {
    const poId = typeof keyOrRow === 'object' ? (keyOrRow.id || keyOrRow.key) : keyOrRow;
    const found = purchaseOrders.find((p: any) => p.id === poId || p.id === poId?.toString());
    if (found) {
      setSelectedPO(found);
      setIsDetailModalOpen(true);
    } else if (keyOrRow?.__record) {
      setSelectedPO(keyOrRow.__record);
      setIsDetailModalOpen(true);
    }
  };

  return (
    <PageLayout title="Purchase Orders" constrainHeight={true}>
      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="All Orders"
        
        showFilter={true}
        filterLabel="Status"
        filterOptions={[
          { uid: 'all', name: 'All Statuses' },
          { uid: 'draft', name: 'Draft' },
          { uid: 'ordered', name: 'Ordered' },
          { uid: 'received', name: 'Received' },
          { uid: 'cancelled', name: 'Cancelled' },
        ]}
        filterValue={statusFilter}
        onFilterChange={(keys: any) => setStatusFilter(keys)}
        
        showAddButton={true}
        addButtonText="New PO"
        onAddButtonClick={() => {
          setEditingPO(null);
          setIsModalOpen(true);
        }}
        onRowActionClick={handleRowActionClick}
        onclick={handleRowClick}
        
        mobileFriendly={true}
      />

      {/* PO Modal Form (Create & Edit) */}
      <PurchaseOrderForm 
        isOpen={isModalOpen}
        onOpenChange={() => {
          setIsModalOpen(false);
          setEditingPO(null);
        }}
        onSuccess={handleFormSuccess}
        initialPO={editingPO}
      />

      {/* PO Detail View Modal */}
      <CustomModal
        isOpen={isDetailModalOpen}
        onOpenChange={() => {
          setIsDetailModalOpen(false);
          setSelectedPO(null);
        }}
        size="3xl"
        classNames={{
          base: "rounded-xl min-h-[500px] scrollbar-hide"
        }}
        header={
          <div className="pt-2 px-2 border-b border-border/50 pb-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {selectedPO?.referenceNumber || selectedPO?.reference_number || "Purchase Order"}
              </h2>
              {selectedPO && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                  selectedPO.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                  : selectedPO.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : selectedPO.status === 'draft' ? 'text-muted-foreground bg-muted'
                  : 'text-destructive bg-destructive/5'
                }`}>
                  {selectedPO.status}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              Supplier: <strong className="text-foreground">{selectedPO?.supplierName || (selectedPO?.supplier ? (typeof selectedPO.supplier === 'object' ? selectedPO.supplier.name : selectedPO.supplier) : 'Unknown')}</strong>
            </p>
          </div>
        }
        body={
          selectedPO && (
            <div className="space-y-4 py-2 text-sm">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded bg-muted/20 border border-border/50">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Order Date</span>
                  <span className="text-xs font-semibold">
                    {selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created
                      ? new Date(selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Payment Type</span>
                  <span className="text-xs font-semibold">
                    {selectedPO.isCreditPurchase || selectedPO.is_credit_purchase ? "Credit" : "Cash"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Credit Due Date</span>
                  <span className="text-xs font-semibold">
                    {selectedPO.creditDueDate || selectedPO.credit_due_date
                      ? new Date(selectedPO.creditDueDate || selectedPO.credit_due_date).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Total Amount</span>
                  <span className="text-xs font-bold">
                    <CurrencyDisplay amount={Number(selectedPO.totalAmount ?? selectedPO.total_amount ?? 0)} showStyling={false} />
                  </span>
                </div>
              </div>

              {/* Notes if present */}
              {selectedPO.notes && (
                <div className="p-2.5 rounded border border-border text-xs text-muted-foreground">
                  <strong className="text-foreground">Notes:</strong> {selectedPO.notes}
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <div className="border rounded overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-inherit border-b border-border/70 font-semibold text-muted-foreground">
                        <th className="p-2.5">Item / Variant</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Tier</th>
                        <th className="p-2.5 text-center">Qty Ordered</th>
                        <th className="p-2.5 text-center">Qty Recv</th>
                        <th className="p-2.5 text-right">Cost</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(selectedPO.items || []).map((item: any, i: number) => {
                        const cost = typeof item.cost_price_per_tier === 'object' 
                          ? Number(item.cost_price_per_tier?.parsedValue ?? item.cost_price_per_tier?.source ?? 0)
                          : Number(item.cost_price_per_tier || 0);
                        const sub = typeof item.subtotal === 'object'
                          ? Number(item.subtotal?.parsedValue ?? item.subtotal?.source ?? 0)
                          : Number(item.subtotal || 0);

                        return (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="p-2.5 font-medium text-foreground capitalize">
                              {item.variant_name || item.variantName || "Unknown Variant"}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground">
                              {item.variant_sku || item.variantSku || "—"}
                            </td>
                            <td className="p-2.5 text-muted-foreground">
                              {item.packaging_tier_name || item.packagingTierName || "Unit"}
                            </td>
                            <td className="p-2.5 text-center font-semibold">
                              {item.quantity_ordered ?? item.quantityOrdered ?? 0}
                            </td>
                            <td className="p-2.5 text-center font-semibold text-green-600">
                              {item.quantity_received ?? item.quantityReceived ?? 0}
                            </td>
                            <td className="p-2.5 text-right">
                              <CurrencyDisplay amount={cost} showStyling={false} />
                            </td>
                            <td className="p-2.5 text-right font-semibold text-foreground">
                              <CurrencyDisplay amount={sub} showStyling={false} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        }
        footer={
          selectedPO ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 w-full">
              <div>
                {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCancel(selectedPO.id, selectedPO.referenceNumber || selectedPO.reference_number)}
                    disabled={isCancellingPO || isReceivingPO}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-medium flex items-center gap-1.5"
                  >
                    <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                    {isCancellingPO ? "Cancelling..." : "Cancel PO"}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedPO(null);
                  }}
                  className="text-xs font-medium"
                >
                  Close
                </Button>

                {selectedPO.status === 'draft' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(selectedPO)}
                    className="text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Icon icon="solar:pen-linear" className="h-3.5 w-3.5" />
                    Edit Draft
                  </Button>
                )}

                {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleReceive(selectedPO.id)}
                    disabled={isReceivingPO || isCancellingPO}
                    className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                    {isReceivingPO ? "Receiving..." : "Mark as Received"}
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      />
    </PageLayout>
  );
}

