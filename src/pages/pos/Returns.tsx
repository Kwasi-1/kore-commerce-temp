import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { 
  RotateCcw, 
  History, 
  Calendar, 
  UserCheck, 
  Printer, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateFilterValue } from '@/components/shared/custom-only-date-filter';

interface ReturnItem {
  variant_id: string;
  product_name: string;
  packaging_tier_id: string | null;
  packaging_tier_name: string;
  quantity: number;
  unit_price: number;
  condition: "sellable" | "damaged";
}

interface ReturnRecord {
  id: string;
  original_transaction_id: string;
  original_transaction_ref: string;
  reason: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  refund_method: string;
  total_refund_amount: number;
  initiated_by: string;
  initiated_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  date_created: string;
  items: ReturnItem[];
}

export default function Returns() {
  const { formatGHS, formatAmount } = useCurrency();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering states
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ active: 'all_time', start_date: null, end_date: null });
  
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
        data = data.filter(r => new Date(r.date_created).getTime() >= start);
      }
      if (dateFilter.end_date) {
        const end = endOfDay(dateFilter.end_date).getTime();
        data = data.filter(r => new Date(r.date_created).getTime() <= end);
      }

      // Client-side search by return ID, transaction ref or notes
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter(r =>
          r.id.toLowerCase().includes(q) ||
          r.original_transaction_ref.toLowerCase().includes(q) ||
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
  }, [statusFilter, searchQuery, dateFilter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleRowClick = (key: any) => {
    const ret = returns.find(r => r.id === key);
    if (ret) {
      setSelectedReturn(ret);
      setIsDrawerOpen(true);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById("drawer-return-receipt-print");
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // restore react app state
  };

  // Summary statistics
  const stats = useMemo(() => {
    const count = returns.length;
    const totalRefunded = returns
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.total_refund_amount, 0);
    const pendingCount = returns.filter(r => r.status === 'pending').length;
    return { count, totalRefunded, pendingCount };
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
    original_ref: <span className="font-mono text-xs font-semibold">{r.original_transaction_ref}</span>,
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

  const reasonLabels: Record<string, string> = {
    defective: "Defective / Damaged",
    wrong_item: "Wrong Item",
    customer_change: "Customer Change",
    other: "Other"
  };

  const methodLabels: Record<string, string> = {
    cash: "Cash Refund",
    mobile_money: "Mobile Money (MoMo)",
    card: "Card Refund"
  };

  return (
    <PageLayout title="POS Returns History" constrainHeight={true}>
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Total Returns Logged"
            value={isLoading ? '...' : stats.count.toString()}
            className="border border-border"
            action={<ArrowRightLeft className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Total Refunds Approved"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.totalRefunded} />}
            className="border border-border"
            action={<CheckCircle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Awaiting Approval"
            value={isLoading ? '...' : stats.pendingCount.toString()}
            className="border border-border"
            action={<Clock className="text-muted-foreground/50 h-5 w-5" />}
          />
        </div>

        {/* Enhanced Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows.map(r => ({
            ...r,
            // Override columns mapping for visual display inside the table
            id: r.id_display,
            original_ref: r.original_ref
          }))}
          isLoading={isLoading}
          title="Returns Log"
          showSearch={true}
          searchPlaceholder="Search by return ID or original receipt..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
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
          defaultDateFilterRange="all_time"
          showAddButton={false}
          onRefresh={fetchReturns}
          onclick={handleRowClick}
          mobileFriendly={true}
        />

        {/* Side Panel Drawer (Details Sheet) */}
        <CustomModal
          isOpen={isDrawerOpen}
          onOpenChange={() => setIsDrawerOpen(false)}
          placement="right"
          size="md"
          header={
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Return Detail Record</span>
            </div>
          }
          body={
            <div className="flex-1 overflow-y-auto px-1 py-4 text-left">
              {selectedReturn ? (
                <div className="space-y-6">
                  {/* Stamp Overview */}
                  <div className="text-center pb-6 border-b border-border/50">
                    <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                      selectedReturn.status === 'approved'
                        ? 'bg-green-500/10 text-green-600'
                        : selectedReturn.status === 'rejected'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      <RotateCcw className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold font-mono uppercase tracking-tight">{selectedReturn.id}</h3>
                    <p className="text-muted-foreground text-xs">
                      Orig. Receipt: <span className="font-mono font-semibold">{selectedReturn.original_transaction_ref}</span>
                    </p>

                    <div className="mt-4 bg-muted/40 p-4.5 rounded-xl border border-border inline-block w-full max-w-[280px]">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">Refund Amount Issued</p>
                      <p className="text-2xl font-extrabold text-foreground tracking-tight">
                        {formatGHS(selectedReturn.total_refund_amount)}
                      </p>
                      <span className={`capitalize text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-2.5 border ${
                        selectedReturn.status === 'approved'
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : selectedReturn.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                      }`}>
                        {selectedReturn.status}
                      </span>
                    </div>
                  </div>

                  {/* Return Information Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                      <FileText className="h-4 w-4" /> Return Info
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Reason</span>
                        <span className="font-semibold">{reasonLabels[selectedReturn.reason] || selectedReturn.reason}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Refund Method</span>
                        <span className="font-semibold capitalize">{selectedReturn.refund_method.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Initiated By</span>
                        <span className="font-semibold">{selectedReturn.initiated_by_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Created Date</span>
                        <span className="font-semibold">
                          {selectedReturn.date_created ? format(new Date(selectedReturn.date_created), 'MMM dd, yyyy h:mm a') : '—'}
                        </span>
                      </div>
                      {selectedReturn.status === 'approved' && (
                        <>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Authorized By</span>
                            <span className="font-semibold">{selectedReturn.approved_by_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Approved At</span>
                            <span className="font-semibold">
                              {selectedReturn.approved_at ? format(new Date(selectedReturn.approved_at), 'MMM dd, yyyy h:mm a') : '—'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedReturn.notes && (
                      <div className="bg-muted/30 p-3 rounded-xl border mt-2">
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase tracking-wider mb-1">Notes / Rejection Remarks</span>
                        <p className="text-xs leading-relaxed font-medium text-foreground">{selectedReturn.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                      <History className="h-4 w-4" /> Returned Items
                    </h4>

                    <div className="border rounded-xl overflow-hidden bg-card text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-muted text-muted-foreground text-[9px] uppercase border-b">
                            <th className="p-2.5">Item</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Price</th>
                            <th className="p-2.5 text-center">Condition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReturn.items?.map((item, idx) => (
                            <tr key={idx} className="border-b last:border-none">
                              <td className="p-2.5">
                                <p className="font-bold capitalize text-foreground">{item.product_name}</p>
                                <span className="text-[9px] text-muted-foreground font-mono">{item.packaging_tier_name || 'Unit'}</span>
                              </td>
                              <td className="p-2.5 text-center font-medium text-muted-foreground">{item.quantity}</td>
                              <td className="p-2.5 text-right font-semibold">{formatGHS(item.unit_price)}</td>
                              <td className="p-2.5 text-center">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                  item.condition === 'sellable'
                                    ? 'bg-green-500/10 text-green-600 border border-green-500/10'
                                    : 'bg-red-500/10 text-red-600 border border-red-500/10'
                                }`}>
                                  {item.condition}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Receipt block for printing */}
                  <div className="hidden">
                    <div 
                      id="drawer-return-receipt-print"
                      className="bg-white text-zinc-950 p-6 font-sans text-xs space-y-4 max-w-[320px] mx-auto text-left"
                    >
                      <div className="text-center pb-3 border-b border-dashed border-zinc-200">
                        <span className="border border-red-500 text-red-500 font-extrabold px-3 py-1 rounded text-[10px] tracking-widest inline-block uppercase rotate-[-5deg] mb-3">
                          Customer Return
                        </span>
                        <h4 className="font-bold text-sm tracking-wider uppercase">HeadlessPOS Store</h4>
                        <p className="text-[9px] text-zinc-500">REFUND RECEIPT</p>
                      </div>

                      <div className="space-y-1 text-[10px] pb-3 border-b border-dashed border-zinc-200">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Return ID:</span>
                          <span className="font-mono font-bold text-zinc-900">{selectedReturn.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Orig Receipt #:</span>
                          <span className="font-mono text-zinc-900">{selectedReturn.original_transaction_ref}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Date Processed:</span>
                          <span>{new Date(selectedReturn.approved_at || selectedReturn.date_created).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Auth Manager:</span>
                          <span className="font-semibold">{selectedReturn.approved_by_name}</span>
                        </div>
                      </div>

                      <div className="pb-3 border-b border-dashed border-zinc-200">
                        <div className="flex text-[9px] font-bold pb-1 text-zinc-900 border-b border-zinc-100 mb-1.5 uppercase">
                          <span className="flex-1">Item</span>
                          <span className="w-12 text-center">Qty</span>
                          <span className="w-16 text-right">Refund</span>
                        </div>
                        <div className="space-y-1">
                          {selectedReturn.items?.map((item, i) => (
                            <div key={i} className="flex items-start text-[10px]">
                              <div className="flex-1 pr-1 capitalize">
                                <p className="font-medium leading-none text-zinc-900">{item.product_name}</p>
                                <span className="text-[8px] text-zinc-400 capitalize font-mono">Condition: {item.condition}</span>
                              </div>
                              <span className="w-12 text-center text-zinc-500">{item.quantity}</span>
                              <span className="w-16 text-right font-semibold text-zinc-950">
                                {formatGHS(item.unit_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center font-bold text-sm text-zinc-950 uppercase pt-1.5">
                        <span>Total Refunded</span>
                        <span>{formatGHS(selectedReturn.total_refund_amount)}</span>
                      </div>

                      <div className="text-center text-[9px] text-zinc-400 font-semibold pt-4 border-t border-dashed border-zinc-200 uppercase tracking-widest">
                        <span>Refund Method: {methodLabels[selectedReturn.refund_method] || selectedReturn.refund_method}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reprint Receipt Action */}
                  {selectedReturn.status === 'approved' && (
                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button 
                        onClick={handlePrintReceipt}
                        className="w-full bg-primary hover:bg-primary/95 text-white rounded-xl h-10 gap-1.5 text-xs font-semibold"
                      >
                        <Printer className="h-4 w-4" /> Reprint Refund Receipt
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          }
        />
      </div>
    </PageLayout>
  );
}
