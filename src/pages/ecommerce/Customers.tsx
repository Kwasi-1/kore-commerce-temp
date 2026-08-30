import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import CustomModal from '@/components/modals/modal';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  Users, 
  UserCheck, 
  ShoppingBag, 
  Mail, 
  Phone, 
  Calendar, 
  RefreshCw, 
  ChevronRight,
  Loader2,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';
import { CustomerDetailPanel } from './components/CustomerDetailPanel';

export default function Customers() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState('all');

  // Selected customer for mobile detail view modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newThisMonth: 0,
    repeatCustomers: 0,
    totalSpent: 0,
    avgSpentPerCustomer: 0
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/customers?limit=100');
      const customersData = response.data.success?.data?.customers || response.data?.customers || [];
      
      // Filter by search query on frontend
      const filtered = customersData.filter((c: any) => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setCustomers(filtered);

      // Calculate mock stats
      const total = customersData.length;
      const oneMonthAgo = new Date(Date.now() - 30*24*60*60*1000).getTime();
      const newMonth = customersData.filter((c: any) => new Date(c.created_at).getTime() >= oneMonthAgo).length;
      const repeat = customersData.filter((c: any) => (c.total_orders || 0) > 1).length;
      const totalRevenue = customersData.reduce((acc: number, c: any) => acc + Number(c.total_spent || 0), 0);
      
      setStats({
        totalCustomers: total,
        newThisMonth: newMonth,
        repeatCustomers: repeat,
        totalSpent: totalRevenue,
        avgSpentPerCustomer: total > 0 ? totalRevenue / total : 0
      });

    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  // Mobile filtered customer list based on active tab
  const displayedCustomers = useMemo(() => {
    if (activeMobileTab === 'repeat') {
      return customers.filter((c: any) => (c.total_orders || 0) > 1);
    }
    if (activeMobileTab === 'new') {
      const oneMonthAgo = new Date(Date.now() - 30*24*60*60*1000).getTime();
      return customers.filter((c: any) => new Date(c.created_at).getTime() >= oneMonthAgo);
    }
    if (activeMobileTab === 'high_value') {
      return [...customers].sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0));
    }
    return customers;
  }, [customers, activeMobileTab]);

  const handleOpenDetailModal = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const columns = [
    { key: 'avatar', label: '' },
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'orders', label: 'Total Orders' },
    { key: 'spent', label: 'Total Spent' },
    { key: 'date', label: 'Date Joined' }
  ];

  const rows = customers.map((c: any) => {
    return {
      id: c.id,
      avatar: (
        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
        </div>
      ),
      name: <span className="font-semibold text-foreground">{c.name}</span>,
      email: <span className="text-muted-foreground">{c.email || '—'}</span>,
      orders: <span className="font-medium">{c.total_orders}</span>,
      spent: <span className="font-semibold"><CurrencyDisplay amount={c.total_spent} /></span>,
      date: <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>,
      __record: c
    };
  });

  const mobileTabs = [
    { id: 'all', label: 'All' },
    { id: 'repeat', label: 'Repeat Buyers' },
    { id: 'new', label: 'New Members' },
    { id: 'high_value', label: 'Top Spenders' },
  ];

  return (
    <PageLayout 
      title="Customers" 
      subtitle={isMobile ? `${customers.length} members registered` : undefined}
      constrainHeight={true}
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (Hidden >= md, Block < md)                                    */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* 1. Hero KPI Card + Metric Carousel */}
        <MobileHeroCard
          title="Total Store Customers"
          value={stats.totalCustomers.toString()}
          badge={`+${stats.newThisMonth} This Month`}
        >
          <MobileMetricPill
            title="Repeat Buyers"
            value={`${stats.repeatCustomers} (${stats.totalCustomers > 0 ? Math.round((stats.repeatCustomers / stats.totalCustomers) * 100) : 0}%)`}
            icon={<UserCheck className="h-4 w-4 text-emerald-500" />}
            onClick={() => setActiveMobileTab('repeat')}
          />
          <MobileMetricPill
            title="Avg Spend (LTV)"
            value={<CurrencyDisplay amount={stats.avgSpentPerCustomer} showStyling={false} />}
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          />
          <MobileMetricPill
            title="Total Revenue"
            value={<CurrencyDisplay amount={stats.totalSpent} showStyling={false} />}
            icon={<CreditCard className="h-4 w-4 text-purple-500" />}
          />
        </MobileHeroCard>

        {/* 2. Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search name, email, or phone..."
          }}
          actions={[
            {
              label: "Refresh",
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary" />,
              onClick: fetchCustomers
            }
          ]}
        />

        {/* 3. Activity Sheet */}
        <MobileActivitySheet
          title="Customer Directory"
          viewAllLabel="Orders"
          onViewAll={() => navigate('/ecommerce/orders')}
          tabs={mobileTabs}
          activeTab={activeMobileTab}
          onTabChange={setActiveMobileTab}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading customers...</p>
            </div>
          ) : displayedCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-center px-4">
              <Users className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <p className="text-sm font-semibold text-foreground">No customers found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try refining your search keyword" : "No customers in this category"}
              </p>
            </div>
          ) : (
            displayedCustomers.map((customer) => {
              const formattedDate = customer.created_at && !isNaN(new Date(customer.created_at).getTime())
                ? new Date(customer.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })
                : '—';

              return (
                <div
                  key={customer.id}
                  onClick={() => handleOpenDetailModal(customer)}
                  className="py-3.5 px-1 flex flex-col gap-2.5 text-xs cursor-pointer hover:bg-muted/20 rounded-lg transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-border/40">
                        {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground text-sm truncate">
                          {customer.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Joined {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-foreground text-xs">
                        <CurrencyDisplay amount={customer.total_spent} showStyling={false} />
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground mt-0.5">
                        {customer.total_orders || 0} {(customer.total_orders || 0) === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info Row */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/20">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {customer.email && (
                        <a 
                          href={`mailto:${customer.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[160px]"
                        >
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </a>
                      )}
                      {customer.phone && (
                        <a 
                          href={`tel:${customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
                        >
                          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{customer.phone}</span>
                        </a>
                      )}
                    </div>

                    <span className="text-[11px] text-primary font-medium flex items-center gap-0.5 shrink-0">
                      Profile <ChevronRight className="h-3 w-3" />
                    </span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <DashboardCard
            title="Total Customers"
            value={isLoading ? '...' : stats.totalCustomers.toString()}
          />
          <DashboardCard
            title="New This Month"
            value={isLoading ? '...' : stats.newThisMonth.toString()}
          />
          <DashboardCard
            title="Repeat Customers"
            value={isLoading ? '...' : stats.repeatCustomers.toString()}
          />
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          enableRowExpansion={true}
          columnsToHideOnExpansion={2}
          renderDetailView={(record) => (
            <CustomerDetailPanel
              customer={record}
              onClose={() => {}}
            />
          )}
          showSearch={true}
          searchPlaceholder="Search by name or email..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showAddButton={false}
          onRefresh={fetchCustomers}
        />
      </div>

      {/* Mobile Customer Detail Slide-Over Modal */}
      <CustomModal
        isOpen={isDetailModalOpen}
        onOpenChange={() => setIsDetailModalOpen(!isDetailModalOpen)}
        placement="right"
        size="lg"
        body={
          selectedCustomer && (
            <CustomerDetailPanel
              customer={selectedCustomer}
              onClose={() => setIsDetailModalOpen(false)}
            />
          )
        }
      />
    </PageLayout>
  );
}

