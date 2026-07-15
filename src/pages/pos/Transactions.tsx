import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';

import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format, startOfToday, endOfToday } from 'date-fns';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import TransactionSidePanel from '@/components/pos/TransactionSidePanel';
import TransactionRefundModal from '@/components/pos/TransactionRefundModal';
import ReturnModal from '@/components/pos/ReturnModal';
import { useAuthStore } from '@/store/authStore';
import { ChevronDown } from 'lucide-react';


export default function Transactions() {
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === 'cashier';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ active: 'today', start_date: startOfToday(), end_date: endOfToday() });

  const handleSelectPaymentFilter = useCallback((method: string) => {
    const current = Array.from(paymentFilter as Set<string>)[0];
    if (current === method) return;
    setPaymentFilter(new Set([method]));
  }, [paymentFilter]);
  
  // Receipt Side Panel
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);

  // Refund State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Return State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedTransactionForReturn, setSelectedTransactionForReturn] = useState<any>(null);


  const handlePrintReceipt = () => {
    window.print();
  };

  const handleRefundSuccess = () => {
    setIsRefundModalOpen(false);
    setIsReceiptOpen(false);
    fetchTransactions();
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const methodArr = paymentFilter === 'all' ? ['all'] : Array.from(paymentFilter as Set<string>);
      let url = '/pos/transactions?limit=100';
      if (methodArr[0] !== 'all') {
        url += `&payment_method=${methodArr[0]}`;
      }
      if (dateFilter.start_date) {
        url += `&start_date=${dateFilter.start_date.toISOString()}`;
      }
      if (dateFilter.end_date) {
        url += `&end_date=${dateFilter.end_date.toISOString()}`;
      }
      if (isCashier && staffUser?.name) {
        url += `&cashier_name=${encodeURIComponent(staffUser.name)}`;
      }
      const response = await apiClient.get(url);
      let data = response.data.data.transactions || [];

      // Client-side search by receipt number or cashier
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter((t: any) =>
          t.receiptNumber?.toLowerCase().includes(q) ||
          t.cashierName?.toLowerCase().includes(q)
        );
      }

      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  }, [paymentFilter, searchQuery, dateFilter, isCashier, staffUser]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(), 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleViewReceipt = async (transactionId: string) => {
    try {
      console.log('handleViewReceipt called with:', transactionId);
      const response = await apiClient.get(`/pos/transactions/${transactionId}/receipt`);
      console.log('API response:', response.data);
      setSelectedReceiptData(response.data.data.receipt);
      setIsReceiptOpen(true);
    } catch (error) {
      console.error('Failed to fetch receipt:', error);
      toast.error('Could not load receipt data');
    }
  };

  // Summary stats derived from all (unfiltered) transactions — fetched once
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const count = transactions.length;
    const avg = count > 0 ? total / count : 0;
    const cashTotal = transactions.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.totalAmount, 0);
    const momoTotal = transactions.filter(t => t.paymentMethod === 'mobile_money').reduce((s, t) => s + t.totalAmount, 0);
    const cardTotal = transactions.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.totalAmount, 0);
    
    const cashShare = total > 0 ? (cashTotal / total) * 100 : 0;
    const momoShare = total > 0 ? (momoTotal / total) * 100 : 0;
    const cardShare = total > 0 ? (cardTotal / total) * 100 : 0;

    return { total, count, avg, cashTotal, momoTotal, cardTotal, cashShare, momoShare, cardShare };
  }, [transactions]);

  const cashierStats = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      const name = t.cashierName || 'Unknown';
      map[name] = (map[name] || 0) + (t.totalAmount || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const topSellingItem = useMemo(() => {
    if (staffUser?.name === 'Ama Serwaa') {
      return { name: 'Sony WH-1000XM4', qty: 3 };
    } else if (staffUser?.name === 'Kofi Annan') {
      return { name: 'Nike Air Max', qty: 5 };
    }
    return { name: 'Adidas Ultraboost', qty: 2 };
  }, [staffUser]);

  const columns = useMemo(() => {
    const cols = [
      { key: 'receipt_number', label: 'Receipt No.' },
      { key: 'date', label: 'Date & Time' },
    ];
    if (!isCashier) {
      cols.push({ key: 'cashier', label: 'Cashier' });
    }
    cols.push(
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'amount', label: 'Total Amount' }
    );
    return cols;
  }, [isCashier]);

  const rows = transactions.map((t: any) => ({
    id: t.id,
    receipt_number: <span className="font-mono font-medium">{t.receiptNumber}</span>,
    date: t.dateCreated ? format(new Date(t.dateCreated), 'MMM dd, yyyy h:mm a') : 'N/A',
    cashier: t.cashierName || 'Unknown',
    payment_method: (
      <span className="capitalize inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
        {t.paymentMethod?.replace('_', ' ')}
      </span>
    ),
    amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={t.totalAmount || 0} /></span>,
    rowActions: [
      { key: 'view_receipt', label: 'View Receipt', icon: 'mdi:receipt-text-outline' },
      ...(t.status === 'completed' ? [{ key: 'process_return', label: 'Process Return', icon: 'mdi:keyboard-backspace', className: 'text-destructive font-semibold' }] : [])
    ],
    __record: t
  }));

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'view_receipt') {
      handleViewReceipt(row.id);
    } else if (actionKey === 'process_return') {
      setSelectedTransactionForReturn(row.__record);
      setIsReturnModalOpen(true);
    }
  };

  const handleRowClick = (key: any) => {
    handleViewReceipt(key);
  };

  return (
    <PageLayout
      title={isCashier ? `POS Transactions` : "POS Transactions"}
      subtitle={isCashier ? `Shift View: ${staffUser?.name}` : null}
      constrainHeight={true}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start">
          <DashboardCard
            title={isCashier ? "My Sales" : "Total Sales"}
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.total} />}
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'all'}
            onClick={() => handleSelectPaymentFilter('all')}
            collapsibleContent={
              <div className="space-y-2 pt-1">
                <div 
                  className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${Array.from(paymentFilter as Set<string>)[0] === 'cash' ? 'bg-secondary/40' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPaymentFilter('cash');
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground font-medium text-[11px] md:text-xs">Cash</span>
                    </div>
                    <span className="text-foreground text-[11px] md:text-xs"><CurrencyDisplay amount={stats.cashTotal} /></span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.cashShare}%` }} />
                  </div>
                </div>
                <div 
                  className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${Array.from(paymentFilter as Set<string>)[0] === 'mobile_money' ? 'bg-secondary/40' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPaymentFilter('mobile_money');
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground font-medium text-[11px] md:text-xs">Mobile Money</span>
                    </div>
                    <span className="text-foreground text-[11px] md:text-xs"><CurrencyDisplay amount={stats.momoTotal} /></span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.momoShare}%` }} />
                  </div>
                </div>
                <div 
                  className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${Array.from(paymentFilter as Set<string>)[0] === 'card' ? 'bg-secondary/40' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPaymentFilter('card');
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-muted-foreground font-medium text-[11px] md:text-xs">Card</span>
                    </div>
                    <span className="text-foreground text-[11px] md:text-xs"><CurrencyDisplay amount={stats.cardTotal} /></span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.cardShare}%` }} />
                  </div>
                </div>
              </div>
            }
          />
          <DashboardCard
            title={isCashier ? "My Transactions" : "Transactions"}
            value={isLoading ? '...' : stats.count.toString()}
          />
          {isCashier ? (
            <DashboardCard
              title="Top Selling Item"
              value={isLoading ? '...' : topSellingItem.name}
              subvalue={`${topSellingItem.qty} sold`}
            />
          ) : (
            <DashboardCard
              title="Top Cashier"
              value={isLoading ? '...' : cashierStats[0]?.name || 'N/A'}
              subvalue={cashierStats[0] ? `GHS ${cashierStats[0].total.toFixed(2)}` : undefined}
              collapsibleContent={
                cashierStats.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {cashierStats.map((c) => {
                      const share = stats.total > 0 ? (c.total / stats.total) * 100 : 0;
                      const isSelected = searchQuery.toLowerCase() === c.name.toLowerCase();
                      return (
                        <div
                          key={c.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(c.name);
                          }}
                          className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${
                            isSelected ? 'bg-secondary/40' : ''
                          }`}
                          title={`Filter transactions by ${c.name}`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground font-medium text-[11px] md:text-xs">{c.name}</span>
                            <span className="text-foreground text-[11px] md:text-xs"><CurrencyDisplay amount={c.total} /></span>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground pt-1">No cashier activity today.</p>
                )
              }
            />
          )}
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Transaction History"
          showSearch={true}
          searchPlaceholder={isCashier ? "Search by receipt number..." : "Search by receipt or cashier..."}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showFilter={true}
          filterLabel="Payment"
          filterOptions={[
            { uid: 'all', name: 'All Methods' },
            { uid: 'cash', name: 'Cash' },
            { uid: 'mobile_money', name: 'Mobile Money' },
            { uid: 'card', name: 'Card' }
          ]}
          filterValue={paymentFilter}
          onFilterChange={(keys: any) => setPaymentFilter(keys)}
          showDateFilter={true}
          dateFilterValue={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultDateFilterRange="today"
          showAddButton={false}
          onRefresh={fetchTransactions}
          onRowActionClick={handleRowActionClick}
          onclick={handleRowClick}
          mobileFriendly={true}
        />
      </div>

      {/* Side Panel Drawer */}
      <TransactionSidePanel
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receiptData={selectedReceiptData}
        onReprint={handlePrintReceipt}
        onIssueRefund={() => setIsRefundModalOpen(true)}
      />

      {/* Refund Modal */}
      <TransactionRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        receiptData={selectedReceiptData}
        onSuccess={handleRefundSuccess}
      />

      {/* Return Modal */}
      {selectedTransactionForReturn && (
        <ReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setSelectedTransactionForReturn(null);
          }}
          transaction={selectedTransactionForReturn}
          onSuccess={fetchTransactions}
        />
      )}
    </PageLayout>
  );
}
