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
} from "lucide-react";
import { BulkProductUploadModal } from "./components/BulkProductUploadModal";
import { ProductDetailModal } from "@/components/inventory/ProductDetailModal";
import { ProductStatusModal } from "@/components/inventory/ProductStatusModal";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<any>(null);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [productToToggleStatus, setProductToToggleStatus] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

      const response = await apiClient.get(url);
      const data = response.data.success?.data?.products || [];
      const pag = response.data.success?.data?.pagination || null;
      setPagination(pag);

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

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination?.hasNext && !isLoading && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "120px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [pagination?.hasNext, pagination?.page, isLoading, isLoadingMore]);

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
  }, [searchQuery, statusFilter, categoryFilter]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setProductVariantsCache({});
    fetchProducts();
  };

  const handleBulkSuccess = () => {
    setIsBulkModalOpen(false);
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
          name: fullName,
          category: p.category || "—",
          sku: v.sku || "—",
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
              isActive
                ? "text-green-600 dark:text-green-400 bg-green-500/10"
                : "text-muted-foreground bg-muted border border-border"
            }`}>
              {p.status || (isActive ? "Active" : "Draft")}
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

  // Calculate metrics
  const totalProducts = pagination?.total ?? products.length;
  const outOfStockCount = products.filter(
    (p) => p.total_stock_base_units === 0,
  ).length;
  const lowStockCount = products.filter(
    (p) => p.total_stock_base_units > 0 && p.total_stock_base_units <= 5,
  ).length;

  const activeProductsCount = products.filter(
    (p) => (p.status ? p.status.toLowerCase() === "active" : p.is_active !== false),
  ).length;

  // Status Filter Tabs
  const statuses = [
    { uid: "all", name: "All" },
    { uid: "active", name: "Active" },
    { uid: "draft", name: "Draft" },
    { uid: "archived", name: "Archived" },
  ];

  return (
    <PageLayout title="Products Inventory" constrainHeight={true}>
      {/* ========================================================================= */}
      {/* MOBILE PRODUCTS VIEW (ZEN-Inspired Design - Block < md, Hidden >= md)     */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper>
        {/* 1. Hero Products Count / Overview Card + Carousel */}
        <MobileHeroCard
          title="Total Products"
          badge={`${activeProductsCount} Active`}
          value={`${isLoading ? '...' : totalProducts} Items`}
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
              icon: <Plus className="h-3.5 w-3.5 text-primary" />,
              onClick: openNewProduct,
            },
            {
              label: 'Bulk Import',
              icon: <Upload className="h-3.5 w-3.5 text-primary" />,
              onClick: () => setIsBulkModalOpen(true),
            },
            {
              // label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: fetchProducts,
            },
          ]}
        />

        {/* 3. Product Activity / Catalog List Sheet */}
        <MobileActivitySheet
          title="Products Catalog"
          viewAllLabel="Manage Stock"
          onViewAll={() => navigate("/inventory/stock")}
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
        >
          {isLoading ? (
            <div className="py-8 text-center">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No products found matching your filter or search.
            </div>
          ) : (
            products.map((product: any) => {
              const isActive = product.status
                ? product.status.toLowerCase() === "active"
                : product.is_active !== false;

              const primaryVariant = product.variants?.[0];
              const stockInfo = primaryVariant
                ? getStockDisplay(primaryVariant)
                : { value: product.total_stock_base_units ?? 0, unit: product.base_unit_name || "units" };
              
              const rawStock = stockInfo.value;
              const numStock = typeof rawStock === 'number' ? rawStock : parseFloat(String(rawStock)) || 0;
              const formattedStock = formatQty(numStock);
              const unit = stockInfo.unit || product.base_unit_name || "units";
              const tierBreakdown = getTierBreakdown(
                numStock,
                unit,
                primaryVariant?.packaging_tiers || product.packaging_tiers
              );

              const isOutOfStock = numStock === 0;
              const isLowStock = numStock > 0 && numStock <= 5;
              const variantCount = product.variants?.length || 0;
              const price = primaryVariant ? getRetailPrice(primaryVariant) : 0;
              const sku = primaryVariant?.sku || product.sku || "—";

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setSelectedProductForDetail(product);
                    setIsDetailModalOpen(true);
                  }}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden bg-muted flex items-center justify-center border border-border">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate max-w-[170px]">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                        {product.category || "General"} • {sku} {variantCount > 1 ? `• ${variantCount} variants` : ""}
                      </p>
                      <div className="mt-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded",
                            isOutOfStock
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isLowStock
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : `${formattedStock} ${unit}${tierBreakdown ? ` (${tierBreakdown})` : ""}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-[12px] text-foreground block">
                      <CurrencyDisplay amount={price} symbolClassName="text-xs" />
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isActive ? "ACTIVE" : product.status?.toUpperCase() || "DRAFT"}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite Scroll Sentinel & Loading indicator */}
          {products.length > 0 && (
            <div ref={sentinelRef} className="py-4 text-center">
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  <span>Loading more products...</span>
                </div>
              ) : pagination && !pagination.hasNext ? (
                <span className="text-[11px] text-muted-foreground font-medium">
                  All {pagination.total || products.length} products loaded
                </span>
              ) : null}
            </div>
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
          title="Total Products"
          value={isLoading ? '...' : totalProducts}
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
                { key: "variants", label: "Variants" },
                { key: "total_stock", label: "Total Stock" },
                { key: "status", label: "Status" },
              ]
            : [
                { key: "image", label: "Image" },
                { key: "name", label: "Name" },
                { key: "category", label: "Category" },
                { key: "sku", label: "SKU" },
                { key: "sell_mode", label: "Sell Mode" },
                { key: "price", label: "Price" },
                { key: "stock", label: "Stock" },
                { key: "status", label: "Status" },
              ]
        }
        rows={tableRows}
        isLoading={isLoading}
        serverPagination={pagination}
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
            )
          }
        ]}
        rowActions={[
          { key: "edit", label: "Edit Product", icon: "fluent:edit-20-filled" },
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
          if (actionKey === "edit") {
            handleEdit(originalProduct);
          } else if (actionKey === "archive" || actionKey === "toggle_status") {
            setProductToToggleStatus(originalProduct);
            setIsStatusModalOpen(true);
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

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={isDeleteModalOpen}
        onOpenChange={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        size="md"
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold text-destructive">
              Delete Product
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              This action cannot be undone.
            </p>
          </div>
        }
        body={
          <div className="p-2 py-4">
            <p className="text-sm text-foreground">
              Are you sure you want to delete{" "}
              <strong>{productToDelete?.name}</strong>? This will remove it
              permanently from your inventory.
            </p>
          </div>
        }
        footer={
          <div className="flex gap-2 w-full justify-end px-2 pb-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
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
