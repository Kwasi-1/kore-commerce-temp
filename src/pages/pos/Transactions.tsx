import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import ReceiptModal from '@/components/pos/ReceiptModal';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format, startOfToday, endOfToday } from 'date-fns';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { Printer, RefreshCcw, X } from 'lucide-react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ active: 'today', start_date: startOfToday(), end_date: endOfToday() });
  
  // Receipt Side Panel
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);

  // Refund State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleIssueRefund = async () => {
    if (!selectedReceiptData) return;
    
    setIsRefunding(true);
    try {
      const amount = refundType === 'full' ? selectedReceiptData.totalAmount : parseFloat(partialRefundAmount);
      if (isNaN(amount) || amount <= 0 || amount > selectedReceiptData.totalAmount) {
        toast.error("Invalid refund amount");
        setIsRefunding(false);
        return;
      }

      await apiClient.post(`/pos/transactions/${selectedReceiptData.id}/refund`, {
        type: refundType,
        amount
      });
      
      toast.success("Refund processed successfully");
      setIsRefundModalOpen(false);
      setIsReceiptOpen(false);
      fetchTransactions();
    } catch (error) {
      console.error("Refund failed:", error);
      toast.error("Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
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
  }, [paymentFilter, searchQuery, dateFilter]);

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
      { key: 'view_receipt', label: 'View Receipt', icon: 'mdi:receipt-text-outline' }
    ],
    __record: t
  }));

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'view_receipt') {
      handleViewReceipt(row.id);
    }
  };

  const handleRowClick = (key: any) => {
    handleViewReceipt(key);
  };

  return (
    <PageLayout title="POS Transactions">
      <div className="flex flex-col gap-6">

        {/* Summary Cards */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Sales Overview</h2>
          <CustomOnlyDateFilterComponent 
            value={dateFilter} 
            onChange={(val) => setDateFilter(val)} 
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <DashboardCard
            title="Total Sales"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.total} />}
            className="col-span-2 md:col-span-1"
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'all'}
            onClick={() => setPaymentFilter(new Set(['all']))}
          />
          <DashboardCard
            title="Transactions"
            value={isLoading ? '...' : stats.count.toString()}
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'all'}
            onClick={() => setPaymentFilter(new Set(['all']))}
          />
          <DashboardCard
            title="Avg. Sale"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.avg} />}
          />
          <DashboardCard
            title="Cash"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.cashTotal} />}
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'cash'}
            onClick={() => setPaymentFilter(new Set(['cash']))}
          />
          <DashboardCard
            title="Mobile Money"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.momoTotal} />}
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'mobile_money'}
            onClick={() => setPaymentFilter(new Set(['mobile_money']))}
          />
          <DashboardCard
            title="Card"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.cardTotal} />}
            isActive={Array.from(paymentFilter as Set<string>)[0] === 'card'}
            onClick={() => setPaymentFilter(new Set(['card']))}
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
          onclick={handleRowClick}
          mobileFriendly={true}
        />

      </div>

      {/* Side Panel Drawer */}
      <CustomModal
        isOpen={isReceiptOpen}
        onOpenChange={() => setIsReceiptOpen(false)}
        placement="right"
        size="md"
        header={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-lg">Transaction Details</span>
          </div>
        }
        body={
          <div className="flex-1 overflow-y-auto px-1 py-4">
            {selectedReceiptData ? (
              <ReceiptModal 
                receiptData={selectedReceiptData} 
                onClose={() => setIsReceiptOpen(false)} 
                isOpen={true}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading receipt...
              </div>
            )}
          </div>
        }
        footer={
          selectedReceiptData ? (
            <div className="flex flex-col gap-3 w-full">
               <Button 
                  variant="default"
                  className="w-full"
                  onClick={handlePrintReceipt}
                >
                 <Printer className="w-4 h-4 mr-2" />
                 Reprint Receipt
               </Button>
               <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={() => setIsRefundModalOpen(true)}
                  disabled={selectedReceiptData.status === 'refunded'}
                >
                 <RefreshCcw className="w-4 h-4 mr-2" />
                 {selectedReceiptData.status === 'refunded' ? 'Already Refunded' : 'Issue Refund'}
               </Button>
            </div>
          ) : null
        }
      />

      {/* Refund Modal */}
      <CustomModal 
        isOpen={isRefundModalOpen} 
        onOpenChange={() => setIsRefundModalOpen(false)}
        placement="center"
        size="md"
        header={<span className="text-lg font-semibold">Process Refund</span>}
        body={
          <div className="flex flex-col gap-6 py-4">
            <div className="flex gap-4">
              <Button 
                className="flex-1"
                variant={refundType === 'full' ? 'default' : 'outline'}
                onClick={() => setRefundType('full')}
              >
                Full Refund
              </Button>
              <Button 
                className="flex-1"
                variant={refundType === 'partial' ? 'default' : 'outline'}
                onClick={() => setRefundType('partial')}
              >
                Partial Refund
              </Button>
            </div>

            {refundType === 'full' ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm border border-destructive/20">
                Are you sure you want to completely refund this transaction? The total amount of <strong><CurrencyDisplay amount={selectedReceiptData?.totalAmount || 0} /></strong> will be recorded as refunded.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the custom amount to refund. Maximum allowed is <strong><CurrencyDisplay amount={selectedReceiptData?.totalAmount || 0} /></strong>.
                </p>
                <CustomInputTextField
                  type="number"
                  label="Refund Amount"
                  placeholder="0.00"
                  value={partialRefundAmount}
                  onChange={(e) => setPartialRefundAmount(e.target.value)}
                  startContent={<span className="text-muted-foreground text-sm font-medium">GHS</span>}
                  labelPlacement="outside"
                />
              </div>
            )}
          </div>
        }
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="ghost" onClick={() => setIsRefundModalOpen(false)} disabled={isRefunding}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleIssueRefund} disabled={isRefunding}>
              {isRefunding ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}
