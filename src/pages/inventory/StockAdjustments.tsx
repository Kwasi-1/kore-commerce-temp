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
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { Selection } from "@nextui-org/react";
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CustomModal from "@/components/modals/modal";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import DashboardCard from "@/components/ui/dashboard-card";
import EnhancedTableComponent, { TableColumn } from "@/components/shared/MainTableComponent";
import { DateFilterValue } from "@/components/shared/custom-only-date-filter";

interface Adjustment {
  id: string;
  variant_id: string;
  variant_name: string;
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

interface Staff {
  id: string;
  name: string;
  role: string;
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
  
  // Table search & filters
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [statusFilterSelection, setStatusFilterSelection] = useState<Selection>(new Set(["all"]));
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
  const [managers, setManagers] = useState<Staff[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [pinCode, setPinCode] = useState("");
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
  const fetchAdjustments = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/tenant/adjustments?per_page=100";
      
      const statusVal = statusFilterSelection instanceof Set 
        ? Array.from(statusFilterSelection)[0] 
        : statusFilterSelection;
        
      if (statusVal && statusVal !== "all") {
        url += `&status=${statusVal}`;
      }

      if (dateFilter.start_date) {
        url += `&start_date=${format(dateFilter.start_date, "yyyy-MM-dd")}T00:00:00Z`;
      }
      if (dateFilter.end_date) {
        url += `&end_date=${format(dateFilter.end_date, "yyyy-MM-dd")}T23:59:59Z`;
      }

      const res = await apiClient.get(url);
      setAdjustments(res.data.success?.data?.adjustments || []);
    } catch (err) {
      console.error("Failed to load adjustments:", err);
      toast.error("Failed to load adjustments history");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilterSelection, dateFilter]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  // Load managers list for PIN authorization
  useEffect(() => {
    apiClient.get("/tenant/staff")
      .then(res => {
        const staffList = res.data.success?.data?.staff || [];
        const managersList = staffList.filter((s: Staff) => s.role === "owner" || s.role === "manager");
        setManagers(managersList);
        if (managersList.length > 0) {
          setSelectedManagerId(managersList[0].id);
        }
      })
      .catch(err => {
        console.error("Failed to load staff:", err);
      });
  }, []);

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
    setRejectionNote("");
    setIsPinModalOpen(true);
  };

