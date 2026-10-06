import React, { useState, useEffect, useMemo } from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { CurrencyDisplay } from "@/hooks";
import { Icon } from "@iconify/react";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface StorefrontCatalogCuratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getVariantDisplayName(v: any, index: number): string {
  if (v.variant_attributes && typeof v.variant_attributes === "object") {
    const values = Object.values(v.variant_attributes).filter(Boolean);
    if (values.length > 0) {
      return values.join(" / ");
    }
  }
  if (v.sku && v.sku !== "—") return v.sku;
  return `Variant #${index + 1}`;
}

function getVariantAttributesDetail(v: any): string {
  if (v.variant_attributes && typeof v.variant_attributes === "object") {
    const entries = Object.entries(v.variant_attributes).filter(([_, val]) => Boolean(val));
    if (entries.length > 0) {
      return entries.map(([key, val]) => `${key}: ${val}`).join(", ");
    }
  }
  return "";
}

function getVariantRetailPrice(v: any): number | null {
  const defaultTier =
    v.packaging_tiers?.find((t: any) => t.is_default_sale_unit || t.is_base_unit) ||
    v.packaging_tiers?.[0];
  const retailPrice =
    defaultTier?.prices?.find((p: any) => p.price_type === "retail")?.price ??
    defaultTier?.selling_price;
  if (retailPrice !== undefined && retailPrice !== null) {
    return Number(retailPrice);
  }
  return null;
}

