import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import EnhancedTableComponent from "@/components/shared/MainTableComponent";

import DashboardCard from "@/components/ui/dashboard-card";
import { CurrencyDisplay } from "@/hooks";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { format, startOfToday, endOfToday } from "date-fns";
import { DateFilterValue } from "@/components/shared/custom-only-date-filter";
import TransactionSidePanel from "@/components/pos/TransactionSidePanel";
import TransactionRefundModal from "@/components/pos/TransactionRefundModal";
import CustomModal from "@/components/modals/modal";
import { useAuthStore } from "@/store/authStore";
import { useFeaturesStore } from "@/store/featuresStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { 
  X, 
  ShoppingCart, 
  ShoppingBag, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  AlertCircle, 
  RotateCcw, 
  RefreshCw,
  Users,
  Clock,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from "@/components/mobile-dashboard";

export default function Transactions() {
  const navigate = useNavigate();
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === "cashier";

  const getEmptyStateTitle = () => {
    const activeRange = dateFilter.active;

    switch (activeRange) {
      case "today":
        return "No transactions today";
      case "yesterday":
        return "No transactions yesterday";
      case "this_week":
        return "No transactions this week";
      case "last_week":
        return "No transactions last week";
      case "this_month":
        return "No transactions this month";
      case "last_month":
        return "No transactions last month";
      case "this_year":
        return "No transactions this year";
      case "last_year":
        return "No transactions last year";
      case "all_time":
        return "No transactions found";
      default:
        return "No transactions for this date range";
    }
  };

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [paymentFilter, setPaymentFilter] = useState<any>(new Set(["all"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: "today",
    start_date: startOfToday(),
    end_date: endOfToday(),
  });

  const handleSelectPaymentFilter = useCallback(
    (method: string) => {
      const current = Array.from(paymentFilter as Set<string>)[0];
      if (current === method) return;
      setPaymentFilter(new Set([method]));
    },
    [paymentFilter],
  );

  // Receipt Side Panel & Refund State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isMobileCashiersOpen, setIsMobileCashiersOpen] = useState(false);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleRefundSuccess = () => {
    setIsRefundModalOpen(false);
    setIsReceiptOpen(false);
    fetchTransactions();
  };

  const [serverSummary, setServerSummary] = useState<any>(null);

  const CACHE_KEY_TRANSACTIONS = "pos_transactions_cache";
  const CACHE_KEY_SUMMARY = "pos_transactions_summary_cache";

  const { queue: offlineQueue } = useOfflineQueueStore();
  const { isOnline } = useNetworkStatus();
  const tenant = useAuthStore((state) => state.tenant);
  const { storeSettings } = useSettingsStore();

  const fetchTransactions = useCallback(async (pageNumber: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const methodArr =
        paymentFilter === "all"
          ? ["all"]
          : Array.from(paymentFilter as Set<string>);
      let url = `/pos/transactions?page=${pageNumber}&per_page=20`;
      if (methodArr[0] !== "all") {
        url += `&payment_method=${methodArr[0]}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (isCashier) {
        url += `&start_date=${startOfToday().toISOString()}`;
        url += `&end_date=${endOfToday().toISOString()}`;
        if (staffUser?.name) {
          url += `&cashier_name=${encodeURIComponent(staffUser.name)}`;
        }
      } else {
        if (dateFilter.start_date) {
          url += `&start_date=${dateFilter.start_date.toISOString()}`;
        }
        if (dateFilter.end_date) {
          url += `&end_date=${dateFilter.end_date.toISOString()}`;
        }
      }
      const response = await apiClient.get(url);
      const data = response.data.success?.data?.transactions || [];
      const summaryData = response.data.success?.data?.summary || null;
      const pag = response.data.success?.data?.pagination || null;
      setServerSummary(summaryData);
      setPagination(pag);
      
      // Update local storage cache for offline resilience
      if (!append) {
        try {
          localStorage.setItem(CACHE_KEY_TRANSACTIONS, JSON.stringify(data));
          if (summaryData) localStorage.setItem(CACHE_KEY_SUMMARY, JSON.stringify(summaryData));
        } catch (storageErr) {
          console.error("Failed to cache transactions in localStorage:", storageErr);
        }
      }

      if (append) {
        setTransactions((prev) => [...prev, ...data]);
      } else {
        setTransactions(data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      // Restore from offline cache if available
      try {
        const cachedTx = localStorage.getItem(CACHE_KEY_TRANSACTIONS);
        const cachedSum = localStorage.getItem(CACHE_KEY_SUMMARY);
        if (cachedTx) {
          setTransactions(JSON.parse(cachedTx));
          if (cachedSum) setServerSummary(JSON.parse(cachedSum));
          if (!isOnline) {
            toast("Working Offline: Showing cached records", { icon: "📡" });
          }
          return;
        }
      } catch (cacheErr) {
        console.error("Failed to load cached transactions:", cacheErr);
      }
      toast.error("Failed to load transaction history");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [paymentFilter, searchQuery, dateFilter, isCashier, staffUser, isOnline]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !pagination?.hasNext) return;
    const nextPage = (pagination?.page || 1) + 1;
    fetchTransactions(nextPage, true);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(1), 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Map offline queue items into unified transaction shape
  const offlineTransactions = useMemo(() => {
    return offlineQueue
      .filter((tx) => tx.syncStatus !== "synced")
      .map((tx) => {
        const payload = tx.payload || {};
        const items = payload.items || [];
        const total = payload.total ?? items.reduce((sum: number, it: any) => sum + ((it.unit_price || it.unitPrice || 0) * (it.quantity || 1)), 0);
        const dateCreated = tx.createdAt || payload.offlineCreatedAt || new Date().toISOString();

        return {
          id: tx.localId,
          localId: tx.localId,
          orderNumber: payload.orderNumber || `OFFLINE-${tx.localId.slice(0, 8).toUpperCase()}`,
          date_created: dateCreated,
          cashierName: payload.cashierName || staffUser?.name || "Cashier",
          payment_method: payload.paymentMethod || "cash",
          total: total,
          status: "offline_pending",
          syncStatus: tx.syncStatus,
          failureReason: tx.failureReason,
          isOffline: true,
          items: items,
          subtotal: payload.subtotal ?? total,
          discount: payload.discount || 0,
          tax: payload.tax,
          customerName: payload.customerName || payload.customerDetails?.name,
          customerPhone: payload.customerPhone || payload.customerDetails?.phone,
          rawTx: tx,
        };
      });
  }, [offlineQueue, staffUser]);

  // Filter offline queue based on active payment filter, search query, and date range
  const filteredOfflineTransactions = useMemo(() => {
    const currentMethod = Array.from(paymentFilter as Set<string>)[0] || "all";
    const query = searchQuery.trim().toLowerCase();

    return offlineTransactions.filter((tx) => {
      // Payment filter
      if (currentMethod !== "all") {
        if (currentMethod === "mobile_money") {
          if (!tx.payment_method.includes("money")) return false;
        } else if (tx.payment_method !== currentMethod) {
          return false;
        }
      }

      // Search query
      if (query) {
        const matchesOrder = tx.orderNumber.toLowerCase().includes(query);
        const matchesCashier = tx.cashierName.toLowerCase().includes(query);
        const matchesCustomer = tx.customerName?.toLowerCase().includes(query);
        const matchesMethod = tx.payment_method.toLowerCase().includes(query);
        if (!matchesOrder && !matchesCashier && !matchesCustomer && !matchesMethod) {
          return false;
        }
      }

      // Date range filter
      if (!isCashier && dateFilter.start_date && dateFilter.end_date) {
        const txDate = new Date(tx.date_created).getTime();
        const start = new Date(dateFilter.start_date).getTime();
        const end = new Date(dateFilter.end_date).getTime();
        if (txDate < start || txDate > end) return false;
      }

      return true;
    });
  }, [offlineTransactions, paymentFilter, searchQuery, isCashier, dateFilter]);

  // Combine offline items at top with server transactions
  const displayTransactions = useMemo(() => {
    const existingOrderNumbers = new Set(transactions.map((t) => t.orderNumber || t.id));
    const uniqueOffline = filteredOfflineTransactions.filter((t) => !existingOrderNumbers.has(t.orderNumber));
    return [...uniqueOffline, ...transactions];
  }, [filteredOfflineTransactions, transactions]);

  const handleViewReceipt = async (transactionId: string) => {
    const offlineTx = offlineTransactions.find((t) => t.id === transactionId);
    if (offlineTx) {
      const effectiveStoreName = storeSettings?.name || tenant?.business_name || tenant?.name || "";
      const payload = offlineTx.rawTx?.payload || {};
      setSelectedReceiptData({
        orderNumber: offlineTx.orderNumber,
        receiptNumber: offlineTx.orderNumber,
        date: offlineTx.date_created,
        cashierName: offlineTx.cashierName,
        paymentMethod: offlineTx.payment_method,
        momoNumber: payload.momoNumber,
        subtotal: offlineTx.subtotal ?? offlineTx.total,
        total: offlineTx.total,
        totalAmount: offlineTx.total,
        amountTendered: payload.amountTendered,
        changeGiven: Math.max(0, (payload.amountTendered || 0) - offlineTx.total),
        discount: offlineTx.discount,
        tax: offlineTx.tax,
        items: offlineTx.items,
        storeName: effectiveStoreName,
        isOffline: true,
      });
      setIsReceiptOpen(true);
      return;
    }

    try {
      console.log("handleViewReceipt called with:", transactionId);
      const response = await apiClient.get(
        `/pos/transactions/${transactionId}/receipt`,
      );
      console.log("API response:", response.data);
      setSelectedReceiptData(response.data.success?.data?.receipt);
      setIsReceiptOpen(true);
    } catch (error) {
      console.error("Failed to fetch receipt:", error);
      toast.error("Could not load receipt data");
    }
  };

  // Summary stats derived from backend global aggregate or fallback
  const { posSettings, getEffectivePaymentMethods } = useFeaturesStore();
  const effectiveMethods = getEffectivePaymentMethods();
  const isPaystackEnabled = posSettings.pos_paystack_enabled ?? true;

  const stats = useMemo(() => {
    // Offline contributions
    const offlineTotal = filteredOfflineTransactions.reduce((s, t) => s + (t.total || 0), 0);
    const offlineCount = filteredOfflineTransactions.length;
    const offlineCash = filteredOfflineTransactions.filter(t => t.payment_method === 'cash').reduce((s, t) => s + (t.total || 0), 0);
    const offlineMomoAuto = filteredOfflineTransactions.filter(t => t.payment_method === 'mobile_money').reduce((s, t) => s + (t.total || 0), 0);
    const offlineMomoManual = filteredOfflineTransactions.filter(t => t.payment_method === 'mobile_money_manual').reduce((s, t) => s + (t.total || 0), 0);
    const offlineCard = filteredOfflineTransactions.filter(t => t.payment_method === 'card').reduce((s, t) => s + (t.total || 0), 0);
    const offlineCredit = filteredOfflineTransactions.filter(t => t.payment_method === 'credit').reduce((s, t) => s + (t.total || 0), 0);

    if (serverSummary && !searchQuery.trim()) {
      const net = (serverSummary.net_sales || 0) + offlineTotal;
      const count = (serverSummary.completed_count || 0) + offlineCount;
      return {
        total: net,
        grossTotal: (serverSummary.gross_sales || 0) + offlineTotal,
        refundTotal: serverSummary.total_refunds || 0,
        completedCount: count,
        refundedCount: serverSummary.refunded_count || 0,
        count: count,
        avg: count > 0 ? net / count : 0,
        cashTotal: (serverSummary.payment_breakdown?.cash || 0) + offlineCash,
        momoAutomatedTotal: (serverSummary.payment_breakdown?.mobile_money || 0) + offlineMomoAuto,
        momoManualTotal: (serverSummary.payment_breakdown?.mobile_money_manual || 0) + offlineMomoManual,
        cardTotal: (serverSummary.payment_breakdown?.card || 0) + offlineCard,
        creditTotal: (serverSummary.payment_breakdown?.credit || 0) + offlineCredit,
        topCashier: serverSummary.top_cashier || "None",
        topCashierSales: serverSummary.top_cashier_sales || 0,
      };
    }

    const netTransactions = displayTransactions.filter(
      (t) => t.status !== "refunded" && t.status !== "voided",
    );
    const refundedTransactions = displayTransactions.filter(
      (t) => t.status === "refunded",
    );

    const total = netTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const refundTotal = refundedTransactions.reduce(
      (sum, t) => sum + (t.total || 0),
      0,
    );
    const grossTotal = total + refundTotal;

    const completedCount = netTransactions.length;
    const refundedCount = refundedTransactions.length;
    const count = completedCount;

    const avg = count > 0 ? total / count : 0;
    const cashTotal = netTransactions
      .filter((t) => t.payment_method === "cash")
      .reduce((s, t) => s + (t.total || 0), 0);
    const momoAutomatedTotal = netTransactions
      .filter((t) => t.payment_method === "mobile_money")
      .reduce((s, t) => s + (t.total || 0), 0);
    const momoManualTotal = netTransactions
      .filter((t) => t.payment_method === "mobile_money_manual")
      .reduce((s, t) => s + (t.total || 0), 0);
    const cardTotal = netTransactions
      .filter((t) => t.payment_method === "card")
      .reduce((s, t) => s + (t.total || 0), 0);
    const creditTotal = netTransactions
      .filter((t) => t.payment_method === "credit")
      .reduce((s, t) => s + (t.total || 0), 0);

    return {
      total,
      grossTotal,
      refundTotal,
      completedCount,
      refundedCount,
      count,
      avg,
      cashTotal,
      momoAutomatedTotal,
      momoManualTotal,
      cardTotal,
      creditTotal,
      topCashier: "None",
      topCashierSales: 0,
    };
  }, [serverSummary, displayTransactions, filteredOfflineTransactions, searchQuery]);

  const paymentBreakdownList = useMemo(() => {
    const definitions = [
      { key: "cash", label: "Cash", color: "bg-green-500", total: stats.cashTotal },
      { key: "mobile_money", label: "MoMo (Automated)", color: "bg-blue-500", total: stats.momoAutomatedTotal },
      { key: "mobile_money_manual", label: "MoMo (Manual)", color: "bg-amber-500", total: stats.momoManualTotal },
      { key: "card", label: "Card", color: "bg-purple-500", total: stats.cardTotal },
      { key: "credit", label: "Credit Sales", color: "bg-rose-500", total: stats.creditTotal },
    ];

    return definitions.filter((item) => {
      // Always include if there are transactions for this method in current view
      if (item.total > 0) return true;

      // Otherwise filter based on active settings
      if (item.key === "mobile_money_manual") return !isPaystackEnabled && effectiveMethods.includes("mobile_money");
      if (item.key === "mobile_money") return isPaystackEnabled && effectiveMethods.includes("mobile_money");
      return effectiveMethods.includes(item.key);
    });
  }, [stats, effectiveMethods, isPaystackEnabled]);

  const cashierStats = useMemo(() => {
    const map: Record<string, number> = {};
    const netTransactions = displayTransactions.filter(
      (t) => t.status !== "refunded" && t.status !== "voided",
    );
    netTransactions.forEach((t) => {
      const name = t.cashierName || "Unknown";
      map[name] = (map[name] || 0) + (t.total || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [displayTransactions]);

  const topSellingItem = useMemo(() => {
    if (serverSummary && serverSummary.top_selling_item !== undefined && offlineTransactions.length === 0) {
      if (!serverSummary.top_selling_item) return null;
      return {
        name: serverSummary.top_selling_item.name,
        variant_name: serverSummary.top_selling_item.variant_name,
        full_name: serverSummary.top_selling_item.full_name || serverSummary.top_selling_item.name,
        qty: serverSummary.top_selling_item.quantity,
        revenue: serverSummary.top_selling_item.revenue,
      };
    }

    // Derive top selling item from loaded and offline transactions at variant granularity
    const itemMap: Record<string, { name: string; variant_name?: string; full_name: string; qty: number; revenue: number; latest: number }> = {};
    const netTransactions = displayTransactions.filter(
      (t) => t.status !== "refunded" && t.status !== "voided",
    );
    netTransactions.forEach((t) => {
      const txTime = t.date_created ? new Date(t.date_created).getTime() : 0;
      (t.items || []).forEach((item: any) => {
        const pName = (item.productName || item.name || "").trim();
        const vName = (item.variantName || item.variant_name || "").trim() || undefined;
        const vId = item.variantId || item.variant_id;
        const groupKey = vId || (vName ? `${pName} - ${vName}` : pName);
        const fullName = vName ? `${pName} (${vName})` : pName;
        const qty = Number(item.quantity || item.qty || 0);
        const unitPrice = Number(item.unitPrice || item.price || item.unit_price || 0);
        const revenue = Number(item.subtotal ?? (unitPrice * qty));

        if (groupKey && qty > 0) {
          if (!itemMap[groupKey]) {
            itemMap[groupKey] = {
              name: pName,
              variant_name: vName,
              full_name: fullName,
              qty: 0,
              revenue: 0,
              latest: txTime,
            };
          }
          itemMap[groupKey].qty += qty;
          itemMap[groupKey].revenue += revenue;
          if (txTime > itemMap[groupKey].latest) {
            itemMap[groupKey].latest = txTime;
          }
        }
      });
    });

    const sorted = Object.values(itemMap).sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.latest - a.latest;
    });

    if (sorted.length > 0) {
      return sorted[0];
    }

    return null;
  }, [serverSummary, displayTransactions, offlineTransactions.length]);

  const isCashierFiltered = useMemo(() => {
    if (isCashier || !searchQuery) return false;
    return cashierStats.some(
      (c) => searchQuery.toLowerCase() === c.name.toLowerCase(),
    );
  }, [isCashier, searchQuery, cashierStats]);

  const columns = useMemo(() => {
    const cols = [
      { key: "receipt_number", label: "Receipt No." },
      { key: "date", label: "Date & Time" },
    ];
    if (!isCashier) {
      cols.push({ key: "cashier", label: "Cashier" });
    }
    cols.push(
      { key: "payment_method", label: "Payment Method" },
      { key: "amount", label: "Total Amount" },
    );
    return cols;
  }, [isCashier]);

  const rows = displayTransactions.map((t: any) => ({
    id: t.id,
    receipt_number: (
      <span className="text-[13.5px] font-medium ">
        {t.orderNumber || t.id?.slice(0, 8)?.toUpperCase()}
      </span>
    ),
    date: t.date_created
      ? format(new Date(t.date_created), "MMM dd, yyyy h:mm a")
      : "N/A",
    cashier: t.cashierName || "Unknown",
    payment_method: (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          t.payment_method === 'mobile_money_manual'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : t.payment_method === 'mobile_money'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-muted text-foreground'
        }`}>
          {t.payment_method === 'mobile_money_manual' ? 'MoMo (Manual)' : t.payment_method?.replace("_", " ")}
        </span>
        {t.isOffline ? (
          t.syncStatus === 'failed' ? (
            <span className="capitalize inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20" title={t.failureReason || 'Sync failed'}>
              <AlertCircle className="h-3 w-3" />
              Sync Failed
            </span>
          ) : t.syncStatus === 'syncing' ? (
            <span className="capitalize inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing
            </span>
          ) : (
            <span className="capitalize inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="h-3 w-3" />
              Pending Sync
            </span>
          )
        ) : t.status === "refunded" ? (
          <span className="capitalize inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Refunded
          </span>
        ) : null}
      </div>
    ),
    amount: (
      <span className="font-semibold text-foreground">
        <CurrencyDisplay amount={t.total || 0} />
      </span>
    ),
    rowActions: [
      {
        key: "view_receipt",
        label: "View Receipt",
        icon: "mdi:receipt-text-outline",
      },
      ...(!t.isOffline && t.status !== "refunded"
        ? [
            {
              key: "issue_refund",
              label: "Issue Refund",
              icon: "lucide:rotate-ccw",
              className: "text-destructive font-semibold",
            },
          ]
        : []),
    ],
    __record: t,
  }));

  const handleRowActionClick = async (actionKey: string, row: any) => {
    if (actionKey === "view_receipt") {
      handleViewReceipt(row.id);
    } else if (actionKey === "issue_refund" || actionKey === "process_return") {
      try {
        if (!row.__record?.items || row.__record.items.length === 0) {
          const res = await apiClient.get(`/pos/transactions/${row.id}/receipt`);
          const fullReceipt = res.data.success?.data?.receipt;
          setSelectedReceiptData(fullReceipt || row.__record);
        } else {
          setSelectedReceiptData(row.__record);
        }
        setIsRefundModalOpen(true);
      } catch (err) {
        console.error("Failed to load receipt details for refund:", err);
        setSelectedReceiptData(row.__record);
        setIsRefundModalOpen(true);
      }
    }
  };

  const handleRowClick = (key: any) => {
    handleViewReceipt(key);
  };

  return (
    <PageLayout
      title={isCashier ? `POS Transactions` : "POS Transactions"}
      subtitle={isCashier ? `Shift View: ${staffUser?.name}` : null}
      constrainHeight={true}
    >

      {/* ========================================================================= */}
      {/* MOBILE TRANSACTIONS VIEW (ZEN-Inspired Design - Block < md, Hidden >= md) */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper>
        {/* 1. Hero Balance / Revenue Card + Metric Carousel */}
        <MobileHeroCard
          title={isCashier ? "My Sales" : "Total Sales"}
          badge={dateFilter.active?.replace('_', ' ') || 'Today'}
          value={<CurrencyDisplay amount={stats.total} className="!tracking-normal"/>}
          isLoading={isLoading}
        >
          <MobileMetricPill
            title="Orders"
            value={stats.completedCount}
            // subtitle="Completed"
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
            iconColorClass="bg-blue-500/5 text-blue-500"
            isLoading={isLoading}
            onClick={() => handleSelectPaymentFilter("all")}
          />

          <MobileMetricPill
            title="Cash"
            value={<CurrencyDisplay amount={stats.cashTotal} symbolClassName="text-muted-foreground text-xs" />}
            // subtitle="Cash volume"
            icon={<Banknote className="h-3.5 w-3.5" />}
            iconColorClass="bg-emerald-500/5 text-emerald-500"
            isLoading={isLoading}
            onClick={() => handleSelectPaymentFilter("cash")}
          />

          <MobileMetricPill
            title="MoMo"
            value={<CurrencyDisplay amount={stats.momoAutomatedTotal + stats.momoManualTotal} symbolClassName="text-muted-foreground text-xs" />}
            // subtitle="Mobile Money"
            icon={<Smartphone className="h-3.5 w-3.5" />}
            iconColorClass="bg-amber-500/5 text-amber-500"
            isLoading={isLoading}
            onClick={() => handleSelectPaymentFilter("mobile_money")}
          />

          {stats.cardTotal > 0 && (
            <MobileMetricPill
              title="Card"
              value={<CurrencyDisplay amount={stats.cardTotal} symbolClassName="text-muted-foreground text-xs" />}
              // subtitle="Card sales"
              icon={<CreditCard className="h-3.5 w-3.5" />}
              iconColorClass="bg-purple-500/5 text-purple-500"
              isLoading={isLoading}
              onClick={() => handleSelectPaymentFilter("card")}
            />
          )}

          {isCashier && topSellingItem && (
            <MobileMetricPill
              title="Top Item"
              value={topSellingItem.name}
              subtitle={
                topSellingItem.variant_name
                  ? `${topSellingItem.variant_name} • ${topSellingItem.qty} sold`
                  : `${topSellingItem.qty} sold`
              }
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
              iconColorClass="bg-purple-500/5 text-purple-500"
              isLoading={isLoading}
            />
          )}

          {!isCashier && cashierStats.length > 0 && (
            <MobileMetricPill
              title="Top Cashier"
              value={cashierStats[0]?.name || "N/A"}
              subtitle={
                cashierStats[0] ? (
                  <span className="flex items-center gap-1">
                    <CurrencyDisplay amount={cashierStats[0].total} symbolClassName="mr-0.5" /> sold
                  </span>
                ) : undefined
              }
              icon={<Users className="h-3.5 w-3.5" />}
              iconColorClass="bg-purple-500/5 text-purple-500"
              isLoading={isLoading}
              onClick={() => setIsMobileCashiersOpen(true)}
            />
          )}

          {stats.refundTotal > 0 && (
            <MobileMetricPill
              title="Refunded"
              value={<CurrencyDisplay amount={stats.refundTotal} />}
              subtitle={`${stats.refundedCount} refund(s)`}
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              iconColorClass="bg-rose-500/10 text-rose-500"
              isLoading={isLoading}
            />
          )}
        </MobileHeroCard>

        {/* 2. Floating Quick Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: isCashier ? "Search receipt number..." : "Search receipt, cashier, or total..."
          }}
          dateFilterConfig={
            !isCashier
              ? {
                  value: dateFilter,
                  onChange: setDateFilter,
                  showLabelOnMobile: true,
                }
              : undefined
          }
          actions={
            isCashier
              ? [
                  {
                    label: 'Register',
                    icon: <ShoppingCart className="h-3.5 w-3.5" />,
                    onClick: () => navigate('/pos/register'),
                  },
                  {
                    label: 'Returns',
                    icon: <RotateCcw className="h-3.5 w-3.5" />,
                    onClick: () => navigate('/pos/returns'),
                  },
                  {
                    label: 'Refresh',
                    icon: <RefreshCw className="h-3.5 w-3.5" />,
                    onClick: fetchTransactions,
                  },
                ]
              : [
                  {
                    label: 'Cashiers',
                    icon: <Users className="h-3.5 w-3.5" />,
                    onClick: () => setIsMobileCashiersOpen(true),
                  },
                  {
                    label: 'Returns',
                    icon: <RotateCcw className="h-3.5 w-3.5" />,
                    onClick: () => navigate('/pos/returns'),
                  },
                ]
          }
        />

        {/* 3. Transaction Activity Feed Sheet */}
        <MobileActivitySheet
          title="Recent Transactions"
          viewAllLabel="Credit Ledger"
          onViewAll={() => navigate('/pos/credit-ledger')}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'cash', label: 'Cash' },
            { id: 'mobile_money', label: 'MoMo' },
            { id: 'card', label: 'Card' },
            ...(stats.refundedCount > 0 ? [{ id: 'refunded', label: 'Refunds', count: stats.refundedCount }] : []),
          ]}
          activeTab={Array.from(paymentFilter as Set<string>)[0] || 'all'}
          onTabChange={(tabId) => handleSelectPaymentFilter(tabId)}
          hasMore={pagination?.hasNext}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          totalCount={(pagination?.total || 0) + filteredOfflineTransactions.length}
          currentCount={displayTransactions.length}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : displayTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {getEmptyStateTitle()}
            </div>
          ) : (
            displayTransactions.map((tx: any, idx: number) => {
              const amount = tx.total ?? (tx.amount_tendered?.parsedValue || tx.amount_tendered || 0);
              const isRefund = tx.status === 'refunded';
              const method = tx.payment_method || 'cash';
              const isOffline = tx.isOffline;
              
              return (
                <div
                  key={tx.id || idx}
                  onClick={() => handleViewReceipt(tx.id)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      isRefund 
                        ? "bg-rose-500/5 text-rose-500" 
                        : method === 'cash'
                          ? "bg-emerald-500/5 text-emerald-500"
                          : method.includes('money')
                            ? "bg-blue-500/5 text-blue-500"
                            : "bg-purple-500/5 text-purple-500"
                    )}>
                      {isRefund ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground truncate max-w-[150px]">
                        {tx.orderNumber || `TX #${tx.id?.substring(0, 8)}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize fontmono">
                        {method === 'mobile_money_manual' ? 'MoMo (Manual)' : method.replace('_', ' ')} • {tx.date_created ? (isCashier ? format(new Date(tx.date_created), 'hh:mm a') : format(new Date(tx.date_created), 'MMM dd, yyyy hh:mm a')) : 'Today'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-0.5">
                    <span className={cn(
                      "font-extrabold text-[12px] block",
                      isRefund ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                    )}>
                      {isRefund && "-"}
                      <CurrencyDisplay amount={amount} symbolClassName="text-xs" />
                    </span>
                    {isOffline ? (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1",
                        tx.syncStatus === 'failed'
                          ? "bg-red-500/10 text-red-500"
                          : tx.syncStatus === 'syncing'
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {tx.syncStatus === 'failed' ? (
                          <>
                            <AlertCircle className="h-2.5 w-2.5" />
                            Failed
                          </>
                        ) : tx.syncStatus === 'syncing' ? (
                          <>
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                            Syncing
                          </>
                        ) : (
                          <>
                            <Clock className="h-2.5 w-2.5" />
                            Pending Sync
                          </>
                        )}
                      </span>
                    ) : tx.status && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        isRefund ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP TRANSACTIONS VIEW (Hidden < md, Flex >= md)                       */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-6 relative h-full md:h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start">
          <DashboardCard
            title={isCashier ? "My Sales" : "Total Sales"}
            value={isLoading ? "..." : <CurrencyDisplay amount={stats.total} />}
            subvalue={
              stats.refundTotal > 0 ? (
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                  <span>
                    Gross: <CurrencyDisplay amount={stats.grossTotal} symbolClassName="mr-1 font-medium text-muted-foreground" />
                  </span>
                  <span>&bull;</span>
                  <span>
                    Refunded:{" "}
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      <CurrencyDisplay
                        amount={stats.refundTotal}
                        symbolClassName="mr-1 text-rose-600 dark:text-rose-400 font-semibold"
                      />
                    </span>
                  </span>
                </span>
              ) : undefined
            }
            isActive={Array.from(paymentFilter as Set<string>)[0] === "all"}
            onClick={() => handleSelectPaymentFilter("all")}
            collapsibleContent={
              <div className="space-y-2 pt-1">
                {paymentBreakdownList.map((item) => {
                  const share = stats.total > 0 ? Math.min(100, Math.round((item.total / stats.total) * 100)) : 0;
                  const isSelected = Array.from(paymentFilter as Set<string>)[0] === item.key;

                  return (
                    <div
                      key={item.key}
                      className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${isSelected ? "bg-secondary/40" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPaymentFilter(item.key);
                      }}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="text-muted-foreground font-medium text-[11px] md:text-xs">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-foreground text-[11px] md:text-xs">
                          <CurrencyDisplay amount={item.total} showStyling={false}/>
                        </span>
                      </div>
                      <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats.refundTotal > 0 && (
                  <div className="flex flex-col gap-1 p-1.5 rounded bg-rose-500/10 border border-rose-500/15">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px] md:text-xs">
                          Refunded
                        </span>
                      </div>
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] md:text-xs">
                        -<CurrencyDisplay amount={stats.refundTotal} symbolClassName="mr-1" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            }
          />
          <DashboardCard
            title={isCashier ? "My Transactions" : "Transactions"}
            value={isLoading ? "..." : stats.completedCount.toString()}
            subvalue={
              stats.refundedCount > 0
                ? `${stats.completedCount} completed • ${stats.refundedCount} refunded`
                : undefined
            }
          />
          {isCashier ? (
            <DashboardCard
              title="Top Selling Item"
              value={isLoading ? "..." : topSellingItem ? topSellingItem.name : "None yet"}
              subvalue={
                topSellingItem ? (
                  topSellingItem.variant_name ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <span className="font-semibold text-foreground/80">{topSellingItem.variant_name}</span>
                      <span>•</span>
                      <span>{topSellingItem.qty} sold</span>
                    </span>
                  ) : (
                    `${topSellingItem.qty} sold`
                  )
                ) : (
                  "No sales in this period"
                )
              }
              valueStyle={topSellingItem && topSellingItem.name.length > 18 ? "text-lg md:text-xl line-clamp-1" : "line-clamp-1"}
            />
          ) : (
            <DashboardCard
              title="Top Cashier"
              value={isLoading ? "..." : cashierStats[0]?.name || stats.topCashier || "N/A"}
              subvalue={
                cashierStats[0] ? (
                  <CurrencyDisplay amount={cashierStats[0].total} showStyling={false}/>
                ) : stats.topCashierSales > 0 ? (
                  <CurrencyDisplay amount={stats.topCashierSales} showStyling={false}/>
                ) : undefined
              }
              toggleIcon={
                isCashierFiltered ? (
                  <X
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                    }}
                    className="h-4 w-4 text-muted-foreground hover:scale-115 cursor-pointer animate-in fade-in spin-in-12 duration-200"
                  />
                ) : undefined
              }
              collapsibleContent={
                cashierStats.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {cashierStats.map((c) => {
                      const share =
                        stats.total > 0 ? (c.total / stats.total) * 100 : 0;
                      const isSelected =
                        searchQuery.toLowerCase() === c.name.toLowerCase();
                      return (
                        <div
                          key={c.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(isSelected ? "" : c.name);
                          }}
                          className={`flex flex-col gap-1 cursor-pointer p-1.5 rounded hover:bg-muted-foreground/10 transition-colors ${
                            isSelected ? "bg-secondary/40" : ""
                          }`}
                          title={
                            isSelected
                              ? `Clear filter for ${c.name}`
                              : `Filter transactions by ${c.name}`
                          }
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground font-medium text-[11px] md:text-xs">
                              {c.name}
                            </span>
                            <span className="text-foreground text-[11px] md:text-xs">
                              <CurrencyDisplay amount={c.total} showStyling={false} />
                            </span>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-500"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    No cashier activity today.
                  </p>
                )
              }
            />
          )}
        </div>

        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(page) => fetchTransactions(page)}
          title="Transaction History"
          emptyStateTitle={getEmptyStateTitle()}
          emptyStateDescription={
            searchQuery.trim() ||
            Array.from(paymentFilter as Set<string>)[0] !== "all"
              ? "Try clearing the payment filter or search to see more results."
              : "Adjust the date filter if you want to check a different period."
          }
          showSearch={true}
          searchPlaceholder={
            isCashier
              ? "Search by receipt number..."
              : "Search by receipt or cashier..."
          }
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showFilter={true}
          filterLabel="Payment"
          filterOptions={[
            { uid: "all", name: "All Methods" },
            { uid: "cash", name: "Cash" },
            { uid: "mobile_money", name: "Mobile Money" },
            { uid: "mobile_money_manual", name: "MoMo (Manual)" },
            { uid: "card", name: "Card" },
          ]}
          filterValue={paymentFilter}
          onFilterChange={(keys: any) => setPaymentFilter(keys)}
          showDateFilter={!isCashier}
          dateFilterValue={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultDateFilterRange="today"
          showAddButton={false}
          onRefresh={fetchTransactions}
          onRowActionClick={handleRowActionClick}
          onclick={handleRowClick}
          mobileFriendly={true}
        />
      </div>

      {/* Side Panel Drawer */}
      <TransactionSidePanel
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receiptData={selectedReceiptData}
        onReprint={handlePrintReceipt}
        onIssueRefund={() => setIsRefundModalOpen(true)}
      />

      {/* Refund Modal */}
      <TransactionRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        receiptData={selectedReceiptData}
        onSuccess={handleRefundSuccess}
      />

      {/* Mobile Cashiers Performance Modal */}
      <CustomModal
        isOpen={isMobileCashiersOpen}
        onClose={() => setIsMobileCashiersOpen(false)}
        onOpenChange={() => setIsMobileCashiersOpen((prev) => !prev)}
        header={
          <div>
            <h3 className="text-base font-bold text-foreground">Cashier Performance</h3>
            <p className="text-xs text-muted-foreground">Sales leaderboard by cashier staff for this period.</p>
          </div>
        }
        body={
          <div className="space-y-3 py-2 pb-4">
            {cashierStats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No cashier sales recorded for this period.</p>
            ) : (
              cashierStats.map((c) => {
                const share = stats.total > 0 ? Math.min(100, Math.round((c.total / stats.total) * 100)) : 0;
                const isSelected = searchQuery.toLowerCase() === c.name.toLowerCase();

                return (
                  <div
                    key={c.name}
                    onClick={() => {
                      setSearchQuery(isSelected ? "" : c.name);
                      setIsMobileCashiersOpen(false);
                    }}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer",
                      isSelected ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="font-bold text-foreground text-sm">{c.name}</span>
                      <span className="text-foreground font-extrabold text-sm">
                        <CurrencyDisplay amount={c.total} />
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>{share}% of total sales</span>
                      <span className="text-primary font-semibold">
                        {isSelected ? "Active Filter (Tap to clear)" : "Tap to filter"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        }
      />
    </PageLayout>
  );
}