  const handlePinKeyPress = (digit: string) => {
    if (pinCode.length < 4) {
      setPinCode(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
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
    if (!tableSearchQuery.trim()) return adjustments;
    const q = tableSearchQuery.toLowerCase();
    return adjustments.filter(a => 
      (a.variant_name && a.variant_name.toLowerCase().includes(q)) ||
      (a.sku && a.sku.toLowerCase().includes(q)) ||
      (a.reason && a.reason.toLowerCase().includes(q)) ||
      (a.notes && a.notes.toLowerCase().includes(q)) ||
      (a.initiated_by_name && a.initiated_by_name.toLowerCase().includes(q))
    );
  }, [adjustments, tableSearchQuery]);

  // EnhancedTableComponent columns definition
  const columns: TableColumn[] = [
    { key: "date", label: "Date" },
    { key: "variant", label: "Product Variant" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Quantity" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
    { key: "initiated_by", label: "Initiated By" },
    { key: "approved_by", label: "Approved By" },
    { key: "notes", label: "Rejection / Notes" },
  ];

  // EnhancedTableComponent rows mapping
  const rows = useMemo(() => {
    return filteredAdjustments.map((item) => ({
      id: item.id,
      date: item.date_created ? format(new Date(item.date_created), "MMM dd, yyyy") : "—",
      variant: <span className="font-semibold text-foreground capitalize">{item.variant_name}</span>,
      sku: <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>,
      quantity: (
        <span className={`font-bold ${item.quantity < 0 ? "text-destructive" : "text-green-500"}`}>
          {item.quantity < 0 ? "" : "+"}{item.quantity} units
        </span>
      ),
      reason: (
        <span className="capitalize text-muted-foreground">
          {reasonLabels[item.reason] || item.reason}
        </span>
      ),
      status: (
        <span className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border ${
          item.status === "approved"
            ? "text-green-600 bg-green-500/10 border-green-500/20"
            : item.status === "rejected"
              ? "text-destructive bg-destructive/10 border-destructive/20"
              : "text-amber-600 bg-amber-500/10 border-amber-500/20 animate-pulse"
        }`}>
          {item.status}
        </span>
      ),
      initiated_by: item.initiated_by_name || "—",
      approved_by: item.approved_by_name || "—",
      notes: (
        <span className="text-muted-foreground max-w-xs truncate block" title={item.notes || item.rejection_note}>
          {item.status === "rejected" && item.rejection_note ? (
            <span className="text-destructive font-semibold">Rejected: {item.rejection_note}</span>
          ) : (
            item.notes || "—"
          )}
        </span>
      ),
      __record: item,
    }));
  }, [filteredAdjustments]);

  return (
    <PageLayout 
      title="Stock Adjustments" 
      constrainHeight={true}
      actions={
        <Button 
          onClick={() => setIsDrawerOpen(true)} 
          className="bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 h-10 text-sm font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Adjustment</span>
        </Button>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
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
            action={<Clock className="h-5 w-5 text-amber-500" />}
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
            valueStyle={totalWrittenOffMonth > 0 ? "text-destructive xl:text-2xl" : "text-foreground xl:text-2xl"}
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
            action={<ArrowRightLeft className="h-5 w-5 text-muted-foreground/50" />}
          />
        </div>

        {/* SECTION 1: Pending Approvals (Manager Panel) */}
        {pendingItems.length > 0 && (
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-2 border-b border-amber-500/15 pb-3">
              <SlidersHorizontal className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-amber-800 dark:text-amber-400">Awaiting Manager PIN Approvals</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground font-semibold border-b border-amber-500/10">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Product Variant</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Adjustment Quantity</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2">Notes</th>
                    <th className="pb-2">Initiated By</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10 text-xs">
                  {pendingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-500/10 transition-colors">
                      <td className="py-3 font-normal text-muted-foreground">
                        {new Date(item.date_created).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-bold text-foreground capitalize">
                        {item.variant_name}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">{item.sku}</td>
                      <td className="py-3">
                        <span className={`font-bold ${item.quantity < 0 ? "text-destructive" : "text-green-500"}`}>
                          {item.quantity < 0 ? "" : "+"}{item.quantity} units
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
                          {reasonLabels[item.reason] || item.reason}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground max-w-xs truncate" title={item.notes}>
                        {item.notes || "—"}
                      </td>
                      <td className="py-3 font-medium text-foreground">{item.initiated_by_name}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => handleOpenPinModal(item, "approve")}
                            className="h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-xs px-3"
                          >
                            Approve
                          </Button>
                          <Button 
                            onClick={() => handleOpenPinModal(item, "reject")}
                            variant="ghost" 
                            className="h-8 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 font-semibold text-xs px-3"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enhanced Table Component */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Adjustments Log"
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
          showDateFilter={true}
          dateFilterValue={dateFilter}
          onDateFilterChange={setDateFilter}
          showAddButton={true}
          addButtonText="New Adjustment"
          onAddButtonClick={() => setIsDrawerOpen(true)}
          onRefresh={fetchAdjustments}
          onclick={handleRowClick}
          mobileFriendly={true}
        />
      </div>

      {/* DRAWER / SHEET: Initiate Stock Adjustment */}
      <CustomModal
        isOpen={isDrawerOpen}
        onOpenChange={() => {
          setIsDrawerOpen(false);
          resetForm();
        }}
        size="md"
        placement="right"
        classNames={{
          base: "sm:w-[450px]"
        }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Record Stock Adjustment
            </h2>
            <p className="text-sm text-muted-foreground font-normal leading-normal mt-2 font-sans !tracking-wide">
              Correct records or report damages. Adjustments require a manager's PIN validation.
            </p>
          </div>
        }
        body={
          <form onSubmit={handleNewAdjustmentSubmit} className="space-y-6 p-2 pb-8">
            {/* Variant Autocomplete Search */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Search className="h-3.5 w-3.5" />
                Search Variant / SKU *
              </label>
              
              {selectedVariant ? (
                <div className="flex items-center justify-between p-3 border rounded-xl bg-primary/5 border-primary/20">
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground capitalize">
                      {selectedVariant.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedVariant.sku}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedVariant(null)} 
                    className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Type product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl h-10 text-sm"
                  />
                  
                  {/* Autocomplete Results Panel */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-[70px] left-0 right-0 border bg-popover rounded-xl shadow-lg z-50 p-2 space-y-1 max-h-56 overflow-y-auto">
                      {searchResults.map((variant) => {
                        const attrStr = variant.variant_attributes
                          ? Object.entries(variant.variant_attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "";
                        return (
                          <div
                            key={variant.variant_id}
                            onClick={() => {
                              setSelectedVariant(variant);
                              setSearchResults([]);
                              setSearchQuery("");
                            }}
                            className="p-2.5 rounded-lg hover:bg-muted cursor-pointer text-left transition-colors flex items-center justify-between border border-transparent hover:border-border"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground capitalize">
                                {variant.product_name} {attrStr && `(${attrStr})`}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {variant.sku}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-foreground">
                              Qty: {variant.stock_quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Read-only Variant Details Block */}
            {selectedVariant && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/20 animate-in fade-in duration-300">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Stock</span>
                  <span className="text-lg font-bold text-foreground">{selectedVariant.stock_quantity} {selectedVariant.base_unit_name || "units"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sell Mode</span>
                  <span className="text-sm font-semibold capitalize text-foreground">{selectedVariant.stock_quantity <= 0 ? "Out of Stock" : "Active"}</span>
                </div>
              </div>
            )}

            {/* Segmented Adjustment type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Adjustment Mode
              </label>
              <div className="grid grid-cols-2 p-1 border bg-muted/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustmentType("reduce")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    adjustmentType === "reduce"
                      ? "bg-destructive text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  }`}
                >
                  Write Off (Reduce)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType("add")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    adjustmentType === "add"
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  }`}
                >
                  Correct Upward (Add)
                </button>
              </div>
            </div>

            {/* Quantity inputs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Adjustment Quantity (Base Units) *
              </label>
              <Input
                type="number"
                min="1"
                required
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(reasonLabels).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            {/* Notes textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Explanatory Notes (Optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Details of audit count correction, damage reason, or shelf expiry location..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {/* Informational banner warning */}
            <div className="flex gap-2.5 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
              <p className="text-[11px] leading-relaxed">
                <strong>Authorization Required:</strong> This adjustment will be logged as <strong>PENDING</strong> and requires a manager's 4-digit PIN verification before stock is physically updated.
              </p>
            </div>

            {/* Bottom Actions footer */}
            <div className="flex gap-3 justify-end pt-4 border-t w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDrawerOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedVariant}
                className="rounded-xl bg-primary text-primary-foreground min-w-[150px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        }
        footer={null}
      />

      {/* DETAIL MODAL / SHEET: View Single Adjustment */}
      <CustomModal
        isOpen={isDetailModalOpen}
        onOpenChange={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailAdj(null);
        }}
        size="md"
        header={
          <div className="pt-2 px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Adjustment Details
            </h2>
            <p className="text-xs text-muted-foreground font-normal">
              Logged on {selectedDetailAdj?.date_created ? format(new Date(selectedDetailAdj.date_created), "MMM dd, yyyy h:mm a") : "—"}
            </p>
          </div>
        }
        body={
          selectedDetailAdj ? (
            <div className="space-y-4 p-2">
              <div className="p-4 border rounded-xl bg-muted/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-foreground capitalize">{selectedDetailAdj.variant_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{selectedDetailAdj.sku}</p>
                  </div>
                  <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${
                    selectedDetailAdj.status === "approved"
                      ? "text-green-600 bg-green-500/10 border-green-500/20"
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
                    <span className={`font-bold text-sm ${selectedDetailAdj.quantity < 0 ? "text-destructive" : "text-green-500"}`}>
                      {selectedDetailAdj.quantity < 0 ? "" : "+"}{selectedDetailAdj.quantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Reason</span>
                    <span className="font-semibold text-foreground capitalize">
                      {reasonLabels[selectedDetailAdj.reason] || selectedDetailAdj.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-xl space-y-2 text-xs">
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
                  <p className="text-foreground bg-muted/30 p-2.5 rounded-lg font-normal">
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
                    className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold"
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

      {/* PIN PAD DIALOG: Manager approvals */}
      <CustomModal
        isOpen={isPinModalOpen}
        onOpenChange={() => {
          setIsPinModalOpen(false);
          setSelectedAdj(null);
        }}
        size="md"
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Manager PIN Authorization
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              {pinActionType === "approve" 
                ? "Authorize stock adjustment. Enter your 4-digit POS PIN."
                : "Reject adjustment request. Provide rejection notes."
              }
            </p>
          </div>
        }
        body={
          <div className="p-2 space-y-5 text-center">
            {/* Displaying target item summaries */}
            {selectedAdj && (
              <div className="border rounded-xl p-3 bg-muted/10 space-y-1 text-left text-xs">
                <p className="font-bold capitalize text-foreground">{selectedAdj.variant_name}</p>
                <p className="text-muted-foreground">Adjustment: <span className={`font-semibold ${selectedAdj.quantity < 0 ? "text-destructive" : "text-green-500"}`}>{selectedAdj.quantity < 0 ? "" : "+"}{selectedAdj.quantity} units</span></p>
                <p className="text-muted-foreground">Reason: <span className="font-semibold">{reasonLabels[selectedAdj.reason] || selectedAdj.reason}</span></p>
              </div>
            )}

            {pinActionType === "reject" ? (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Rejection Reason *
                  </label>
                  <Textarea
                    required
                    placeholder="Provide explanatory notes on why this request is rejected..."
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="ghost" onClick={() => setIsPinModalOpen(false)} disabled={isProcessingAction}>
                    Cancel
                  </Button>
                  <Button onClick={handleActionConfirm} disabled={isProcessingAction || !rejectionNote.trim()} className="bg-destructive text-white hover:bg-destructive/95">
                    {isProcessingAction ? "Rejecting..." : "Confirm Reject"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Selector for verifying manager */}
                <div className="text-left space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    Approving Manager *
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                    {managers.length === 0 && (
                      <option value="">No managers found</option>
                    )}
                  </select>
                </div>

                {/* PIN digits indicators */}
                <div className="flex justify-center gap-4 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-4.5 w-4.5 rounded-full border-2 transition-all ${
                        pinCode.length > idx
                          ? "bg-primary border-primary scale-110"
                          : "bg-transparent border-border"
                      }`}
                    />
                  ))}
                </div>

                {/* PIN Pad 1-9 Grid buttons */}
                <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pb-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinKeyPress(digit)}
                      className="h-14 w-14 rounded-full border bg-muted/40 hover:bg-muted font-bold text-lg text-foreground flex items-center justify-center transition-colors shadow-sm focus:outline-none active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinCode("")}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center focus:outline-none active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinKeyPress("0")}
                    className="h-14 w-14 rounded-full border bg-muted/40 hover:bg-muted font-bold text-lg text-foreground flex items-center justify-center transition-colors shadow-sm focus:outline-none active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center focus:outline-none active:scale-95"
                  >
                    Delete
                  </button>
                </div>

                {/* Submit action */}
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="ghost" onClick={() => setIsPinModalOpen(false)} disabled={isProcessingAction}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleActionConfirm} 
                    disabled={isProcessingAction || pinCode.length !== 4} 
                    className="bg-green-500 hover:bg-green-600 text-white min-w-[120px]"
                  >
                    {isProcessingAction ? (
                      <div className="flex items-center gap-1">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Authorize"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        }
        footer={null}
      />
    </PageLayout>
  );
}
