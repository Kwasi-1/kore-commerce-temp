import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ReceiptModal from '@/components/pos/ReceiptModal';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const methodArr = paymentFilter === 'all' ? ['all'] : Array.from(paymentFilter as Set<string>);
      let url = '/pos/transactions?limit=100';
      if (methodArr[0] !== 'all') {
        url += `&payment_method=${methodArr[0]}`;
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
  }, [paymentFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(), 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleViewReceipt = async (transactionId: string) => {
    try {
      const response = await apiClient.get(`/pos/transactions/${transactionId}/receipt`);
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
    return { total, count, avg, cashTotal, momoTotal, cardTotal };
  }, [transactions]);

  const columns = [
    { key: 'receipt_number', label: 'Receipt No.' },
    { key: 'date', label: 'Date & Time' },
    { key: 'cashier', label: 'Cashier' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'amount', label: 'Total Amount' }
  ];

  const rows = transactions.map((t: any) => ({
    id: t.id,
    receipt_number: <span className="font-mono text-primary font-semibold">{t.receiptNumber}</span>,
    date: t.dateCreated ? format(new Date(t.dateCreated), 'MMM dd, yyyy h:mm a') : 'N/A',
    cashier: t.cashierName || 'Unknown',
    payment_method: (
      <span className={`capitalize inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        t.paymentMethod === 'cash' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        t.paymentMethod === 'mobile_money' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      }`}>
        {t.paymentMethod?.replace('_', ' ')}
      </span>
    ),
    amount: <span className="font-semibold text-foreground"><CurrencyDisplay amount={t.totalAmount || 0} /></span>,
    rowActions: [
      { key: 'view_receipt', label: 'View Receipt', icon: 'mdi:receipt-text-outline' }
    ],
    __record: t
  }));

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'view_receipt') {
      handleViewReceipt(row.id);
    }
  };

  return (
    <PageLayout title="POS Transactions">
      <div className="flex flex-col gap-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <DashboardCard
            title="Total Sales"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.total} />}
            className="border border-border col-span-2 md:col-span-1"
          />
          <DashboardCard
            title="Transactions"
            value={isLoading ? '...' : stats.count.toString()}
            className="border border-border"
          />
          <DashboardCard
            title="Avg. Sale"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.avg} />}
            className="border border-border"
          />
          <DashboardCard
            title="Cash"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.cashTotal} />}
            className="border border-border"
          />
          <DashboardCard
            title="Mobile Money"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.momoTotal} />}
            className="border border-border"
          />
          <DashboardCard
            title="Card"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.cardTotal} />}
            className="border border-border"
          />
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Transaction History"
          showSearch={true}
          searchPlaceholder="Search by receipt or cashier..."
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
          showAddButton={false}
          onRefresh={fetchTransactions}
          onRowActionClick={handleRowActionClick}
          mobileFriendly={true}
        />

      </div>

      <CustomModal
        isOpen={isReceiptOpen}
        onOpenChange={() => setIsReceiptOpen(!isReceiptOpen)}
        placement="center"
        size="md"
        classNames={{ base: "max-w-[400px]" }}
        header={null}
        body={
          selectedReceiptData ? (
            <div className="p-4">
              <ReceiptModal 
                receiptData={selectedReceiptData} 
                onClose={() => setIsReceiptOpen(false)} 
                isOpen={isReceiptOpen}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Loading receipt...</div>
          )
        }
      />
    </PageLayout>
  );
}
