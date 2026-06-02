import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function Expenses() {
  const { staffUser } = useAuthStore();
  const isManagerOrOwner = staffUser?.role === 'manager' || staffUser?.role === 'owner';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState(new Set(['all']));
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Summary for Current Month
      const startOfCurrMonth = startOfMonth(new Date()).toISOString();
      const endOfCurrMonth = endOfMonth(new Date()).toISOString();
      const summaryRes = await apiClient.get(`/tenant/expenses/summary?start_date=${startOfCurrMonth}&end_date=${endOfCurrMonth}`);
      setSummary(summaryRes.data.data || {});

      // 2. Fetch Expenses List
      const catArr = Array.from(categoryFilter);
      let listUrl = '/tenant/expenses?limit=50';
      if (catArr[0] !== 'all') {
        listUrl += `&category=${catArr[0]}`;
      }
      const listRes = await apiClient.get(listUrl);
      setExpenses(listRes.data.data?.expenses || []);

    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchExpenses();
  };

  const handleVoid = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to void this expense? This action cannot be undone and will remove it from financial reports.')) {
      return;
    }

    try {
      await apiClient.put(`/tenant/expenses/${expenseId}/void`);
      toast.success('Expense voided successfully');
      fetchExpenses();
    } catch (error: any) {
      console.error('Void expense error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to void expense');
    }
  };

  const columns = [
    { key: 'date', label: 'Date Incurred' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'status', label: 'Status' }
  ];

  const rows = expenses.map((exp: any) => {
    const rowActions = [];
    if (isManagerOrOwner && !exp.isVoided) {
      rowActions.push({ key: 'void', label: 'Void Expense', icon: 'mdi:cancel', className: 'text-danger' });
    }

    return {
      id: exp.id,
      date: format(new Date(exp.dateIncurred || exp.date || new Date()), 'MMM dd, yyyy'),
      category: <span className="capitalize font-medium">{exp.category}</span>,
      description: <span className="text-muted-foreground max-w-xs truncate block">{exp.description}</span>,
      amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={exp.amount} /></span>,
      recorded_by: exp.recordedByName || 'Unknown',
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          exp.isVoided ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' 
          : 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {exp.isVoided ? 'Voided' : 'Valid'}
        </span>
      ),
      rowActions,
      __record: exp
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'void') handleVoid(row.id);
  };

  // Build dynamic summary cards for top categories
  const summaryList = Array.isArray(summary?.summary) ? summary.summary : [];
  const topCategories = summaryList
    .sort((a: any, b: any) => b.total_amount - a.total_amount)
    .slice(0, 3)
    .map((item: any) => [item.category, item.total_amount]);
  
  const totalExpenses = summary?.total || summaryList.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

  return (
    <PageLayout title="Expenses">
      
      {/* Summary Cards */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">This Month's Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Expenses"
            value={isLoading ? '...' : <CurrencyDisplay amount={totalExpenses} />}
            className="border border-border bg-primary/5 dark:bg-primary/10"
          />
          {topCategories.map(([cat, amount]: any) => (
            <DashboardCard
              key={cat}
              title={`${cat} Expenses`}
              value={<CurrencyDisplay amount={amount} />}
              className="border border-border capitalize"
            />
          ))}
          {topCategories.length === 0 && !isLoading && (
             <DashboardCard
             title="No category data"
             value={<CurrencyDisplay amount={0} />}
             className="border border-border"
           />
          )}
        </div>
      </div>

      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Expense Log"
        
        showSearch={false}
        
        showFilter={true}
        filterLabel="Category"
        filterOptions={[
          { uid: 'all', name: 'All Categories' },
          { uid: 'rent', name: 'Rent' },
          { uid: 'utilities', name: 'Utilities' },
          { uid: 'salaries', name: 'Salaries' },
          { uid: 'marketing', name: 'Marketing' },
          { uid: 'maintenance', name: 'Maintenance' },
          { uid: 'supplies', name: 'Supplies' },
          { uid: 'software', name: 'Software' },
          { uid: 'taxes', name: 'Taxes' },
          { uid: 'other', name: 'Other' },
        ]}
        filterValue={categoryFilter}
        onFilterChange={(keys: any) => setCategoryFilter(keys)}
        
        showAddButton={true}
        addButtonText="Log Expense"
        onAddButtonClick={() => setIsModalOpen(true)}
        onRowActionClick={handleRowActionClick}
        
        mobileFriendly={true}
      />

      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">Log New Expense</h2>
            <p className="text-sm text-muted-foreground font-normal">Record a business expense or petty cash transaction.</p>
          </div>
        }
        body={
          <ExpenseForm 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsModalOpen(false)} 
          />
        }
      />

    </PageLayout>
  );
}
