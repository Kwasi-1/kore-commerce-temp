import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import RecurringExpenseForm from '@/components/expenses/RecurringExpenseForm';
import DashboardCard from '@/components/ui/dashboard-card';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Receipt, 
  Repeat, 
  Play, 
  Pause, 
  Pencil, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import clsx from 'clsx';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function Expenses() {
  const isMobile = useIsMobile();
  const { staffUser } = useAuthStore();
  const isManagerOrOwner = staffUser?.role === 'manager' || staffUser?.role === 'owner';

  // Active Tab: 'log' vs 'recurring'
  const [activeTab, setActiveTab] = useState<'log' | 'recurring'>('log');

  // Expense Log state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

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

  const fetchExpenses = useCallback(async (pageNumber: number = 1) => {
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
      const listParams = new URLSearchParams({ page: String(pageNumber), per_page: '20' });
      if (catArr[0] && catArr[0] !== 'all') listParams.set('category', catArr[0] as string);
      if (startIso) listParams.set('start_date', startIso);
      if (endIso) listParams.set('end_date', endIso);
      if (searchQuery.trim()) listParams.set('search', searchQuery.trim());

      const listRes = await apiClient.get(`/tenant/expenses?${listParams.toString()}`);
      const data = listRes.data.success?.data?.expenses || listRes.data.data?.expenses || [];
      const pag = listRes.data.success?.data?.pagination || listRes.data.data?.pagination || null;

      setExpenses(data);
      setPagination(pag);
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
      const timer = setTimeout(() => fetchExpenses(1), 300);
      return () => clearTimeout(timer);
    } else {
      fetchRecurringExpenses();
    }
  }, [activeTab, fetchExpenses, fetchRecurringExpenses]);

  const handleLogFormSuccess = () => {
    setIsLogModalOpen(false);
    fetchExpenses(1);
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
    if (!window.confirm('Are you sure you want to delete this recurring schedule? Existing logged expenses will remain intact.')) {
      return;
    }
    try {
      await apiClient.delete(`/tenant/expenses/recurring/${ruleId}`);
      toast.success('Schedule deleted successfully');
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Delete recurring error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete schedule');
    }
  };

  const activeMobileCatTab = useMemo(() => {
    if (categoryFilter instanceof Set) {
      return (Array.from(categoryFilter)[0] as string) || 'all';
    }
    return (categoryFilter as string) || 'all';
  }, [categoryFilter]);

  // Expense Log Table Definition
  const columnsLog = [
    { key: 'expense_date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'source', label: 'Source' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'status', label: 'Status' },
  ];

  const rowsLog = expenses.map((item) => {
    const isVoided = item.status === 'voided' || item.isVoided;
    const dateRaw = item.dateIncurred || item.date || item.date_created || item.expense_date;
    return {
      id: item.id,
      expense_date: dateRaw ? format(new Date(dateRaw), 'MMM dd, yyyy') : '—',
      category: (
        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
          {item.category?.replace(/_/g, ' ')}
        </span>
      ),
      description: <span className="font-medium text-foreground">{item.description || item.reason || '—'}</span>,
      amount: (
        <span className={clsx('font-bold', isVoided ? 'line-through text-muted-foreground' : 'text-foreground')}>
          <CurrencyDisplay amount={item.amount} showStyling={false} />
        </span>
      ),
      source: (
        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600">
          {item.source || 'Backoffice'}
        </span>
      ),
      recorded_by: item.recordedByName || item.logged_by_name || 'System',
      status: (
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize',
            isVoided
              ? 'bg-rose-500/10 text-rose-600'
              : 'bg-emerald-500/10 text-emerald-600'
          )}
        >
          {isVoided ? 'Voided' : 'Valid'}
        </span>
      ),
      rowActions: [
        ...(!isVoided && isManagerOrOwner
          ? [
              {
                key: 'void',
                label: 'Void Expense',
                icon: 'solar:trash-bin-trash-linear',
                className: 'text-destructive',
              },
            ]
          : []),
      ],
      __record: item,
    };
  });

  // Recurring Schedules Table Definition
  const columnsRecurring = [
    { key: 'name', label: 'Schedule Name' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'next_run', label: 'Next Run Date' },
    { key: 'status', label: 'Status' },
  ];

  const rowsRecurring = recurringList.map((rule) => {
    const isActive = rule.status === 'active';
    return {
      id: rule.id,
      name: <span className="font-semibold text-foreground">{rule.description || rule.name}</span>,
      category: (
        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
          {rule.category?.replace(/_/g, ' ')}
        </span>
      ),
      amount: (
        <span className="font-bold text-foreground">
          <CurrencyDisplay amount={rule.amount} showStyling={false} />
        </span>
      ),
      frequency: (
        <span className="capitalize text-xs font-medium">
          {rule.frequency}
        </span>
      ),
      next_run: rule.nextDueDate || rule.next_run_date ? format(new Date(rule.nextDueDate || rule.next_run_date), 'MMM dd, yyyy') : '—',
      status: (
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize',
            isActive
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isActive ? 'Active' : 'Paused'}
        </span>
      ),
      rowActions: [
        {
          key: 'post_now',
          label: 'Post to Log Now',
          icon: 'solar:play-circle-linear',
          className: 'text-primary',
        },
        {
          key: 'toggle_status',
          label: isActive ? 'Pause Schedule' : 'Resume Schedule',
          icon: isActive ? 'solar:pause-circle-linear' : 'solar:play-circle-linear',
        },
        {
          key: 'edit',
          label: 'Edit Schedule',
          icon: 'solar:pen-linear',
        },
        {
          key: 'delete',
          label: 'Delete Schedule',
          icon: 'solar:trash-bin-trash-linear',
          className: 'text-destructive',
        },
      ],
      __record: rule,
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

  const summaryList = Array.isArray(summary?.summary) ? summary.summary : [];
  const topCategories = summaryList
    .sort((a: any, b: any) => b.total_amount - a.total_amount)
    .slice(0, 4);

  const totalExpenses = summary?.total ?? summaryList.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

  return (
    <PageLayout
      title="Expenses"
      actions={
        <div className="hidden md:flex items-center gap-3">
          <div className="inline-flex items-center bg-muted/80 p-[3px] rounded-lg border border-border/60 text-[12px] font-medium">
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
      <MobileDashboardWrapper>
        <MobileHeroCard
          title="Total Expenses"
          badge={dateFilter.active === 'this_month' ? 'This Month' : dateFilter.active?.replace(/_/g, ' ')}
          value={isLoading ? '...' : <CurrencyDisplay amount={totalExpenses} />}
          isLoading={isLoading}
        >
          {topCategories.map((item: any) => {
            const percent = totalExpenses > 0 ? ((item.total_amount / totalExpenses) * 100).toFixed(0) : 0;
            return (
              <MobileMetricPill
                key={item.category}
                title={item.category?.replace(/_/g, ' ')}
                value={<CurrencyDisplay amount={item.total_amount} />}
                subtitle={`${percent}% of total`}
                icon={<Receipt className="h-3.5 w-3.5" />}
                iconColorClass="bg-blue-500/10 text-blue-500"
                isLoading={isLoading}
                onClick={() => {
                  setActiveTab('log');
                  setCategoryFilter(new Set([item.category]));
                }}
              />
            );
          })}
          <MobileMetricPill
            title="Recurring"
            value={recurringList.length}
            subtitle="Schedules"
            icon={<Repeat className="h-3.5 w-3.5" />}
            iconColorClass="bg-purple-500/10 text-purple-500"
            isLoading={isLoadingRecurring}
            onClick={() => setActiveTab('recurring')}
          />
        </MobileHeroCard>

        <MobileActionCapsuleBar
          searchConfig={
            activeTab === 'log'
              ? {
                  value: searchQuery,
                  onChange: setSearchQuery,
                  placeholder: "Search expenses...",
                }
              : undefined
          }
          actions={
            activeTab === 'log'
              ? [
                  {
                    label: 'Log Expense',
                    icon: <Plus className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => setIsLogModalOpen(true),
                  },
                  {
                    label: 'Recurring',
                    icon: <Repeat className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => setActiveTab('recurring'),
                  },
                  {
                    icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
                    onClick: () => fetchExpenses(1),
                  },
                ]
              : [
                  {
                    label: 'Schedule',
                    icon: <Plus className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => {
                      setEditingRecurring(null);
                      setIsRecurringModalOpen(true);
                    },
                  },
                  {
                    label: 'Expense Log',
                    icon: <Receipt className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => setActiveTab('log'),
                  },
                  {
                    icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
                    onClick: fetchRecurringExpenses,
                  },
                ]
          }
        />

        {activeTab === 'log' ? (
          <MobileActivitySheet
            title="Expense Log"
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'supplies', label: 'Supplies' },
              { id: 'utilities', label: 'Utilities' },
              { id: 'food', label: 'Food' },
              { id: 'transport', label: 'Transport' },
              { id: 'rent', label: 'Rent' },
              { id: 'salaries', label: 'Salaries' },
              { id: 'marketing', label: 'Marketing' },
              { id: 'maintenance', label: 'Maintenance' },
            ]}
            activeTab={activeMobileCatTab}
            onTabChange={(tabId) => setCategoryFilter(new Set([tabId]))}
          >
            {isLoading ? (
              <div className="py-8 text-center"><Spinner /></div>
            ) : expenses.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No expenses found matching your filter or search.
              </div>
            ) : (
              expenses.map((item) => {
                const isVoided = item.status === 'voided' || item.isVoided;
                const dateRaw = item.dateIncurred || item.date || item.date_created || item.expense_date;
                return (
                  <div
                    key={item.id}
                    className="py-3 flex flex-col gap-2 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate max-w-[210px]">
                          {item.description || item.reason || 'General Expense'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {dateRaw ? format(new Date(dateRaw), 'MMM dd, yyyy') : '—'} &middot; {item.recordedByName || item.logged_by_name || 'System'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={clsx('text-xs font-bold', isVoided ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          <CurrencyDisplay amount={item.amount} showStyling={false} />
                        </p>
                        <span className="text-[10px] text-blue-600 capitalize">
                          {item.source || 'Backoffice'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        {item.category?.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          isVoided ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {isVoided ? 'Voided' : 'Valid'}
                        </span>
                        {!isVoided && isManagerOrOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVoid(item.id)}
                            className="h-6 px-2 text-[10px] font-semibold text-destructive hover:bg-destructive/10 rounded-md"
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </MobileActivitySheet>
        ) : (
          <MobileActivitySheet title="Recurring Schedules">
            {isLoadingRecurring ? (
              <div className="py-8 text-center"><Spinner /></div>
            ) : recurringList.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No recurring schedules configured.
              </div>
            ) : (
              recurringList.map((rule) => {
                const isActive = rule.status === 'active';
                return (
                  <div
                    key={rule.id}
                    className="py-3 flex flex-col gap-2 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate max-w-[210px]">
                          {rule.description || rule.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                          {rule.frequency}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">
                          <CurrencyDisplay amount={rule.amount} showStyling={false} />
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold capitalize ${
                          isActive ? 'text-emerald-600 bg-emerald-500/10' : 'text-muted-foreground bg-muted'
                        }`}>
                          {isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        {rule.category?.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => handlePostNow(rule.id)}
                          className="h-6 px-2 text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                        >
                          Post Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleRecurringStatus(rule.id)}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          title={isActive ? "Pause" : "Resume"}
                        >
                          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRecurring(rule);
                            setIsRecurringModalOpen(true);
                          }}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </MobileActivitySheet>
        )}
      </MobileDashboardWrapper>

      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        {activeTab === 'log' ? (
          <>
            <div className="mb-4 lg:mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <DashboardCard
                  title="Total Expenses"
                  value={isLoading ? '...' : <CurrencyDisplay amount={totalExpenses} />}
                />
                {topCategories.slice(0, 3).map((item: any) => (
                  <DashboardCard
                    key={item.category}
                    title={`${item.category?.replace(/_/g, ' ')} Expenses`}
                    value={<CurrencyDisplay amount={item.total_amount} />}
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
              columns={columnsLog}
              rows={rowsLog}
              isLoading={isLoading}
              serverPagination={pagination}
              onPageChange={(page) => fetchExpenses(page)}
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
              onRefresh={() => fetchExpenses(1)}
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
      </div>

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