export function StorefrontCatalogCuratorModal({
  isOpen,
  onClose,
  onSuccess,
}: StorefrontCatalogCuratorModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Track online status for products & individual variants
  const [productStatusMap, setProductStatusMap] = useState<Record<string, boolean>>({});
  const [initialProductStatusMap, setInitialProductStatusMap] = useState<Record<string, boolean>>({});
  const [variantStatusMap, setVariantStatusMap] = useState<Record<string, boolean>>({});
  const [initialVariantStatusMap, setInitialVariantStatusMap] = useState<Record<string, boolean>>({});

  // Accordion expansion states
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const loadAllProducts = async () => {
      setIsLoading(true);
      try {
        // Fetch up to 1000 products to allow comprehensive catalog curation
        const res = await apiClient.get("/tenant/products?limit=1000");
        const prods: any[] = res.data?.success?.data?.products || [];
        setProducts(prods);

        const pMap: Record<string, boolean> = {};
        const vMap: Record<string, boolean> = {};
        const initialCategoriesExpanded: Record<string, boolean> = {};

        prods.forEach((p) => {
          const cat = p.category || "General";
          initialCategoriesExpanded[cat] = true;

          const pOnline = p.is_available_online !== false && p.isAvailableOnline !== false;
          pMap[p.id] = pOnline;

          const variants: any[] = p.variants || [];
          variants.forEach((v) => {
            // A variant is online if its is_available_online is not explicitly false
            const vOnline = v.is_available_online !== false && v.isAvailableOnline !== false;
            vMap[v.id] = vOnline;
          });
        });

        setProductStatusMap(pMap);
        setInitialProductStatusMap(pMap);
        setVariantStatusMap(vMap);
        setInitialVariantStatusMap(vMap);
        setExpandedCategories(initialCategoriesExpanded);
        setExpandedProducts({});
      } catch (err: any) {
        console.error("Failed to load products for catalog curation:", err);
        toast.error("Failed to load products catalog");
      } finally {
        setIsLoading(false);
      }
    };

    loadAllProducts();
  }, [isOpen]);

  // Group products by category
  const categoriesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    products.forEach((p) => {
      const cat = p.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categoriesMap;

    const filtered: Record<string, any[]> = {};
    Object.entries(categoriesMap).forEach(([cat, catProducts]) => {
      const catMatches = cat.toLowerCase().includes(q);
      const matchingProducts = catProducts.filter((p) => {
        if (catMatches) return true;
        if (p.name?.toLowerCase().includes(q)) return true;
        if (p.sku && p.sku.toLowerCase().includes(q)) return true;

        // Check variants
        const hasMatchingVariant = (p.variants || []).some((v: any) => {
          if (v.sku && v.sku.toLowerCase().includes(q)) return true;
          if (v.variant_attributes && typeof v.variant_attributes === "object") {
            const vals = Object.values(v.variant_attributes).map((x) =>
              String(x).toLowerCase()
            );
            if (vals.some((val) => val.includes(q))) return true;
          }
          return false;
        });

        return hasMatchingVariant;
      });

      if (matchingProducts.length > 0) {
        filtered[cat] = matchingProducts;
      }
    });

    return filtered;
  }, [categoriesMap, searchQuery]);

  // Calculate totals
  const totalProductsCount = products.length;
  const onlineProductsCount = useMemo(() => {
    return Object.values(productStatusMap).filter(Boolean).length;
  }, [productStatusMap]);

  const allVariantsList = useMemo(() => {
    const list: any[] = [];
    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        list.push(...p.variants);
      }
    });
    return list;
  }, [products]);

  const totalVariantsCount = allVariantsList.length;
  const onlineVariantsCount = useMemo(() => {
    return Object.values(variantStatusMap).filter(Boolean).length;
  }, [variantStatusMap]);

  // Toggle variant individual state
  const handleToggleVariant = (productId: string, variantId: string, targetVal: boolean) => {
    setVariantStatusMap((prev) => {
      const nextVariantMap = { ...prev, [variantId]: targetVal };

      // Update parent product state: if at least 1 variant is online, product is online.
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.variants) {
        const hasAnyOnline = prod.variants.some((v: any) =>
          v.id === variantId ? targetVal : Boolean(nextVariantMap[v.id])
        );
        setProductStatusMap((pPrev) => ({
          ...pPrev,
          [productId]: hasAnyOnline,
        }));
      }

      return nextVariantMap;
    });
  };

  // Toggle product master state (cascades to all variants)
  const handleToggleProduct = (productId: string, targetVal: boolean) => {
    setProductStatusMap((prev) => ({
      ...prev,
      [productId]: targetVal,
    }));

    const prod = products.find((p) => p.id === productId);
    if (prod && prod.variants && prod.variants.length > 0) {
      setVariantStatusMap((prev) => {
        const next = { ...prev };
        prod.variants.forEach((v: any) => {
          next[v.id] = targetVal;
        });
        return next;
      });
    }
  };

  // Toggle entire category
  const handleToggleCategory = (category: string, targetState: boolean) => {
    const catProducts = categoriesMap[category] || [];
    setProductStatusMap((prev) => {
      const nextP = { ...prev };
      catProducts.forEach((p) => {
        nextP[p.id] = targetState;
      });
      return nextP;
    });

    setVariantStatusMap((prev) => {
      const nextV = { ...prev };
      catProducts.forEach((p) => {
        (p.variants || []).forEach((v: any) => {
          nextV[v.id] = targetState;
        });
      });
      return nextV;
    });
  };

  // Bulk select all or deselect all
  const handleSetAll = (targetState: boolean) => {
    setProductStatusMap((prev) => {
      const nextP = { ...prev };
      products.forEach((p) => {
        nextP[p.id] = targetState;
      });
      return nextP;
    });

    setVariantStatusMap((prev) => {
      const nextV = { ...prev };
      allVariantsList.forEach((v) => {
        nextV[v.id] = targetState;
      });
      return nextV;
    });
  };

  const toggleCategoryExpanded = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Save changes
  const handleSave = async () => {
    // 1. Gather changed variants
    const variantUpdates: { id: string; is_available_online: boolean }[] = [];
    Object.entries(variantStatusMap).forEach(([vId, currentOnline]) => {
      if (initialVariantStatusMap[vId] !== currentOnline) {
        variantUpdates.push({ id: vId, is_available_online: currentOnline });
      }
    });

    // 2. Gather standalone products with 0 variants that changed
    const standaloneToEnable: string[] = [];
    const standaloneToDisable: string[] = [];
    products.forEach((p) => {
      if (!p.variants || p.variants.length === 0) {
        const curOnline = Boolean(productStatusMap[p.id]);
        const wasOnline = Boolean(initialProductStatusMap[p.id]);
        if (curOnline !== wasOnline) {
          if (curOnline) standaloneToEnable.push(p.id);
          else standaloneToDisable.push(p.id);
        }
      }
    });

    if (
      variantUpdates.length === 0 &&
      standaloneToEnable.length === 0 &&
      standaloneToDisable.length === 0
    ) {
      toast("No changes to sync", { icon: "ℹ️" });
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // Send variant updates (backend automatically updates parent products)
      if (variantUpdates.length > 0) {
        promises.push(
          apiClient.post("/tenant/products/bulk-channel", {
            variant_updates: variantUpdates,
          })
        );
      }

      // Send standalone products updates if any exist
      if (standaloneToEnable.length > 0) {
        promises.push(
          apiClient.post("/tenant/products/bulk-channel", {
            product_ids: standaloneToEnable,
            is_available_online: true,
          })
        );
      }

      if (standaloneToDisable.length > 0) {
        promises.push(
          apiClient.post("/tenant/products/bulk-channel", {
            product_ids: standaloneToDisable,
            is_available_online: false,
          })
        );
      }

      await Promise.all(promises);
      toast.success(
        `Updated storefront catalog! (${variantUpdates.length + standaloneToEnable.length + standaloneToDisable.length} items updated)`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Bulk sync error:", err);
      toast.error(err?.response?.data?.error?.message || "Failed to update storefront products");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isSaving) onClose();
      }}
      size="xl"
      header={
        <div className="pt-1 px-1 border-b border-border/50 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="text-lg font-bold text-foreground !tracking-tight">
                  Curate Storefront Catalog
                </h2>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Toggle products or expand multi-variant groups to choose individual sizes and colors for your online store
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs mr-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetAll(true)}
                className="h-8 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Icon icon="solar:check-read-linear" className="h-3.5 w-3.5 mr-1" />
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetAll(false)}
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Set All In-Store
              </Button>
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="mt-3 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category, product name, variant (e.g. Large), or SKU..."
              className="h-9 text-xs bg-muted/30 rounded-lg border-border/60 focus-visible:ring-1"
            />
          </div>
        </div>
      }
      body={
        <div className="py-2 max-h-[58vh] overflow-y-auto space-y-3 pr-1 scrollbar-hide">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="h-6 w-6 text-primary" />
              <p className="text-xs font-medium">Loading catalog...</p>
            </div>
          ) : Object.keys(filteredCategories).length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No categories or products match your search.
            </div>
          ) : (
            Object.entries(filteredCategories).map(([category, catProducts]) => {
              const allOnline = catProducts.every((p) => productStatusMap[p.id]);
              const someOnline = catProducts.some((p) => productStatusMap[p.id]);
              const isExpanded = expandedCategories[category] !== false;
              const onlineInCat = catProducts.filter((p) => productStatusMap[p.id]).length;

              return (
                <div
                  key={category}
                  className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-xs"
                >
                  {/* Category Header Strip */}
                  <div className="px-3.5 py-2.5 bg-muted/30 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpanded(category)}
                      className="flex items-center gap-2 text-left group flex-1 min-w-0"
                    >
                      <Icon
                        icon={isExpanded ? "solar:alt-arrow-down-linear" : "solar:alt-arrow-right-linear"}
                        className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform"
                      />
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {category}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {onlineInCat} of {catProducts.length} items online
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                        {allOnline ? "All Online" : someOnline ? "Partial" : "In-Store"}
                      </span>
                      <Switch
                        checked={allOnline}
                        onCheckedChange={(checked) => handleToggleCategory(category, checked)}
                      />
                    </div>
                  </div>

                  {/* Products list under this category */}
                  {isExpanded && (
                    <div className="divide-y divide-border/40 px-2 py-1 bg-background/50">
                      {catProducts.map((p) => {
                        const isProductOnline = Boolean(productStatusMap[p.id]);
                        const variants: any[] = p.variants || [];
                        const hasMultipleVariants = variants.length > 1;
                        const isProdExpanded = Boolean(expandedProducts[p.id]);

                        const onlineVarCount = variants.filter(
                          (v) => variantStatusMap[v.id]
                        ).length;

                        // Calculate status pill text & style
                        let variantStatusText = "";
                        let variantStatusBadgeClass = "";
                        if (hasMultipleVariants) {
                          if (onlineVarCount === variants.length) {
                            variantStatusText = "All Online";
                            variantStatusBadgeClass =
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                          } else if (onlineVarCount > 0) {
                            variantStatusText = `${onlineVarCount}/${variants.length} Online`;
                            variantStatusBadgeClass =
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                          } else {
                            variantStatusText = "In-Store Only";
                            variantStatusBadgeClass =
                              "bg-muted text-muted-foreground border-border/50";
                          }
                        }

                        // Default retail price from first variant or packaging tier
                        const firstVarPrice =
                          variants.length > 0 ? getVariantRetailPrice(variants[0]) : null;

                        return (
                          <div key={p.id} className="py-1">
                            <div className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded-lg transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                {/* Expand chevron for multi-variant products */}
                                {hasMultipleVariants ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleProductExpanded(p.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors"
                                    title={isProdExpanded ? "Collapse variants" : "Expand variants"}
                                  >
                                    <Icon
                                      icon={
                                        isProdExpanded
                                          ? "solar:alt-arrow-down-linear"
                                          : "solar:alt-arrow-right-linear"
                                      }
                                      className="h-3.5 w-3.5"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-5 shrink-0" />
                                )}

                                {/* Product thumbnail */}
                                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                                  {p.images && p.images[0] ? (
                                    <img
                                      src={p.images[0]}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Icon
                                      icon="solar:box-minimalistic-linear"
                                      className="h-3.5 w-3.5 text-muted-foreground"
                                    />
                                  )}
                                </div>

                                <div className="min-w-0 truncate">
                                  <div className="flex items-center gap-2 truncate">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                      {p.name}
                                    </p>
                                    {hasMultipleVariants && (
                                      <button
                                        type="button"
                                        onClick={() => toggleProductExpanded(p.id)}
                                        className={cn(
                                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all shrink-0 cursor-pointer hover:opacity-80",
                                          variantStatusBadgeClass
                                        )}
                                      >
                                        <span>{variants.length} variants</span>
                                        <span className="opacity-60">•</span>
                                        <span>{variantStatusText}</span>
                                      </button>
                                    )}
                                  </div>

                                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {p.sku && p.sku !== "—" ? `${p.sku} • ` : ""}
                                    {firstVarPrice !== null && (
                                      <>
                                        <CurrencyDisplay amount={firstVarPrice} showStyling={false} />
                                        <span> • </span>
                                      </>
                                    )}
                                    {isProductOnline ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        Online & POS
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        In-Store Only
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <Switch
                                  checked={isProductOnline}
                                  onCheckedChange={(checked) =>
                                    handleToggleProduct(p.id, checked)
                                  }
                                />
                              </div>
                            </div>

                            {/* Sub-list of individual variants when expanded */}
                            {hasMultipleVariants && isProdExpanded && (
                              <div className="ml-10 mr-1 mb-2 pl-3 py-1.5 border-l-2 border-border/60 space-y-1.5 bg-muted/10 rounded-r-lg">
                                <div className="flex items-center justify-between px-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground pb-0.5">
                                  <span>Variants Catalog</span>
                                  <span className="font-mono text-[9px] lowercase">
                                    {onlineVarCount} of {variants.length} online
                                  </span>
                                </div>

                                {variants.map((v: any, vIdx: number) => {
                                  const isVOnline = Boolean(variantStatusMap[v.id]);
                                  const displayName = getVariantDisplayName(v, vIdx);
                                  const attrDetail = getVariantAttributesDetail(v);
                                  const price = getVariantRetailPrice(v);
                                  const stock = v.stock_quantity ?? 0;
                                  const unitName = v.base_unit_name || "units";

                                  return (
                                    <div
                                      key={v.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-md border transition-all",
                                        isVOnline
                                          ? "bg-card border-border/80 shadow-2xs"
                                          : "bg-muted/30 border-border/40 opacity-75 hover:opacity-100"
                                      )}
                                    >
                                      <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-foreground">
                                            {displayName}
                                          </span>
                                          {attrDetail && attrDetail !== displayName && (
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                              ({attrDetail})
                                            </span>
                                          )}
                                          <span
                                            className={cn(
                                              "text-[9px] px-1.5 py-0.2 rounded font-semibold",
                                              isVOnline
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-muted text-muted-foreground"
                                            )}
                                          >
                                            {isVOnline ? "Online & POS" : "In-Store Only"}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                                          {v.sku && v.sku !== "—" && (
                                            <span className="font-mono">{v.sku}</span>
                                          )}
                                          {v.sku && v.sku !== "—" && <span>•</span>}
                                          <span>
                                            Stock: {stock} {unitName}
                                          </span>
                                          {price !== null && (
                                            <>
                                              <span>•</span>
                                              <span className="font-semibold text-foreground">
                                                <CurrencyDisplay
                                                  amount={price}
                                                  showStyling={false}
                                                />
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="shrink-0">
                                        <Switch
                                          checked={isVOnline}
                                          onCheckedChange={(checked) =>
                                            handleToggleVariant(p.id, v.id, checked)
                                          }
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-2 pb-1 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-muted/60 !tracking-wide !font-sans text-foreground">
              <Icon icon="solar:global-linear" className="h-3.5 w-3.5 text-foreground/80" />
              {onlineProductsCount} of {totalProductsCount} products online
            </span>
            {totalVariantsCount > 0 && (
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                ({onlineVariantsCount} of {totalVariantsCount} variants)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5"
            >
              {isSaving ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:check-read-linear" className="h-3.5 w-3.5" />
                  <span>Save & Sync</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    />
  );
}
