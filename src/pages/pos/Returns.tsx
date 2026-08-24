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
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateFilterValue } from '@/components/shared/custom-only-date-filter';
import ReturnDetailModal, { ReturnRecord } from '@/components/pos/ReturnDetailModal';
import { APP_CONFIG } from '@/config/app.config';

export default function Returns() {
  const { formatGHS, formatAmount } = useCurrency();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter as Set<string>);
      let url = '/pos/returns';
      
      const response = await apiClient.get(url);
      let data: ReturnRecord[] = response.data.success?.data?.returns || [];

      // Client-side filtering by status
      if (statusArr[0] !== 'all') {
        data = data.filter(r => r.status === statusArr[0]);
      }

      // Client-side filtering by date range
      if (dateFilter.start_date) {
        const start = startOfDay(dateFilter.start_date).getTime();
        data = data.filter(r => new Date(r.date_created || '').getTime() >= start);
      }
      if (dateFilter.end_date) {
        const end = endOfDay(dateFilter.end_date).getTime();
        data = data.filter(r => new Date(r.date_created || '').getTime() <= end);
      }

      // Client-side search by return ID, transaction ref or notes using debounced query
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase();
        data = data.filter(r =>
          r.id.toLowerCase().includes(q) ||
          r.original_transaction_ref?.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      }

      setReturns(data);
    } catch (error) {
      console.error('Failed to fetch returns history:', error);
      toast.error('Failed to load returns history');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearchQuery, dateFilter]);

  useEffect(() => {
    fetchReturns();
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
    date: r.date_created ? format(new Date(r.date_created), 'MMM dd, yyyy h:mm a') : 'N/A',
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
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Total Returns Logged"
            value={isLoading ? '...' : metrics.totalCount.toString()}
            className="border border-border"
            action={<ArrowRightLeft className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Total Refunds Approved"
            value={isLoading ? '...' : <CurrencyDisplay amount={metrics.totalRefunded} />}
            className="border border-border"
            action={<CheckCircle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Awaiting Approval"
            value={isLoading ? '...' : metrics.pendingCount.toString()}
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
          onRefresh={fetchReturns}
          onclick={handleRowClick}
          mobileFriendly={true}
        />

        {/* Side Panel Drawer (Details Sheet) */}
        <ReturnDetailModal
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          selectedReturn={selectedReturn}
        />
      </div>
    </PageLayout>
  );
}
