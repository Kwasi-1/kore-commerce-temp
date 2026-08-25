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
import { ShoppingCart, PackagePlus, AlertCircle, Clock, ShoppingBag, Users, Tag, MonitorSmartphone, History as HistoryIcon, ArrowRight } from 'lucide-react';
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

import { getModules } from '@/utils/permissions';
import { useFeaturesStore } from '@/store/featuresStore';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function Overview() {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { staffUser, tenant } = useAuthStore();
  const plan = tenant?.plan || 'starter';
  const modules = getModules(plan);
  const hasModule = useFeaturesStore((s) => s.hasModule);
  
  const hasPos = modules.pos || hasModule('pos');
  const hasEcommerce = modules.ecommerce || hasModule('ecommerce');
  
  const [isLoading, setIsLoading] = useState(true);
  const [desktopView, setDesktopView] = useState<'pos' | 'ecommerce'>(() => {
    try {
      const saved = localStorage.getItem('vysion_dashboard_view');
      if (saved === 'pos' || saved === 'ecommerce') return saved;
    } catch (e) {
      console.error('Failed to read dashboard view preference:', e);
    }
    return 'pos';
  });

  const toggleDesktopView = () => {
    setDesktopView(prev => {
      const next = prev === 'pos' ? 'ecommerce' : 'pos';
      try {
        localStorage.setItem('vysion_dashboard_view', next);
      } catch (e) {
        console.error('Failed to save dashboard view preference:', e);
      }
      return next;
    });
  };
  
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

  const getNumericValue = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (typeof val === 'object') {
      if (typeof val.parsedValue === 'number') return val.parsedValue;
      if (typeof val.value === 'number') return val.value;
      if (val.source) {
        const p = parseFloat(val.source);
        return isNaN(p) ? fallback : p;
      }
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  };

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

          const salesSummary = salesRes.data.success?.data?.summary || {};
          const todayRev = getNumericValue(
            salesSummary.net_sales ?? salesSummary.gross_sales ?? salesSummary.total_sales, 
            0
          );
          const todayOrdersCount = getNumericValue(
            salesSummary.total_transactions ?? salesSummary.total_orders ?? salesSummary.completed_orders_count, 
            0
          );

          setTodaySales({
            revenue: todayRev,
            orders: todayOrdersCount
          });

          // Active Shifts
          const shifts = shiftsRes.data.success?.data?.shifts || [];
          setActiveShifts(shifts);
          setActiveShiftsCount(shifts.length);

          // Recent POS Transactions
          const transactions = txRes.data.success?.data?.transactions || [];
          setRecentPosTransactions(transactions);
          
          // 4. 7-Day Chart Data for POS
          const weekStart = startOfDay(subDays(new Date(), 6)).toISOString();
          const weekRes = await apiClient.get(`/tenant/reports/sales?start_date=${weekStart}&end_date=${todayEnd}`);
          const timeseries = weekRes.data.success?.data?.timeseries;
          
          if (Array.isArray(timeseries) && timeseries.length > 0) {
            const mappedChartData = timeseries.map((entry: any) => ({
              date: entry.date || (entry.full_date ? format(new Date(entry.full_date), 'EEE') : ''),
              revenue: getNumericValue(entry.revenue ?? entry.gross_revenue, 0)
            }));
            setChartData(mappedChartData);
          } else {
            const weekSummary = weekRes.data.success?.data?.summary;
            const totalWeekRev = getNumericValue(weekSummary?.net_sales ?? weekSummary?.gross_sales, 0);
            const dailyAvg = totalWeekRev / 7;
            const generatedChartData = [];
            let runningDate = subDays(new Date(), 6);
            for (let i = 0; i < 7; i++) {
              generatedChartData.push({
                date: format(runningDate, 'EEE'),
                revenue: Math.round(dailyAvg)
              });
              runningDate.setDate(runningDate.getDate() + 1);
            }
            setChartData(generatedChartData);
          }
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
      titleClassName='xl:text-[27px] textwrap leading-[1]'
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
      className='custom-header md:mt-2 lg:px-5'
    >

      {/* ========================================================================= */}
      {/* MOBILE DASHBOARD VIEW (ZEN-Inspired UX - Block < md, Hidden >= md)       */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className='-mt-6'>
        {/* 1. Hero Balance / Revenue Card + Carousel */}
        <MobileHeroCard
          title="Today's Sales Revenue"
          badge={plan?.replace('_', ' ')}
          value={<CurrencyDisplay amount={todaySales.revenue} />}
          isLoading={isLoading}
        >
          <MobileMetricPill
            title="Orders"
            value={todaySales.orders}
            subtitle="Completed today"
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            iconColorClass="bg-emerald-500/10 text-emerald-500"
            isLoading={isLoading}
          />

          <MobileMetricPill
            title="Shifts"
            value={activeShiftsCount}
            subtitle="Registers open"
            icon={<Clock className="h-3.5 w-3.5" />}
            iconColorClass="bg-blue-500/10 text-blue-500"
            isLoading={isLoading}
          />

          <MobileMetricPill
            title="Low Stock"
            value={lowStockProducts.length}
            subtitle="Items to reorder"
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            iconColorClass="bg-amber-500/10 text-amber-500"
            isLoading={isLoading}
          />

          {hasEcommerce && (
            <MobileMetricPill
              title="Online"
              value={ecomStats.todayOrders}
              subtitle="Web orders"
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
              iconColorClass="bg-purple-500/10 text-purple-500"
              isLoading={isLoading}
            />
          )}
        </MobileHeroCard>

        {/* 2. Floating Quick Action Capsule Bar */}
        <MobileActionCapsuleBar
          actions={[
            {
              label: 'Register',
              icon: <ShoppingCart className="h-3.5 w-3.5 text-primary" />,
              onClick: () => navigate('/pos/register'),
            },
            {
              label: 'Product',
              icon: <PackagePlus className="h-3.5 w-3.5 text-primary" />,
              onClick: () => navigate('/inventory/products/new'),
            },
            {
              label: 'Sales',
              icon: <HistoryIcon className="h-3.5 w-3.5 text-primary" />,
              onClick: () => navigate('/pos/transactions'),
            },
          ]}
        />

        {/* 3. Recent Activity Feed Sheet */}
        <MobileActivitySheet
          title="Recent Activity"
          viewAllLabel="View all"
          onViewAll={() => navigate('/pos/transactions')}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'pos', label: 'POS Sales' },
            ...(hasEcommerce ? [{ id: 'online', label: 'Online' }] : []),
            { id: 'alerts', label: 'Alerts', count: lowStockProducts.length },
          ]}
          activeTab={activeMobileFeedTab}
          onTabChange={(tabId) => setActiveMobileFeedTab(tabId as any)}
        >
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
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP DASHBOARD VIEW (Hidden < md, Block >= md)                        */}
      {/* ========================================================================= */}
      <div className="hidden md:block">

        {/* Section Header with View Switcher */}
        <div className="flex items-center justify-between mb-4 mt-1 md:mt-2">
          <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
            {(hasPos && (!hasEcommerce || desktopView === 'pos')) ? (
              <>
                <MonitorSmartphone className="h-5 w-5 text-primary" />
                Point of Sale Overview
              </>
            ) : (
              <>
                <ShoppingBag className="h-5 w-5 text-primary" />
                Ecommerce Overview
              </>
            )}
          </h3>

          {/* Toggle Switcher Button (when tenant has both POS & Ecommerce) */}
          {hasPos && hasEcommerce && (
            <Button
              size="sm"
              onClick={toggleDesktopView}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 font-semibold text-foreground transition-all duration-200 shadow-xs cursor-pointer group"
            >
              {desktopView === 'pos' ? (
                <>
                  <ShoppingBag className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  <span>Switch to Ecommerce</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  <MonitorSmartphone className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  <span>Switch to Point of Sale</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* POS Module Overview */}
        {hasPos && (!hasEcommerce || desktopView === 'pos') && (
          <div className="mb-6 md:mb-10">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
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
        {hasEcommerce && (!hasPos || desktopView === 'ecommerce') && (
          <div className="mb-6 md:mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-4">
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
