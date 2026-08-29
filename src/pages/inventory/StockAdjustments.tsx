import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Search, 
  FileText, 
  ChevronRight, 
  UserCheck, 
  SlidersHorizontal, 
  Trash2,
  Calendar,
  XCircle,
  ArrowRightLeft,
  KeyRound,
  FileCheck,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Selection } from "@nextui-org/react";
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import CustomModal from "@/components/modals/modal";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import DashboardCard from "@/components/ui/dashboard-card";
import EnhancedTableComponent, { TableColumn } from "@/components/shared/MainTableComponent";
import { DateFilterValue } from "@/components/shared/custom-only-date-filter";
import { PackagingStockDisplay } from "@/components/inventory/PackagingStockDisplay";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomInputTextField } from "@/components/shared/text-field";
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from "@/components/mobile-dashboard";

interface Adjustment {
  id: string;
  variant_id: string;
  variant_name: string;
  base_unit_name?: string;
  packaging_tier_id?: string | null;
  packaging_tier_name?: string | null;
  units_per_tier?: number | null;
  package_quantity?: number | null;
  sku: string;
  quantity: number;
  reason: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  initiated_by: string;
  initiated_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_note?: string;
  date_created: string;
}

interface SearchVariant {
  variant_id: string;
  product_name: string;
  sku: string;
  stock_quantity: number;
  base_unit_name: string;
  variant_attributes?: Record<string, string>;
}

