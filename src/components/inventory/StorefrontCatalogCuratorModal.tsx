import React, { useState, useEffect, useMemo } from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { 
  Globe, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Package, 
  CheckCheck, 
  Store,
  Layers,
  Sparkles
} from "lucide-react";
import { Icon } from "@iconify/react";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface StorefrontCatalogCuratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StorefrontCatalogCuratorModal({
  isOpen,
  onClose,
  onSuccess,
}: StorefrontCatalogCuratorModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, boolean>>({});
  const [initialStatusMap, setInitialStatusMap] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
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

        const statusMap: Record<string, boolean> = {};
        prods.forEach((p) => {
          const isOnline = p.is_available_online !== false && p.isAvailableOnline !== false;
          statusMap[p.id] = isOnline;
        });

        setOnlineStatusMap(statusMap);
        setInitialStatusMap(statusMap);

        // Auto-expand all categories by default for easy scanning
        const initialExpanded: Record<string, boolean> = {};
        prods.forEach((p) => {
          const cat = p.category || "General";
          initialExpanded[cat] = true;
        });
        setExpandedCategories(initialExpanded);

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
      const matchingProducts = catProducts.filter(
        (p) =>
          catMatches ||
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );

      if (matchingProducts.length > 0) {
        filtered[cat] = matchingProducts;
      }
    });

    return filtered;
  }, [categoriesMap, searchQuery]);

  // Count active online products
  const totalCount = products.length;
  const onlineCount = useMemo(() => {
    return Object.values(onlineStatusMap).filter(Boolean).length;
  }, [onlineStatusMap]);

  // Toggle single product
  const handleToggleProduct = (productId: string, val: boolean) => {
    setOnlineStatusMap((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  // Toggle entire category
  const handleToggleCategory = (category: string, targetState: boolean) => {
    const catProducts = categoriesMap[category] || [];
    setOnlineStatusMap((prev) => {
      const next = { ...prev };
      catProducts.forEach((p) => {
        next[p.id] = targetState;
      });
      return next;
    });
  };

  // Select all or deselect all
  const handleSetAll = (targetState: boolean) => {
    setOnlineStatusMap((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        next[p.id] = targetState;
      });
      return next;
    });
  };

  const toggleCategoryExpanded = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Save changes
  const handleSave = async () => {
    // Determine which products actually changed
    const toEnableOnline: string[] = [];
    const toDisableOnline: string[] = [];

    Object.entries(onlineStatusMap).forEach(([id, currentOnline]) => {
      const wasOnline = initialStatusMap[id];
      if (currentOnline !== wasOnline) {
        if (currentOnline) {
          toEnableOnline.push(id);
        } else {
          toDisableOnline.push(id);
        }
      }
    });

    if (toEnableOnline.length === 0 && toDisableOnline.length === 0) {
      toast("No changes to sync", { icon: "ℹ️" });
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      if (toEnableOnline.length > 0) {
        promises.push(
          apiClient.post("/tenant/products/bulk-channel", {
            product_ids: toEnableOnline,
            is_available_online: true,
          })
        );
      }

      if (toDisableOnline.length > 0) {
        promises.push(
          apiClient.post("/tenant/products/bulk-channel", {
            product_ids: toDisableOnline,
            is_available_online: false,
          })
        );
      }

      await Promise.all(promises);
      toast.success(
        `Updated ${toEnableOnline.length + toDisableOnline.length} products on your storefront!`
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
              {/* <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Globe className="h-4 w-4" />
              </div> */}
              <div>
                <h2 className="text-lg font-bold text-foreground !tracking-tight">
                  Curate Storefront Catalog
                </h2>
                {/* <p className="text-xs text-muted-foreground leading-tight">
                  Choose which categories and individual items are available to online shoppers
                </p> */}
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
              placeholder="Search category or product..."
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
              const allOnline = catProducts.every((p) => onlineStatusMap[p.id]);
              const someOnline = catProducts.some((p) => onlineStatusMap[p.id]);
              const isExpanded = expandedCategories[category] !== false;
              const onlineInCat = catProducts.filter((p) => onlineStatusMap[p.id]).length;

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
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform" />
                      )}
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
                        const isProductOnline = Boolean(onlineStatusMap[p.id]);

                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                                {p.images && p.images[0] ? (
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0 truncate">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {p.sku && p.sku !== "—" ? `${p.sku} • ` : ""}
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-muted/60 !tracking-wide !font-sans text-foreground">
              <Icon icon="solar:global-linear" className="h-3.5 w-3.5 text-foreground/80" />
              {onlineCount} of {totalCount} online
            </span>
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
                  <Sparkles className="h-3.5 w-3.5" />
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
