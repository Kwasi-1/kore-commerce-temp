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
  const [creditPurchases, setCreditPurchases] = useState<any[]>([]);
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Settlement Modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlementMode, setSettlementMode] = useState<'all' | 'specific'>('all');
  const [activeSettlePurchase, setActiveSettlePurchase] = useState<any>(null);

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

  const fetchCreditPurchases = async (customerId: string) => {
    setIsPurchasesLoading(true);
    try {
      const response = await apiClient.get(`/tenant/customers/${customerId}/credit-purchases`);
      setCreditPurchases(response.data.data.purchases || []);
    } catch (error) {
      console.error('Failed to fetch credit purchases:', error);
      toast.error('Could not load credit purchases');
    } finally {
      setIsPurchasesLoading(false);
    }
  };

  const handleRowClick = (key: any) => {
    const debtor = debtors.find(d => d.id === key);
    if (debtor) {
      setSelectedDebtor(debtor);
      setIsDrawerOpen(true);
      fetchCreditPurchases(debtor.id);
    }
  };

  const handleSettle = async (amount: number, method: string) => {
    try {
      let response;
      if (settlementMode === 'all') {
        response = await apiClient.post(`/tenant/customers/${selectedDebtor.id}/settle-all-debt`, {
          amount,
          payment_method: method
        });
        toast.success('Debt settled successfully');

        const enrichedSettlements = response.data.data.settlements?.map((s: any) => {
          const matchPurchase = creditPurchases.find(p => p.id === s.purchase_id);
          return {
            ...s,
            purchase_reference: matchPurchase ? matchPurchase.reference : s.purchase_id
          };
        }) || [];

        setSelectedCreditPurchase({
          id: `cons-${Date.now()}`,
          reference: `CONS-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString(),
          amount: amount,
          balance_after: response.data.data.new_balance,
          payment_method: method,
          type: 'consolidated',
          settlements: enrichedSettlements
        });
        setIsReceiptModalOpen(true);
      } else {
        response = await apiClient.post(`/tenant/credit-ledger/${activeSettlePurchase.id}/settle`, {
          amount,
          payment_method: method
        });
        toast.success('Payment recorded successfully');

        setSelectedCreditPurchase({
          id: `rep-${Date.now()}`,
          reference: `SET-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString(),
          amount: amount,
          balance_after: response.data.data.new_balance,
          payment_method: method,
          type: 'settlement',
          purchase_reference: activeSettlePurchase.reference,
          purchase_original_amount: activeSettlePurchase.original_amount,
          items: activeSettlePurchase.items
        });
        setIsReceiptModalOpen(true);
      }
      
      setIsSettleModalOpen(false);
      
      // Refresh list, drawer balance, and purchases list
      fetchDebtors();
      if (selectedDebtor) {
        setSelectedDebtor((prev: any) => ({
          ...prev,
          outstanding_debt: response.data.data.new_balance
        }));
        fetchCreditPurchases(selectedDebtor.id);
      }
      
    } catch (error: any) {
      console.error('Failed to settle debt:', error);
      toast.error(error.response?.data?.message || 'Failed to process settlement');
    }
  };

  const handleViewLatestReceipt = () => {
    if (!creditPurchases || creditPurchases.length === 0) return;
    
    // Collect all purchases and repayments
    const allEvents: any[] = [];
    creditPurchases.forEach(p => {
      // Add purchase itself
      allEvents.push({
        ...p,
        eventDate: new Date(p.date).getTime(),
        eventType: 'purchase'
      });
      // Add repayments
      if (p.repayments) {
        p.repayments.forEach((r: any) => {
          allEvents.push({
            ...r,
            eventDate: new Date(r.date).getTime(),
            eventType: 'repayment',
            purchaseRef: p.reference,
            purchaseOriginalAmount: p.original_amount,
            purchaseItems: p.items
          });
        });
      }
    });
    
    if (allEvents.length === 0) return;
    
    // Sort by date descending
    allEvents.sort((a, b) => b.eventDate - a.eventDate);
    
    const latest = allEvents[0];
    if (latest.eventType === 'purchase') {
      setSelectedCreditPurchase({
        id: latest.id,
        reference: latest.reference,
        date: latest.date,
        amount: latest.original_amount,
        balance_after: latest.outstanding_debt,
        type: 'credit_purchase',
        items: latest.items
      });
    } else {
      setSelectedCreditPurchase({
        id: latest.id,
        reference: latest.reference,
        date: latest.date,
        amount: latest.amount,
        balance_after: latest.balance_after,
        payment_method: latest.payment_method,
        type: 'settlement',
        purchase_reference: latest.purchaseRef,
        purchase_original_amount: latest.purchaseOriginalAmount,
        items: latest.purchaseItems
      });
    }
    setIsReceiptModalOpen(true);
  };

  const handleDownloadPaymentPDF = async (payment: any, purchaseRef: string) => {
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
            <span>${purchaseRef}</span>
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
    { key: 'phone', label: 'Phone Number' },
    { key: 'last_credit', label: 'Last Credit Date' },
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
    phone: <span className="text-muted-foreground">{d.phone || '—'}</span>,
    last_credit: <span className="text-muted-foreground">{d.last_credit_date ? format(new Date(d.last_credit_date), 'MMM dd, yyyy') : '—'}</span>,
    debt: <span className="font-semibold text-foreground"><CurrencyDisplay amount={d.outstanding_debt || 0} /></span>,
    __record: d
  }));

  return (
    <PageLayout title="Credit Ledger" constrainHeight={true}>
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
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
              <span className="text-lg font-semibold">Ledger Account</span>
            </div>
          }
          body={
            <div className="flex-1 overflow-y-auto px-1 py-4">
              {selectedDebtor ? (
                <>
                  {/* Layer 1: Customer Overview */}
                  <div className="text-center mb-6 border-b border-border/50 pb-6">
                    <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3">
                      {selectedDebtor.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold">{selectedDebtor.name}</h3>
                    <p className="text-muted-foreground text-sm">{selectedDebtor.phone || selectedDebtor.email}</p>
                    
                    <div className="mt-6 bg-muted/50 p-4 rounded-xl border border-border inline-block w-full max-w-[250px]">
                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Total Outstanding Balance</p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        <CurrencyDisplay amount={selectedDebtor.outstanding_debt} />
                      </p>
                    </div>

                    <div className="mt-4">
                      <Button 
                        onClick={() => {
                          setSettlementMode('all');
                          setIsSettleModalOpen(true);
                        }}
                        disabled={selectedDebtor.outstanding_debt <= 0}
                        className="w-full max-w-[250px] rounded-full"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Settle Debt
                      </Button>
                    </div>
                  </div>

                  {/* Layer 2: Credit Purchases List */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/50">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Credit Purchases
                      </h4>
                      {creditPurchases.length > 0 && (
                        <button
                          onClick={handleViewLatestReceipt}
                          className="text-xs text-primary hover:underline font-semibold"
                        >
                          View Latest Receipt
                        </button>
                      )}
                    </div>

                    {isPurchasesLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading credit purchases...</div>
                    ) : creditPurchases.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No credit purchases on record.</div>
                    ) : (
                      <div className="space-y-4">
                        {creditPurchases.map((p) => {
                          const isExpanded = expandedPurchaseId === p.id;
                          return (
                            <div key={p.id} className="border border-border rounded-xl overflow-hidden bg-card text-card-foreground">
                              {/* Accordion Header */}
                              <div 
                                onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-2"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-sm font-bold text-foreground">{p.reference}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                    p.status === 'settled' 
                                      ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                      : p.status === 'partial' 
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-3 text-xs text-muted-foreground mt-1">
                                  <div>
                                    <p className="text-[10px] uppercase text-zinc-400">Date</p>
                                    <p className="font-semibold">{format(new Date(p.date), 'MMM dd, yyyy')}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-zinc-400">Original</p>
                                    <p className="font-semibold"><CurrencyDisplay amount={p.original_amount} /></p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] uppercase text-zinc-400">Remaining</p>
                                    <p className="font-bold text-foreground"><CurrencyDisplay amount={p.outstanding_debt} /></p>
                                  </div>
                                </div>
                              </div>

                              {/* Accordion Expanded Panel */}
                              {isExpanded && (
                                <div className="p-4 border-t border-border bg-muted/20 space-y-4">
                                  {/* Items Table */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items Purchased</p>
                                    <div className="border border-border/50 rounded-lg overflow-hidden bg-card text-xs">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="bg-muted text-muted-foreground text-[10px] uppercase border-b border-border/50">
                                            <th className="p-2">Item</th>
                                            <th className="p-2 text-center">Qty</th>
                                            <th className="p-2 text-right">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {p.items?.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-b border-border/50 last:border-none">
                                              <td className="p-2 font-medium">{item.name}</td>
                                              <td className="p-2 text-center text-muted-foreground">{item.quantity}</td>
                                              <td className="p-2 text-right font-semibold"><CurrencyDisplay amount={item.subtotal || (item.price * item.quantity)} /></td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Repayments History */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payments Made</p>
                                    {p.repayments && p.repayments.length > 0 ? (
                                      <div className="space-y-2 bg-card border border-border/50 rounded-lg p-3">
                                        {p.repayments.map((r: any) => (
                                          <div 
                                            key={r.id}
                                            onClick={() => handleDownloadPaymentPDF(r, p.reference)}
                                            className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/40 p-2 -mx-2 rounded transition-colors group"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Download className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                              <div>
                                                <p className="font-semibold text-foreground">{r.reference}</p>
                                                <p className="text-[10px] text-muted-foreground">{format(new Date(r.date), 'MMM dd, yyyy')}</p>
                                              </div>
                                            </div>
                                            <span className="font-bold text-foreground">-<CurrencyDisplay amount={r.amount} /></span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">No payments recorded against this purchase.</p>
                                    )}
                                  </div>

                                  {/* Settle Specific Button */}
                                  {p.outstanding_debt > 0 && (
                                    <Button
                                      onClick={() => {
                                        setSettlementMode('specific');
                                        setActiveSettlePurchase(p);
                                        setIsSettleModalOpen(true);
                                      }}
                                      size="sm"
                                      className="w-full mt-2"
                                      variant="outline"
                                    >
                                      <Wallet className="h-3.5 w-3.5 mr-2" />
                                      Settle This Purchase
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
        debtor={settlementMode === 'all' ? selectedDebtor : {
          name: `${selectedDebtor?.name} (Purchase ${activeSettlePurchase?.reference})`,
          outstanding_debt: activeSettlePurchase?.outstanding_debt
        }}
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
