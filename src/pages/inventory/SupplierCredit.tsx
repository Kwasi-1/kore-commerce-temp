import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import { useAuthStore } from '@/store/authStore';
import { 
  CreditCard, 
  AlertTriangle,
  Clock,
  Coins,
  Users,
  RefreshCw,
  FileText,
  Calendar,
  DollarSign
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
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@iconify/react';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function SupplierCredit() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
    total_suppliers_with_debt: 0,
    overdue_count: 0,
    upcoming_due_7_days: 0
  });

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<any>(new Set(['all']));
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || (location.state as any)?.search || ''
  );

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null && s !== searchQuery) {
      setSearchQuery(s);
    }
  }, [searchParams]);

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

  const fetchCredits = useCallback(async (pageNumber: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
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

      if (append) {
        setCredits((prev) => [...prev, ...data]);
      } else {
        setCredits(data);
      }
      setPagination(pag);
    } catch (err) {
      console.error("Failed to load supplier credits:", err);
      toast.error("Failed to load credit ledger");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter, searchQuery]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !pagination?.hasNext) return;
    const nextPage = (pagination?.page || 1) + 1;
    fetchCredits(nextPage, true);
  };

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
        <div style="text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
          <h2 style="font-size: 18px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">Payment Receipt</h2>
          <p style="font-size: 11px; color: #64748b; margin: 0;">Supplier Debt Payment</p>
        </div>

        <div style="font-size: 12px; margin-bottom: 16px; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Supplier:</span>
            <span style="font-weight: 600;">${selectedCredit.supplier_name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">PO Reference:</span>
            <span style="font-family: monospace; font-weight: 600;">${selectedCredit.purchase_order_ref}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Date Paid:</span>
            <span>${format(new Date(payment.date_created), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Method:</span>
            <span style="text-transform: capitalize; font-weight: 600;">${payment.payment_method?.replace('_', ' ') || 'Cash'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Receipt Ref:</span>
            <span style="font-family: monospace; font-weight: 600;">${payment.reference}</span>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 12px; font-weight: 600;">Amount Paid:</span>
            <span style="font-size: 16px; font-weight: bold; color: #16a34a;">${payment.amount}</span>
          </div>
        </div>

        ${payment.notes ? `
        <div style="font-size: 11px; color: #64748b; margin-bottom: 16px; background-color: #ffffff; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 4px;">
          <strong>Notes:</strong> ${payment.notes}
        </div>` : ''}

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8;">
          <p style="margin: 0;">Official Payment Confirmation &middot; Generated electronically</p>
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
      pdf.addImage(imgData, 'PNG', 5, 5, 90, 0);
      pdf.save(`Payment_${selectedCredit.purchase_order_ref}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);

      toast.success('Receipt downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      toast.error('Failed to export PDF receipt', { id: toastId });
    }
  };

  const activeMobileTab = useMemo(() => {
    if (statusFilter instanceof Set) {
      return (Array.from(statusFilter)[0] as string) || 'all';
    }
    return (statusFilter as string) || 'all';
  }, [statusFilter]);

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
    <PageLayout 
      title="Suppliers Credit" 
      subtitle={
        isMobile ? (
          <span>
            <CurrencyDisplay amount={summary.total_outstanding} showStyling={false} /> total outstanding
          </span>
        ) : undefined
      }
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      {/* ========================================================================= */}
      {/* MOBILE SUPPLIERS CREDIT VIEW (Hidden >= md, Block < md)                   */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* Compact Credit Metric Strip on Mobile (On top of Action Bar) */}
        <div className="grid grid-cols-3 gap-2 px-1 pt-1 pb-1">
          <div className="bg-background border border-border/60 rounded-xl p-2.5 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] text-muted-foreground font-medium">In Debt</span>
            <span className="text-sm font-bold text-foreground mt-0.5">{summary.total_suppliers_with_debt}</span>
          </div>

          <div className="bg-background border border-border/60 rounded-xl p-2.5 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] text-muted-foreground font-medium">Overdue</span>
            <span className={`text-sm font-bold mt-0.5 ${summary.overdue_count > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {summary.overdue_count}
            </span>
          </div>

          <div className="bg-background border border-border/60 rounded-xl p-2.5 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] text-muted-foreground font-medium">Upcoming (7d)</span>
            <span className={`text-sm font-bold mt-0.5 ${summary.upcoming_due_7_days > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {summary.upcoming_due_7_days}
            </span>
          </div>
        </div>

        {/* Action Capsule Bar (Search + Supplier Directory + Refresh) */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search supplier or PO...",
          }}
          actions={[
            {
              label: 'Directory',
              icon: <Users className="h-3.5 w-3.5 text-primary" />,
              onClick: () => navigate('/inventory/suppliers'),
            },
            {
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: () => {
                fetchSummary();
                fetchCredits(1);
              },
            },
          ]}
        />

        {/* Credit Activity Sheet */}
        <MobileActivitySheet
          title="Credit Records"
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'outstanding', label: 'Outstanding' },
            { id: 'partial', label: 'Partial' },
            { id: 'settled', label: 'Settled' },
          ]}
          activeTab={activeMobileTab}
          onTabChange={(tabId) => setStatusFilter(new Set([tabId]))}
          hasMore={pagination?.hasNext}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          totalCount={pagination?.total}
          currentCount={credits.length}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : credits.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No credit records found matching your filter or search.
            </div>
          ) : (
            credits.map((record) => {
              const isOverdue = record.status !== 'settled' && new Date(record.due_date) < new Date();
              const isSettled = record.status === 'settled';

              return (
                <div
                  key={record.id}
                  onClick={() => handleRowClick(record.id)}
                  className="py-3 flex flex-col gap-2.5 text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0"
                >
                  {/* Top Row: Supplier + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate max-w-[200px]">
                        {record.supplier_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{record.purchase_order_ref}</span>
                        <span>&middot;</span>
                        <span className={isOverdue ? "text-destructive font-bold" : "text-muted-foreground"}>
                          Due {format(new Date(record.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                      isSettled
                        ? 'text-emerald-600 bg-emerald-500/10'
                        : record.status === 'partial'
                          ? 'text-amber-600 bg-amber-500/10'
                          : 'text-destructive bg-destructive/10'
                    }`}>
                      {record.status}
                    </span>
                  </div>

                  {/* Bottom Row: Balance & Action Button */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">Remaining Balance</span>
                      <span className={`text-xs font-bold ${
                        isSettled ? 'text-muted-foreground' : isOverdue ? 'text-destructive' : 'text-foreground'
                      }`}>
                        <CurrencyDisplay amount={record.balance_remaining} showStyling={false} />
                      </span>
                    </div>

                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleOpenPayment(record, e)}
                        className="h-7 px-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        <span>Pay Debt</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP SUPPLIERS CREDIT VIEW (Hidden < md, Flex >= md)                   */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
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
                    className: "border border-muted/70 text-foreground font-semibold rounded-md h-[39px] bg-muted/70 hover:bg-muted text-xs",
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
      </div>

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
    </PageLayout>
  );
}
