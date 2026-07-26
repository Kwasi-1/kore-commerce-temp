import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import DashboardCard from '@/components/ui/dashboard-card';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Expenses() {
  const { staffUser } = useAuthStore();
  const isManagerOrOwner = staffUser?.role === 'manager' || staffUser?.role === 'owner';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const startIso = dateFilter.start_date ? dateFilter.start_date.toISOString() : '';
      const endIso = dateFilter.end_date ? dateFilter.end_date.toISOString() : '';

      // 1. Fetch Summary for selected date range
      const summaryParams = new URLSearchParams();
      if (startIso) summaryParams.set('start_date', startIso);
      if (endIso) summaryParams.set('end_date', endIso);
      const summaryRes = await apiClient.get(`/tenant/expenses/summary?${summaryParams.toString()}`);
      setSummary(summaryRes.data.success?.data || summaryRes.data.data || {});

      // 2. Fetch Expenses List with filters
      const catArr = categoryFilter === 'all' ? ['all'] : Array.from(categoryFilter);
      const listParams = new URLSearchParams({ limit: '100' });
      if (catArr[0] !== 'all') listParams.set('category', catArr[0] as string);
      if (startIso) listParams.set('start_date', startIso);
      if (endIso) listParams.set('end_date', endIso);

      const listRes = await apiClient.get(`/tenant/expenses?${listParams.toString()}`);
      let data = listRes.data.success?.data?.expenses || listRes.data.data?.expenses || [];

      // Client-side search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter((e: any) =>
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.reason?.toLowerCase().includes(q)
        );
      }

      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchExpenses(), 300);
    return () => clearTimeout(timer);
  }, [fetchExpenses]);

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
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'source', label: 'Source' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'status', label: 'Status' }
  ];

  const rows = expenses.map((exp: any) => {
    const rowActions = [];
    if (isManagerOrOwner && !exp.isVoided && !exp.is_pos_movement) {
      rowActions.push({ key: 'void', label: 'Void Expense', icon: 'mdi:cancel', className: 'text-danger' });
    }

    const isTillMovement = exp.is_pos_movement || exp.source === 'pos_till' || exp.category === 'float_topup';
    const dateRaw = exp.dateIncurred || exp.date || exp.date_created;

    return {
      id: exp.id,
      date: dateRaw ? format(new Date(dateRaw), 'MMM dd, yyyy') : '—',
      category: (
        <span className="capitalize inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-foreground">
          {exp.category?.replace(/_/g, ' ')}
        </span>
      ),
      description: <span className="text-muted-foreground max-w-xs truncate block">{exp.description || exp.reason || '—'}</span>,
      amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={exp.amount} showStyling={false} /></span>,
      source: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
          isTillMovement
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
        }`}>
          {isTillMovement ? 'POS Till' : 'Backoffice'}
        </span>
      ),
      recorded_by: exp.recordedByName || exp.logged_by_name || 'Unknown',
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

  // Build dynamic summary cards from merged summary list
  const summaryList = Array.isArray(summary?.summary) ? summary.summary : [];
  const topCategories = summaryList
    .sort((a: any, b: any) => b.total_amount - a.total_amount)
    .slice(0, 3);

  const totalExpenses = summary?.total ?? summaryList.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

  return (
    <PageLayout
      title="Expenses"
      actions={
        <CustomOnlyDateFilterComponent
          defaultDate="this_month"
          value={dateFilter}
          onChange={setDateFilter}
          align="end"
          showLabelOnMobile={true}
        />
      }
      constrainHeight={true}
    >

      {/* Summary Cards */}
      <div className="mb-4 lg:mb-6">
        <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {dateFilter.active === 'today' ? "Today's Summary" : dateFilter.active === 'this_month' ? "This Month's Summary" : "Period Summary"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashboardCard
            title="Total Expenses"
            value={isLoading ? '...' : <CurrencyDisplay amount={totalExpenses} showStyling={false} />}
          />
          {topCategories.map((item: any) => (
            <DashboardCard
              key={item.category}
              title={`${item.category?.replace(/_/g, ' ')} Expenses`}
              value={<CurrencyDisplay amount={item.total_amount} showStyling={false} />}
              className="border border-border capitalize"
            />
          ))}
          {topCategories.length === 0 && !isLoading && (
            <DashboardCard
              title="No category data"
              value={<CurrencyDisplay amount={0} showStyling={false} />}
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

        showSearch={true}
        searchPlaceholder="Search by description or category..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}

        showFilter={true}
        filterLabel="Category"
        filterOptions={[
          { uid: 'all', name: 'All Categories' },
          { uid: 'supplies', name: 'Store Supplies' },
          { uid: 'utilities', name: 'Utilities & Bills' },
          { uid: 'food', name: 'Food & Meals' },
          { uid: 'transport', name: 'Transport & Logistics' },
          { uid: 'float_topup', name: 'Float Top-up' },
          { uid: 'rent', name: 'Rent' },
          { uid: 'salaries', name: 'Salaries' },
          { uid: 'marketing', name: 'Marketing' },
          { uid: 'maintenance', name: 'Maintenance' },
          { uid: 'miscellaneous', name: 'Miscellaneous' },
          { uid: 'other', name: 'Other' },
        ]}
        filterValue={categoryFilter}
        onFilterChange={(keys: any) => setCategoryFilter(keys)}

        showAddButton={true}
        addButtonText="Log Expense"
        addButtonIcon="ph:plus-bold"
        onAddButtonClick={() => setIsModalOpen(true)}
        onRefresh={fetchExpenses}
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