export default function StockAdjustments() {
  // Page lists states
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("awaiting");
  
  // Table search & filters
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [statusFilterSelection, setStatusFilterSelection] = useState<Selection>(new Set(["all"]));
  const [typeFilter, setTypeFilter] = useState<Selection>(new Set(["all"]));
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: "all_time",
    start_date: null,
    end_date: null,
  });

  // Drawer / New adjustment state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<SearchVariant | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"reduce" | "add">("reduce");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("damaged");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approval Modal states
  const [selectedAdj, setSelectedAdj] = useState<Adjustment | null>(null);
  const [pinActionType, setPinActionType] = useState<"approve" | "reject">("approve");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Detail Sheet Modal state
  const [selectedDetailAdj, setSelectedDetailAdj] = useState<Adjustment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Reason mapping utility
  const reasonLabels: Record<string, string> = {
    damaged: "Damaged / Broken",
    defective: "Defective Return",
    expired: "Expired",
    lost: "Lost / Missing",
    stolen: "Theft / Shrinkage",
    counting_error: "Counting Error",
    other: "Other"
  };

  // Fetch Adjustments data
  const fetchAdjustments = useCallback(async (pageNumber: number = 1) => {
    setIsLoading(true);
    try {
      let url = `/tenant/adjustments?page=${pageNumber}&per_page=20`;
      
      const statusVal = statusFilterSelection instanceof Set 
        ? Array.from(statusFilterSelection)[0] 
        : statusFilterSelection;
        
      if (statusVal && statusVal !== "all") {
        url += `&status=${statusVal}`;
      }

      if (tableSearchQuery.trim()) {
        url += `&search=${encodeURIComponent(tableSearchQuery.trim())}`;
      }

      if (dateFilter.start_date) {
        url += `&start_date=${format(dateFilter.start_date, "yyyy-MM-dd")}T00:00:00Z`;
      }
      if (dateFilter.end_date) {
        url += `&end_date=${format(dateFilter.end_date, "yyyy-MM-dd")}T23:59:59Z`;
      }

      const res = await apiClient.get(url);
      setAdjustments(res.data.success?.data?.adjustments || []);
      setPagination(res.data.success?.data?.pagination || null);
    } catch (err) {
      console.error("Failed to load adjustments:", err);
      toast.error("Failed to load adjustments history");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilterSelection, tableSearchQuery, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdjustments(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAdjustments]);

  // Variant Search autocomplete handler inside New Adjustment drawer
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        apiClient.get(`/pos/products/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => {
            setSearchResults(res.data.success?.data?.products || []);
          })
          .catch(console.error);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Initiate stock adjustment request
  const handleNewAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) {
      toast.error("Please search and select a product variant first.");
      return;
    }
    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }

    // Cost reduction maps to negative stock quantity
    const finalQty = adjustmentType === "reduce" ? -qtyNum : qtyNum;

    setIsSubmitting(true);
    try {
      await apiClient.post("/tenant/adjustments", {
        variant_id: selectedVariant.variant_id,
        quantity: finalQty,
        reason,
        notes
      });

      toast.success("Adjustment request submitted. Awaiting manager approval.");
      setIsDrawerOpen(false);
      resetForm();
      fetchAdjustments();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || "Failed to submit adjustment request";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedVariant(null);
    setSearchQuery("");
    setSearchResults([]);
    setQuantity("");
    setReason("damaged");
    setNotes("");
    setAdjustmentType("reduce");
  };

  // Approval / Rejection Trigger handlers
  const handleOpenPinModal = (adj: Adjustment, action: "approve" | "reject") => {
    setSelectedAdj(adj);
    setPinActionType(action);
    setPinCode("");
    setShowPin(false);
    setRejectionNote("");
    setIsPinModalOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!selectedAdj) return;

    if (pinActionType === "reject" && !rejectionNote.trim()) {
      toast.error("Please provide a rejection note.");
      return;
    }

    if (pinActionType === "approve" && pinCode.length !== 4) {
      toast.error("Please enter a 4-digit PIN code.");
      return;
    }

    setIsProcessingAction(true);
    try {
      if (pinActionType === "approve") {
        await apiClient.post(`/tenant/adjustments/${selectedAdj.id}/approve`, {
          approver_pin: pinCode
        });
        toast.success("Adjustment approved. Stock levels updated!");
      } else {
        await apiClient.post(`/tenant/adjustments/${selectedAdj.id}/reject`, {
          rejection_note: rejectionNote
        });
        toast.success("Adjustment request rejected.");
      }
      setIsPinModalOpen(false);
      setSelectedAdj(null);
      if (selectedDetailAdj?.id === selectedAdj.id) {
        setIsDetailModalOpen(false);
      }
      fetchAdjustments();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || "Failed to process authorization";
      toast.error(msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRowClick = (key: any) => {
    const record = adjustments.find(a => a.id === key || a.id === key?.toString());
    if (record) {
      setSelectedDetailAdj(record);
      setIsDetailModalOpen(true);
    }
  };

  // Compute metrics based on lists
  const pendingApprovalsCount = useMemo(() => {
    return adjustments.filter(a => a.status === "pending").length;
  }, [adjustments]);

  const totalWrittenOffMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return adjustments
      .filter(a => a.status === "approved" && a.quantity < 0 && new Date(a.date_created).getTime() >= startOfMonth)
      .reduce((sum, a) => sum + Math.abs(a.quantity), 0);
  }, [adjustments]);

  const totalAdjustmentsMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return adjustments.filter(a => new Date(a.date_created).getTime() >= startOfMonth).length;
  }, [adjustments]);

  // Split items for pending manager panel and main log table
  const pendingItems = useMemo(() => adjustments.filter(a => a.status === "pending"), [adjustments]);

  // Filtered rows for EnhancedTableComponent
  const filteredAdjustments = useMemo(() => {
    let result = adjustments;

    // Filter by Direction / Type (addition vs reduction)
    const typeVal =
      typeFilter instanceof Set
        ? Array.from(typeFilter)[0]
        : (typeFilter as any)?.currentKey || (typeof typeFilter === "string" ? typeFilter : "all");

    if (typeVal === "addition") {
      result = result.filter((a) => a.quantity > 0);
    } else if (typeVal === "reduction") {
      result = result.filter((a) => a.quantity < 0);
    }

    if (!tableSearchQuery.trim()) return result;
    const q = tableSearchQuery.toLowerCase();
    return result.filter(
      (a) =>
        (a.variant_name && a.variant_name.toLowerCase().includes(q)) ||
        (a.sku && a.sku.toLowerCase().includes(q)) ||
        (a.reason && a.reason.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.initiated_by_name && a.initiated_by_name.toLowerCase().includes(q))
    );
  }, [adjustments, typeFilter, tableSearchQuery]);

  // Pending approvals columns definition
  const pendingColumns: TableColumn[] = [
    { key: "date", label: "Date" },
    { key: "variant", label: "Product Variant" },
    { key: "quantity", label: "Quantity" },
    { key: "reason", label: "Reason" },
    { key: "notes", label: "Notes" },
    { key: "initiated_by", label: "Initiated By" },
    { key: "actions", label: "Actions" },
  ];

  // Pending approvals rows mapping
  const pendingRows = useMemo(() => {
    return pendingItems.map((item) => ({
      id: item.id,
      date: item.date_created ? format(new Date(item.date_created), "MMM dd, yyyy") : "—",
      variant: (
        <div className="min-w-[180px]">
          <p className="font-semibold text-foreground capitalize text-[13px]">{item.variant_name}</p>
          {item.sku && <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>}
        </div>
      ),
      quantity: (
        <PackagingStockDisplay
          quantity={item.quantity}
          baseUnitName={item.base_unit_name || "units"}
          showPrefixSign={true}
          customBreakdown={
            item.package_quantity && item.packaging_tier_name
              ? `${item.package_quantity} ${item.packaging_tier_name}`
              : undefined
          }
          tierClassName="text-[11px] text-muted-foreground"
        />
      ),
      reason: (
        <span className="inline-flex items-center px-2.5 py-1.5 rounded text-[10px] font-semibold bg-amber-500/5 text-amber-600 dark:text-amber-400 capitalize">
          {reasonLabels[item.reason] || item.reason}
        </span>
      ),
      notes: (
        <span className="text-xs text-muted-foreground max-w-xs truncate block" title={item.notes}>
          {item.notes || "—"}
        </span>
      ),
      initiated_by: (
        <span className="text-[13px] text-muted-foreground font-medium">{item.initiated_by_name || "—"}</span>
      ),
      actions: (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            size="sm"
            onClick={() => handleOpenPinModal(item, "approve")}
            className="h-8 rounded-md font-semibold text-xs px-3 shadow-none"
          >
            Approve
          </Button>
          <Button 
            size="sm"
            onClick={() => handleOpenPinModal(item, "reject")}
            variant="ghost" 
            className="h-8 rounded-md border border-destructive/20 text-destructive hover:bg-destructive/10 font-semibold text-xs px-3"
          >
            Reject
          </Button>
        </div>
      ),
      __record: item,
    }));
  }, [pendingItems]);

  // EnhancedTableComponent columns definition
  const columns: TableColumn[] = [
    { key: "date", label: "Date" },
    { key: "variant", label: "Product Variant" },
    { key: "quantity", label: "Quantity" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
    { key: "initiated_by", label: "Initiated By" },
    { key: "approved_by", label: "Approved By" },
    // { key: "notes", label: "Rejection / Notes" },
  ];

  // EnhancedTableComponent rows mapping
  const rows = useMemo(() => {
    return filteredAdjustments.map((item) => ({
      id: item.id,
      date: item.date_created ? format(new Date(item.date_created), "MMM dd, yyyy") : "—",
      variant: (
        <div className="min-w-[180px]">
          <p className="font-semibold text-foreground capitalize text-[13px]">{item.variant_name}</p>
          {item.sku && <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>}
        </div>
      ),
      quantity: (
        <PackagingStockDisplay
          quantity={item.quantity}
          baseUnitName={item.base_unit_name || "units"}
          showPrefixSign={true}
          customBreakdown={
            item.package_quantity && item.packaging_tier_name
              ? `${item.package_quantity} ${item.packaging_tier_name}`
              : undefined
          }
          primaryClassName="text-foreground"
          tierClassName="text-[11px] text-muted-foreground font-mono"
        />
      ),
      reason: (
        <span className="capitalize text-muted-foreground">
          {reasonLabels[item.reason] || item.reason}
        </span>
      ),
      status: (
        <span className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold ${
          item.status === "approved"
            ? "text-green-600 bg-green-400/10 border-green-500/20"
            : item.status === "rejected"
              ? "text-destructive bg-destructive/10 border-destructive/20"
              : "text-amber-600 bg-amber-400/10 border-amber-500/20 animate-pulse"
        }`}>
          {item.status}
        </span>
      ),
      initiated_by: (
        <span className="text-[13px] text-muted-foreground font-medium">{item.initiated_by_name || "—"}</span>
      ),
      approved_by: (
        <span className="text-[13px] text-muted-foreground font-medium">{item.approved_by_name || "—"}</span>
      ),
      // notes: (
      //   <span className="text-xs text-muted-foreground max-w-xs truncate block" title={item.notes || item.rejection_note}>
      //     {item.rejection_note || item.notes || "—"}
      //   </span>
      // ),
      __record: item,
    }));
  }, [filteredAdjustments]);

  return (
    <PageLayout 
      title="Stock Adjustments" 
      subtitle={
        <span className="md:hidden">
          {pendingItems.length > 0 ? `${pendingItems.length} pending approval` : `${adjustments.length} total logged`}
        </span>
      }
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
      headerVariant="action-bridge"
      constrainHeight={true}
    >
      {/* ========================================================================= */}
      {/* MOBILE STOCK ADJUSTMENTS VIEW (Hidden >= md, Block < md)                  */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* Action Capsule Bar (Search + Date Filter + Quick Actions) */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: tableSearchQuery,
            onChange: setTableSearchQuery,
            placeholder: "Search variant, reason, notes...",
          }}
          dateFilterConfig={{
            value: dateFilter,
            onChange: setDateFilter,
          }}
          actions={[
            {
              label: 'New Request',
              icon: <Plus className="h-3.5 w-3.5 text-primary" />,
              onClick: () => setIsDrawerOpen(true),
            },
            {
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: () => fetchAdjustments(1),
            },
          ]}
        />

        {/* Adjustments Activity Sheet */}
        <MobileActivitySheet
          title="Adjustment Records"
          secondary={true}
          tabs={[
            ...(pendingItems.length > 0 ? [{ id: 'awaiting', label: 'Awaiting Approval', count: pendingItems.length }] : []),
            { id: 'all', label: 'All Logs' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ]}
          activeTab={activeTab === 'awaiting' ? 'awaiting' : ((Array.from(statusFilterSelection as Set<string>)[0]) || 'all')}
          onTabChange={(tabId) => {
            if (tabId === 'awaiting') {
              setActiveTab('awaiting');
            } else {
              setActiveTab('logs');
              setStatusFilterSelection(new Set([tabId]));
            }
          }}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : (activeTab === 'awaiting' ? pendingItems : filteredAdjustments).length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {activeTab === 'awaiting' ? 'No pending approval requests' : 'No adjustment records found'}
            </div>
          ) : (
            (activeTab === 'awaiting' ? pendingItems : filteredAdjustments).map((adj) => {
              const isPending = adj.status === 'pending';
              const isApproved = adj.status === 'approved';
              const isAddition = adj.quantity > 0;

              return (
                <div
                  key={adj.id}
                  onClick={() => {
                    setSelectedDetailAdj(adj);
                    setIsDetailModalOpen(true);
                  }}
                  className="py-3 flex flex-col gap-2.5 text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-lg shrink-0 flex items-center justify-center border ${
                        isPending ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        isApproved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {isPending ? <Clock className="h-4 w-4" /> : isApproved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate max-w-[180px]">
                          {adj.variant_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {reasonLabels[adj.reason] || adj.reason} &middot; {adj.initiated_by_name || 'Staff'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quantity Change + Status */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      <span className={`font-extrabold text-[13px] ${isAddition ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isAddition ? `+${adj.quantity}` : adj.quantity} {adj.base_unit_name || 'units'}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isPending ? 'bg-amber-500/10 text-amber-600' :
                        isApproved ? 'bg-emerald-500/10 text-emerald-600' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {adj.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions row for Awaiting Approval on Mobile */}
                  {isPending && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPinModal(adj, "reject")}
                        className="h-7 px-3 text-xs font-semibold text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-full"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenPinModal(adj, "approve")}
                        className="h-7 px-3 text-xs font-semibold rounded-full shadow-none"
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP STOCK ADJUSTMENTS VIEW (Hidden < md, Flex >= md)                  */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-5 relative h-full">
        {/* Metric summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <DashboardCard
            title="Pending Approvals"
            value={
              isLoading ? (
                "..."
              ) : (
                <>
                  {pendingApprovalsCount}
                  <span className="text-[75%] font-normal ml-1">Requests</span>
                </>
              )
            }
            className="border border-border"
            // valueStyle="font-header tracking-tight"
            action={<Clock className={`${pendingApprovalsCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/50"} h-5 w-5 `} />}
          />
          <DashboardCard
            title="Total Written Off"
            value={
              isLoading ? (
                "..."
              ) : (
                <>
                  {totalWrittenOffMonth}
                  <span className="text-[75%] font-normal ml-1">units</span>
                </>
              )
            }
            className="border border-border"
            valueStyle="text-foreground xl:text-2xl font-semibold"
            action={<AlertTriangle className="text-muted-foreground/50 h-5 w-5" />}
          />
          <DashboardCard
            title="Total Adjustments"
            value={
              isLoading ? (
                "..."
              ) : (
                <>
                  {totalAdjustmentsMonth}
                  <span className="text-[75%] font-normal ml-1">logged</span>
                </>
              )
            }
            className="border border-border"
            // valueStyle="font-header !tracking-tighter"
            action={<ArrowRightLeft className="h-5 w-5 text-muted-foreground/50" />}
          />
        </div>

        {/* Dynamic Content: Tabs if there are pending approvals, or direct table if none */}
        {pendingItems.length > 0 ? (
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList variant="top" className="w-full mb-5">
              <TabsTrigger 
                value="awaiting" 
                badge={pendingItems.length}
                className="gap-2 font-semibold"
              >
                Awaiting Approval
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="font-semibold"
              >
                Adjustment Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="awaiting" className="w-full mt-0">
              <EnhancedTableComponent
                columns={pendingColumns}
                rows={pendingRows}
                isLoading={isLoading}
                showSearch={false}
                showTopContent={false}
                showFilter={false}
                showDateFilter={false}
                showAddButton={false}
                onRefresh={fetchAdjustments}
                onclick={handleRowClick}
                mobileFriendly={true}
              />
            </TabsContent>

            <TabsContent value="logs" className="w-full mt-0">
              <EnhancedTableComponent
                columns={columns}
                rows={rows}
                isLoading={isLoading}
                serverPagination={pagination}
                onPageChange={(page) => fetchAdjustments(page)}
                onRefresh={() => fetchAdjustments(1)}
                showSearch={true}
                searchPlaceholder="Search product variant, SKU, reason, or notes..."
                searchValue={tableSearchQuery}
                onSearchChange={setTableSearchQuery}
                showFilter={true}
                filterLabel="Status"
                filterOptions={[
                  { uid: "all", name: "All Statuses" },
                  { uid: "approved", name: "Approved" },
                  { uid: "pending", name: "Pending" },
                  { uid: "rejected", name: "Rejected" },
                ]}
                filterValue={statusFilterSelection}
                onFilterChange={(keys: any) => setStatusFilterSelection(keys)}
                additionalFilters={[
                  {
                    label: "Type",
                    options: [
                      { uid: "all", name: "All Types" },
                      { uid: "addition", name: "Added (+)" },
                      { uid: "reduction", name: "Reduced (-)" },
                    ],
                    value: typeFilter,
                    onChange: (keys: any) => setTypeFilter(keys),
                  },
                ]}
                showDateFilter={true}
                dateFilterValue={dateFilter}
                onDateFilterChange={setDateFilter}
                showAddButton={false}
                onclick={handleRowClick}
                mobileFriendly={true}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <EnhancedTableComponent
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            serverPagination={pagination}
            onPageChange={(page) => fetchAdjustments(page)}
            onRefresh={() => fetchAdjustments(1)}
            showSearch={true}
            searchPlaceholder="Search product variant, SKU, reason, or notes..."
            searchValue={tableSearchQuery}
            onSearchChange={setTableSearchQuery}
            showFilter={true}
            filterLabel="Status"
            filterOptions={[
              { uid: "all", name: "All Statuses" },
              { uid: "approved", name: "Approved" },
              { uid: "pending", name: "Pending" },
              { uid: "rejected", name: "Rejected" },
            ]}
            filterValue={statusFilterSelection}
            onFilterChange={(keys: any) => setStatusFilterSelection(keys)}
            additionalFilters={[
              {
                label: "Type",
                options: [
                  { uid: "all", name: "All Types" },
                  { uid: "addition", name: "Added (+)" },
                  { uid: "reduction", name: "Reduced (-)" },
                ],
                value: typeFilter,
                onChange: (keys: any) => setTypeFilter(keys),
              },
            ]}
            showDateFilter={true}
            dateFilterValue={dateFilter}
            onDateFilterChange={setDateFilter}
            showAddButton={false}
            classNames={{
              base: "min-h-[300px]"
            }}
            onclick={handleRowClick}
            mobileFriendly={true}
          />
        )}
      </div>

      {/* DETAIL MODAL / SHEET: View Single Adjustment */}
      <CustomModal
        isOpen={isDetailModalOpen}
        onOpenChange={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailAdj(null);
        }}
        size={selectedDetailAdj?.status === "pending" ? "lg" : "md"}
        header={
          <div className="pt-2 px2 border-b border-border/50 pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {/* <FileText className="h-5 w-5 text-primary" /> */}
              Adjustment Details
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Review full details and authorize or reject this request.
            </p>
          </div>
        }
        body={
          selectedDetailAdj ? (
            <div className="space-y-4 pb-6">
              <div className="pb-4 pt-2 px-3 bg-muted/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-foreground capitalize">{selectedDetailAdj.variant_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{selectedDetailAdj.sku}</p>
                  </div>
                  <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                    selectedDetailAdj.status === "approved"
                      ? "text-green-600 bg-green-400/10 border-green-500/20"
                      : selectedDetailAdj.status === "rejected"
                        ? "text-destructive bg-destructive/10 border-destructive/20"
                        : "text-amber-600 bg-amber-500/10 border-amber-500/20"
                  }`}>
                    {selectedDetailAdj.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Adjustment Quantity</span>
                    <PackagingStockDisplay
                      quantity={selectedDetailAdj.quantity}
                      baseUnitName={selectedDetailAdj.base_unit_name || "units"}
                      showPrefixSign={true}
                      customBreakdown={
                        selectedDetailAdj.package_quantity && selectedDetailAdj.packaging_tier_name
                          ? `${selectedDetailAdj.package_quantity} ${selectedDetailAdj.packaging_tier_name}`
                          : undefined
                      }
                      primaryClassName="font-bold text-sm text-foreground font-mono"
                      tierClassName="text-[11px] text-muted-foreground font-mono mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Reason</span>
                    <span className="font-semibold text-foreground capitalize">
                      {reasonLabels[selectedDetailAdj.reason] || selectedDetailAdj.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Initiated By</span>
                  <span className="font-medium text-foreground">{selectedDetailAdj.initiated_by_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Approved / Handled By</span>
                  <span className="font-medium text-foreground">{selectedDetailAdj.approved_by_name || "—"}</span>
                </div>
                {selectedDetailAdj.approved_at && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Authorized At</span>
                    <span className="font-medium text-foreground">{format(new Date(selectedDetailAdj.approved_at), "MMM dd, yyyy h:mm a")}</span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-muted-foreground block mb-1">Notes / Remarks:</span>
                  <p className="text-foreground bg-muted/30 p-2.5 rounded-md font-normal">
                    {selectedDetailAdj.notes || "No additional notes provided."}
                  </p>
                </div>
                {selectedDetailAdj.status === "rejected" && selectedDetailAdj.rejection_note && (
                  <div className="pt-1">
                    <span className="text-destructive font-semibold block mb-1">Rejection Reason:</span>
                    <p className="text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
                      {selectedDetailAdj.rejection_note}
                    </p>
                  </div>
                )}
              </div>

              {selectedDetailAdj.status === "pending" && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button 
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenPinModal(selectedDetailAdj, "reject");
                    }}
                    variant="ghost" 
                    className="border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold"
                  >
                    Reject Request
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenPinModal(selectedDetailAdj, "approve");
                    }}
                    className="text-xs font-semibold"
                  >
                    Authorize with PIN
                  </Button>
                </div>
              )}
            </div>
          ) : null
        }
        footer={null}
      />

      {/* PIN / AUTHORIZATION MODAL: Manager approvals */}
      <CustomModal
        isOpen={isPinModalOpen}
        onOpenChange={() => {
          setIsPinModalOpen(false);
          setSelectedAdj(null);
        }}
        size="md"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              {/* <KeyRound className="h-5 w-5 text-primary" /> */}
              {pinActionType === "approve" ? "Manager Authorization" : "Reject Adjustment"}
            </h2>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {pinActionType === "approve" 
                ? "Enter your 4-digit POS / Manager PIN to authorize this stock change."
                : "Provide explanatory notes for rejecting this adjustment request."
              }
            </p>
          </div>
        }
        body={
          <div className="p-1 space-y-4 pb-4">
            {/* Displaying target item summary */}
            {selectedAdj && (
              <div className="border border-border/70 rounded-md p-3 bg-muted/20 space-y-1.5 text-xs">
                <div className="flex justify-between items-start">
                  <p className="font-bold capitalize text-foreground text-sm">{selectedAdj.variant_name}</p>
                  {selectedAdj.sku && <span className="font-mono text-muted-foreground text-[11px]">{selectedAdj.sku}</span>}
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">Adjustment:</span>
                  <PackagingStockDisplay
                    quantity={selectedAdj.quantity}
                    baseUnitName={selectedAdj.base_unit_name || "units"}
                    showPrefixSign={true}
                    customBreakdown={
                      selectedAdj.package_quantity && selectedAdj.packaging_tier_name
                        ? `${selectedAdj.package_quantity} ${selectedAdj.packaging_tier_name}`
                        : undefined
                    }
                    primaryClassName="font-bold text-foreground font-mono text-xs"
                    tierClassName="text-[10px] text-muted-foreground font-mono"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="font-medium text-foreground capitalize">{reasonLabels[selectedAdj.reason] || selectedAdj.reason}</span>
                </div>
                {selectedAdj.notes && (
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">Notes: </span>{selectedAdj.notes}
                  </div>
                )}
              </div>
            )}

            {pinActionType === "reject" ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleActionConfirm();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-foreground">
                    Rejection Reason <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    required
                    autoFocus
                    placeholder="Provide explanatory notes on why this request is rejected..."
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="rounded-lg text-sm min-h-[90px]"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-3 border-t border-border/50">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsPinModalOpen(false)} disabled={isProcessingAction}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={isProcessingAction || !rejectionNote.trim()} 
                    className="bg-destructive text-white hover:bg-destructive/90 font-semibold"
                  >
                    {isProcessingAction ? "Rejecting..." : "Confirm Reject"}
                  </Button>
                </div>
              </form>
            ) : (
              <form 
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleActionConfirm();
                }}
                className="space-y-4"
              >
                <div className="space-y-1 py-1">
                  <CustomInputTextField
                    label="ENTER 4-DIGIT SECURITY PIN"
                    labelPlacement="outside"
                    type="text"
                    value={pinCode}
                    onChange={(e: any) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 4) {
                        setPinCode(val);
                      }
                    }}
                    placeholder={showPin ? "0000" : "••••"}
                    height="h-12"
                    endContent={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPin((prev) => !prev)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors focus:outline-none"
                        title={showPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    inputProps={{
                      autoComplete: "off",
                      name: "manager_auth_pin",
                      "data-1p-ignore": "true",
                      "data-lpignore": "true",
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                      maxLength: 4,
                      autoFocus: true,
                      style: { WebkitTextSecurity: showPin ? "none" : "disc" } as React.CSSProperties,
                      className: "text-center text-2xl tracking-[0.4em] font-mono font-bold rounded-lg border-border",
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Authorizing with your staff / manager account
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 justify-end pt-3 border-t border-border/50">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsPinModalOpen(false)} disabled={isProcessingAction}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={isProcessingAction || pinCode.length !== 4} 
                    className="min-w-[110px] font-semibold"
                  >
                    {isProcessingAction ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Authorize"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        }
        footer={null}
      />
    </PageLayout>
  );
}
