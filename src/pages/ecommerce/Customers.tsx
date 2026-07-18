import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import { CustomerDetailPanel } from './components/CustomerDetailPanel';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newThisMonth: 0,
    repeatCustomers: 0
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/customers?limit=100');
      const customersData = response.data.success?.data?.customers || [];
      
      // Filter by search query on frontend
      const filtered = customersData.filter((c: any) => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setCustomers(filtered);

      // Calculate mock stats
      const total = filtered.length;
      const oneMonthAgo = new Date(Date.now() - 30*24*60*60*1000).getTime();
      const newMonth = filtered.filter((c: any) => new Date(c.created_at).getTime() >= oneMonthAgo).length;
      const repeat = filtered.filter((c: any) => c.total_orders > 1).length;
      
      setStats({
        totalCustomers: total,
        newThisMonth: newMonth,
        repeatCustomers: repeat
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
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {c.name.charAt(0).toUpperCase()}
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

  return (
    <PageLayout title="Customers">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <DashboardCard
          title="Total Customers"
          value={isLoading ? '...' : stats.totalCustomers.toString()}
          className="border border-border"
        />
        <DashboardCard
          title="New This Month"
          value={isLoading ? '...' : stats.newThisMonth.toString()}
          className="border border-border bg-primary/5 dark:bg-primary/10"
        />
        <DashboardCard
          title="Repeat Customers"
          value={isLoading ? '...' : stats.repeatCustomers.toString()}
          className="border border-border"
        />
      </div>

      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Customer Directory"
        
        enableRowExpansion={true}
        columnsToHideOnExpansion={2}
        renderDetailView={(record) => (
          <CustomerDetailPanel
            customer={record}
            onClose={() => {}} // Handled by EnhancedTableComponent
          />
        )}
        
        showSearch={true}
        searchPlaceholder="Search by name or email..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showAddButton={false}
        onRefresh={fetchCustomers}
      />
    </PageLayout>
  );
}
