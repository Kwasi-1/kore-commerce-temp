import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { 
  CreditCard, 
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
  Download,
  Wallet,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CreditPayment {
  id: string;
  amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  date_created: string;
}

interface SupplierCreditRecord {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_order_id: string;
  purchase_order_ref: string;
  total_amount: number;
  amount_paid: number;
  balance_remaining: number;
  status: "outstanding" | "partial" | "settled";
  due_date: string;
  notes: string;
  date_created: string;
  payments: CreditPayment[];
}

export default function SupplierCredit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatGHS, formatAmount } = useCurrency();
  const staffUser = useAuthStore((state) => state.staffUser);
  const showCreditTab = staffUser?.role === 'owner' || staffUser?.role === 'manager';

  // Redirect cashier if they land here
  useEffect(() => {
    if (staffUser && staffUser.role !== 'owner' && staffUser.role !== 'manager') {
      navigate('/inventory/suppliers');
      toast.error("Unauthorized access to credit ledger");
    }
  }, [staffUser, navigate]);

  // Page data states
  const [credits, setCredits] = useState<SupplierCreditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
    total_suppliers_with_debt: 0,
    overdue_count: 0,
    upcoming_due_7_days: 0
  });

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / details sheet state
  const [selectedCredit, setSelectedCredit] = useState<SupplierCreditRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Record payment state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch summary & ledger details
  const fetchSummary = async () => {
    try {
      const response = await apiClient.get('/tenant/supplier-credit/summary');
      setSummary(response.data.data || {
        total_outstanding: 0,
        total_suppliers_with_debt: 0,
        overdue_count: 0,
        upcoming_due_7_days: 0
      });
    } catch (err) {
      console.error("Failed to load credit summary:", err);
    }
  };

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter as Set<string>);
      let url = '/tenant/supplier-credit?limit=100';
      if (statusArr[0] !== 'all') {
        url += `&status=${statusArr[0]}`;
      }
      const response = await apiClient.get(url);
      let data = response.data.success?.data?.supplierCredits || [];

      // Client-side search by supplier name or PO ref
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter((c: SupplierCreditRecord) =>
          c.supplier_name.toLowerCase().includes(q) ||
          c.purchase_order_ref.toLowerCase().includes(q)
        );
      }

      setCredits(data);
    } catch (err) {
      console.error("Failed to load supplier credits:", err);
      toast.error("Failed to load credit ledger");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchSummary();
    fetchCredits();
  }, [fetchCredits]);

  // Open Payment dialog
  const handleOpenPayment = (record: SupplierCreditRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCredit(record);
    setPayAmount(record.balance_remaining.toString());
    setPaymentMethod('cash');
    setPaymentRef('');
    setPaymentNotes('');
    setIsPaymentOpen(true);
  };

  // Open detail panel drawer
  const handleRowClick = (key: any) => {
    const record = credits.find(c => c.id === key);
    if (record) {
      setSelectedCredit(record);
      setIsDetailOpen(true);
    }
  };

  // Submit payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > selectedCredit.balance_remaining) {
      toast.error(`Invalid payment amount. Range: 0.01 - ${selectedCredit.balance_remaining}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const response = await apiClient.post(`/tenant/supplier-credit/${selectedCredit.id}/payments`, {
        amount: amountNum,
        payment_method: paymentMethod,
        reference: paymentRef,
        notes: paymentNotes
      });

      toast.success("Payment recorded successfully!");
      setIsPaymentOpen(false);
      
      // Update local states
      fetchSummary();
      fetchCredits();
      
      // If detail panel is open, update the displayed item
      if (isDetailOpen && selectedCredit.id === response.data.success?.data?.supplierCredit?.id) {
        setSelectedCredit(response.data.success?.data?.supplierCredit);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Download PDF Receipt
  const handleDownloadPDF = async (payment: CreditPayment) => {
    if (!selectedCredit) return;

    const toastId = toast.loading('Generating PDF payment receipt...');
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
          <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 4px; uppercase; letter-spacing: 1px;">VYSION LABS RETAIL</h3>
          <p style="font-size: 9px; color: #666; text-transform: uppercase; margin: 0;">SUPPLIER PAYMENT RECORD</p>
        </div>
        
        <div style="border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Receipt No:</span>
            <span>${payment.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Date Paid:</span>
            <span>${new Date(payment.date_created).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Supplier:</span>
            <span style="font-weight: bold;">${selectedCredit.supplier_name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">PO Reference:</span>
            <span>${selectedCredit.purchase_order_ref}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">Payment Method:</span>
            <span style="text-transform: uppercase;">${payment.payment_method}</span>
          </div>
        </div>
        
        <div style="border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span>Outstanding Owed:</span>
            <span>GHS ${(payment.amount + (selectedCredit.id === selectedCredit.id ? selectedCredit.balance_remaining : 0)).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 4px; color: red;">
            <span>Amount Paid:</span>
            <span>-GHS ${payment.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; text-transform: uppercase;">
          <span>Remaining Balance:</span>
          <span>GHS ${selectedCredit.balance_remaining.toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 8px; color: #777;">
          <p>This is an automated payment confirmation receipt.</p>
          <p style="margin-top: 5px;">Thank you for your business!</p>
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
      pdf.save(`SupplierReceipt_${payment.reference}.pdf`);
      
      document.body.removeChild(container);
      toast.success('Supplier payment receipt downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const columns = [
    { key: 'name', label: 'Supplier Name' },
    { key: 'po_ref', label: 'PO Reference' },
    { key: 'total', label: 'Original Owed' },
    { key: 'paid', label: 'Amount Paid' },
    { key: 'balance', label: 'Remaining Balance' },
    { key: 'status', label: 'Status' },
    { key: 'due_date', label: 'Due Date' }
  ];

  const rows = credits.map((s: SupplierCreditRecord) => {
    const isOverdue = new Date(s.due_date).getTime() < Date.now() && s.status !== 'settled';
    return {
      id: s.id,
      name: <span className="font-semibold text-foreground">{s.supplier_name}</span>,
      po_ref: <span className="font-mono text-xs font-semibold">{s.purchase_order_ref}</span>,
      total: formatGHS(s.total_amount),
      paid: formatGHS(s.amount_paid),
      balance: (
        <span className={`font-bold ${
          s.status === 'settled' ? 'text-green-500' : isOverdue ? 'text-destructive' : 'text-foreground'
        }`}>
          {formatGHS(s.balance_remaining)}
        </span>
      ),
      status: (
        <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
          s.status === 'settled'
            ? 'bg-green-500/10 text-green-600 border-green-500/20'
            : s.status === 'partial'
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-red-500/10 text-red-600 border-red-500/20'
        }`}>
          {s.status}
        </span>
      ),
      due_date: (
        <span className={`font-semibold ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
          {format(new Date(s.due_date), 'MMM dd, yyyy')}
          {isOverdue && ' (Overdue)'}
        </span>
      ),
      rowActions: [
        { key: 'view', label: 'View Details', icon: 'mdi:eye-outline' },
        ...(s.status !== 'settled' ? [{ key: 'pay', label: 'Record Payment', icon: 'mdi:credit-card-outline', className: 'text-primary font-semibold' }] : [])
      ],
      __record: s
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'view') handleRowClick(row.id);
    if (actionKey === 'pay') handleOpenPayment(row.__record, { stopPropagation: () => {} } as any);
  };

  const methodLabels: Record<string, string> = {
    cash: "Cash Payment",
    mobile_money: "Mobile Money (MoMo)",
    bank_transfer: "Bank Transfer"
  };

  return (
    <PageLayout title="Suppliers">
      {/* Tab Switcher */}
      {showCreditTab && (
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => navigate('/inventory/suppliers')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              location.pathname === '/inventory/suppliers'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Supplier Directory
          </button>
          <button
            onClick={() => navigate('/inventory/supplier-credit')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              location.pathname === '/inventory/supplier-credit'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Credit Ledger
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 relative">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Outstanding Owed"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_outstanding} />}
            className="border border-border"
            action={<Coins className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Suppliers with Credit"
            value={isLoading ? '...' : summary.total_suppliers_with_debt.toString()}
            className="border border-border"
            action={<CreditCard className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Overdue Balances"
            value={isLoading ? '...' : summary.overdue_count.toString()}
            className="border border-border text-destructive"
            action={<AlertTriangle className="text-destructive/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Upcoming Due (7 Days)"
            value={isLoading ? '...' : summary.upcoming_due_7_days.toString()}
            className="border border-border text-amber-500"
            action={<Clock className="text-amber-500/50 h-5 w-5" />}
          />
        </div>

        {/* Ledger Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Supplier Credit Ledger"
          showSearch={true}
          searchPlaceholder="Search by supplier or PO number..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showFilter={true}
          filterLabel="Status"
          filterOptions={[
            { uid: 'all', name: 'All Statuses' },
            { uid: 'outstanding', name: 'Outstanding' },
            { uid: 'partial', name: 'Partial' },
            { uid: 'settled', name: 'Settled' }
          ]}
          filterValue={statusFilter}
          onFilterChange={(keys: any) => setStatusFilter(keys)}
          showAddButton={false}
          onRefresh={fetchCredits}
          onRowActionClick={handleRowActionClick}
          onclick={handleRowClick}
          mobileFriendly={true}
        />

        {/* DETAILS DRAWER / SHEET */}
        <CustomModal
          isOpen={isDetailOpen}
          onOpenChange={() => setIsDetailOpen(false)}
          placement="right"
          size="md"
          header={
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Credit Ledger details</span>
            </div>
          }
          body={
            <div className="flex-1 overflow-y-auto px-1 py-4 text-left">
              {selectedCredit ? (
                <div className="space-y-6">
                  {/* Visual stamps & remaining metrics */}
                  <div className="text-center pb-6 border-b border-border/50">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3">
                      {selectedCredit.supplier_name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-lg font-bold">{selectedCredit.supplier_name}</h3>
                    <p className="text-muted-foreground text-xs font-mono">{selectedCredit.purchase_order_ref}</p>
                    
                    <div className="mt-4 bg-muted/40 p-4.5 rounded-xl border border-border inline-block w-full max-w-[280px]">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">Remaining Balance Owed</p>
                      <p className="text-2xl font-extrabold text-foreground tracking-tight">
                        {formatGHS(selectedCredit.balance_remaining)}
                      </p>
                      <span className={`capitalize text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-3 border ${
                        selectedCredit.status === 'settled'
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : selectedCredit.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        {selectedCredit.status}
                      </span>
                    </div>

                    {selectedCredit.status !== 'settled' && (
                      <div className="mt-4 flex justify-center">
                        <Button 
                          onClick={(e) => handleOpenPayment(selectedCredit, e)}
                          className="w-full max-w-[200px] rounded-xl h-10 font-semibold text-xs"
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Summary grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                      <FileText className="h-4 w-4" /> Invoice Summary
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Total Invoice Amount</span>
                        <span className="font-semibold text-foreground">{formatGHS(selectedCredit.total_amount)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Amount Settled</span>
                        <span className="font-semibold text-foreground">{formatGHS(selectedCredit.amount_paid)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Payment Due Date</span>
                        <span className="font-semibold text-foreground">{format(new Date(selectedCredit.due_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Logged On</span>
                        <span className="font-semibold text-foreground">{format(new Date(selectedCredit.date_created), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    {selectedCredit.notes && (
                      <div className="bg-muted/30 p-3 rounded-xl border mt-2">
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase tracking-wider mb-1">Notes</span>
                        <p className="text-xs leading-relaxed font-medium text-foreground">{selectedCredit.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Timeline history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                      <History className="h-4 w-4" /> Payments History
                    </h4>
                    
                    {selectedCredit.payments && selectedCredit.payments.length > 0 ? (
                      <div className="space-y-3.5 bg-muted/20 border rounded-xl p-3.5">
                        {selectedCredit.payments.map((payment) => (
                          <div 
                            key={payment.id} 
                            onClick={() => handleDownloadPDF(payment)}
                            className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-lg cursor-pointer transition-colors group text-xs -mx-1"
                          >
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              <div className="text-left">
                                <p className="font-bold text-foreground truncate max-w-[150px]">{payment.reference}</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                  {format(new Date(payment.date_created), 'MMM dd, yyyy')} · {methodLabels[payment.payment_method] || payment.payment_method}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-foreground">-{formatGHS(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl p-4 bg-muted/5">
                        No payments recorded against this credit purchase yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          }
        />

        {/* RECORD PAYMENT SHEET DRAWER */}
        <CustomModal
          isOpen={isPaymentOpen}
          onOpenChange={() => setIsPaymentOpen(false)}
          placement="right"
          size="md"
          classNames={{ base: "sm:w-[450px]" }}
          header={
            <div className="pt-4 px-2 text-left">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Record Supplier Payment
              </h2>
              {selectedCredit && (
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Supplier: <strong>{selectedCredit.supplier_name}</strong> · PO: <span className="font-mono">{selectedCredit.purchase_order_ref}</span>
                </p>
              )}
            </div>
          }
          body={
            selectedCredit ? (
              <form onSubmit={handleRecordPaymentSubmit} className="space-y-5 p-2 pb-8 text-left">
                {/* Remaining debt overview */}
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Owed Balance</span>
                    <span className="text-lg font-bold text-foreground">{formatGHS(selectedCredit.balance_remaining)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Supplier Limit</span>
                    <span className="text-xs font-semibold text-foreground">GHS {formatAmount(selectedCredit.total_amount)}</span>
                  </div>
                </div>

                {/* Amount to pay */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Payment Amount (GHS) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCredit.balance_remaining.toString()}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="rounded-xl h-10 text-xs font-bold"
                  />
                </div>

                {/* Method */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money (MoMo)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Reference */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Transaction / Bank Reference *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Bank trace ref, MoMo transaction ID..."
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Internal Notes / Explanations
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Add cash voucher number, bank check number or cashier notations..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* Footer action buttons */}
                <div className="flex gap-3 justify-end pt-5 border-t w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsPaymentOpen(false)}
                    disabled={isSubmittingPayment}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="rounded-xl bg-primary text-primary-foreground min-w-[150px]"
                  >
                    {isSubmittingPayment ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Record Payment"
                    )}
                  </Button>
                </div>
              </form>
            ) : null
          }
          footer={null}
        />
      </div>
    </PageLayout>
  );
}
