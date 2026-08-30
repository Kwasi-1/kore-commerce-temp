import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  ShoppingBag, 
  Loader2, 
  RefreshCw, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Package, 
  ChevronRight, 
  CreditCard,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';
import OrderSidePanel from './components/OrderSidePanel';
import OrderRefundModal from './components/OrderRefundModal';
import OrderStatusConfirmModal from './components/OrderStatusConfirmModal';

export default function OnlineOrders() {
  const isMobile = useIsMobile();
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

  // Active mobile tab
  const activeStatusKey = useMemo(() => {
    const arr = Array.from(statusFilter);
    return (arr[0] as string) || 'all';
  }, [statusFilter]);

  const handleMobileTabChange = (tabId: string) => {
    setStatusFilter(new Set([tabId]));
  };

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    todayRevenue: 0,
    avgOrderValue: 0
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter);
      let url = '/tenant/orders?channel=online&limit=100';
      if (statusArr[0] && statusArr[0] !== 'all') {
        url += `&status=${statusArr[0]}`;
      }
      
      const response = await apiClient.get(url);
      const ordersData = response.data.success?.data?.orders || response.data?.orders || [];
      
      // Filter by search query on frontend
      const filtered = ordersData.filter((o: any) => 
        (o.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setOrders(filtered);

      // Calculate stats across all orders
      const total = ordersData.length;
      const pending = ordersData.filter((o: any) => o.status === 'pending').length;
      const processing = ordersData.filter((o: any) => o.status === 'processing').length;
      const shipped = ordersData.filter((o: any) => o.status === 'shipped').length;
      const delivered = ordersData.filter((o: any) => o.status === 'delivered').length;
      const revenue = ordersData.reduce((acc: number, o: any) => acc + (o.status !== 'cancelled' ? Number(o.total_amount || 0) : 0), 0);
      
      setStats({
        totalOrders: total,
        pendingOrders: pending,
        processingOrders: processing,
        shippedOrders: shipped,
        deliveredOrders: delivered,
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
      toast.success(`Order #${pendingStatusUpdate.order.reference} marked as ${pendingStatusUpdate.newStatus}`);
      
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
    window.print();
  };

  const getNextStatusAction = (order: any) => {
    switch (order.status) {
      case 'pending':
        return {
          label: 'Process',
          nextStatus: 'processing',
          icon: <Package className="h-3 w-3" />,
          colorClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'processing':
        return {
          label: 'Ship',
          nextStatus: 'shipped',
          icon: <Truck className="h-3 w-3" />,
          colorClass: 'bg-purple-600 hover:bg-purple-700 text-white'
        };
      case 'shipped':
        return {
          label: 'Deliver',
          nextStatus: 'delivered',
          icon: <CheckCircle2 className="h-3 w-3" />,
          colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      default:
        return null;
    }
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

  const mobileTabs = [
    { id: 'all', label: 'All', count: stats.totalOrders },
    { id: 'pending', label: 'Pending', count: stats.pendingOrders },
    { id: 'processing', label: 'Processing', count: stats.processingOrders },
    { id: 'shipped', label: 'Shipped', count: stats.shippedOrders },
    { id: 'delivered', label: 'Delivered', count: stats.deliveredOrders },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <PageLayout
      title="Online Orders"
      subtitle={isMobile ? `${orders.length} orders listed` : undefined}
      constrainHeight={true}
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (Hidden >= md, Block < md)                                    */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* 1. Hero KPI Card + Metric Carousel */}
        <MobileHeroCard
          title="Total Online GMV"
          value={<CurrencyDisplay amount={stats.todayRevenue} showStyling={false} />}
          badge={`${stats.totalOrders} Orders`}
        >
          <MobileMetricPill
            title="Pending Fulfillment"
            value={stats.pendingOrders.toString()}
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            onClick={() => handleMobileTabChange('pending')}
          />
          <MobileMetricPill
            title="In Transit"
            value={stats.shippedOrders.toString()}
            icon={<Truck className="h-4 w-4 text-purple-500" />}
            onClick={() => handleMobileTabChange('shipped')}
          />
          <MobileMetricPill
            title="Avg Order Value"
            value={<CurrencyDisplay amount={stats.avgOrderValue} showStyling={false} />}
            icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
          />
        </MobileHeroCard>

        {/* 2. Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search order #, customer, or email..."
          }}
          actions={[
            {
              label: "Refresh",
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: fetchOrders
            }
          ]}
        />

        {/* 3. Activity Sheet */}
        <MobileActivitySheet
          title="Storefront Orders"
          tabs={mobileTabs}
          activeTab={activeStatusKey}
          onTabChange={handleMobileTabChange}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-center px-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <p className="text-sm font-semibold text-foreground">No orders found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try refining your search keyword" : "No orders in this category"}
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const nextAction = getNextStatusAction(order);
              const formattedDate = order.created_at && !isNaN(new Date(order.created_at).getTime())
                ? new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsSidePanelOpen(true);
                  }}
                  className="py-3.5 px-1 flex flex-col gap-2.5 text-xs cursor-pointer hover:bg-muted/20 rounded-lg transition-colors border-b border-border/20 last:border-0"
                >
                  {/* Top Line: Reference + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-xs">
                          {order.reference}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {order.customer_name}
                      </p>
                    </div>

                    <StatusBadge status={order.status} />
                  </div>

                  {/* Middle Line: Customer info & payment badges */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-muted/60 px-2 py-0.5 rounded text-[10px] font-medium text-foreground">
                        {order.items_count || (order.items ? order.items.length : 1)} {order.items_count === 1 ? 'item' : 'items'}
                      </span>
                      <span className="bg-muted/60 px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground capitalize">
                        {order.payment_method?.replace('_', ' ') || 'Online'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-foreground">
                      <CurrencyDisplay amount={order.total_amount} showStyling={false} />
                    </div>
                  </div>

                  {/* Bottom Line: Quick Status Transition Action & View Details */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                    <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                      Details <ChevronRight className="h-3 w-3" />
                    </span>

                    {nextAction && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatusClick(order, nextAction.nextStatus);
                        }}
                        className={`h-6 px-2.5 text-[10px] font-bold rounded-md gap-1 shadow-xs ${nextAction.colorClass}`}
                      >
                        {nextAction.icon}
                        <span>{nextAction.label}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (Hidden < md, Flex >= md)                                    */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
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
      </div>

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

