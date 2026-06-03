import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks';
import { StatusBadge } from '@/components/ui/status-badge';
import OrderSidePanel from './components/OrderSidePanel';
import OrderRefundModal from './components/OrderRefundModal';
import OrderStatusConfirmModal from './components/OrderStatusConfirmModal';

export default function OnlineOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New State for Side Panel & Modals
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  
  // State for Status Confirmation
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ order: any, newStatus: string } | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    avgOrderValue: 0
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter);
      let url = '/tenant/orders?channel=online&limit=50';
      if (statusArr[0] !== 'all') {
        url += `&status=${statusArr[0]}`;
      }
      
      const response = await apiClient.get(url);
      const ordersData = response.data.data.orders || [];
      
      // Filter by search query on frontend since backend mock might not support it fully
      const filtered = ordersData.filter((o: any) => 
        o.reference.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setOrders(filtered);

      // Calculate some basic mock stats if they are not from an endpoint
      const total = filtered.length;
      const pending = filtered.filter((o: any) => o.status === 'pending').length;
      const revenue = filtered.reduce((acc: number, o: any) => acc + (o.status !== 'cancelled' ? o.total_amount : 0), 0);
      
      setStats({
        totalOrders: total,
        pendingOrders: pending,
        todayRevenue: revenue,
        avgOrderValue: total > 0 ? revenue / total : 0
      });

    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery]);

  const handleUpdateStatusClick = (order: any, newStatus: string) => {
    setPendingStatusUpdate({ order, newStatus });
    setIsStatusConfirmOpen(true);
  };

  const confirmUpdateStatus = async () => {
    if (!pendingStatusUpdate) return;
    
    setIsUpdatingStatus(true);
    try {
      await apiClient.put(`/tenant/orders/${pendingStatusUpdate.order.id}/status`, { status: pendingStatusUpdate.newStatus });
      toast.success('Order status updated');
      
      // Update the local selectedOrder so the side panel reflects the change immediately
      setSelectedOrder((prev: any) => prev && prev.id === pendingStatusUpdate.order.id ? { ...prev, status: pendingStatusUpdate.newStatus } : prev);
      
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusConfirmOpen(false);
      setPendingStatusUpdate(null);
    }
  };

  const handleRowClick = (key: any) => {
    const order = orders.find(o => o.id === key);
    if (order) {
      setSelectedOrder(order);
      setIsSidePanelOpen(true);
    }
  };

  const handleRefundSuccess = () => {
    setIsRefundModalOpen(false);
    setIsSidePanelOpen(false);
    fetchOrders();
  };

  const handlePrintInvoice = () => {
    // In a real app, this would open a printable view or PDF
    window.print();
  };

  const columns = [
    { key: 'reference', label: 'Order #' },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'payment', label: 'Payment' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date Placed' }
  ];

  const rows = orders.map((o: any) => {
    return {
      id: o.id,
      reference: <span className="font-medium font-mono text-foreground">{o.reference}</span>,
      customer: (
        <div>
          <div className="font-medium">{o.customer_name}</div>
          <div className="text-xs text-muted-foreground">{o.customer_email}</div>
        </div>
      ),
      items: <span className="text-muted-foreground">{o.items_count} items</span>,
      total: <span className="font-semibold"><CurrencyDisplay amount={o.total_amount} /></span>,
      payment: <span className="capitalize text-muted-foreground">{o.payment_method?.replace('_', ' ')}</span>,
      status: <StatusBadge status={o.status} />,
      date: <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>,
      __record: o
    };
  });

  return (
    <PageLayout title="Online Orders">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard
          title="Total Orders"
          value={isLoading ? '...' : stats.totalOrders.toString()}
          className="border border-border"
        />
        <DashboardCard
          title="Pending Orders"
          value={isLoading ? '...' : stats.pendingOrders.toString()}
          className="border border-border"
        />
        <DashboardCard
          title="Today's Revenue"
          value={isLoading ? '...' : <CurrencyDisplay amount={stats.todayRevenue} />}
          className="border border-border"
        />
        <DashboardCard
          title="Avg Order Value"
          value={isLoading ? '...' : <CurrencyDisplay amount={stats.avgOrderValue} />}
          className="border border-border"
        />
      </div>

      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Online Orders"
        onclick={handleRowClick}
        showSearch={true}
        searchPlaceholder="Search order # or customer..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        
        showFilter={true}
        filterLabel="Status"
        filterOptions={[
          { uid: 'all', name: 'All Orders' },
          { uid: 'pending', name: 'Pending' },
          { uid: 'processing', name: 'Processing' },
          { uid: 'shipped', name: 'Shipped' },
          { uid: 'delivered', name: 'Delivered' },
          { uid: 'cancelled', name: 'Cancelled' }
        ]}
        filterValue={statusFilter}
        onFilterChange={(keys: any) => setStatusFilter(keys)}
        
        showAddButton={false}
        onRefresh={fetchOrders}
      />

      {/* Side Panel Drawer */}
      <OrderSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        order={selectedOrder}
        onUpdateStatusClick={handleUpdateStatusClick}
        onIssueRefundClick={() => setIsRefundModalOpen(true)}
        onPrintInvoice={handlePrintInvoice}
      />

      {/* Refund Modal */}
      <OrderRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        orderData={selectedOrder}
        onSuccess={handleRefundSuccess}
      />

      {/* Status Confirm Modal */}
      <OrderStatusConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={confirmUpdateStatus}
        orderReference={pendingStatusUpdate?.order?.reference || ''}
        newStatus={pendingStatusUpdate?.newStatus || ''}
        isUpdating={isUpdatingStatus}
      />
    </PageLayout>
  );
}
