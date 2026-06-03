import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import DebtSettlementModal from '@/components/pos/DebtSettlementModal';
import CreditReceiptModal from '@/components/pos/CreditReceiptModal';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Wallet, History, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  // Receipt Modal state
  const [selectedCreditPurchase, setSelectedCreditPurchase] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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

  const fetchCreditHistory = async (purchaseId: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await apiClient.get(`/tenant/credit-ledger/${purchaseId}/history`);
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
      const response = await apiClient.post(`/tenant/credit-ledger/${selectedDebtor.id}/settle`, {
        amount,
        payment_method: method
      });
      
      toast.success(response.data.message || 'Payment recorded successfully');
      
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

  const handleDownloadPaymentPDF = async (payment: any) => {
    if (!selectedDebtor) return;
    
    const toastId = toast.loading('Generating payment receipt...');
    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '380px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.style.padding = '24px';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '12px';
      container.style.borderRadius = '12px';
      
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 4px; letter-spacing: 1px;">VYSION STORE</h3>
          <p style="font-size: 10px; color: #666; text-transform: uppercase; margin: 0;">123 Commerce St, Accra, Ghana</p>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">Tel: +233 24 123 4567</p>
        </div>
        
        <div style="border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Payment Ref:</span>
            <span>${payment.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Date:</span>
            <span>${new Date(payment.date).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Customer:</span>
            <span>${selectedDebtor.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Purchase Ref:</span>
            <span>${selectedDebtor.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">Payment Method:</span>
            <span style="text-transform: uppercase;">${payment.payment_method || 'cash'}</span>
          </div>
        </div>
        
        <div style="border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px;">
          <h4 style="font-weight: bold; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase;">Payment Details</h4>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>Credit Purchase Balance:</span>
            <span>GHS ${(payment.balance_after + payment.amount).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
            <span>Amount Paid:</span>
            <span>-GHS ${payment.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; text-transform: uppercase;">
          <span>Remaining Balance:</span>
          <span>GHS ${payment.balance_after.toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #666; text-transform: uppercase;">
          <span style="border: 1px solid #000; padding: 4px 8px; border-radius: 99px; font-weight: bold;">Payment Receipt</span>
          <p style="margin-top: 10px; letter-spacing: 1px;">Thank you for your payment!</p>
        </div>
      `;
      
      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${payment.reference}.pdf`);
      
      document.body.removeChild(container);
      toast.success('Payment receipt downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF', { id: toastId });
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
    { key: 'reference', label: 'Receipt Ref' },
    { key: 'date', label: 'Purchase Date' },
    { key: 'original', label: 'Original Amount' },
    { key: 'debt', label: 'Outstanding Balance' }
  ];

  const rows = debtors.map((d: any) => ({
    id: d.id,
    avatar: (
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0">
        {d.name.charAt(0).toUpperCase()}
      </div>
    ),
    name: <span className="font-semibold text-foreground">{d.name}</span>,
    reference: <span className="font-mono text-xs text-muted-foreground">{d.reference}</span>,
    date: <span className="text-muted-foreground">{d.date ? format(new Date(d.date), 'MMM dd, yyyy') : '—'}</span>,
    original: <span className="text-muted-foreground"><CurrencyDisplay amount={d.original_amount || 0} /></span>,
    debt: <span className="font-semibold text-foreground"><CurrencyDisplay amount={d.outstanding_debt || 0} /></span>,
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
            className="border border-border"
            action={<AlertCircle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Debtors"
            value={isLoading ? '...' : stats.count.toString()}
            className="border border-border"
            action={<UsersIcon className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Settled This Month"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.settledThisMonth} />}
            className="border border-border"
            action={<Wallet className="text-muted-foreground/50 h-5 w-5" />}
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
        <CustomModal
          isOpen={isDrawerOpen}
          onOpenChange={() => setIsDrawerOpen(false)}
          placement="right"
          size="md"
          header={
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Ledger: {selectedDebtor?.reference}</span>
            </div>
          }
          body={
            <div className="flex-1 overflow-y-auto px-1 py-4">
              {selectedDebtor ? (
                <>
                  <div className="text-center mb-6">
                    <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3">
                      {selectedDebtor.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold">{selectedDebtor.name}</h3>
                    <p className="text-muted-foreground text-sm">{selectedDebtor.phone || selectedDebtor.email}</p>
                    
                    <div className="mt-4 flex flex-col items-center gap-1 text-xs text-muted-foreground">
                      <span>Receipt: <span className="font-mono font-semibold">{selectedDebtor.reference}</span></span>
                      <span>Date: {format(new Date(selectedDebtor.date), 'MMM dd, yyyy')}</span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                      <div className="text-center">
                        <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Original Credit</p>
                        <p className="text-lg font-bold text-foreground">
                          <CurrencyDisplay amount={selectedDebtor.original_amount} />
                        </p>
                      </div>
                      <div className="text-center border-l border-border">
                        <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Current Balance</p>
                        <p className="text-lg font-bold text-foreground">
                          <CurrencyDisplay amount={selectedDebtor.outstanding_debt} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <Button 
                      onClick={() => setIsSettleModalOpen(true)}
                      disabled={selectedDebtor.outstanding_debt <= 0}
                      className="w-full"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Settle Debt
                    </Button>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Repayment History
                      </h4>
                      <button
                        onClick={() => {
                          setSelectedCreditPurchase(selectedDebtor);
                          setIsReceiptModalOpen(true);
                        }}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        View Original Receipt
                      </button>
                    </div>
                    
                    {isHistoryLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading repayments...</div>
                    ) : creditHistory.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No payments made yet.</div>
                    ) : (
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[1.15rem] before:w-px before:bg-border">
                        {creditHistory.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => handleDownloadPaymentPDF(item)}
                            className="relative flex items-start gap-4 cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-full border border-background bg-muted shrink-0 z-10">
                              <Wallet className="h-4 w-4 text-foreground" />
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex justify-between items-start mb-0.5">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  Repayment
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                    <Download className="h-2.5 w-2.5" /> PDF
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-foreground">
                                  -<CurrencyDisplay amount={item.amount} />
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
          }
        />
      </div>

      <DebtSettlementModal 
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        debtor={selectedDebtor}
        onSettle={handleSettle}
      />

      <CreditReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedCreditPurchase(null);
        }}
        debtor={selectedDebtor}
        transaction={selectedCreditPurchase}
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
