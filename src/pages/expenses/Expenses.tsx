import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import RecurringExpenseForm from '@/components/expenses/RecurringExpenseForm';
import DashboardCard from '@/components/ui/dashboard-card';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Receipt, Repeat, Play, Pause, Pencil, Trash2, Plus, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function Expenses() {
  const { staffUser } = useAuthStore();
  const isManagerOrOwner = staffUser?.role === 'manager' || staffUser?.role === 'owner';

  // Active Tab: 'log' vs 'recurring'
  const [activeTab, setActiveTab] = useState<'log' | 'recurring'>('log');

  // Expense Log state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Recurring Expenses state
  const [recurringList, setRecurringList] = useState<any[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);

  // Filters for Expense Log
  const [categoryFilter, setCategoryFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<any>(null);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const startIso = dateFilter.start_date ? dateFilter.start_date.toISOString() : '';
      const endIso = dateFilter.end_date ? dateFilter.end_date.toISOString() : '';

      const summaryParams = new URLSearchParams();
      if (startIso) summaryParams.set('start_date', startIso);
      if (endIso) summaryParams.set('end_date', endIso);
      const summaryRes = await apiClient.get(`/tenant/expenses/summary?${summaryParams.toString()}`);
      setSummary(summaryRes.data.success?.data || summaryRes.data.data || {});

      const catArr = categoryFilter === 'all' ? ['all'] : Array.from(categoryFilter);
      const listParams = new URLSearchParams({ limit: '100' });
      if (catArr[0] !== 'all') listParams.set('category', catArr[0] as string);
      if (startIso) listParams.set('start_date', startIso);
      if (endIso) listParams.set('end_date', endIso);

      const listRes = await apiClient.get(`/tenant/expenses?${listParams.toString()}`);
      let data = listRes.data.success?.data?.expenses || listRes.data.data?.expenses || [];

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

  const fetchRecurringExpenses = useCallback(async () => {
    setIsLoadingRecurring(true);
    try {
      const res = await apiClient.get('/tenant/expenses/recurring');
      const data = res.data.success?.data?.recurring_expenses || res.data.data?.recurring_expenses || [];
      setRecurringList(data);
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error);
      toast.error('Failed to load recurring expense schedules');
    } finally {
      setIsLoadingRecurring(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'log') {
      const timer = setTimeout(() => fetchExpenses(), 300);
      return () => clearTimeout(timer);
    } else {
      fetchRecurringExpenses();
    }
  }, [activeTab, fetchExpenses, fetchRecurringExpenses]);

  const handleLogFormSuccess = () => {
    setIsLogModalOpen(false);
    fetchExpenses();
  };

  const handleRecurringFormSuccess = () => {
    setIsRecurringModalOpen(false);
    setEditingRecurring(null);
    fetchRecurringExpenses();
  };

  const handleVoid = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to void this expense? This action cannot be undone and will remove it from financial reports.')) {
      return;
    }

    try {
      await apiClient.post(`/tenant/expenses/${expenseId}/void`);
      toast.success('Expense voided successfully');
      fetchExpenses();
    } catch (error: any) {
      console.error('Void expense error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to void expense');
    }
  };

  const handlePostNow = async (ruleId: string) => {
    try {
      await apiClient.post(`/tenant/expenses/recurring/${ruleId}/post-now`);
      toast.success('Expense posted to log successfully');
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Post now error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to post expense');
    }
  };

  const handleToggleRecurringStatus = async (ruleId: string) => {
    try {
      await apiClient.post(`/tenant/expenses/recurring/${ruleId}/toggle-status`);
      toast.success('Schedule status updated');
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update schedule status');
    }
  };

  const handleDeleteRecurring = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this recurring schedule? Historical logs will not be affected.')) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/expenses/recurring/${ruleId}`);
      toast.success('Recurring schedule deleted');
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Delete recurring schedule error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete schedule');
    }
  };

  // Expense Log Table Definition
  const columnsLog = [
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'source', label: 'Source' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'status', label: 'Status' }
  ];

  const rowsLog = expenses.map((exp: any) => {
    const rowActions = [];
    if (isManagerOrOwner && !exp.isVoided && !exp.is_pos_movement) {
      rowActions.push({ key: 'void', label: 'Void Expense', icon: 'mdi:cancel', className: 'text-danger' });
    }

    const isTillMovement = exp.is_pos_movement || exp.source === 'pos_till' || exp.category === 'float_topup';
    const isAutoRecurring = exp.source === 'Auto-Recurring';
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
        <span className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border',
          isTillMovement
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            : isAutoRecurring
            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        )}>
          {isAutoRecurring && <Repeat className="h-3 w-3" />}
          {isTillMovement ? 'POS Till' : isAutoRecurring ? 'Auto-Recurring' : 'Backoffice'}
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

  // Recurring Schedules Table Definition
  const columnsRecurring = [
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'auto_post', label: 'Posting Mode' },
    { key: 'next_due', label: 'Next Due Date' },
    { key: 'status', label: 'Status' }
  ];

  const rowsRecurring = recurringList.map((rec: any) => {
    const isPaused = rec.status === 'paused';
    const autoPost = rec.autoPost ?? rec.auto_post ?? true;
    const nextDueRaw = rec.nextDueDate || rec.next_due_date || rec.startDate;

    const rowActions = [
      { key: 'post_now', label: 'Post Entry Now', icon: 'mdi:play-circle-outline' },
      { key: 'toggle_status', label: isPaused ? 'Resume Schedule' : 'Pause Schedule', icon: isPaused ? 'mdi:play' : 'mdi:pause' },
      { key: 'edit', label: 'Edit Schedule', icon: 'mdi:pencil-outline' },
      { key: 'delete', label: 'Delete Schedule', icon: 'mdi:trash-can-outline', className: 'text-danger' }
    ];

    return {
      id: rec.id,
      description: (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{rec.description}</span>
          <span className="text-xs text-muted-foreground capitalize">Via {rec.paymentMethod?.replace(/_/g, ' ') || 'Cash'}</span>
        </div>
      ),
      category: (
        <span className="capitalize inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-foreground">
          {rec.category?.replace(/_/g, ' ')}
        </span>
      ),
      amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={rec.amount} showStyling={false} /></span>,
      frequency: (
        <span className="capitalize text-xs font-semibold text-foreground px-2 py-1 rounded bg-muted/40 border border-border/50">
          {rec.frequency?.replace(/_/g, ' ')}
        </span>
      ),
      auto_post: (
        <span className={clsx(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold',
          autoPost
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        )}>
          {autoPost ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {autoPost ? 'Auto-Post' : 'Prompt Review'}
        </span>
      ),
      next_due: (
        <span className="text-xs font-medium text-muted-foreground">
          {nextDueRaw ? format(new Date(nextDueRaw), 'MMM dd, yyyy') : '—'}
        </span>
      ),
      status: (
        <span className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize',
          isPaused
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        )}>
          {rec.status}
        </span>
      ),
      rowActions,
      __record: rec
    };
  });

  const handleRowActionClickLog = (actionKey: string, row: any) => {
    if (actionKey === 'void') handleVoid(row.id);
  };

  const handleRowActionClickRecurring = (actionKey: string, row: any) => {
    if (actionKey === 'post_now') handlePostNow(row.id);
    if (actionKey === 'toggle_status') handleToggleRecurringStatus(row.id);
    if (actionKey === 'edit') {
      setEditingRecurring(row.__record);
      setIsRecurringModalOpen(true);
    }
    if (actionKey === 'delete') handleDeleteRecurring(row.id);
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
        <div className="flex items-center gap-3">
          {/* Segmented View Switcher */}
          <div className="inline-flex items-center bg-muted/80 p-[3px] rounded-lg borde border-border/60 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
                activeTab === 'log'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* <Receipt className="h-3.5 w-3.5" /> */}
              Expense Log
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recurring')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
                activeTab === 'recurring'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* <Repeat className="h-3.5 w-3.5" /> */}
              Recurring Schedules
            </button>
          </div>

          {activeTab === 'log' && (
            <CustomOnlyDateFilterComponent
              defaultDate="this_month"
              value={dateFilter}
              onChange={setDateFilter}
              align="end"
              showLabelOnMobile={true}
            />
          )}
        </div>
      }
      constrainHeight={true}
    >
      {activeTab === 'log' ? (
        <>
          {/* Sleek Compact Metric Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 p-3 rounded-xl bg-card/60 border border-border/60 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                {dateFilter.active === 'today' ? "Today's Total" : dateFilter.active === 'this_month' ? "This Month's Total" : "Period Total"}:
              </span>
              <span className="text-base font-bold text-foreground">
                {isLoading ? '...' : <CurrencyDisplay amount={totalExpenses} />}
              </span>
            </div>

            {topCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {topCategories.map((item: any) => (
                  <span key={item.category} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 text-foreground">
                    <span className="capitalize text-muted-foreground">{item.category?.replace(/_/g, ' ')}:</span>
                    <span className="font-semibold"><CurrencyDisplay amount={item.total_amount} showStyling={false} /></span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <EnhancedTableComponent
            columns={columnsLog}
            rows={rowsLog}
            isLoading={isLoading}
            title=""

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
            onAddButtonClick={() => setIsLogModalOpen(true)}
            onRefresh={fetchExpenses}
            onRowActionClick={handleRowActionClickLog}

            mobileFriendly={true}
          />
        </>
      ) : (
        <EnhancedTableComponent
          columns={columnsRecurring}
          rows={rowsRecurring}
          isLoading={isLoadingRecurring}
          title=""

          showSearch={false}
          showFilter={false}

          showAddButton={true}
          addButtonText="Add Recurring Schedule"
          addButtonIcon="ph:plus-bold"
          onAddButtonClick={() => {
            setEditingRecurring(null);
            setIsRecurringModalOpen(true);
          }}
          onRefresh={fetchRecurringExpenses}
          onRowActionClick={handleRowActionClickRecurring}

          mobileFriendly={true}
        />
      )}

      {/* Modal 1: Log Expense */}
      <CustomModal
        isOpen={isLogModalOpen}
        onOpenChange={() => setIsLogModalOpen(!isLogModalOpen)}
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
            onSuccess={handleLogFormSuccess}
            onCancel={() => setIsLogModalOpen(false)}
          />
        }
      />

      {/* Modal 2: Recurring Expense Schedule */}
      <CustomModal
        isOpen={isRecurringModalOpen}
        onOpenChange={() => {
          setIsRecurringModalOpen(!isRecurringModalOpen);
          if (isRecurringModalOpen) setEditingRecurring(null);
        }}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">{editingRecurring ? 'Edit Recurring Schedule' : 'Create Recurring Schedule'}</h2>
            <p className="text-sm text-muted-foreground font-normal">Schedule automated or prompt-based recurring financial outlays.</p>
          </div>
        }
        body={
          <RecurringExpenseForm
            initialData={editingRecurring}
            onSuccess={handleRecurringFormSuccess}
            onCancel={() => {
              setIsRecurringModalOpen(false);
              setEditingRecurring(null);
            }}
          />
        }
      />
    </PageLayout>
  );
}
