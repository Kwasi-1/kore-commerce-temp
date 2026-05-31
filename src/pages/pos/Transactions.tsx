import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import ReceiptModal from '@/components/pos/ReceiptModal';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pos/transactions?limit=100');
      setTransactions(response.data.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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
      <span className="capitalize inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800">
        {t.paymentMethod?.replace('_', ' ')}
      </span>
    ),
    amount: <span className="font-semibold text-foreground">GHS {t.totalAmount?.toFixed(2) || '0.00'}</span>,
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
      <div className="flex flex-col gap-4">
        
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Transaction History"
          showSearch={true}
          showFilter={true}
          filterLabel="Payment"
          filterOptions={[
            { uid: 'all', name: 'All Methods' },
            { uid: 'cash', name: 'Cash' },
            { uid: 'mobile_money', name: 'MoMo' },
            { uid: 'card', name: 'Card' }
          ]}
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
        header={null} // ReceiptModal brings its own clean header/body styling
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
