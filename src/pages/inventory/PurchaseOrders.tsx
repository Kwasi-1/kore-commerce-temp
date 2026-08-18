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
import { Input } from '@/components/ui/input';

interface ReceiveItemRow {
  variant_id: string;
  packaging_tier_id: string;
  variant_name: string;
  variant_sku: string;
  tier_name: string;
  quantity_ordered: number;
  quantity_already_received: number;
  quantity_to_receive: number;
  cost_price_per_tier: number;
}

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
  const [detailActiveTab, setDetailActiveTab] = useState<'items' | 'receipts'>('items');

  // Custom Confirmation Modal states
  const [poToReceive, setPoToReceive] = useState<any | null>(null);
  const [receiveRows, setReceiveRows] = useState<ReceiveItemRow[]>([]);
  const [poToCancel, setPoToCancel] = useState<any | null>(null);
  const [poToCloseEarly, setPoToCloseEarly] = useState<any | null>(null);
  const [isReceivingPO, setIsReceivingPO] = useState(false);
  const [isCancellingPO, setIsCancellingPO] = useState(false);
  const [isClosingPO, setIsClosingPO] = useState(false);

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
        quantity_to_receive: remaining,
        cost_price_per_tier: cost,
      };
    });

    setReceiveRows(rows);
    setPoToReceive(po);
  };

  const handleReceiveQtyChange = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setReceiveRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, quantity_to_receive: isNaN(val) || val < 0 ? 0 : val } : row
      )
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
      const response = await apiClient.post(`/tenant/purchase-orders/${poToCancel.id}/cancel`, {});
      toast.success(response.data.success?.message || 'Purchase order cancelled');
      setPoToCancel(null);
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

  const handleConfirmCloseEarly = async () => {
    if (!poToCloseEarly) return;
    setIsClosingPO(true);
    try {
      const response = await apiClient.post(`/tenant/purchase-orders/${poToCloseEarly.id}/close`, {});
      toast.success(response.data.success?.message || 'Purchase order closed early');
      setPoToCloseEarly(null);
      setIsDetailModalOpen(false);
      setSelectedPO(null);
      fetchPOs();
    } catch (error: any) {
      console.error('Close PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to close PO');
    } finally {
      setIsClosingPO(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!poToReceive) return;
    
    const totalToReceive = receiveRows.reduce((sum, r) => sum + (Number(r.quantity_to_receive) || 0), 0);
    if (totalToReceive === 0) {
      toast.error('Please enter a quantity greater than 0 for at least one item');
      return;
    }

    setIsReceivingPO(true);
    try {
      const payload = {
        items: receiveRows.map((r) => ({
          variant_id: r.variant_id,
          packaging_tier_id: r.packaging_tier_id,
          quantity_received: Number(r.quantity_to_receive) || 0,
          cost_price_per_tier: Number(r.cost_price_per_tier) || 0,
        })),
      };

      const response = await apiClient.post(`/tenant/purchase-orders/${poToReceive.id}/receive`, payload);
      const unitsAdded = response.data.success?.data?.unitsReceived || totalToReceive;
      toast.success(`PO Received! ${unitsAdded} units added to stock.`);
      setPoToReceive(null);
      setReceiveRows([]);
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
    const isPartial = po.status === 'partially_received';
    
    // Build row actions
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
      setDetailActiveTab('items');
      setIsDetailModalOpen(true);
    } else if (keyOrRow?.__record) {
      setSelectedPO(keyOrRow.__record);
      setDetailActiveTab('items');
      setIsDetailModalOpen(true);
    }
  };

  const totalUnitsReceiving = receiveRows.reduce((sum, r) => sum + (Number(r.quantity_to_receive) || 0), 0);
  const totalValueReceiving = receiveRows.reduce(
    (sum, r) => sum + (Number(r.quantity_to_receive) || 0) * (Number(r.cost_price_per_tier) || 0),
    0
  );

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
          setDetailActiveTab('items');
        }}
        size="3xl"
        classNames={{
          base: "rounded-xl min-h-[520px] scrollbar-hide"
        }}
        header={
          <div className="pt-2 px-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {selectedPO?.referenceNumber || selectedPO?.reference_number || "Purchase Order"}
              </h2>
              {selectedPO && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                  selectedPO.status === 'received' ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                  : selectedPO.status === 'partially_received' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                  : selectedPO.status === 'ordered' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : selectedPO.status === 'draft' ? 'text-muted-foreground bg-muted'
                  : 'text-destructive bg-destructive/5'
                }`}>
                  {selectedPO.status === 'partially_received' ? 'Partially Received' : selectedPO.status}
                </span>
              )}
            </div>
            <p className="text-xs md:text-[13px] text-muted-foreground font-normal">
              Supplier: <strong className="text-foreground">{selectedPO?.supplierName || (selectedPO?.supplier ? (typeof selectedPO.supplier === 'object' ? selectedPO.supplier.name : selectedPO.supplier) : 'Unknown')}</strong>
            </p>
          </div>
        }
        body={
          selectedPO && (
            <div className="space-y-4 py-2 text-sm">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-muted/20 border border-border/40">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Order Date</span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created
                      ? new Date(selectedPO.orderDate || selectedPO.order_date || selectedPO.dateCreated || selectedPO.date_created).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Payment Type</span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {selectedPO.isCreditPurchase || selectedPO.is_credit_purchase ? "Credit" : "Cash"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Credit Due Date</span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {selectedPO.creditDueDate || selectedPO.credit_due_date
                      ? new Date(selectedPO.creditDueDate || selectedPO.credit_due_date).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">Total Amount</span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block">
                    <CurrencyDisplay amount={Number(selectedPO.totalAmount ?? selectedPO.total_amount ?? 0)} showStyling={false} />
                  </span>
                </div>
              </div>

              {/* Segmented Tabs Bar */}
              <div className="flex items-center p-1 bg-muted/40 dark:bg-muted/20 rounded-md border border-border/50 gap-1 w-fit">
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('items')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                    detailActiveTab === 'items'
                      ? 'bg-background text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon icon="solar:box-minimalistic-linear" className="h-4 w-4 text-muted-foreground" />
                  <span>Line Items & Progress</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    detailActiveTab === 'items'
                      ? 'bg-primary/20 text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedPO.items?.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('receipts')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                    detailActiveTab === 'receipts'
                      ? 'bg-background text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon icon="solar:history-linear" className="h-4 w-4 text-muted-foreground" />
                  <span>Delivery Receipts</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    detailActiveTab === 'receipts'
                      ? 'bg-primary/20 text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedPO.receipts?.length || 0}
                  </span>
                </button>
              </div>

              {/* TAB 1: Line Items */}
              {detailActiveTab === 'items' && (
                <div className="space-y-3">
                  <div className="border border-border/70 overflow-hidden max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/70 text-muted-foreground font-semibold text-[11px] uppercase !tracking-wider">
                          <th className="p-3 !tracking-wide">Item / Variant</th>
                          <th className="p-3 !tracking-wide">SKU</th>
                          <th className="p-3 !tracking-wide">Tier</th>
                          <th className="p-3 !tracking-wide text-center">Ordered</th>
                          <th className="p-3 !tracking-wide text-center">Fulfillment</th>
                          <th className="p-3 !tracking-wide text-right">Cost</th>
                          <th className="p-3 !tracking-wide text-right">Subtotal</th>
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
                          const qtyOrd = Number(item.quantity_ordered ?? item.quantityOrdered ?? 0);
                          const qtyRec = Number(item.quantity_received ?? item.quantityReceived ?? 0);
                          const pct = qtyOrd > 0 ? Math.min(100, Math.round((qtyRec / qtyOrd) * 100)) : 0;
                          const isFullyReceived = qtyRec >= qtyOrd && qtyOrd > 0;
                          const isPartiallyReceived = qtyRec > 0 && qtyRec < qtyOrd;

                          return (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="p-2.5 font-medium text-foreground capitalize">
                                {item.variant_name || item.variantName || "Unknown Variant"}
                              </td>
                              <td className="p-3 font-mono text-muted-foreground">
                                <span className="">
                                  {item.variant_sku || item.variantSku || "—"}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {item.packaging_tier_name || item.packagingTierName || "Unit"}
                              </td>
                              <td className="p-3 text-center font-semibold text-foreground">
                                {qtyOrd}
                              </td>
                              <td className="p-3 text-center">
                                <div className="space-y-1.5 inline-block w-28 text-center">
                                  <div className="flex items-center justify-between text-[11px] font-semibold">
                                    <span className={isFullyReceived ? 'text-emerald-600 dark:text-emerald-400' : isPartiallyReceived ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                      {qtyRec} / {qtyOrd}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {pct}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden border border-border/30">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isFullyReceived
                                          ? 'bg-emerald-500'
                                          : isPartiallyReceived
                                          ? 'bg-amber-500'
                                          : 'bg-transparent'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right text-muted-foreground font-medium">
                                <CurrencyDisplay amount={cost} showStyling={false} />
                              </td>
                              <td className="p-3 text-right font-semibold text-foreground">
                                <CurrencyDisplay amount={sub} showStyling={false} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedPO.notes && (
                    <div className="p-3 rounded border border-border/60 bg-muted/10 text-xs text-muted-foreground">
                      <strong className="text-foreground">Notes:</strong> {selectedPO.notes}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Delivery Receipts History */}
              {detailActiveTab === 'receipts' && (
                <div className="space-y-3">
                  {(!selectedPO.receipts || selectedPO.receipts.length === 0) ? (
                    <div className="text-center py-10 text-muted-foreground text-xs space-y-2 border border-dashed border-border/70 rounded-xl">
                      <Icon icon="solar:box-minimalistic-linear" className="h-9 w-9 mx-auto opacity-40 text-muted-foreground" />
                      <p className="font-semibold text-foreground text-sm">No Delivery Receipts Yet</p>
                      <p className="text-xs md:text-[13px] max-w-sm mx-auto">When stock items are received, timestamped intake audit records will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {selectedPO.receipts.map((rcv: any, rIdx: number) => (
                        <div key={rIdx} className="border border-border/70 rounded-xl p-3.5 space-y-3 bg-card/60 shadow-xs">
                          {/* Receipt Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[11px] font-bold text-foreground bg-muted/50 px-2.5 py-1 rounded border border-border/60">
                                {rcv.receiptNumber || `Receipt #${rIdx + 1}`}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Icon icon="solar:calendar-linear" className="h-3.5 w-3.5" />
                                {rcv.dateReceived ? new Date(rcv.dateReceived).toLocaleString() : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {rcv.receivedByName && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Icon icon="solar:user-circle-linear" className="h-3.5 w-3.5" />
                                  <span>{rcv.receivedByName}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                Units: <strong className="text-foreground">{rcv.totalUnitsReceived}</strong>
                              </span>
                              <span className="font-bold text-foreground">
                                <CurrencyDisplay amount={Number(rcv.totalAmountReceived || 0)} showStyling={false} />
                              </span>
                            </div>
                          </div>

                          {/* Items in this Receipt */}
                          <div className="bg-muted/15 rounded-lg border border-border/40 divide-y divide-border/30 px-3 py-0.5 text-xs">
                            {(rcv.items || []).map((ritem: any, itemIdx: number) => (
                              <div key={itemIdx} className="py-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium text-foreground capitalize truncate">
                                    {ritem.variant_name || ritem.variantName || 'Item'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                    {ritem.variant_sku || ritem.variantSku || '—'}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    ({ritem.packaging_tier_name || ritem.packagingTierName || 'Unit'})
                                  </span>
                                </div>
                                <div className="text-right flex items-center gap-3 shrink-0">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] border-emerald-200/50 dark:border-emerald-800/30">
                                    +{ritem.quantity_received} units
                                  </span>
                                  <span className="font-semibold text-foreground text-xs min-w-[70px] text-right">
                                    <CurrencyDisplay amount={Number(ritem.subtotal || 0)} showStyling={false} />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }
        footer={
          selectedPO ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 w-full">
              <div className="flex items-center gap-2">
                {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPoToCancel(selectedPO)}
                    disabled={isCancellingPO || isReceivingPO || isClosingPO}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-medium flex items-center gap-1.5"
                  >
                    <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                    {isCancellingPO ? "Cancelling..." : "Cancel PO"}
                  </Button>
                )}
                {selectedPO.status === 'partially_received' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPoToCloseEarly(selectedPO)}
                    disabled={isCancellingPO || isReceivingPO || isClosingPO}
                    className="text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5"
                    title="Close PO early if supplier will not deliver remaining items"
                  >
                    <Icon icon="solar:check-read-linear" className="h-4 w-4" />
                    Close Short
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
                    onClick={() => handleOpenReceiveModal(selectedPO)}
                    disabled={isReceivingPO || isCancellingPO || isClosingPO}
                    className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                    {selectedPO.status === 'partially_received' ? "Receive Remaining Stock" : "Mark as Received"}
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      />

      {/* ── Partial Receiving & Quantity Adjustment Modal ──────────────────────── */}
      <CustomModal
        isOpen={!!poToReceive}
        onOpenChange={() => {
          if (!isReceivingPO) {
            setPoToReceive(null);
            setReceiveRows([]);
          }
        }}
        size="3xl"
        classNames={{
          base: "rounded-xl min-h-[450px] scrollbar-hide"
        }}
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                {/* <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5 text-primary" /> */}
                Receive Stock Intake
              </h2>
              <span className="text-xs font-semibold text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-md">
                {poToReceive?.referenceNumber || poToReceive?.reference_number || "PO"}
              </span>
            </div>
            <p className="text-xs md:text-[13px] !tracking-tight text-muted-foreground font-normal mt-0.5">
              Supplier: <strong className="text-foreground">{poToReceive?.supplierName || (poToReceive?.supplier ? (typeof poToReceive.supplier === 'object' ? poToReceive.supplier.name : poToReceive.supplier) : 'Supplier')}</strong> · Adjust received quantities if shipment is partial or damaged.
            </p>
          </div>
        }
        body={
          <div className="space-y-3 pb-2 text-xs">
            {/* Quick Bulk Presets */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border/50">
              <span className="text-[11px] text-muted-foreground font-medium">
                Line Items ({receiveRows.length})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleSetAllReceiveRemaining}
                  className="h-6 text-[11px] px-2 font-medium"
                >
                  Fill All Remaining
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleClearAllReceive}
                  className="h-6 text-[11px] px-2 font-medium text-muted-foreground"
                >
                  Clear (Set 0)
                </Button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border/70 rounded overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 font-semibold text-muted-foreground">
                    <th className="p-2.5">Item / Variant</th>
                    <th className="p-2.5">Tier</th>
                    <th className="p-2.5 text-center">Ordered</th>
                    <th className="p-2.5 text-center">Qty to Intake</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {receiveRows.map((row, idx) => {
                    const rowSubtotal = (Number(row.quantity_to_receive) || 0) * (Number(row.cost_price_per_tier) || 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-2.5 font-medium text-foreground capitalize">
                          <div>{row.variant_name}</div>
                          <span className="text-[10px] font-mono text-muted-foreground">{row.variant_sku}</span>
                        </td>
                        <td className="p-2.5 text-muted-foreground font-medium">
                          {row.tier_name}
                        </td>
                        <td className="p-2.5 text-center font-medium text-muted-foreground">
                          {row.quantity_ordered}
                          {row.quantity_already_received > 0 && (
                            <span className="block text-[10px] text-green-600">({row.quantity_already_received} recvd)</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={row.quantity_to_receive.toString()}
                            onChange={(e) => handleReceiveQtyChange(idx, e.target.value)}
                            className="h-8 w-20 mx-auto text-center font-semibold rounded-md border-border text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.cost_price_per_tier.toString()}
                            onChange={(e) => handleReceiveCostChange(idx, e.target.value)}
                            className="h-8 w-24 ml-auto text-right font-medium rounded-md border-border text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right font-semibold text-foreground">
                          <CurrencyDisplay amount={rowSubtotal} showStyling={false} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary Footer Card */}
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium block">Total Units to Add</span>
                <span className="font-bold text-foreground text-sm">{totalUnitsReceiving} units</span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium block">Receiving Value</span>
                <span className="font-bold text-foreground text-base lg:text-lg">
                  <CurrencyDisplay amount={totalValueReceiving} showStyling={true} />
                </span>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full pt-1 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setPoToReceive(null);
                setReceiveRows([]);
              }}
              disabled={isReceivingPO}
              className="text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleConfirmReceive}
              disabled={isReceivingPO || totalUnitsReceiving === 0}
              className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 min-w-[160px] justify-center"
            >
              {isReceivingPO ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Receiving Stock...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                  <span>Confirm & Update Stock</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* ── Confirm Cancel PO Modal ──────────────────────────────────────────── */}
      <CustomModal
        isOpen={!!poToCancel}
        onOpenChange={() => {
          if (!isCancellingPO) setPoToCancel(null);
        }}
        size="sm"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2 flex items-center gap-2 text-destructive">
            <Icon icon="solar:danger-triangle-linear" className="h-5 w-5 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">Cancel Purchase Order?</h3>
          </div>
        }
        body={
          <div className="py-2 space-y-1 text-xs text-muted-foreground">
            <p>
              Are you sure you want to cancel purchase order <strong className="text-foreground">{poToCancel?.referenceNumber || poToCancel?.reference_number || 'this PO'}</strong>?
            </p>
            <p className="text-[11px] text-destructive/80 font-medium">
              This action cannot be undone.
            </p>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full pt-1">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPoToCancel(null)}
              disabled={isCancellingPO}
              className="text-xs font-medium"
            >
              Keep Order
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleConfirmCancel}
              disabled={isCancellingPO}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold flex items-center gap-1.5 min-w-[110px] justify-center"
            >
              {isCancellingPO ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                  <span>Cancel PO</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* ── Confirm Close Short PO Modal ──────────────────────────────────────── */}
      <CustomModal
        isOpen={!!poToCloseEarly}
        onOpenChange={() => {
          if (!isClosingPO) setPoToCloseEarly(null);
        }}
        size="sm"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2 flex items-center gap-2">
            <Icon icon="solar:check-read-linear" className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Close Purchase Order Short?</h3>
          </div>
        }
        body={
          <div className="py-2 space-y-2 text-xs text-muted-foreground">
            <p>
              Close <strong className="text-foreground">{poToCloseEarly?.referenceNumber || poToCloseEarly?.reference_number || 'this PO'}</strong> now and mark it as completed?
            </p>
            <div className="bg-muted/30 p-2.5 rounded-md border border-border/60 text-[11px] text-muted-foreground">
              Use this if your supplier cannot deliver the remaining items. The stock you already received will remain in inventory, and this PO will no longer appear as pending delivery.
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full pt-1">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPoToCloseEarly(null)}
              disabled={isClosingPO}
              className="text-xs font-medium"
            >
              Keep Pending
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleConfirmCloseEarly}
              disabled={isClosingPO}
              className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 min-w-[120px] justify-center"
            >
              {isClosingPO ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Closing...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                  <span>Close PO Early</span>
                </>
              )}
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}


