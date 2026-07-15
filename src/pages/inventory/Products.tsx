import React, { useState, useEffect, useMemo } from "react";
import { Selection } from "@nextui-org/react";
import PageLayout from "@/components/layout/PageLayout";
import CustomModal from "@/components/modals/modal";
import ProductForm from "@/components/inventory/ProductForm";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
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
} from "lucide-react";
import { BulkProductUploadModal } from "./components/BulkProductUploadModal";
import { BulkStockUploadModal } from "./components/BulkStockUploadModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import EnhancedTableComponent from "@/components/shared/MainTableComponent";
import DashboardCard from "@/components/ui/dashboard-card";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "group">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_products_view_mode");
      if (saved === "list" || saved === "group") {
        return saved;
      }
    }
    return "list";
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Selection>(new Set(["all"]));
  const [categoryFilter, setCategoryFilter] = useState<Selection>(
    new Set(["all"]),
  );
  const [categories, setCategories] = useState<string[]>([]);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Row Actions state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accordion / cache state for variants
  const [expandedProductIds, setExpandedProductIds] = useState<
    Record<string, boolean>
  >({});
  const [productVariantsCache, setProductVariantsCache] = useState<
    Record<string, any[]>
  >({});
  const [loadingVariants, setLoadingVariants] = useState<
    Record<string, boolean>
  >({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let url = "/tenant/products?limit=100";
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
      const data = response.data.data.products || [];
      setProducts(data);

      // Extract categories for filter options
      const uniqueCats = Array.from(
        new Set(data.map((p: any) => p.category).filter(Boolean)),
      ) as string[];
      setCategories((prev) => {
        const union = Array.from(new Set([...prev, ...uniqueCats]));
        return union;
      });
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
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
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
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

  const handleUpdateStatus = async (product: any, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/tenant/products/${product.id}/status`, {
        status: newStatus,
      });
      toast.success(`Product marked as ${newStatus}`);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to update product status");
    } finally {
      setIsUpdatingStatus(false);
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
        const productDetails = res.data.data.product;
        const variants = productDetails.variants || [];
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

  const getStockCell = (quantity: number, unitName: string) => {
    const isOutOfStock = quantity === 0;
    const isLowStock = quantity > 0 && quantity <= 5;

    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1 text-destructive font-bold text-[12px]">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {Number(quantity.toFixed(2))} {unitName}
        </span>
      );
    }

    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[12px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {Number(quantity.toFixed(2))} {unitName}
        </span>
      );
    }

    return (
      <span className="text-foreground/80 font-medium text-[12px]">
        {Number(quantity.toFixed(2))} {unitName}
      </span>
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
      return products.map((p) => ({
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/30 dark:bg-inherit dark:text-primary border border-primary/20">
            {p.has_variants ? `${p.variant_count} variants` : "Simple"}
          </span>
        ),
        total_stock: getStockCell(p.total_stock_base_units, "units"),
        status: (
          <span
            className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
              p.status === "active"
                ? "text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-muted-foreground bg-muted border border-border"
            }`}
          >
            {p.status || "Active"}
          </span>
        ),
      }));
    }

    // List view: flatten variants
    const flatRows: any[] = [];
    products.forEach((p) => {
      const vars = p.variants || [];
      if (vars.length === 0) {
        flatRows.push({
          id: p.id,
          __record: p,
          rowClassName: "[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-destructive",
          image: p.images && p.images[0] ? (
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
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
              unit only
            </span>
          ),
          price: "—",
          stock: getStockCell(0, "units"),
          status: (
            <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
              p.status === "active"
                ? "text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-muted-foreground bg-muted border border-border"
            }`}>
              {p.status || "Active"}
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
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground capitalize">
              {v.sell_mode?.replace("_", " ")}
            </span>
          ),
          price: (
            <span className="font-semibold text-foreground">
              GHS {Number(retailPrice).toFixed(2)}
            </span>
          ),
          stock: getStockCell(stockInfo.value, stockInfo.unit),
          status: (
            <span className={`capitalize inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${
              p.status === "active"
                ? "text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-muted-foreground bg-muted border border-border"
            }`}>
              {p.status || "Active"}
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
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
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
  const totalProducts = products.length;
  const outOfStockCount = products.filter(
    (p) => p.total_stock_base_units === 0,
  ).length;
  const lowStockCount = products.filter(
    (p) => p.total_stock_base_units > 0 && p.total_stock_base_units <= 5,
  ).length;

  // Custom total value calculation based on average or base unit prices
  const totalValue = products.reduce(
    (sum, p) => sum + (p.total_stock_base_units || 0),
    0,
  );

  // Status Filter Tabs
  const statuses = [
    { uid: "all", name: "All" },
    { uid: "active", name: "Active" },
    { uid: "draft", name: "Draft" },
    { uid: "archived", name: "Archived" },
  ];

  return (
    <PageLayout title="Products Inventory" constrainHeight={true}>
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
          title="Total Base Units"
          value={isLoading ? '...' : totalValue.toLocaleString()}
          className="border border-border md:col-span-3 lg:col-span-1"
          action={<Layers className="text-muted-foreground/50 h-5 w-5" />}
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
        onRowActionClick={(actionKey, rowData) => {
          const originalProduct = rowData.__record;
          if (actionKey === "edit") {
            handleEdit(originalProduct);
          } else if (actionKey === "archive") {
            handleUpdateStatus(
              originalProduct,
              originalProduct.status === "active" ? "draft" : "active",
            );
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
        customAddButton= {
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
              <DropdownMenuItem
                onClick={() => setIsBulkStockModalOpen(true)}
                className="cursor-pointer text-[13px]"
              >
                <Upload className="h-4 w-4 mr-2" /> Bulk Receive Stock (CSV/Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onRefresh={fetchProducts}
        mobileFriendly={false}
        // containerStyles=""
      />

      {/* Single Product Form Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{
          base: "sm:w-[500px]",
        }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              Fill in the details below.
            </p>
          </div>
        }
        body={
          <div className="p-2 pb-6">
            <ProductForm
              onSuccess={handleFormSuccess}
              onCancel={() => setIsModalOpen(false)}
              initialData={editingProduct}
            />
          </div>
        }
        footer={null}
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

      <BulkStockUploadModal
        isOpen={isBulkStockModalOpen}
        onClose={() => setIsBulkStockModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />
    </PageLayout>
  );
}
