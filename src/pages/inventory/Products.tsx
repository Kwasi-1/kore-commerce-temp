import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Selection } from "@nextui-org/react";
import PageLayout from "@/components/layout/PageLayout";
import CustomModal from "@/components/modals/modal";
import ProductForm from "@/components/inventory/ProductForm";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { getTierBreakdown, formatQty } from "@/utils/packaging";
import { PackagingStockDisplay } from "@/components/inventory/PackagingStockDisplay";
import {
  Package,
  AlertTriangle,
  XCircle,
  Plus,
  Upload,
  Edit,
  Archive,
  Trash2,
  Loader2,
  Search,
  Layers,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  Globe,
  Store,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { BulkProductUploadModal } from "./components/BulkProductUploadModal";
import { ProductDetailModal } from "@/components/inventory/ProductDetailModal";
import { ProductStatusModal } from "@/components/inventory/ProductStatusModal";
import { ProductChannelModal } from "@/components/inventory/ProductChannelModal";
import { StorefrontCatalogCuratorModal } from "@/components/inventory/StorefrontCatalogCuratorModal";
import { useFeaturesStore } from "@/store/featuresStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import EnhancedTableComponent from "@/components/shared/MainTableComponent";
import DashboardCard from "@/components/ui/dashboard-card";
import { CurrencyDisplay } from "@/hooks";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from "@/components/mobile-dashboard";

export default function Products() {
  const navigate = useNavigate();
  const hasEcommerce = useFeaturesStore((s) => s.hasModule("ecommerce"));
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<Selection>(new Set(["all"]));
  const [categoryFilter, setCategoryFilter] = useState<Selection>(
    new Set(["all"]),
  );
  const [channelFilter, setChannelFilter] = useState<"all" | "online" | "in_store">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<any>(null);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [productToToggleStatus, setProductToToggleStatus] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Sales Channel Modal State
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [productToToggleChannel, setProductToToggleChannel] = useState<any>(null);
  const [isUpdatingChannel, setIsUpdatingChannel] = useState(false);

  // Storefront Catalog Curator Modal State
  const [isCuratorModalOpen, setIsCuratorModalOpen] = useState(false);

  // Mobile Add Product Choice Modal (Single vs Bulk)
  const [isAddChoiceModalOpen, setIsAddChoiceModalOpen] = useState(false);

  // Mobile Channel Filter Modal
  const [isChannelFilterModalOpen, setIsChannelFilterModalOpen] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preferred view mode for table: 'list' (flat variants) vs 'group' (parent product with accordion)
  const [viewMode, setViewMode] = useState<"list" | "group">(() => {
    return (
      (localStorage.getItem(
        "preferred_products_view_mode",
      ) as "list" | "group") || "list"
    );
  });

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pagination & Infinite Scroll State
  const [pagination, setPagination] = useState<any>(null);
  const [serverSummary, setServerSummary] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Accordion expanded keys / IDs for grouped view
  const [expandedProductIds, setExpandedProductIds] = useState<
    Record<string, boolean>
  >({});
  const [productVariantsCache, setProductVariantsCache] = useState<
    Record<string, any[]>
  >({});
  const [loadingVariants, setLoadingVariants] = useState<
    Record<string, boolean>
  >({});

  const fetchProducts = async (pageNumber: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      let url = `/tenant/products?page=${pageNumber}&limit=20`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const statusVal =
        statusFilter instanceof Set
          ? Array.from(statusFilter)[0]
          : statusFilter;
      if (statusVal && statusVal !== "all") url += `&status=${statusVal}`;
      const categoryVal =
        categoryFilter instanceof Set
          ? Array.from(categoryFilter)[0]
          : categoryFilter;
      if (categoryVal && categoryVal !== "all")
        url += `&category=${categoryVal}`;
      if (hasEcommerce && channelFilter !== "all") {
        url += `&channel=${channelFilter}`;
      }

      const response = await apiClient.get(url);
      const data = response.data.success?.data?.products || [];
      const pag = response.data.success?.data?.pagination || null;
      const summaryData = response.data.success?.data?.summary || null;
      setPagination(pag);
      setServerSummary(summaryData);

      if (append) {
        setProducts((prev) => [...prev, ...data]);
      } else {
        setProducts(data);
      }

    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !pagination?.hasNext) return;
    const nextPage = (pagination?.page || 1) + 1;
    fetchProducts(nextPage, true);
  };


  // Fetch all unique categories from the server once (not from paginated product data)
  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/tenant/products/categories');
      const cats = res.data.success?.data?.categories || [];
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, categoryFilter, channelFilter]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setProductVariantsCache({});
    fetchProducts();
  };

  const handleBulkSuccess = () => {
    setProductVariantsCache({});
    fetchProducts();
  };

  const handleEdit = (product: any) => {
    navigate(`/inventory/products/${product.id}/edit`);
  };

  const openNewProduct = () => {
    navigate("/inventory/products/new");
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenant/products/${productToDelete.id}`);
      toast.success("Product deleted successfully");
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!productToToggleStatus) return;
    const isVariant = Boolean(productToToggleStatus.isVariant);

    if (isVariant) {
      const isCurrentlyActive =
        productToToggleStatus.isActive !== false &&
        productToToggleStatus.is_active !== false;
      const targetActive = !isCurrentlyActive;

      setIsUpdatingStatus(true);
      try {
        await apiClient.patch(
          `/tenant/products/variants/${productToToggleStatus.id}/status`,
          { is_active: targetActive }
        );
        toast.success(
          `Variant marked as ${targetActive ? "Active" : "Inactive"}`
        );
        setIsStatusModalOpen(false);
        setProductToToggleStatus(null);
        fetchProducts();
      } catch (error) {
        toast.error("Failed to update variant status");
      } finally {
        setIsUpdatingStatus(false);
      }
      return;
    }

    const isActive = productToToggleStatus.status
      ? productToToggleStatus.status.toLowerCase() === "active"
      : productToToggleStatus.is_active !== false;
    const newStatus = isActive ? "draft" : "active";

    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/tenant/products/${productToToggleStatus.id}/status`, {
        status: newStatus,
      });
      toast.success(`Product marked as ${newStatus}`);
      setIsStatusModalOpen(false);
      setProductToToggleStatus(null);
      if (selectedProductForDetail?.id === productToToggleStatus.id) {
        setSelectedProductForDetail((prev: any) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                is_active: newStatus === "active",
              }
            : null
        );
      }
      fetchProducts();
    } catch (error) {
      toast.error("Failed to update product status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRowClick = (key: any) => {
    const row = tableRows.find((r) => (r.id || r.key) === key);
    if (row?.__record) {
      setSelectedProductForDetail(row.__record);
      setIsDetailModalOpen(true);
    }
  };

  const promptToggleChannel = (product: any) => {
    setProductToToggleChannel(product);
    setIsChannelModalOpen(true);
  };

  const handleConfirmChannelToggle = async () => {
    if (!productToToggleChannel) return;
    const isVariant = Boolean(productToToggleChannel.isVariant);
    const currentOnline =
      productToToggleChannel.is_available_online !== false &&
      productToToggleChannel.isAvailableOnline !== false;
    const newStatus = !currentOnline;

    setIsUpdatingChannel(true);
    try {
      if (isVariant) {
        await apiClient.post("/tenant/products/bulk-channel", {
          variant_updates: [
            {
              id: productToToggleChannel.id,
              is_available_online: newStatus,
            },
          ],
        });
        toast.success(
          newStatus
            ? `"${productToToggleChannel.name}" is now available Online & in POS`
            : `"${productToToggleChannel.name}" is now set to In-Store Only`
        );
      } else {
        await apiClient.put(`/tenant/products/${productToToggleChannel.id}`, {
          is_available_online: newStatus,
        });
        toast.success(
          newStatus
            ? `"${productToToggleChannel.name}" is now available Online & in POS`
            : `"${productToToggleChannel.name}" is now set to In-Store Only`
        );
      }

      const parentId = productToToggleChannel.productId || productToToggleChannel.id;
      if (
        selectedProductForDetail &&
        (selectedProductForDetail.id === parentId ||
          selectedProductForDetail.id === productToToggleChannel.id)
      ) {
        try {
          const freshRes = await apiClient.get(`/tenant/products/${parentId}`);
          const freshProduct = freshRes.data?.success?.data?.product;
          if (freshProduct) {
            setSelectedProductForDetail(freshProduct);
          }
        } catch (e) {
          console.error("Failed to refresh product details after channel toggle:", e);
        }
      }

      setIsChannelModalOpen(false);
      setProductToToggleChannel(null);
      fetchProducts(pagination?.page || 1, false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to update sales channel"
      );
    } finally {
      setIsUpdatingChannel(false);
    }
  };

  // Toggle variant row expansion and lazy-load details
  const handleToggleExpand = async (productId: string) => {
    const isExpanded = !!expandedProductIds[productId];

    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !isExpanded,
    }));

    if (!isExpanded && !productVariantsCache[productId]) {
      setLoadingVariants((prev) => ({ ...prev, [productId]: true }));
      try {
        const res = await apiClient.get(`/tenant/products/${productId}`);
        const productDetails = res.data.success?.data?.product;
        const variants = productDetails?.variants || [];
        setProductVariantsCache((prev) => ({
          ...prev,
          [productId]: variants,
        }));
      } catch (err) {
        console.error("Failed to fetch product variants:", err);
        toast.error("Failed to load variants");
        setExpandedProductIds((prev) => ({
          ...prev,
          [productId]: false,
        }));
      } finally {
        setLoadingVariants((prev) => ({ ...prev, [productId]: false }));
      }
    }
  };

  // Helper to compute stock display (flexible / unit / pack only)
  const getStockDisplay = (variant: any) => {
    const qty = variant.stock_quantity || 0;
    if (variant.sell_mode === "pack_only") {
      const defaultPurchaseTier = variant.packaging_tiers?.find(
        (t: any) => t.is_default_purchase_unit,
      );
      if (defaultPurchaseTier && defaultPurchaseTier.units_per_tier > 0) {
        return {
          value: qty / defaultPurchaseTier.units_per_tier,
          unit: defaultPurchaseTier.name,
        };
      }
    }
    return {
      value: qty,
      unit: variant.base_unit_name || "unit",
    };
  };

  const getStockCell = (quantity: number, unitName: string, tiers?: any[]) => {
    const isOutOfStock = quantity === 0;
    const isLowStock = quantity > 0 && quantity <= 5;
    const statusIcon = isOutOfStock ? (
      <XCircle className="h-3.5 w-3.5 shrink-0" />
    ) : isLowStock ? (
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    ) : null;

    const primaryClass = isOutOfStock
      ? "text-destructive font-bold"
      : isLowStock
      ? "text-amber-600 dark:text-amber-400 font-semibold"
      : "text-foreground/80 font-medium";

    return (
      <PackagingStockDisplay
        quantity={quantity}
        baseUnitName={unitName}
        packagingTiers={tiers}
        icon={statusIcon}
        primaryClassName={primaryClass}
        tierClassName="text-xs text-muted-foreground font-medium"
      />
    );
  };

  const handleSetViewMode = (mode: "list" | "group") => {
    setViewMode(mode);
    localStorage.setItem("preferred_products_view_mode", mode);
  };

  // Helper to determine the retail price
  const getRetailPrice = (variant: any) => {
    let tier = variant.packaging_tiers?.find(
      (t: any) => t.is_default_sale_unit,
    );
    if (!tier) {
      tier = variant.packaging_tiers?.find((t: any) => t.is_base_unit);
    }
    if (!tier && variant.packaging_tiers?.length > 0) {
      tier = variant.packaging_tiers[0];
    }
    if (tier) {
      const priceRec = tier.prices?.find((p: any) => p.price_type === "retail");
      if (priceRec) return priceRec.price;
    }
    return variant.cost_price_per_base_unit || 0;
  };

  const effectiveViewMode = isMobile ? "list" : viewMode;

  // Transform products data into rows for EnhancedTableComponent
  const tableRows = useMemo(() => {
    if (effectiveViewMode === "group") {
      return products.map((p) => {
        const isActive = p.status
          ? p.status.toLowerCase() === "active"
          : p.is_active !== false;

        return {
          id: p.id,
          __record: p,
          image:
            p.images && p.images[0] ? (
              <img
                src={p.images[0]}
                alt={p.name}
                className="h-10 w-10 rounded-lg object-cover bg-muted border"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                <Package className="h-5 w-5" />
              </div>
            ),
          name: p.name,
          category: p.category || "—",
          ...(hasEcommerce
            ? {
                channel: (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      promptToggleChannel(p);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-transform active:scale-95 cursor-pointer hover:opacity-80 border",
                      p.is_available_online !== false && p.isAvailableOnline !== false
                        ? "bg-muted text-foreground border-border/80"
                        : "bg-muted/40 text-muted-foreground border-border/50"
                    )}
                    title="Click to change sales channel"
                  >
                    {p.is_available_online !== false && p.isAvailableOnline !== false ? (
                      <>
                        <Icon icon="solar:global-linear" className="h-3 w-3 shrink-0" /> Online & POS
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:shop-2-linear" className="h-3 w-3 shrink-0" /> In-Store Only
                      </>
                    )}
                  </button>
                ),
              }
            : {}),
          variants: (
            <span
              className={`${
                p.has_variants
                  ? "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/30 dark:bg-inherit dark:text-primary border border-primary/20 dark:border-primary/30"
                  : "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-muted/30 dark:bg-inherit dark:text-secondary-foreground border border-border/50 dark:border-border"
              }`}
            >
              {p.has_variants ? `${p.variant_count} variants` : "Simple"}
            </span>
          ),
          total_stock: getStockCell(p.total_stock_base_units, "units"),
          status: (
            <span
              className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
                isActive
                  ? "text-green-600 dark:text-green-400 bg-green-500/10"
                  : "text-muted-foreground bg-muted border border-border"
              }`}
            >
              {p.status || (isActive ? "Active" : "Draft")}
            </span>
          ),
        };
      });
    }

    // List view: flatten variants
    const flatRows: any[] = [];
    products.forEach((p) => {
      const isActive = p.status
        ? p.status.toLowerCase() === "active"
        : p.is_active !== false;

      const vars = p.variants || [];
      if (vars.length === 0) {
        flatRows.push({
          id: p.id,
          __record: p,
          rowClassName:
            "[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-destructive",
          image:
            p.images && p.images[0] ? (
              <img
                src={p.images[0]}
                alt={p.name}
                className="h-10 w-10 rounded-lg object-cover bg-muted border"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                <Package className="h-5 w-5" />
              </div>
            ),
          name: p.name,
          category: p.category || "—",
          sku: "—",
          sell_mode: (
            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
              unit only
            </span>
          ),
          price: "—",
          stock: getStockCell(0, "units"),
          status: (
            <span
              className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
                isActive
                  ? "text-green-600 dark:text-green-400 bg-green-500/10"
                  : "text-muted-foreground bg-muted border border-border"
              }`}
            >
              {p.status || (isActive ? "Active" : "Draft")}
            </span>
          ),
        });
        return;
      }

      vars.forEach((v: any) => {
        const attrStr = Object.values(v.variant_attributes || {}).join(" / ");
        const fullName = attrStr ? `${p.name} (${attrStr})` : p.name;
        const stockInfo = getStockDisplay(v);
        const retailPrice = getRetailPrice(v);
        const isVariantOnline =
          v.is_available_online !== false && v.isAvailableOnline !== false;
        const isVariantActive = v.is_active !== false;

        const isOutOfStock = v.stock_quantity === 0;
        const isLowStock = v.stock_quantity > 0 && v.stock_quantity <= 5;
        const rowClassName = isOutOfStock
          ? "[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-destructive"
          : isLowStock
            ? "[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.01]"
            : "";

        flatRows.push({
          id: `${p.id}-${v.id}`,
          __record: p,
          __variant: v,
          rowClassName,
          image: p.images && p.images[0] ? (
            <img
              src={p.images[0]}
              alt={fullName}
              className="h-10 w-10 rounded-lg object-cover bg-muted border"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
              <Package className="h-5 w-5" />
            </div>
          ),
          name: (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">{fullName}</span>
              {p.status?.toLowerCase() === "draft" && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 bg-muted text-muted-foreground border border-border">
                  Draft
                </span>
              )}
            </div>
          ),
          category: p.category || "—",
          sku: <span className="font-mono">{v.sku || "—"}</span>,
          ...(hasEcommerce
            ? {
                channel: (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      promptToggleChannel({
                        ...v,
                        name: fullName,
                        is_available_online: isVariantOnline,
                        isAvailableOnline: isVariantOnline,
                        isVariant: true,
                        productId: p.id,
                      });
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-transform active:scale-95 cursor-pointer hover:opacity-80 border",
                      isVariantOnline
                        ? "bg-muted text-foreground border-border/80"
                        : "bg-muted/40 text-muted-foreground border-border/50"
                    )}
                    title="Click to change sales channel"
                  >
                    {isVariantOnline ? (
                      <>
                        <Icon icon="solar:global-linear" className="h-3 w-3 shrink-0" /> Online & POS
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:shop-2-linear" className="h-3 w-3 shrink-0" /> In-Store Only
                      </>
                    )}
                  </button>
                ),
              }
            : {}),
          sell_mode: (
            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground capitalize">
              {v.sell_mode?.replace("_", " ")}
            </span>
          ),
          price: (
            <span className="font-semibold text-foreground">
              GHS {Number(retailPrice).toFixed(2)}
            </span>
          ),
          stock: getStockCell(stockInfo.value, stockInfo.unit, v.packaging_tiers || p.packaging_tiers),
          status: (
            <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
              isVariantActive
                ? "text-green-600 dark:text-green-400 bg-green-500/10"
                : "text-muted-foreground bg-muted border border-border"
            }`}>
              {isVariantActive ? "Active" : "Inactive"}
            </span>
          ),
        });
      });
    });

    return flatRows;
  }, [products, effectiveViewMode]);

  const renderVariantsAccordion = (row: any) => {
    const p = row.__record;
    const variants = productVariantsCache[p.id] || [];
    const isLoadingVars = !!loadingVariants[p.id];

    if (isLoadingVars) {
      return (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Loading variants...
          </span>
        </div>
      );
    }

    if (variants.length === 0) {
      return (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No variants found for this product.
        </div>
      );
    }

    return (
      <div className="border border-border rounded-sm bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              <th className="px-4 py-2.5">Attributes</th>
              <th className="px-4 py-2.5">SKU</th>
              <th className="px-4 py-2.5">Sell Mode</th>
              <th className="px-4 py-2.5">Stock</th>
              <th className="px-4 py-2.5">Default Sale Tier</th>
              <th className="px-4 py-2.5">Retail Price</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {variants.map((v: any) => {
              const attrStr =
                Object.entries(v.variant_attributes || {})
                  .map(([key, val]) => `${key}: ${val}`)
                  .join(", ") || "Default";

              const stockInfo = getStockDisplay(v);
              const defaultSaleTier = v.packaging_tiers?.find(
                (t: any) => t.is_default_sale_unit,
              );
              const defaultSaleTierName = defaultSaleTier
                ? defaultSaleTier.name
                : v.base_unit_name;
              const retailPrice = getRetailPrice(v);

              return (
                <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-foreground capitalize">
                    {attrStr}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {v.sku}
                  </td>
                  <td className="px-4 py-2.5 capitalize">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                      {v.sell_mode?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {getStockCell(stockInfo.value, stockInfo.unit)}
                  </td>
                  <td className="px-4 py-2.5 capitalize">
                    {defaultSaleTierName || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">
                    GHS {Number(retailPrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toast.success(`Edit variant ${v.sku}`)}
                        className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                        title="Edit Variant"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toast.success(`Manage tiers for ${v.sku}`)
                        }
                        className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                        title="Manage Tiers"
                      >
                        <Layers className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Flattened items for mobile view (each variant becomes an individual card)
  const flatMobileItems = useMemo(() => {
    const items: any[] = [];
    products.forEach((p) => {
      const isProductActive = p.status
        ? p.status.toLowerCase() === "active"
        : p.is_active !== false;
      const isOnline = p.is_available_online !== false && p.isAvailableOnline !== false;

      const vars = p.variants || [];
      if (vars.length === 0) {
        items.push({
          id: p.id,
          product: p,
          variant: null,
          name: p.name,
          category: p.category || "General",
          sku: p.sku || "—",
          image: p.images?.[0] || null,
          price: 0,
          stockQty: 0,
          unit: p.base_unit_name || "units",
          tierBreakdown: "",
          isOutOfStock: true,
          isLowStock: false,
          isActive: isProductActive,
          isAvailableOnline: isOnline,
          status: p.status || (isProductActive ? "Active" : "Draft"),
        });
        return;
      }

      vars.forEach((v: any) => {
        const attrStr = Object.values(v.variant_attributes || {}).join(" / ");
        const fullName = attrStr ? `${p.name} (${attrStr})` : p.name;
        const stockInfo = getStockDisplay(v);
        const rawStock = stockInfo.value;
        const numStock = typeof rawStock === "number" ? rawStock : parseFloat(String(rawStock)) || 0;
        const unit = stockInfo.unit || v.base_unit_name || p.base_unit_name || "units";
        const tierBreakdown = getTierBreakdown(numStock, unit, v.packaging_tiers || p.packaging_tiers);
        const retailPrice = getRetailPrice(v);
        const isOutOfStock = numStock <= 0;
        const isLowStock = numStock > 0 && numStock <= 5;
        const isVariantOnline = v.is_available_online !== false && v.isAvailableOnline !== false;
        const isVariantActive = v.is_active !== false;

        items.push({
          id: `${p.id}-${v.id}`,
          product: p,
          variant: v,
          name: fullName,
          category: p.category || "General",
          sku: v.sku || "—",
          image: p.images?.[0] || null,
          price: retailPrice,
          stockQty: numStock,
          unit,
          tierBreakdown,
          isOutOfStock,
          isLowStock,
          isActive: isVariantActive,
          isAvailableOnline: isVariantOnline,
          status: isVariantActive ? "Active" : "Inactive",
        });
      });
    });
    return items;
  }, [products]);

  // Calculate metrics using server-aggregated summary (exact counts across entire database)
  const totalProductsCount = serverSummary?.total_products ?? pagination?.totalProducts ?? pagination?.total ?? products.length;
  const totalVariantsCount = serverSummary?.total_variants ?? pagination?.totalVariants ?? flatMobileItems.length;
  const displayTotalCount = effectiveViewMode === "list" ? totalVariantsCount : totalProductsCount;
  const displayTotalLabel = effectiveViewMode === "list" ? "Total Items / SKUs" : "Total Products";

  const outOfStockCount = serverSummary
    ? (effectiveViewMode === "list" ? serverSummary.out_of_stock_variants : serverSummary.out_of_stock_variants)
    : (effectiveViewMode === "list" ? flatMobileItems : products).filter(
        (item: any) => (effectiveViewMode === "list" ? item.isOutOfStock : item.total_stock_base_units === 0),
      ).length;

  const lowStockCount = serverSummary
    ? (effectiveViewMode === "list" ? serverSummary.low_stock_variants : serverSummary.low_stock_variants)
    : (effectiveViewMode === "list" ? flatMobileItems : products).filter(
        (item: any) => (effectiveViewMode === "list" ? item.isLowStock : item.total_stock_base_units > 0 && item.total_stock_base_units <= 5),
      ).length;

  const activeProductsCount = serverSummary
    ? (effectiveViewMode === "list" ? serverSummary.active_variants : serverSummary.active_products)
    : (effectiveViewMode === "list" ? flatMobileItems : products).filter(
        (item: any) => (effectiveViewMode === "list" ? item.isActive : (item.status ? item.status.toLowerCase() === "active" : item.is_active !== false)),
      ).length;

  // Status Filter Tabs
  const statuses = [
    { uid: "all", name: "All" },
    { uid: "active", name: "Active" },
    { uid: "draft", name: "Draft" },
    { uid: "archived", name: "Archived" },
  ];

  return (
    <PageLayout
      title="Products Inventory"
      constrainHeight={true}
      actions={
        hasEcommerce ? (
          <div className="hidden md:flex items-center gap-2">
            {/* Dynamic Channel Filter Segmented Pill */}
            <div className="inline-flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40 h-9 text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-semibold transition-all h-full flex items-center gap-1 cursor-pointer",
                  channelFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-bold border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("online")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all h-full cursor-pointer",
                  channelFilter === "online"
                    ? "bg-background text-foreground shadow-xs font-bold border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* <Icon icon="solar:global-linear" className="h-3.5 w-3.5" /> */}
                <span>E-Com Only</span>
                {/* {serverSummary?.online_products !== undefined && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                    {serverSummary.online_products}
                  </span>
                )} */}
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("in_store")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all h-full cursor-pointer",
                  channelFilter === "in_store"
                    ? "bg-background text-foreground shadow-xs font-bold border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* <Icon icon="solar:shop-2-linear" className="h-3.5 w-3.5" /> */}
                <span>In-Store</span>
                {/* {serverSummary?.instore_only_products !== undefined && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                    {serverSummary.instore_only_products}
                  </span>
                )} */}
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* ========================================================================= */}
      {/* MOBILE PRODUCTS VIEW (ZEN-Inspired Design - Block < md, Hidden >= md)     */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper>
        {/* 1. Hero Products Count / Overview Card + Carousel */}
        <MobileHeroCard
          title={displayTotalLabel}
          badge={
            hasEcommerce ? (
              <button
                type="button"
                onClick={() => setIsChannelFilterModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-muted/80 hover:bg-muted border border-border/80 text-foreground px-2.5 py-1 rounded-full cursor-pointer transition-all active:scale-95"
              >
                <Icon
                  icon={
                    channelFilter === "online"
                      ? "solar:global-linear"
                      : channelFilter === "in_store"
                      ? "solar:shop-2-linear"
                      : "solar:filter-linear"
                  }
                  className="h-3 w-3"
                />
                <span>
                  {channelFilter === "online"
                    ? "E-Com Only"
                    : channelFilter === "in_store"
                    ? "In-Store Only"
                    : "All Channels"}
                </span>
                <Icon icon="solar:alt-arrow-down-linear" className="h-2.5 w-2.5 opacity-60 ml-0.5" />
              </button>
            ) : (
              `${activeProductsCount} Active`
            )
          }
          value={`${isLoading ? '...' : displayTotalCount} ${displayTotalCount > 1 ? "Items" : "Item"}`}
          isLoading={isLoading}
        >
          <MobileMetricPill
            title="Active"
            value={activeProductsCount}
            subtitle="Live in POS"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            iconColorClass="bg-emerald-500/10 text-emerald-500"
            isLoading={isLoading}
            onClick={() => setStatusFilter(new Set(["active"]))}
          />

          <MobileMetricPill
            title="Low Stock"
            value={lowStockCount}
            subtitle="≤ 5 units left"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            iconColorClass="bg-amber-500/10 text-amber-500"
            isLoading={isLoading}
          />

          <MobileMetricPill
            title="Out of Stock"
            value={outOfStockCount}
            subtitle="0 inventory"
            icon={<XCircle className="h-3.5 w-3.5" />}
            iconColorClass="bg-rose-500/10 text-rose-500"
            isLoading={isLoading}
          />

          <MobileMetricPill
            title="Categories"
            value={categories.length}
            subtitle="Total groups"
            icon={<Layers className="h-3.5 w-3.5" />}
            iconColorClass="bg-blue-500/10 text-blue-500"
            isLoading={isLoading}
          />
        </MobileHeroCard>

        {/* 2. Quick Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search product, SKU, or category...",
          }}
          actions={[
            {
              label: 'Add Product',
              icon: <Icon icon="solar:add-circle-linear" className="h-3.5 w-3.5" />,
              onClick: hasEcommerce ? () => setIsAddChoiceModalOpen(true) : openNewProduct,
            },
            ...(hasEcommerce
              ? [
                  {
                    label: 'Curate Store',
                    icon: <Icon icon="solar:global-linear" className="h-3.5 w-3.5" />,
                    onClick: () => setIsCuratorModalOpen(true),
                  },
                ]
              : []),
            ...(!hasEcommerce
              ? [
                  {
                    label: 'Bulk Import',
                    icon: <Icon icon="solar:cloud-upload-linear" className="h-3.5 w-3.5" />,
                    onClick: () => setIsBulkModalOpen(true),
                  },
                ]
              : []),
            {
              // label: 'Refresh',
              icon: <Icon icon="solar:restart-linear" className="h-3.5 w-3.5 -mx-1" />,
              onClick: fetchProducts,
            },
          ]}
        />

        {/* 3. Product Activity / Catalog List Sheet */}
        <MobileActivitySheet
          title="Products Catalog"
          viewAllLabel="Manage Stock"
          viewAllTo="/inventory/stock"
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "draft", label: "Draft" },
            { id: "archived", label: "Archived" },
          ]}
          activeTab={
            statusFilter instanceof Set
              ? (Array.from(statusFilter)[0] as string) || "all"
              : (statusFilter as string) || "all"
          }
          onTabChange={(tabId) => setStatusFilter(new Set([tabId]))}
          hasMore={pagination?.hasNext}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          totalCount={displayTotalCount}
          currentCount={flatMobileItems.length}
        >
          {isLoading ? (
            <div className="py-8 text-center">
              <Spinner />
            </div>
          ) : flatMobileItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No products found matching your filter or search.
            </div>
          ) : (
            flatMobileItems.map((item: any) => {
              const formattedStock = formatQty(item.stockQty);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedProductForDetail(item.product);
                    setIsDetailModalOpen(true);
                  }}
                  className="py-3 gap-5 flex items-center justify-between text-[12px] cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden bg-muted flex items-center justify-center border border-border">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                        <p className="font-bold text-foreground truncate sm:text-sm">
                          {item.name}
                        </p>
                        {item.product?.status?.toLowerCase() === "draft" && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 bg-muted text-muted-foreground border border-border">
                            DRAFT
                          </span>
                        )}
                        {!item.isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.category || "General"}
                        {item.sku && item.sku !== "—" ? ` • ${item.sku}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <span className="font-extrabold text-[12px] text-foreground block">
                      <CurrencyDisplay amount={item.price} symbolClassName="text-xs" />
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 max-w-[170px] sm:max-w-[210px] truncate",
                        item.isOutOfStock
                          ? "bg-destructive/5 text-destructive"
                          : item.isLowStock
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-secondary/85 text-secondary-foreground"
                      )}
                    >
                      {item.isOutOfStock
                        ? "Out of Stock"
                        : `${formattedStock} ${item.unit}${item.tierBreakdown ? ` (${item.tierBreakdown})` : ""}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP PRODUCTS VIEW (Hidden < md, Flex >= md)                           */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <DashboardCard
          title={displayTotalLabel}
          value={isLoading ? '...' : displayTotalCount}
          className="border border-border"
          action={<Package className="text-muted-foreground/50 h-5 w-5" />}
        />
        <DashboardCard
          title="Low Stock"
          value={isLoading ? '...' : lowStockCount}
          className="border border-border"
          action={<AlertTriangle className="text-muted-foreground/50 h-5 w-5" />}
        />
        <DashboardCard
          title="Out of Stock"
          value={isLoading ? '...' : outOfStockCount}
          className="border border-border"
          action={<XCircle className="text-muted-foreground/50 h-5 w-5" />}
        />
        <DashboardCard
          title="Active Products"
          value={isLoading ? '...' : activeProductsCount}
          className="border border-border md:col-span-3 lg:col-span-1"
          action={<CheckCircle2 className="text-muted-foreground/50 h-5 w-5" />}
        />
      </div>

      {/* Main Table Card */}

      <EnhancedTableComponent
        columns={
          effectiveViewMode === "group"
            ? [
                { key: "image", label: "Image" },
                { key: "name", label: "Name" },
                { key: "category", label: "Category" },
                ...(hasEcommerce ? [{ key: "channel", label: "Channel" }] : []),
                { key: "variants", label: "Variants" },
                { key: "total_stock", label: "Total Stock" },
                { key: "status", label: "Status" },
              ]
            : [
                { key: "image", label: "Image" },
                { key: "name", label: "Name" },
                { key: "category", label: "Category" },
                { key: "sku", label: "SKU" },
                ...(hasEcommerce ? [{ key: "channel", label: "Channel" }] : []),
                { key: "sell_mode", label: "Sell Mode" },
                { key: "price", label: "Price" },
                { key: "stock", label: "Stock" },
                { key: "status", label: "Status" },
              ]
        }
        rows={tableRows}
        isLoading={isLoading}
        serverPagination={
          pagination
            ? {
                ...pagination,
                total: effectiveViewMode === "list" && pagination.totalVariants ? pagination.totalVariants : pagination.total,
              }
            : undefined
        }
        onPageChange={(newPage) => fetchProducts(newPage, false)}
        enableInlineAccordion={effectiveViewMode === "group"}
        expandedRowIds={effectiveViewMode === "group" ? expandedProductIds : undefined}
        onRowExpandToggle={effectiveViewMode === "group" ? handleToggleExpand : undefined}
        renderInlineAccordion={effectiveViewMode === "group" ? renderVariantsAccordion : undefined}
        showTopContent={true}
        topActions={[
          {
            customComponent: (
              <div className="hidden sm:flex rounded-[7px] overflow-hidden border shadow-sm h-[35px] md:h-[38px] bg-muted p-0.5">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className={`h-full px-2.5 text-[12px] font-semibold transition-all rounded-[8px] ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-sm font-bold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleSetViewMode("list")}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {/* List */}
                </Button>
                <Button
                  variant={viewMode === "group" ? "secondary" : "ghost"}
                  className={`h-full px-2.5 text-[12px] font-semibold transition-all rounded-[8px] ${
                    viewMode === "group"
                      ? "bg-background text-foreground shadow-sm font-bold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleSetViewMode("group")}
                >
                  <Package className="h-3.5 w-3.5" />
                  {/* Grouped */}
                </Button>
              </div>
            ),
          },
          ...(hasEcommerce
            ? [
                {
                  customComponent: (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsCuratorModalOpen(true)}
                      className="h-[35px] md:h-[38px] w-[35px] md:w-[38px] text-foreground border-border hover:bg-muted rounded-[8px] cursor-pointer"
                      title="Curate Storefront Catalog"
                    >
                      <Icon icon="solar:global-linear" className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
        rowActions={[
          { key: "edit", label: "Edit Product", icon: "fluent:edit-20-filled" },
          ...(hasEcommerce
            ? [
                {
                  key: "toggle_channel",
                  label: "Change Sales Channel",
                  icon: "fluent:globe-20-filled",
                },
              ]
            : []),
          {
            key: "archive",
            label: "Toggle Status",
            icon: "fluent:archive-20-filled",
          },
          {
            key: "delete",
            label: "Delete Product",
            icon: "fluent:delete-20-filled",
            color: "danger",
            className: "text-danger",
          },
        ]}
        onclick={handleRowClick}
        onRowActionClick={(actionKey, rowData) => {
          const originalProduct = rowData.__record;
          const variantData = rowData.__variant;
          if (actionKey === "edit") {
            handleEdit(originalProduct);
          } else if (actionKey === "toggle_channel") {
            if (effectiveViewMode === "list" && variantData) {
              const attrStr = Object.values(variantData.variant_attributes || {}).join(" / ");
              const fullName = attrStr ? `${originalProduct.name} (${attrStr})` : originalProduct.name;
              const isVOnline = variantData.is_available_online !== false && variantData.isAvailableOnline !== false;
              promptToggleChannel({
                ...variantData,
                name: fullName,
                is_available_online: isVOnline,
                isAvailableOnline: isVOnline,
                isVariant: true,
                productId: originalProduct.id,
              });
            } else {
              promptToggleChannel(originalProduct);
            }
          } else if (actionKey === "archive" || actionKey === "toggle_status") {
            if (effectiveViewMode === "list" && variantData) {
              const attrStr = Object.values(variantData.variant_attributes || {}).join(" / ");
              const fullName = attrStr ? `${originalProduct.name} (${attrStr})` : originalProduct.name;
              const isVActive = variantData.is_active !== false;
              setProductToToggleStatus({
                ...variantData,
                name: fullName,
                is_active: isVActive,
                isActive: isVActive,
                isVariant: true,
                productId: originalProduct.id,
                parentStatus: originalProduct.status,
              });
              setIsStatusModalOpen(true);
            } else {
              setProductToToggleStatus(originalProduct);
              setIsStatusModalOpen(true);
            }
          } else if (actionKey === "delete") {
            setProductToDelete(originalProduct);
            setIsDeleteModalOpen(true);
          }
        }}
        // pageSize={25}
        showSearch={true}
        searchPlaceholder="Search by name or SKU..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showFilter={true}
        filterLabel="Status"
        filterOptions={statuses}
        filterValue={statusFilter}
        onFilterChange={(keys: any) => setStatusFilter(keys)}
        // Category Filter
        additionalFilters={[
          {
            label: "Category",
            value: categoryFilter,
            onChange: (keys: any) => setCategoryFilter(keys),
            options: [
              { uid: "all", name: "All Categories" },
              ...categories.map((c) => ({ uid: c, name: c })),
            ],
          },
        ]}
        // Actions
        showAddButton={false}
        customAddButton={
          <DropdownMenu>
            <div className="flex rounded-md overflow-hidden border shadow-sm lg:h-[34px] bg-muted">
              <Button
                variant="ghost"
                className="gap-2 rounded-none text-[12px] text-foreground/70 hover:text-foreground/90 border-r border-muted-foreground/20 h-full hidden lg:flex"
                onClick={openNewProduct}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">Add Product</span>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button
                  // size="sm"
                  variant="ghost"
                  className="rounded-none text-muted-foreground hover:bg-muted/90 px-2 h-full"
                >
                  <ChevronDown className="h-4 w-4 hidden lg:inline" />
                  <Plus className="h-4 w-4 lg:hidden" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-xl shadow-lg border-border"
            >
              <DropdownMenuItem
                onClick={openNewProduct}
                className="cursor-pointer text-[13px]"
              >
                <Package className="h-4 w-4 mr-2" /> Single Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsBulkModalOpen(true)}
                className="cursor-pointer text-[13px]"
              >
                <Upload className="h-4 w-4 mr-2" /> Bulk Import Products (CSV)
              </DropdownMenuItem>
              {hasEcommerce && (
                <DropdownMenuItem
                  onClick={() => setIsCuratorModalOpen(true)}
                  className="cursor-pointer text-[13px]"
                >
                  <Globe className="h-4 w-4 mr-2 text-emerald-500" /> Curate Storefront Catalog
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onRefresh={fetchProducts}
        mobileFriendly={false}
        // containerStyles=""
      />
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProductForDetail(null);
        }}
        product={selectedProductForDetail}
        onEdit={(prod) => {
          setIsDetailModalOpen(false);
          handleEdit(prod);
        }}
        onToggleChannel={(prod) => {
          promptToggleChannel(prod);
        }}
      />

      {/* Product Status Confirmation Modal */}
      <ProductStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setProductToToggleStatus(null);
        }}
        product={productToToggleStatus}
        onConfirm={handleConfirmStatusToggle}
        isUpdating={isUpdatingStatus}
      />

      {/* Product Channel Confirmation Modal */}
      <ProductChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => {
          setIsChannelModalOpen(false);
          setProductToToggleChannel(null);
        }}
        product={productToToggleChannel}
        onConfirm={handleConfirmChannelToggle}
        isUpdating={isUpdatingChannel}
      />

      {/* Storefront Catalog Curator Modal */}
      <StorefrontCatalogCuratorModal
        isOpen={isCuratorModalOpen}
        onClose={() => setIsCuratorModalOpen(false)}
        onSuccess={() => fetchProducts(1, false)}
      />

      {/* Mobile Add Product Choice Modal (Single vs Bulk) */}
      <CustomModal
        isOpen={isAddChoiceModalOpen}
        onOpenChange={() => setIsAddChoiceModalOpen(false)}
        onClose={() => setIsAddChoiceModalOpen(false)}
        size="md"
        placement="top"
        classNames={{
          base: "!w-full !max-w-md rounded-2xl border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
          header: "pb-2 px-5 sm:px-6 pt-4",
          body: "py-3 px-4 sm:px-6",
        }}
        header={
          <div className="flex items-center gap-2.5 px-1 w-full">
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">Add Products</h3>
              {/* <p className="text-xs text-muted-foreground">Select how you would like to add items</p> */}
            </div>
          </div>
        }
        body={
          <div className="flex flex-col gap-2.5 py-1">
            <button
              type="button"
              onClick={() => {
                setIsAddChoiceModalOpen(false);
                openNewProduct();
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all text-left cursor-pointer group active:scale-[0.99]"
            >
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 text-foreground">
                <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Single Product
                  </h4>
                  <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  Create a new product with custom variants, tiers, and pricing
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAddChoiceModalOpen(false);
                setIsBulkModalOpen(true);
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all text-left cursor-pointer group active:scale-[0.99]"
            >
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 text-foreground">
                <Icon icon="solar:cloud-upload-linear" className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Bulk Import (CSV)
                  </h4>
                  <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  Upload multiple products and inventory quantities in bulk
                </p>
              </div>
            </button>
          </div>
        }
      />

      {/* Mobile Channel Filter Modal */}
      <CustomModal
        isOpen={isChannelFilterModalOpen}
        onOpenChange={() => setIsChannelFilterModalOpen(false)}
        onClose={() => setIsChannelFilterModalOpen(false)}
        size="md"
        placement="top"
        classNames={{
          base: "!w-full !max-w-md rounded-2xl border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
          header: "pb-2 borderb border-border/40 px-5 sm:px-6 pt-4",
          body: "py-3 px-4 sm:px-6",
        }}
        header={
          <div className="flex items-center gap-2.5 px-1 w-full">
            {/* <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icon icon="solar:filter-linear" className="h-4 w-4 text-foreground" />
            </div> */}
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">Filter by Sales Channel</h3>
              {/* <p className="text-xs text-muted-foreground">Select which inventory channel you want to view</p> */}
            </div>
          </div>
        }
        body={
          <div className="flex flex-col gap-2.5 py-1">
            {[
              {
                id: "all" as const,
                title: "All Channels",
                subtitle: "View complete inventory across POS & online store",
                icon: "solar:layers-minimalistic-linear",
                count: displayTotalCount,
              },
              {
                id: "online" as const,
                title: "E-Commerce Only",
                subtitle: "Products published and visible on the online store",
                icon: "solar:global-linear",
                count: serverSummary?.online_products,
              },
              {
                id: "in_store" as const,
                title: "In-Store POS Only",
                subtitle: "Products restricted to physical in-store sales",
                icon: "solar:shop-2-linear",
                count: serverSummary?.instore_only_products,
              },
            ].map((option) => {
              const isSelected = channelFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setChannelFilter(option.id);
                    setIsChannelFilterModalOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99]",
                    isSelected
                      ? "border-foreground/30 bg-muted/40 shadow-xs ring-1 ring-foreground/10"
                      : "border-border/60 bg-card hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                        isSelected
                          ? "bg-foreground text-background border-foreground"
                          : "bg-muted/60 text-foreground border-border/40"
                      )}
                    >
                      <Icon icon={option.icon} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {option.title}
                        </span>
                        {option.count !== undefined && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 font-semibold">
                            {option.count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    {isSelected ? (
                      <Icon icon="solar:check-circle-bold" className="h-5 w-5 text-foreground" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border/80" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={isDeleteModalOpen}
        onOpenChange={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        size="md"
        placement="top"
        classNames={{
          base: "!w-full !max-w-md rounded-2xl border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
          header: "pb-2 border-b border-border/40 px-4 sm:px-6 pt-4",
          body: "py-3 px-4 sm:px-6",
          footer: "px-4 sm:px-6 pb-4 pt-1",
        }}
        header={
          <div className="flex items-center gap-2.5 px-1 w-full">
            <div className="h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-destructive leading-tight">Delete Product</h3>
              <p className="text-xs text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>
        }
        body={
          <div className="py-1 text-sm text-muted-foreground">
            <p>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{productToDelete?.name}</strong>? This will remove it
              permanently from your inventory.
            </p>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="font-medium flex-1 h-9 rounded-xl border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="font-semibold flex-1 h-9 rounded-xl"
            >
              {isDeleting ? "Deleting..." : "Delete Product"}
            </Button>
          </div>
        }
      />

      <BulkProductUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />
    </PageLayout>
  );
}
