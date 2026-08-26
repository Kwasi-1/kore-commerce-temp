import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { 
  CreditCard, 
  AlertTriangle,
  Clock,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import SupplierCreditDetailModal, { 
  CreditPayment, 
  SupplierCreditRecord 
} from '@/components/inventory/SupplierCreditDetailModal';
import RecordSupplierPaymentModal from '@/components/inventory/RecordSupplierPaymentModal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

export default function SupplierCredit() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
    total_suppliers_with_debt: 0,
    overdue_count: 0,
    upcoming_due_7_days: 0
  });

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedCredit, setSelectedCredit] = useState<SupplierCreditRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Fetch summary & ledger details
  const fetchSummary = async () => {
    try {
      const response = await apiClient.get('/tenant/supplier-credit/summary');
      const data = response.data.success?.data || response.data.data;
      if (data) {
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to load credit summary:", err);
    }
  };

  const fetchCredits = useCallback(async (pageNumber: number = 1) => {
    setIsLoading(true);
    try {
      const statusArr = statusFilter === 'all' ? ['all'] : Array.from(statusFilter as Set<string>);
      let url = `/tenant/supplier-credit?page=${pageNumber}&limit=20`;
      if (statusArr[0] && statusArr[0] !== 'all') {
        url += `&status=${encodeURIComponent(statusArr[0])}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const response = await apiClient.get(url);
      const data = response.data.success?.data?.supplierCredits || [];
      const pag = response.data.success?.data?.pagination || null;

      setCredits(data);
      setPagination(pag);
    } catch (err) {
      console.error("Failed to load supplier credits:", err);
      toast.error("Failed to load credit ledger");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchSummary();
    fetchCredits(1);
  }, [fetchCredits]);

  // Open Payment dialog
  const handleOpenPayment = (record: SupplierCreditRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCredit(record);
    setIsPaymentOpen(true);
  };

  // Open detail panel drawer
  const handleRowClick = async (key: any) => {
    const record = credits.find(c => c.id === key);
    if (record) {
      setSelectedCredit(record);
      setIsDetailOpen(true);
      try {
        const res = await apiClient.get(`/tenant/supplier-credit/${key}`);
        const detailed = res.data.success?.data?.supplierCredit || res.data.data?.supplierCredit;
        if (detailed) {
          setSelectedCredit(detailed);
        }
      } catch (e) {
        console.error('Failed to fetch detailed credit info:', e);
      }
    }
  };

  const handlePaymentSuccess = async (updatedCredit?: any) => {
    fetchSummary();
    fetchCredits(pagination?.page || 1);
    if (updatedCredit?.id) {
      try {
        const res = await apiClient.get(`/tenant/supplier-credit/${updatedCredit.id}`);
        const detailed = res.data.success?.data?.supplierCredit || res.data.data?.supplierCredit;
        setSelectedCredit(detailed || updatedCredit);
      } catch {
        setSelectedCredit(updatedCredit);
      }
    } else if (updatedCredit) {
      setSelectedCredit(updatedCredit);
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
      container.style.fontFamily = 'Helvetica, Arial, sans-serif';

      container.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px; text-transform: uppercase;">Payment Receipt</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #555;">Supplier Credit Settlement</p>
        </div>
        
        <div style="font-size: 11px; margin-bottom: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #777;">Receipt Ref:</span>
            <span style="font-weight: bold;">${payment.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #777;">Date:</span>
            <span>${format(new Date(payment.date_created), 'dd MMM yyyy, HH:mm')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold;">Supplier:</span>
            <span style="font-weight: bold;">${selectedCredit.supplier_name}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #777;">PO Reference:</span>
            <span>${selectedCredit.purchase_order_ref}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 20px; padding: 10px; background: #f9f9f9;">
          <span>Paid Amount:</span>
          <span>GHS ${payment.amount.toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 8px; color: #777;">
          <p>Thank you for your business!</p>
        </div>
      `;

      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, { scale: 2 });
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
      po_ref: <span className="text-sm font-medium">{s.purchase_order_ref}</span>,
      total: <CurrencyDisplay amount={s.total_amount} showStyling={false} />,
      paid: <CurrencyDisplay amount={s.amount_paid} showStyling={false} />,
      balance: (
        <span className={`font-bold ${s.status === 'settled' ? 'text-foreground' : isOverdue ? 'text-destructive' : 'text-foreground'}`}>
          <CurrencyDisplay amount={s.balance_remaining} showStyling={false} />
        </span>
      ),
      status: (
        <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
          s.status === 'settled' ? 'bg-green-500/5 text-green-600' : 
          s.status === 'partial' ? 'bg-amber-500/5 text-amber-600' : 
          'bg-red-500/5 text-red-600'
        }`}>
          {s.status}
        </span>
      ),
      due_date: (
        <span className={`font-semibold ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
          {format(new Date(s.due_date), 'MMM dd, yyyy')}
        </span>
      ),
      rowActions: [
        { key: 'view', label: 'View Details', icon: 'mdi:eye-outline' },
        ...(s.status !== 'settled' ? [{ key: 'pay', label: 'Record Payment', icon: 'mdi:credit-card-outline' }] : [])
      ],
      __record: s
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'view') handleRowClick(row.id);
    if (actionKey === 'pay') handleOpenPayment(row.__record);
  };

  return (
    <PageLayout title="Suppliers" constrainHeight={true}>
      <div className="flex flex-col gap-5 relative flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Outstanding Owed"
            value={isLoading ? '...' : <CurrencyDisplay amount={summary.total_outstanding} />}
            className="border border-border"
          />
          <DashboardCard
            title="Suppliers with Credit"
            value={isLoading ? '...' : summary.total_suppliers_with_debt.toString()}
            className="border border-border"
          />
          <DashboardCard
            title="Overdue Balances"
            value={isLoading ? '...' : summary.overdue_count.toString()}
            className="border border-border text-destructive"
          />
          <DashboardCard
            title="Upcoming Due (7 Days)"
            value={isLoading ? '...' : summary.upcoming_due_7_days.toString()}
            className="border border-border text-amber-500"
          />
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(page) => fetchCredits(page)}
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
          showTopContent={true}
          topActions={
            showCreditTab
              ? [
                  {
                    title: "Supplier Directory",
                    icon: "solar:users-group-two-rounded-linear",
                    variant: "flat",
                    className: "border border-border/60 text-foreground font-semibold rounded-md h-[38px] px-3 bg-muted/60 hover:bg-muted text-xs",
                    onPress: () => navigate('/inventory/suppliers'),
                  },
                ]
              : []
          }
          showAddButton={false}
          onRefresh={() => fetchCredits(1)}
          onRowActionClick={handleRowActionClick}
          onclick={handleRowClick}
          mobileFriendly={true}
        />

        {/* DETAILS MODAL */}
        <SupplierCreditDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedCredit(null);
          }}
          selectedCredit={selectedCredit}
          onRecordPayment={(credit) => {
            setSelectedCredit(credit);
            setIsPaymentOpen(true);
          }}
          onDownloadPDF={handleDownloadPDF}
        />

        {/* RECORD PAYMENT MODAL */}
        <RecordSupplierPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          selectedCredit={selectedCredit}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </PageLayout>
  );
}
