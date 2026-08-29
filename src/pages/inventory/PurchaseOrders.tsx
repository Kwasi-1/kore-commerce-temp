import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import PurchaseOrderForm from '@/components/inventory/PurchaseOrderForm';
import PurchaseOrderDetailModal from '@/components/inventory/PurchaseOrderDetailModal';
import PurchaseOrderReceiveModal, { ReceiveItemRow } from '@/components/inventory/PurchaseOrderReceiveModal';
import PurchaseOrderCancelModal from '@/components/inventory/PurchaseOrderCancelModal';
import PurchaseOrderCloseEarlyModal from '@/components/inventory/PurchaseOrderCloseEarlyModal';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react/dist/iconify.js';
import { 
  Plus, 
  RefreshCw, 
  CreditCard, 
  ArrowDownToLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function PurchaseOrders() {
  const isMobile = useIsMobile();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<any | null>(null);

  // Detail Modal state
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Custom Confirmation Modal states
  const [poToReceive, setPoToReceive] = useState<any | null>(null);
  const [receiveRows, setReceiveRows] = useState<ReceiveItemRow[]>([]);
  const [poToCancel, setPoToCancel] = useState<any | null>(null);
  const [poToCloseEarly, setPoToCloseEarly] = useState<any | null>(null);
  const [isReceivingPO, setIsReceivingPO] = useState(false);
  const [isCancellingPO, setIsCancellingPO] = useState(false);
  const [isClosingPO, setIsClosingPO] = useState(false);

  const fetchPOs = useCallback(async (pageNumber: number = 1) => {
    setIsLoading(true);
    try {
      const statusArr = Array.from(statusFilter);
      let url = `/tenant/purchase-orders?page=${pageNumber}&limit=20`;
      if (statusArr[0] && statusArr[0] !== 'all') {
        url += `&status=${encodeURIComponent(statusArr[0])}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await apiClient.get(url);
      setPurchaseOrders(response.data.success?.data?.purchaseOrders || []);
      setPagination(response.data.success?.data?.pagination || null);
    } catch (error) {
      console.error('Failed to fetch POs:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchPOs(1);
  }, [fetchPOs]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingPO(null);
    fetchPOs(pagination?.page || 1);
  };

  const handleEdit = (po: any) => {
    setIsDetailModalOpen(false);
    setSelectedPO(null);
    setEditingPO(po);
    setIsModalOpen(true);
  };

  const handleOpenReceiveModal = (po: any) => {
    const rows: ReceiveItemRow[] = (po.items || []).map((item: any) => {
      const qtyOrd = Number(item.quantity_ordered ?? item.quantityOrdered ?? 0);
      const qtyAlready = Number(item.quantity_received ?? item.quantityReceived ?? 0);
      const remaining = Math.max(0, qtyOrd - qtyAlready);
      const cost = typeof item.cost_price_per_tier === 'object'
        ? Number(item.cost_price_per_tier?.parsedValue ?? item.cost_price_per_tier?.source ?? 0)
        : Number(item.cost_price_per_tier ?? item.costPricePerTier ?? 0);

      return {
        variant_id: item.variant_id || item.variantId,
        packaging_tier_id: item.packaging_tier_id || item.packagingTierId,
        variant_name: item.variant_name || item.variantName || 'Item',
        variant_sku: item.variant_sku || item.variantSku || '—',
        tier_name: item.packaging_tier_name || item.packagingTierName || 'Unit',
        quantity_ordered: qtyOrd,
        quantity_already_received: qtyAlready,
        quantity_remaining: remaining,
        quantity_to_receive: remaining,
        cost_price_per_tier: cost,
      };
    });

    setReceiveRows(rows);
    setPoToReceive(po);
  };

  const handleReceiveQtyChange = (index: number, valStr: string) => {
    const rawVal = parseInt(valStr, 10);
    setReceiveRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const maxAllowed = Math.max(0, row.quantity_ordered - row.quantity_already_received);
        if (!isNaN(rawVal) && rawVal > maxAllowed) {
          toast.error(`Quantity cannot exceed remaining (${maxAllowed})`, { id: 'po-max-qty' });
        }
        const clampedVal = isNaN(rawVal) ? 0 : Math.min(maxAllowed, Math.max(0, rawVal));
        return { ...row, quantity_to_receive: clampedVal };
      })
    );
  };

  const handleReceiveCostChange = (index: number, valStr: string) => {
    const val = parseFloat(valStr);
    setReceiveRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, cost_price_per_tier: isNaN(val) || val < 0 ? 0 : val } : row
      )
    );
  };

  const handleSetAllReceiveRemaining = () => {
    setReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        quantity_to_receive: Math.max(0, row.quantity_ordered - row.quantity_already_received),
      }))
    );
  };

  const handleClearAllReceive = () => {
    setReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        quantity_to_receive: 0,
      }))
    );
  };

  const handleConfirmCancel = async () => {
    if (!poToCancel) return;
    setIsCancellingPO(true);
    try {
      await apiClient.post(`/tenant/purchase-orders/${poToCancel.id}/cancel`);
      toast.success('Purchase order cancelled');
      setPoToCancel(null);
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs(pagination?.page || 1);
    } catch (error: any) {
      console.error('Cancel PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to cancel purchase order');
    } finally {
      setIsCancellingPO(false);
    }
  };

  const handleConfirmCloseEarly = async () => {
    if (!poToCloseEarly) return;
    setIsClosingPO(true);
    try {
      await apiClient.post(`/tenant/purchase-orders/${poToCloseEarly.id}/close`);
      toast.success('Purchase order closed');
      setPoToCloseEarly(null);
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs(pagination?.page || 1);
    } catch (error: any) {
      console.error('Close PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to close purchase order');
    } finally {
      setIsClosingPO(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!poToReceive) return;
    const itemsToReceive = receiveRows
      .filter((r) => Number(r.quantity_to_receive) > 0)
      .map((r) => ({
        variant_id: r.variant_id,
        packaging_tier_id: r.packaging_tier_id,
        quantity_received: Number(r.quantity_to_receive),
        cost_price_per_tier: Number(r.cost_price_per_tier),
      }));

    if (itemsToReceive.length === 0) {
      toast.error('Please enter at least one quantity to receive');
      return;
    }

    setIsReceivingPO(true);
    try {
      await apiClient.post(`/tenant/purchase-orders/${poToReceive.id}/receive`, {
        items: itemsToReceive,
      });
      toast.success('Stock received successfully');
      setPoToReceive(null);
      setReceiveRows([]);
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs(pagination?.page || 1);
    } catch (error: any) {
      console.error('Receive stock error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to receive stock');
    } finally {
      setIsReceivingPO(false);
    }
  };

  const activeMobileTab = useMemo(() => {
    if (statusFilter instanceof Set) {
      return (Array.from(statusFilter)[0] as string) || 'all';
    }
    return (statusFilter as string) || 'all';
  }, [statusFilter]);

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total Amount' },
    { key: 'type', label: 'Payment Terms' },
    { key: 'status', label: 'Status' }
  ];

  const rows = purchaseOrders.map((po: any) => {
    const isReceivable = po.status !== 'received' && po.status !== 'cancelled';
    const isDraft = po.status === 'draft';
    const isPartial = po.status === 'partially_received';
    
    const rowActions = [];
    if (isDraft) {
      rowActions.push({ key: 'edit', label: 'Edit Draft', icon: 'solar:pen-linear' });
    }
    if (isReceivable) {
      rowActions.push({
        key: 'receive',
        label: isPartial ? 'Receive More' : 'Receive Stock',
        icon: 'solar:check-circle-linear',
        className: 'text-success'
      });
      if (isPartial) {
        rowActions.push({ key: 'close_early', label: 'Close PO', icon: 'solar:check-read-linear' });
      }
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${
          po.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' 
          : po.status === 'partially_received' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400'
          : po.status === 'draft' ? 'text-muted-foreground bg-muted'
          : po.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-destructive bg-destructive/5'
        }`}>
          {po.status === 'partially_received' ? 'Partial' : po.status}
        </span>
      ),
      rowActions,
      __record: po
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    const po = row.__record || purchaseOrders.find((p: any) => p.id === row.id);
    if (actionKey === 'receive' && po) handleOpenReceiveModal(po);
    if (actionKey === 'close_early' && po) setPoToCloseEarly(po);
    if (actionKey === 'cancel' && po) setPoToCancel(po);
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
    <PageLayout 
      title="Purchase Orders" 
      subtitle={
        isMobile ? (
          `${purchaseOrders.length} order${purchaseOrders.length !== 1 ? 's' : ''} listed`
        ) : undefined
      }
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      <MobileDashboardWrapper className="block md:hidden">
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search reference, supplier, or notes...",
          }}
          actions={[
            {
              label: 'New PO',
              icon: <Plus className="h-3.5 w-3.5 text-primary" />,
              onClick: () => {
                setEditingPO(null);
                setIsModalOpen(true);
              },
            },
            {
              label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: () => fetchPOs(1),
            },
          ]}
        />

        <MobileActivitySheet
          title="All Orders"
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'ordered', label: 'Ordered' },
            { id: 'partially_received', label: 'Partial' },
            { id: 'received', label: 'Received' },
            { id: 'draft', label: 'Draft' },
            { id: 'cancelled', label: 'Cancelled' },
          ]}
          activeTab={activeMobileTab}
          onTabChange={(tabId) => setStatusFilter(new Set([tabId]))}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : purchaseOrders.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No purchase orders found matching your filter or search.
            </div>
          ) : (
            purchaseOrders.map((po) => {
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
              const isReceivable = po.status === 'ordered' || po.status === 'partially_received';

              return (
                <div
                  key={po.id}
                  onClick={() => handleRowClick(po)}
                  className="py-3 flex flex-col gap-2 text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate max-w-[200px]">
                        {refNum}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {supplierName} &middot; {formattedDate}
                      </p>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                      po.status === 'received'
                        ? 'text-emerald-600 bg-emerald-500/10'
                        : po.status === 'partially_received'
                          ? 'text-amber-600 bg-amber-500/10'
                          : po.status === 'ordered'
                            ? 'text-blue-600 bg-blue-500/10'
                            : po.status === 'draft'
                              ? 'text-muted-foreground bg-muted'
                              : 'text-destructive bg-destructive/10'
                    }`}>
                      {po.status === 'partially_received' ? 'Partial' : po.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      {isCredit ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400">
                          <CreditCard className="h-3 w-3" />
                          <span>Credit{formattedDueDate ? ` · due ${formattedDueDate}` : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground">Cash</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        <CurrencyDisplay amount={totalVal} showStyling={false} />
                      </span>

                      {isReceivable && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReceiveModal(po);
                          }}
                          className="h-6 px-2 text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1"
                        >
                          <ArrowDownToLine className="h-3 w-3" />
                          <span>Receive</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="All Orders"
          serverPagination={pagination}
          onPageChange={(page) => fetchPOs(page)}
          showSearch={true}
          searchPlaceholder="Search reference, supplier, or notes..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => fetchPOs(1)}
          
          showFilter={true}
          filterLabel="Status"
          filterOptions={[
            { uid: 'all', name: 'All Statuses' },
            { uid: 'draft', name: 'Draft' },
            { uid: 'ordered', name: 'Ordered' },
            { uid: 'partially_received', name: 'Partially Received' },
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
      </div>

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
      <PurchaseOrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPO(null);
        }}
        selectedPO={selectedPO}
        onEdit={(po) => handleEdit(po)}
        onReceive={(po) => handleOpenReceiveModal(po)}
        onCancel={(po) => setPoToCancel(po)}
        onCloseEarly={(po) => setPoToCloseEarly(po)}
        isCancellingPO={isCancellingPO}
        isReceivingPO={isReceivingPO}
        isClosingPO={isClosingPO}
      />

      {/* Partial Receiving & Quantity Adjustment Modal */}
      <PurchaseOrderReceiveModal
        isOpen={!!poToReceive}
        onClose={() => {
          setPoToReceive(null);
          setReceiveRows([]);
        }}
        poToReceive={poToReceive}
        receiveRows={receiveRows}
        onReceiveQtyChange={handleReceiveQtyChange}
        onReceiveCostChange={handleReceiveCostChange}
        onSetAllReceiveRemaining={handleSetAllReceiveRemaining}
        onClearAllReceive={handleClearAllReceive}
        onConfirmReceive={handleConfirmReceive}
        isReceivingPO={isReceivingPO}
      />

      {/* Confirm Cancel PO Modal */}
      <PurchaseOrderCancelModal
        isOpen={!!poToCancel}
        onClose={() => setPoToCancel(null)}
        poToCancel={poToCancel}
        onConfirmCancel={handleConfirmCancel}
        isCancellingPO={isCancellingPO}
      />

      {/* Confirm Close Short PO Modal */}
      <PurchaseOrderCloseEarlyModal
        isOpen={!!poToCloseEarly}
        onClose={() => setPoToCloseEarly(null)}
        poToCloseEarly={poToCloseEarly}
        onConfirmCloseEarly={handleConfirmCloseEarly}
        isClosingPO={isClosingPO}
      />
    </PageLayout>
  );
}


