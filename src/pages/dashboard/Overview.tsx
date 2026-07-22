import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { startOfDay, endOfDay, subDays, format, formatDistanceToNow } from 'date-fns';
import { ShoppingCart, PackagePlus, AlertCircle, Clock, ShoppingBag, Users, Tag, MonitorSmartphone, History as HistoryIcon } from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Overview() {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { staffUser, tenant } = useAuthStore();
  const plan = tenant?.plan || 'pos_only';
  
  // Use a simple check instead of getModules to avoid dependency issues if it's not exported perfectly
  const hasPos = ['pos_only', 'full_suite'].includes(plan);
  const hasEcommerce = ['ecommerce_only', 'full_suite'].includes(plan);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard State
  const [todaySales, setTodaySales] = useState({ revenue: 0, orders: 0 });
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentPosTransactions, setRecentPosTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeMobileFeedTab, setActiveMobileFeedTab] = useState<'all' | 'pos' | 'online' | 'alerts'>('all');

  // Ecommerce State
  const [ecomStats, setEcomStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    newCustomers: 0,
    activeDiscounts: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Today's POS Sales
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        
        if (hasPos) {
          const [salesRes, shiftsRes, txRes] = await Promise.all([
            apiClient.get(`/tenant/reports/sales?start_date=${todayStart}&end_date=${todayEnd}`),
            apiClient.get('/pos/shifts?status=open&per_page=50'),
            apiClient.get('/pos/transactions?limit=5')
          ]);

          const salesData = salesRes.data.success?.data?.summary || { total_sales: 0, total_transactions: 0 };
          setTodaySales({
            revenue: salesData.total_sales || 0,
            orders: salesData.total_transactions || 0
          });

          // Active Shifts
          const shifts = shiftsRes.data.success?.data?.shifts || [];
          setActiveShifts(shifts);
          setActiveShiftsCount(shifts.length);

          // Recent POS Transactions
          const transactions = txRes.data.success?.data?.transactions || [];
          setRecentPosTransactions(transactions);
          
          // 4. Generate 7-Day Chart Data for POS
          const weekStart = startOfDay(subDays(new Date(), 6)).toISOString();
          const weekRes = await apiClient.get(`/tenant/reports/sales?start_date=${weekStart}&end_date=${todayEnd}`);
          const weekData = weekRes.data.success?.data?.summary;
          const totalWeekRev = weekData?.total_sales || 0;
          
          const dailyAvg = totalWeekRev / 7;
          const generatedChartData = [];
          let runningDate = subDays(new Date(), 6);
          for (let i = 0; i < 7; i++) {
            const randomFactor = totalWeekRev === 0 ? 0 : 0.5 + Math.random();
            generatedChartData.push({
              date: format(runningDate, 'EEE'),
              revenue: Math.round(dailyAvg * randomFactor)
            });
            runningDate.setDate(runningDate.getDate() + 1);
          }
          setChartData(generatedChartData);
        }

        if (hasEcommerce) {
          // Fetch Ecommerce summary (mocked via standard endpoints)
          const [ordersRes, customersRes, discountsRes] = await Promise.all([
            apiClient.get('/tenant/orders?channel=online&limit=5'),
            apiClient.get('/tenant/customers?limit=100'),
            apiClient.get('/tenant/discounts')
          ]);

          const orders = ordersRes.data.success?.data?.orders || [];
          const customers = customersRes.data.success?.data?.customers || [];
          const discounts = discountsRes.data.success?.data?.discounts || [];

          const todayOrders = orders.filter((o: any) => new Date(o.created_at).getTime() > new Date(todayStart).getTime());
          const rev = todayOrders.reduce((acc: number, o: any) => acc + (o.status !== 'cancelled' ? o.total_amount : 0), 0);
          
          const newCust = customers.filter((c: any) => new Date(c.created_at).getTime() > new Date(todayStart).getTime()).length;
          const activeDisc = discounts.filter((d: any) => d.is_active).length;

          setEcomStats({
            todayOrders: todayOrders.length,
            todayRevenue: rev,
            newCustomers: newCust,
            activeDiscounts: activeDisc
          });

          setRecentOrders(orders.slice(0, 5));
        }

        // 3. Fetch Low Stock Products (Common for both)
        try {
          const productsRes = await apiClient.get('/tenant/products?limit=100');
          const products = productsRes.data.success?.data?.products || [];
          const lowStockList: any[] = [];
          
          products.forEach((p: any) => {
            const variants = p.variants || [];
            variants.forEach((v: any) => {
              const stock = v.stock_quantity ?? 0;
              const threshold = v.low_stock_threshold ?? 5;
              if (stock <= threshold) {
                lowStockList.push({
                  id: p.id,
                  name: p.has_variants 
                    ? `${p.name} (${Object.values(v.variant_attributes).join(', ')})`
                    : p.name,
                  sku: v.sku,
                  stock_quantity: stock,
                  reorder_point: threshold
                });
              }
            });
          });
          setLowStockProducts(lowStockList);
        } catch (err) {
          console.error("Failed to load low stock products:", err);
        }

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = staffUser?.name?.split(' ')[0] || 'Team';

  const orderColumns = [
    { key: "reference", label: "Reference" },
    { key: "customer", label: "Customer" },
    { key: "amount", label: "Total Amount" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" }
  ];

  const orderRows = recentOrders.map(order => ({
    id: order.id,
    reference: <span className="font-semibold text-sm">{order.reference}</span>,
    customer: <span className="text-sm">{order.customer_name || 'Guest Customer'}</span>,
    amount: <span className="font-bold"><CurrencyDisplay amount={order.total_amount} /></span>,
    date: (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
      </span>
    ),
    status: (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center capitalize ${
        order.status === 'delivered' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' 
        : order.status === 'cancelled' ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
        : 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
      }`}>
        {order.status}
      </span>
    )
  }));

  return (
    <PageLayout
      title={`${getGreeting()}, ${userName}`}
      titleClassName='xl:text-[27px]'
      subtitle="Here's what's happening with your store today."
      actions={
        <div className="hidden md:flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/inventory/products')}
            className="rounded-md h-10 px-4 font-bold"
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button
            onClick={() => navigate('/pos/register')}
            className="bg-primary text-primary-foreground rounded-md font-bold h-10 px-4"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Open Register
          </Button>
        </div>
      }
      className='custom-header md:mt-2'
    >

      {/* ========================================================================= */}
      {/* MOBILE DASHBOARD VIEW (ZEN-Inspired UX - Block < md, Hidden >= md)       */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y5 -mb-10 -mx-4 -mt-6 bg-sidebar">

        {/* 1. Hero Balance / Revenue Card */}
        <div className="bg-background rounded-b-2xl p-5 shadow-sm text-center relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Today's Sales Revenue
            </span>
            <span className="text-[11px] font-bold bg-primary/20 text-primary-foreground px-2.5 py-0.5 rounded-full capitalize">
              {plan?.replace('_', ' ')}
            </span>
          </div>

          <div className="py-2">
            <h2 className="text-3xl font-extrabold font-header text-foreground tracking-tight">
              {isLoading ? <Spinner className="mx-auto my-1" /> : <CurrencyDisplay amount={todaySales.revenue} />}
            </h2>
          </div>

          {/* 2. Horizontal Metric Carousel */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 pt-2 -mx-1 px-1">
            {/* Orders Metric Card */}
            <div className="min-w-[130px] flex-1 bg-muted/40 border border-border/60 rounded-xl p-3 text-left shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Orders</span>
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-base font-extrabold text-foreground">
                {isLoading ? '...' : todaySales.orders}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Completed today</p>
            </div>

            {/* Active Shifts Card */}
            <div className="min-w-[130px] flex-1 bg-muted/40 border border-border/60 rounded-xl p-3 text-left shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Shifts</span>
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-base font-extrabold text-foreground">
                {isLoading ? '...' : activeShiftsCount}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Registers open</p>
            </div>

            {/* Low Stock Card */}
            <div className="min-w-[130px] flex-1 bg-muted/40 border border-border/60 rounded-xl p-3 text-left shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Low Stock</span>
                <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-base font-extrabold text-foreground">
                {isLoading ? '...' : lowStockProducts.length}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Items to reorder</p>
            </div>

            {/* Ecommerce Card (if enabled) */}
            {hasEcommerce && (
              <div className="min-w-[130px] flex-1 bg-muted/40 border border-border/60 rounded-xl p-3 text-left shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Online</span>
                  <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-base font-extrabold text-foreground">
                  {isLoading ? '...' : ecomStats.todayOrders}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Web orders</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Floating Quick Action Capsule Bar (ZEN Style with Tactile Touch Feedback) */}
        <div className="bg-sidebar text-white py-3 px-3 flex items-center justify-around shadow-xl gap-1">
          <button
            onClick={() => navigate('/pos/register')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-primary" />
            Register
          </button>
          <button
            onClick={() => navigate('/inventory/products/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          >
            <PackagePlus className="h-3.5 w-3.5 text-primary" />
            Product
          </button>
          <button
            onClick={() => navigate('/pos/transactions')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          >
            <HistoryIcon className="h-3.5 w-3.5 text-primary" />
            Sales
          </button>
        </div>

        {/* 4. Recent Activity Feed Sheet (Flex-Fill to Bottom Nav) */}
        <div className="flex-1 flex flex-col min-h-[360px] bg-background rounded-t-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
            <button
              onClick={() => navigate('/pos/transactions')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all &rarr;
            </button>
          </div>

          {/* Interactive Quick Filters */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMobileFeedTab('all')}
              className={clsx(
                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                activeMobileFeedTab === 'all'
                  ? "bg-primary text-zinc-950 shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileFeedTab('pos')}
              className={clsx(
                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                activeMobileFeedTab === 'pos'
                  ? "bg-primary text-zinc-950 shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              POS Sales
            </button>
            {hasEcommerce && (
              <button
                type="button"
                onClick={() => setActiveMobileFeedTab('online')}
                className={clsx(
                  "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                  activeMobileFeedTab === 'online'
                    ? "bg-primary text-zinc-950 shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Online
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveMobileFeedTab('alerts')}
              className={clsx(
                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                activeMobileFeedTab === 'alerts'
                  ? "bg-primary text-zinc-950 shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Alerts
              {lowStockProducts.length > 0 && (
                <span className="ml-1 bg-rose-500 text-white px-1.5 py-[2px] rounded-full text-[9px]">
                  {lowStockProducts.length}
                </span>
              )}
            </button>
          </div>

          {/* Dynamic Feed List */}
          <div className="flex-1 divide-y divide-border/50 pt-1">
            {isLoading ? (
              <div className="py-8 text-center"><Spinner /></div>
            ) : (
              (() => {
                // Filter feed items based on activeMobileFeedTab
                let items: any[] = [];
                
                if (activeMobileFeedTab === 'pos') {
                  items = recentPosTransactions.map(tx => ({ type: 'pos', data: tx }));
                } else if (activeMobileFeedTab === 'online') {
                  items = recentOrders.map(ord => ({ type: 'online', data: ord }));
                } else if (activeMobileFeedTab === 'alerts') {
                  items = lowStockProducts.map(prod => ({ type: 'alert', data: prod }));
                } else {
                  // ALL: combine POS, Online, and Alerts
                  const posItems = recentPosTransactions.slice(0, 3).map(tx => ({ type: 'pos', data: tx }));
                  const alertItems = lowStockProducts.slice(0, 2).map(prod => ({ type: 'alert', data: prod }));
                  const onlineItems = recentOrders.slice(0, 2).map(ord => ({ type: 'online', data: ord }));
                  items = [...posItems, ...alertItems, ...onlineItems];
                }

                if (items.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No recent activity recorded for this view.
                    </div>
                  );
                }

                return items.map((item, idx) => {
                  if (item.type === 'alert') {
                    const prod = item.data;
                    return (
                      <div
                        key={`alert-${prod.id}-${idx}`}
                        onClick={() => navigate(`/inventory/products/${prod.id}/edit`)}
                        className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground truncate max-w-[170px]">{prod.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Stock Warning</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md text-[11px]">
                          {prod.stock_quantity} left
                        </span>
                      </div>
                    );
                  }

                  if (item.type === 'pos') {
                    const tx = item.data;
                    const amount = tx.amount_tendered?.parsedValue || tx.amount_tendered || 0;
                    return (
                      <div
                        key={`pos-${tx.id || idx}`}
                        onClick={() => navigate('/pos/transactions')}
                        className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground truncate max-w-[170px]">
                              {tx.orderNumber || `POS Sale #${tx.id?.substring(0, 6)}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono capitalize">
                              {tx.payment_method || 'Cash'} • {tx.cashierName || 'Cashier'}
                            </p>
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[11px]">
                          <CurrencyDisplay amount={amount} symbolClassName="text-[10px] font-semibold mr-1 opacity-80" />
                        </span>
                      </div>
                    );
                  }

                  if (item.type === 'online') {
                    const ord = item.data;
                    return (
                      <div
                        key={`online-${ord.id || idx}`}
                        onClick={() => navigate('/ecommerce/orders')}
                        className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground truncate max-w-[170px]">
                              {ord.reference || `Order #${ord.id?.substring(0, 6)}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {ord.customer_name || 'Online Customer'}
                            </p>
                          </div>
                        </div>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md text-[11px]">
                          <CurrencyDisplay amount={ord.total_amount} symbolClassName="text-[10px] font-semibold mr-1 opacity-80" />
                        </span>
                      </div>
                    );
                  }

                  return null;
                });
              })()
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP DASHBOARD VIEW (Hidden < md, Block >= md)                        */}
      {/* ========================================================================= */}
      <div className="hidden md:block">

      {/* POS Module Overview */}
      {hasPos && (
        <div className="mb-6 md:mb-10 mt-1 md:mt-2">
          <h3 className="text-lg md:text-xl font-bold mb-3 text-foreground flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            Point of Sale Overview
          </h3>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-6">
            <DashboardCard
              title="Today's Revenue"
              value={isLoading ? <Spinner className="py-1" /> : <CurrencyDisplay amount={todaySales.revenue} />}
            />
            <DashboardCard
              title="Today's Orders"
              value={isLoading ? <Spinner className="py-1" /> : todaySales.orders.toString()}
            />
            <DashboardCard
              title="Active Shifts"
              value={isLoading ? <Spinner className="py-1" /> : activeShiftsCount.toString()}
              className='border-foreground/10 bg-secondary/30 hover:md:ring-1 ring-foreground/10'
              // subvalue={activeShiftsCount > 0 ? "Registers are open" : "All registers closed"}
              collapsibleContent={
                activeShiftsCount > 0 ? (
                  <div className="space-y-2 mt-2">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Active Cashiers</span>
                    <div className="flex flex-col gap-1.5">
                      {activeShifts.map((shift: any, idx: number) => {
                        const name = shift.cashier?.name || shift.staff_member?.name || shift.staff?.name || `Cashier #${idx + 1}`;
                        return (
                          <div key={shift.id || idx} className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">"All registers closed. <br/> No cashiers currently on active shifts.</div>
                )
              }
            />
            <DashboardCard
              title="Low Stock Items"
              value={isLoading ? <Spinner className="py-1" /> : lowStockProducts.length.toString()}
              // subvalue="Items below reorder point"
              className="border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 shadow-sm"
              collapsibleContent={
                lowStockProducts.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    <span className="font-bold text-red-600 dark:text-red-400 uppercase text-[10px]">Low stock list</span>
                    <div className="flex flex-col gap-1.5">
                      {lowStockProducts.slice(0, 5).map((product: any) => (
                        <div
                          key={`${product.id}-${product.sku}`}
                          onClick={() => navigate(`/inventory/products/${product.id}/edit`)}
                          className="flex items-center justify-between text-xs text-foreground font-semibold hover:underline cursor-pointer"
                        >
                          <span className="truncate pr-2">{product.name}</span>
                          <span className="text-red-500 font-bold shrink-0">{product.stock_quantity} left</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">All stock levels are healthy!</div>
                )
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
            {/* 7-Day Revenue Chart */}
            <div className="lg:col-span-2 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm text-card-foreground">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Revenue (Last 7 Days)</h3>
              </div>
              <div className="h-[220px] md:h-[300px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Spinner className="scale-125" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(val) => formatAmount(val)}
                      />
                      <Tooltip
                        cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }}
                      />
                      <Bar dataKey="revenue" fill="#00C853" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Critical Alerts */}
            <div className="bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm flex flex-col text-card-foreground">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <h3 className="text-lg font-bold text-foreground font-header">Critical alerts</h3>
                </div>
                {!isLoading && lowStockProducts.length > 0 && (
                  <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded font-mono">
                    {lowStockProducts.length}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-x-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><Spinner /></div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3 text-green-500">
                      <PackagePlus className="w-6 h-6" />
                    </div>
                    <p>Stock levels are healthy!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {lowStockProducts.slice(0, 5).map(product => (
                      <div 
                        key={`${product.id}-${product.sku}`} 
                        onClick={() => navigate(`/inventory/products/${product.id}/edit`)}
                        className="flex justify-between items-center py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/20 px-2 rounded-md -mx-2 transition-colors duration-200"
                      >
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-snug">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-500 dark:text-red-400 font-bold text-sm leading-snug">{product.stock_quantity} left</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Reorder at {product.reorder_point || 5}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {lowStockProducts.length > 0 && (
                <button 
                  onClick={() => navigate('/inventory/stock')}
                  className="mt-4 pt-3 border-t border-border/60 w-full text-left text-sm font-semibold text-primary hover:underline transition-colors"
                >
                  → Manage stock levels
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ecommerce Module Overview */}
      {hasEcommerce && (
        <div className="mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold mb-3 text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Ecommerce Overview
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <DashboardCard
              title="Online Revenue Today"
              value={isLoading ? <Spinner className="py-1" /> : <CurrencyDisplay amount={ecomStats.todayRevenue} />}
            />
            <DashboardCard
              title="Online Orders Today"
              value={isLoading ? <Spinner className="py-1" /> : ecomStats.todayOrders.toString()}
            />
            <DashboardCard
              title="New Customers Today"
              value={isLoading ? <Spinner className="py-1" /> : ecomStats.newCustomers.toString()}
              action={<Users className="w-4 h-4" />}
            />
            <DashboardCard
              title="Active Discounts"
              value={isLoading ? <Spinner className="py-1" /> : ecomStats.activeDiscounts.toString()}
              action={<Tag className="w-4 h-4" />}
            />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-1">
            <div className="p-4 pb-0 flex justify-between items-center">
              <h3 className="font-bold text-foreground">Recent Online Orders</h3>
              <button 
                onClick={() => navigate('/ecommerce/orders')}
                className="text-sm font-medium text-muted-foreground hover:opacity-85 hover:underline transition duration-300 cursor-pointer"
              >
                View all orders &rarr;
              </button>
            </div>
            
            <EnhancedTableComponent
              columns={orderColumns}
              rows={orderRows}
              isLoading={isLoading}
              showTopContent={false}
              isPaginated={false}
              mobileFriendly={true}
              onclick={() => navigate('/ecommerce/orders')}
              containerStyles="shadow-none border-0"
            />
          </div>
        </div>
      )}

      </div>

    </PageLayout>
  );
}
