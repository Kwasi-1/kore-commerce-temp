import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import DebtSettlementModal from '@/components/pos/DebtSettlementModal';
import { X, Wallet, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CreditLedger() {
  const [debtors, setDebtors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Settlement Modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const fetchDebtors = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pos/credit-ledger');
      const data = response.data.data.debtors || [];
      
      // Client-side search
      const filtered = data.filter((c: any) => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.phone && c.phone.includes(searchQuery))
      );
      
      setDebtors(filtered);
    } catch (error) {
      console.error('Failed to fetch credit ledger:', error);
      toast.error('Failed to load credit ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, [searchQuery]);

  const fetchCreditHistory = async (customerId: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await apiClient.get(`/tenant/customers/${customerId}/credit-history`);
      setCreditHistory(response.data.data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Could not load credit history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRowClick = (key: any) => {
    const debtor = debtors.find(d => d.id === key);
    if (debtor) {
      setSelectedDebtor(debtor);
      setIsDrawerOpen(true);
      fetchCreditHistory(debtor.id);
    }
  };

  const handleSettle = async (amount: number, method: string) => {
    try {
      const response = await apiClient.post(`/tenant/customers/${selectedDebtor.id}/settle-debt`, {
        amount,
        payment_method: method
      });
      
      toast.success(response.data.message || 'Debt settled successfully');
      
      // Update selected debtor's balance
      setSelectedDebtor((prev: any) => ({
        ...prev,
        outstanding_debt: response.data.data.new_balance
      }));
      
      setIsSettleModalOpen(false);
      
      // Refresh list and history
      fetchDebtors();
      fetchCreditHistory(selectedDebtor.id);
      
    } catch (error: any) {
      console.error('Failed to settle debt:', error);
      toast.error(error.response?.data?.message || 'Failed to process settlement');
    }
  };

  const stats = useMemo(() => {
    const totalDebt = debtors.reduce((sum, d) => sum + (d.outstanding_debt || 0), 0);
    const count = debtors.length;
    // Mock metric for demonstration
    const settledThisMonth = 4250.00; 
    return { totalDebt, count, settledThisMonth };
  }, [debtors]);

  const columns = [
    { key: 'avatar', label: '' },
    { key: 'name', label: 'Customer Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'last_credit', label: 'Last Credit Date' },
    { key: 'debt', label: 'Outstanding Balance' }
  ];

  const rows = debtors.map((d: any) => ({
    id: d.id,
    avatar: (
      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-xs shrink-0">
        {d.name.charAt(0).toUpperCase()}
      </div>
    ),
    name: <span className="font-semibold text-foreground">{d.name}</span>,
    phone: <span className="text-muted-foreground">{d.phone || '—'}</span>,
    last_credit: <span className="text-muted-foreground">{d.last_credit_date ? format(new Date(d.last_credit_date), 'MMM dd, yyyy') : '—'}</span>,
    debt: <span className="font-bold text-destructive"><CurrencyDisplay amount={d.outstanding_debt || 0} /></span>,
    __record: d
  }));

  return (
    <PageLayout title="Credit Ledger">
      <div className="flex flex-col gap-6 relative">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashboardCard
            title="Total Outstanding Debt"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.totalDebt} />}
            className="border-destructive/20 bg-destructive/5 text-destructive"
            icon={<AlertCircle className="text-destructive/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Debtors"
            value={isLoading ? '...' : stats.count.toString()}
            className="border border-border"
            icon={<UsersIcon className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Settled This Month"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.settledThisMonth} />}
            className="border border-border bg-primary/5 dark:bg-primary/10 text-primary"
            icon={<Wallet className="text-primary/50 h-5 w-5" />}
          />
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Customer Balances"
          showSearch={true}
          searchPlaceholder="Search by name or phone..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showAddButton={false}
          onRefresh={fetchDebtors}
          onclick={handleRowClick}
        />

        {/* Side Panel Drawer for Debtor details */}
        <div 
          className={`fixed inset-y-0 right-0 z-50 w-full max-w-[450px] bg-background shadow-2xl border-l border-border transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Ledger Account
              </h2>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDebtor ? (
                <>
                  <div className="text-center mb-6 pt-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
                      {selectedDebtor.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold">{selectedDebtor.name}</h3>
                    <p className="text-muted-foreground text-sm">{selectedDebtor.phone || selectedDebtor.email}</p>
                    
                    <div className="mt-6 bg-destructive/10 p-4 rounded-xl inline-block border border-destructive/20">
                      <p className="text-sm font-medium text-destructive/80 mb-1">Current Balance</p>
                      <p className="text-3xl font-bold text-destructive tracking-tight">
                        <CurrencyDisplay amount={selectedDebtor.outstanding_debt} />
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 px-2">
                    <button 
                      onClick={() => setIsSettleModalOpen(true)}
                      disabled={selectedDebtor.outstanding_debt <= 0}
                      className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Wallet className="h-5 w-5" />
                      Settle Debt
                    </button>
                  </div>

                  <div className="px-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Transaction History
                    </h4>
                    
                    {isHistoryLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading history...</div>
                    ) : creditHistory.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">No history found.</div>
                    ) : (
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {creditHistory.map((item, idx) => (
                          <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                              {item.type === 'settlement' ? (
                                <Wallet className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className={`font-semibold ${item.type === 'settlement' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                  {item.type === 'settlement' ? 'Payment' : 'Credit Sale'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), 'MMM dd')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
                                <span className="font-bold">
                                  {item.type === 'settlement' ? '-' : '+'}<CurrencyDisplay amount={item.amount} />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Backdrop */}
        {isDrawerOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </div>

      <DebtSettlementModal 
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        debtor={selectedDebtor}
        onSettle={handleSettle}
      />
    </PageLayout>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
