import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay, useReceiptHeader } from '@/hooks';
import DebtSettlementModal from '@/components/pos/DebtSettlementModal';
import CreditReceiptModal from '@/components/pos/CreditReceiptModal';
import CustomerCreditDetailModal from '@/components/pos/CustomerCreditDetailModal';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Wallet, History, AlertCircle, Download, Info, RefreshCw, CheckCircle2, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useFeaturesStore } from '@/store/featuresStore';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function CreditLedger() {
  const { posSettings } = useFeaturesStore();
  const { storeName, storeLocation, storePhone } = useReceiptHeader();
  const [debtors, setDebtors] = useState<any[]>([]);
  const [settledThisMonth, setSettledThisMonth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer state
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [creditPurchases, setCreditPurchases] = useState<any[]>([]);
  const [creditPayments, setCreditPayments] = useState<any[]>([]);
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Settlement Modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlementMode, setSettlementMode] = useState<'all' | 'specific'>('all');
  const [activeSettlePurchase, setActiveSettlePurchase] = useState<any>(null);

  // Receipt Modal state
  const [selectedCreditPurchase, setSelectedCreditPurchase] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'settled'>('active');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [settledCount, setSettledCount] = useState<number>(0);
  const [totalOutstandingDebt, setTotalOutstandingDebt] = useState<number>(0);

  const fetchDebtors = async (mode: 'active' | 'settled' = viewMode) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/pos/credit-ledger?status=${mode}`);
      const data = response.data.success?.data?.debtors || [];
      const settled = response.data.success?.data?.settled_this_month ?? 0;
      setSettledThisMonth(settled);
      setActiveCount(response.data.success?.data?.active_count ?? 0);
      setSettledCount(response.data.success?.data?.settled_count ?? 0);
      
      if (mode === 'active') {
        const sum = data.reduce((acc: number, d: any) => acc + (d.outstanding_debt || 0), 0);
        setTotalOutstandingDebt(response.data.success?.data?.total_outstanding_debt ?? sum);
      }
      
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
    fetchDebtors(viewMode);
  }, [searchQuery, viewMode]);

  const fetchCreditPurchases = async (customerId: string) => {
    setIsPurchasesLoading(true);
    try {
      const response = await apiClient.get(`/tenant/customers/${customerId}/credit-purchases`);
      const data = response.data.success?.data || {};
      setCreditPurchases(data.purchases || []);
      setCreditPayments(data.payments || []);
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

        const enrichedSettlements = response.data.success?.data?.settlements?.map((s: any) => {
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
          balance_after: response.data.success?.data?.new_balance,
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
          balance_after: response.data.success?.data?.new_balance,
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
          outstanding_debt: response.data.success?.data?.new_balance
        }));
        fetchCreditPurchases(selectedDebtor.id);
      }
      
    } catch (error: any) {
      console.error('Failed to settle debt:', error);
      toast.error(error.response?.data?.message || 'Failed to process settlement');
    }
  };

  const handleViewPurchaseReceipt = (purchase: any) => {
    setSelectedCreditPurchase({
      id: purchase.id,
      reference: purchase.reference,
      date: purchase.date,
      amount: purchase.original_amount,
      balance_after: purchase.outstanding_debt,
      type: 'credit_purchase',
      items: purchase.items
    });
    setIsReceiptModalOpen(true);
  };

  const handleViewPaymentReceipt = (payment: any) => {
    setSelectedCreditPurchase({
      id: payment.id,
      reference: payment.reference,
      date: payment.date,
      amount: payment.amount,
      balance_after: payment.balance_after ?? 0,
      payment_method: payment.payment_method,
      type: 'settlement',
      purchase_reference: payment.purchase_reference,
      purchase_original_amount: payment.purchase_original_amount,
      items: payment.purchase_items
    });
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
          <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 4px; letter-spacing: 1px;">${storeName}</h3>
          ${storeLocation ? `<p style="font-size: 10px; color: #666; text-transform: uppercase; margin: 0;">${storeLocation}</p>` : ''}
          ${storePhone ? `<p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">Tel: ${storePhone}</p>` : ''}
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
            <span>GHS ${((payment.balance_after || 0) + payment.amount).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
            <span>Amount Paid:</span>
            <span>-GHS ${Number(payment.amount).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: ${(payment.balance_after || 0) <= 0 ? '#16a34a' : '#ea580c'};">
            <span>Remaining Balance:</span>
            <span>GHS ${(payment.balance_after || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #666;">
          <p style="margin: 0 0 4px 0;">Thank you for your payment!</p>
          <p style="margin: 0; font-size: 10px;">Keep this receipt for your records.</p>
        </div>
      `;
      
      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(container);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payment_Receipt_${payment.reference}.pdf`);
      toast.success('Payment receipt downloaded', { id: toastId });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const stats = useMemo(() => {
    const totalDebt = debtors.reduce((sum, d) => sum + (d.outstanding_debt || 0), 0);
    const count = viewMode === 'active' ? (activeCount || debtors.length) : (settledCount || debtors.length);
    return { totalDebt, count, settledThisMonth };
  }, [debtors, settledThisMonth, viewMode, activeCount, settledCount]);

  const columns = useMemo(() => {
    if (viewMode === 'settled') {
      return [
        { key: 'avatar', label: '' },
        { key: 'name', label: 'Customer Name' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'last_credit', label: 'Last Credit Date' },
        { key: 'last_settled', label: 'Settled Date' },
        { key: 'debt', label: 'Status' }
      ];
    }
    return [
      { key: 'avatar', label: '' },
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'last_credit', label: 'Last Credit Date' },
      { key: 'debt', label: 'Outstanding Balance' }
    ];
  }, [viewMode]);

  const rows = debtors.map((d: any) => ({
    id: d.id,
    avatar: (
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-foreground">
        {d.name.charAt(0).toUpperCase()}
      </div>
    ),
    name: (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{d.name}</span>
        {(d.outstanding_debt || 0) <= 0.001 && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
            Settled
          </span>
        )}
      </div>
    ),
    phone: <span className="text-muted-foreground">{d.phone || '—'}</span>,
    last_credit: <span className="text-muted-foreground">{d.last_credit_date ? format(new Date(d.last_credit_date), 'MMM dd, yyyy') : '—'}</span>,
    last_settled: <span className="text-muted-foreground">{d.last_settled_date ? format(new Date(d.last_settled_date), 'MMM dd, yyyy') : '—'}</span>,
    debt: (d.outstanding_debt || 0) > 0 ? (
      <span className="font-semibold text-foreground"><CurrencyDisplay amount={d.outstanding_debt || 0} /></span>
    ) : (
      <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[13px]">Fully Settled</span>
    ),
    __record: d
  }));

  return (
    <PageLayout title="Credit Ledger" constrainHeight={true}>
      {/* ========================================================================= */}
      {/* MOBILE CREDIT LEDGER VIEW (ZEN-Inspired Design - Block < md, Hidden >= md)*/}
      {/* ========================================================================= */}
      <MobileDashboardWrapper>
        {/* 1. Hero Outstanding Debt Card + Metric Carousel */}
        <MobileHeroCard
          title="Total Outstanding Debt"
          badge={`${activeCount} Active Debtors`}
          value={<CurrencyDisplay amount={totalOutstandingDebt || stats.totalDebt} className="!tracking-normal" />}
          isLoading={isLoading}
        >
          <MobileMetricPill
            title="Active Debtors"
            value={activeCount}
            subtitle="Pending balances"
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            iconColorClass="bg-muted text-foreground"
            isLoading={isLoading}
            onClick={() => setViewMode('active')}
          />

          <MobileMetricPill
            title="Settled Month"
            value={<CurrencyDisplay amount={stats.settledThisMonth} symbolClassName="text-muted-foreground text-xs" />}
            subtitle="Recovered"
            icon={<Wallet className="h-3.5 w-3.5" />}
            iconColorClass="bg-muted text-foreground"
            isLoading={isLoading}
          />

          <MobileMetricPill
            title="Settled Accounts"
            value={settledCount}
            subtitle="Fully paid"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            iconColorClass="bg-muted text-foreground"
            isLoading={isLoading}
            onClick={() => setViewMode('settled')}
          />
        </MobileHeroCard>

        {/* 2. Quick Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search customer name or phone...",
          }}
          actions={[
            {
              label: viewMode === 'active' ? 'Settled Accounts' : 'Active Debtors',
              icon: viewMode === 'active' ? <UserCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />,
              onClick: () => setViewMode((prev) => (prev === 'active' ? 'settled' : 'active')),
            },
            {
              label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5" />,
              onClick: () => fetchDebtors(viewMode),
            },
          ]}
        />

        {/* 3. Debtors Activity Sheet */}
        <MobileActivitySheet
          title="Customer Accounts"
          tabs={[
            { id: 'active', label: 'Active Debtors', count: activeCount },
            { id: 'settled', label: 'Settled Accounts', count: settledCount },
          ]}
          activeTab={viewMode}
          onTabChange={(tabId) => setViewMode(tabId as 'active' | 'settled')}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : debtors.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {viewMode === 'active' ? 'No outstanding debtor balances.' : 'No settled customer records found.'}
            </div>
          ) : (
            debtors.map((debtor: any) => {
              const debt = debtor.outstanding_debt || 0;
              const isOwing = debt > 0;
              const initials = debtor.name
                ? debtor.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'CU';

              return (
                <div
                  key={debtor.id}
                  onClick={() => handleRowClick(debtor.id)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center font-bold text-xs bg-muted text-foreground border border-border">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate max-w-[170px]">
                        {debtor.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[170px] font-mono">
                        {debtor.phone || 'No phone'} • {debtor.unpaid_purchases_count ? `${debtor.unpaid_purchases_count} invoice(s)` : (debtor.last_credit_date ? format(new Date(debtor.last_credit_date), 'MMM dd, yyyy') : 'No credit history')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-[12px] block text-foreground">
                      {isOwing ? <CurrencyDisplay amount={debt} symbolClassName="text-xs" /> : "Fully Settled"}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5 border",
                      isOwing
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border/50"
                    )}>
                      {isOwing ? "OWING" : "SETTLED"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP CREDIT LEDGER VIEW (Hidden < md, Flex >= md)                      */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        {!posSettings.pos_credit_enabled && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs lg:text-sm font-medium shrink-0">
            <Info className="w-4 h-4 shrink-0" />
            <span>New credit sales are currently disabled in POS Settings. You can still view and collect payments for existing customer debts below.</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Total Outstanding Debt"
            value={isLoading ? '...' : <CurrencyDisplay amount={stats.totalDebt} />}
            className="border border-border"
            action={<AlertCircle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title={viewMode === 'active' ? 'Debtors' : 'Settled Accounts'}
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
          title={viewMode === 'active' ? 'Customer Balances' : 'Settled Accounts'}
          showSearch={true}
          searchPlaceholder="Search by name or phone..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showAddButton={false}
          onRefresh={() => fetchDebtors(viewMode)}
          onclick={handleRowClick}
          topActions={[
            {
              title: viewMode === 'active' 
                ? `Settled Accounts (${settledCount})` 
                : `Active Debtors (${activeCount})`,
              icon: viewMode === 'active' ? 'stash:archive' : 'stash:user-check',
              variant: 'flat',
              className: 'bg-muted border border-border text-foreground hover:bg-muted/80 rounded-lg text-xs font-semibold h-[35px] md:h-[38px] px-3 transition-colors',
              onPress: () => setViewMode(prev => prev === 'active' ? 'settled' : 'active')
            }
          ]}
        />
      </div>

      {/* Customer Credit Detail Drawer Modal */}
      <CustomerCreditDetailModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedDebtor={selectedDebtor}
        creditPurchases={creditPurchases}
        creditPayments={creditPayments}
        isPurchasesLoading={isPurchasesLoading}
        onSettleAll={() => {
          setSettlementMode('all');
          setIsSettleModalOpen(true);
        }}
        onSettleSpecific={(p) => {
          setSettlementMode('specific');
          setActiveSettlePurchase(p);
          setIsSettleModalOpen(true);
        }}
        onViewPurchaseReceipt={handleViewPurchaseReceipt}
        onViewPaymentReceipt={handleViewPaymentReceipt}
        onDownloadPaymentPDF={handleDownloadPaymentPDF}
      />

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
