import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import { 
  CheckCircle,
  Clock,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateFilterValue } from '@/components/shared/custom-only-date-filter';
import ReturnDetailModal, { ReturnRecord } from '@/components/pos/ReturnDetailModal';
import { APP_CONFIG } from '@/config/app.config';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function Returns() {
  const { formatGHS, formatAmount } = useCurrency();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>({
    total_logged: 0,
    total_refunds_approved: 0,
    awaiting_count: 0
  });
  
  // Filtering states
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ active: 'all_time', start_date: null, end_date: null });
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Drawer state for return details
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchReturns = useCallback(async (pageNumber: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter as Set<string>);
      let url = `/pos/returns?page=${pageNumber}&per_page=20`;
      
      if (statusArr[0] && statusArr[0] !== 'all') {
        url += `&status=${encodeURIComponent(statusArr[0])}`;
      }
      if (dateFilter.start_date) {
        url += `&start_date=${format(dateFilter.start_date, 'yyyy-MM-dd')}T00:00:00Z`;
      }
      if (dateFilter.end_date) {
        url += `&end_date=${format(dateFilter.end_date, 'yyyy-MM-dd')}T23:59:59Z`;
      }
      if (debouncedSearchQuery.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearchQuery.trim())}`;
      }

      const response = await apiClient.get(url);
      const data: ReturnRecord[] = response.data.success?.data?.returns || [];
      const pag = response.data.success?.data?.pagination || null;
      const sum = response.data.success?.data?.summary || null;

      if (append) {
        setReturns((prev) => [...prev, ...data]);
      } else {
        setReturns(data);
      }
      setPagination(pag);
      if (sum) {
        setSummary(sum);
      }
    } catch (error) {
      console.error('Failed to fetch returns history:', error);
      toast.error('Failed to load returns history');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter, debouncedSearchQuery, dateFilter]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !pagination?.hasNext) return;
    const nextPage = (pagination?.page || 1) + 1;
    fetchReturns(nextPage, true);
  };

  useEffect(() => {
    fetchReturns(1);
  }, [fetchReturns]);

  const handleRowClick = (key: any) => {
    const targetId = typeof key === 'string' ? key : key?.id || key?.__record?.id;
    const found = returns.find(r => r.id === targetId);
    if (found) {
      setSelectedReturn(found);
      setIsDrawerOpen(true);
    }
  };

  // Metric computations
  const metrics = useMemo(() => {
    const totalCount = returns.length;
    const totalRefunded = returns
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.total_refund_amount || 0), 0);
    const pendingCount = returns.filter(r => r.status === 'pending').length;
    
    return {
      totalCount,
      totalRefunded,
      pendingCount
    };
  }, [returns]);

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'id_display', label: 'Return ID' },
    { key: 'original_ref', label: 'Orig. Receipt' },
    { key: 'items_count', label: 'Items Count' },
    { key: 'amount', label: 'Total Refund' },
    { key: 'status', label: 'Status' },
    { key: 'approved_by', label: 'Approved By' }
  ];

  const rows = returns.map((r: ReturnRecord) => ({
    id: r.id,
    date: <span className="min-w-[150px] inline-block">{r.date_created ? format(new Date(r.date_created), 'MMM dd, yyyy h:mm a') : 'N/A'} </span>,
    id_display: <span className="font-mono text-xs font-semibold">{r.id}</span>,
    original_ref: <span className="font-mono text-xs font-semibold">{r.original_transaction_ref || r.original_transaction_id?.slice(0, 8)?.toUpperCase()}</span>,
    items_count: <span className="font-medium">{r.items?.length || 0} items</span>,
    amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={r.total_refund_amount || 0} /></span>,
    status: (
      <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
        r.status === 'approved'
          ? 'bg-green-500/10 text-green-600 border-green-500/20'
          : r.status === 'rejected'
            ? 'bg-red-500/10 text-red-600 border-red-500/20'
            : 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
      }`}>
        {r.status}
      </span>
    ),
    approved_by: r.approved_by_name || '—',
    __record: r
  }));

  return (
    <PageLayout title="POS Returns History" constrainHeight={true}>
      {/* ========================================================================= */}
      {/* MOBILE RETURNS VIEW (ZEN-Inspired Design - Block < md, Hidden >= md)      */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper>
        {/* 1. Hero Total Refunds Approved Card + Metric Carousel */}
        <MobileHeroCard
          title="Total Refunds Approved"
          badge={dateFilter.active?.replace('_', ' ') || 'All Time'}
          value={<CurrencyDisplay amount={metrics.totalRefunded} className="!tracking-normal" />}
          isLoading={isLoading}
        >
          <MobileMetricPill
            title="Total Logged"
            value={metrics.totalCount}
            subtitle="Return records"
            icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
            iconColorClass="bg-blue-500/10 text-blue-500"
            isLoading={isLoading}
            onClick={() => setStatusFilter(new Set(['all']))}
          />

          <MobileMetricPill
            title="Pending"
            value={metrics.pendingCount}
            subtitle="Needs review"
            icon={<Clock className="h-3.5 w-3.5" />}
            iconColorClass="bg-amber-500/10 text-amber-500"
            isLoading={isLoading}
            onClick={() => setStatusFilter(new Set(['pending']))}
          />

          <MobileMetricPill
            title="Approved"
            value={returns.filter(r => r.status === 'approved').length}
            subtitle="Processed"
            icon={<CheckCircle className="h-3.5 w-3.5" />}
            iconColorClass="bg-emerald-500/10 text-emerald-500"
            isLoading={isLoading}
            onClick={() => setStatusFilter(new Set(['approved']))}
          />
        </MobileHeroCard>

        {/* 2. Floating Quick Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search return ID, receipt ref, or notes...",
          }}
          dateFilterConfig={{
            value: dateFilter,
            onChange: setDateFilter,
            showLabelOnMobile: true,
          }}
          actions={[
            {
              label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5" />,
              onClick: fetchReturns,
            },
          ]}
        />

        {/* 3. Returns Activity Sheet */}
        <MobileActivitySheet
          title="Return Records"
          tabs={[
            { id: 'all', label: 'All' },
            ...(metrics.pendingCount > 0 ? [{ id: 'pending', label: 'Pending', count: metrics.pendingCount }] : [{ id: 'pending', label: 'Pending' }]),
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ]}
          activeTab={
            statusFilter instanceof Set
              ? (Array.from(statusFilter)[0] as string) || 'all'
              : (statusFilter as string) || 'all'
          }
          onTabChange={(tabId) => setStatusFilter(new Set([tabId]))}
          hasMore={pagination?.hasNext}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          totalCount={pagination?.total}
          currentCount={returns.length}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : returns.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No return records found matching your filters.
            </div>
          ) : (
            returns.map((r: ReturnRecord) => {
              const isApproved = r.status === 'approved';
              const isPending = r.status === 'pending';

              return (
                <div
                  key={r.id}
                  onClick={() => handleRowClick(r.id)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "p-3 rounded-lg shrink-0 bg-muted/60 text-muted-foreground  flex items-center justify-center",
                      
                    )}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground font-mono truncate max-w-[170px]">
                        {r.id}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                        Orig: <span className="font-mono">{r.original_transaction_ref || r.original_transaction_id?.slice(0, 8)?.toUpperCase()}</span> • {r.items?.length || 0} items
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {r.date_created ? format(new Date(r.date_created), 'MMM dd, yyyy hh:mm a') : 'N/A'} {r.approved_by_name ? `• ${r.approved_by_name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-[12px] text-foreground block">
                      <CurrencyDisplay amount={r.total_refund_amount || 0} symbolClassName="text-xs" />
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5",
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : isPending
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}>
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP RETURNS VIEW (Hidden < md, Flex >= md)                            */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Total Returns Logged"
            value={isLoading ? '...' : (summary?.total_logged ?? returns.length).toString()}
            className="border border-border"
            action={<ArrowRightLeft className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Total Refunds Approved"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary?.total_refunds_approved ?? 0} />}
            className="border border-border"
            action={<CheckCircle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Awaiting Approval"
            value={isLoading ? '...' : (summary?.awaiting_count ?? 0).toString()}
            className="border border-border"
            action={<Clock className="text-muted-foreground/50 h-5 w-5" />}
          />
        </div>

        {/* Returns Table Component */}
        <EnhancedTableComponent
          title="Return Records"
          columns={columns}
          rows={rows}
          searchPlaceholder="Search by ID, receipt reference, notes..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(page) => fetchReturns(page)}
          showFilter={true}
          filterLabel="Status"
          filterOptions={[
            { uid: 'all', name: 'All Statuses' },
            { uid: 'pending', name: 'Pending' },
            { uid: 'approved', name: 'Approved' },
            { uid: 'rejected', name: 'Rejected' }
          ]}
          filterValue={statusFilter}
          onFilterChange={(keys: any) => setStatusFilter(keys)}
          showDateFilter={true}
          dateFilterValue={dateFilter}
          onDateFilterChange={setDateFilter}
          showAddButton={false}
          onRefresh={() => fetchReturns(1)}
          onclick={handleRowClick}
          mobileFriendly={true}
        />
      </div>

      {/* Side Panel Drawer (Details Sheet) */}
      <ReturnDetailModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedReturn={selectedReturn}
      />
    </PageLayout>
  );
}

