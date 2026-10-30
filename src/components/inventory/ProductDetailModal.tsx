import React, { useState, useEffect, useRef } from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/hooks";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Package } from "lucide-react";
import apiClient from "@/api/client";
import { BatchHistoryList, CostHistoryList, ProductChangesList } from "@/components/inventory/ProductHistoryPanels";
import { PackagingStockDisplay } from "@/components/inventory/PackagingStockDisplay";
import { useFeaturesStore } from "@/store/featuresStore";
import { cn } from "@/lib/utils";
import { useCan } from '@/hooks/usePermissions';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  /** The variant whose row was clicked; the panel opens on it instead of the first one. */
  initialVariantId?: string | null;
  onEdit?: (product: any) => void;
  /** In-house products: open "Record batch" (also the mobile entry point). */
  onRecordBatch?: (productId: string) => void;
  onToggleChannel?: (product: any) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  initialVariantId,
  onEdit,
  onRecordBatch,
  onToggleChannel,
}: ProductDetailModalProps) {
  const hasEcommerce = useFeaturesStore((s) => s.hasModule("ecommerce"));
  const madeInHouseEnabled = useFeaturesStore((s) => !!s.posSettings?.made_in_house_enabled);
  const [detailTab, setDetailTab] = useState<"details" | "history">("details");
  const [historyView, setHistoryView] = useState<"stock" | "cost" | "batches" | "changes">("stock");
  // Cost price and cost history need "Profit & costs"
  const can = useCan();
  const canSeeCosts = can("reports.profit");
  const [productData, setProductData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Opening the panel selects the clicked variant; later refreshes of the same product keep
  // whichever variant the user has picked since
  const openedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !product) {
      openedForRef.current = null;
      return;
    }
    if (openedForRef.current !== product.id) {
      openedForRef.current = product.id;
      setSelectedVariantId(initialVariantId || null);
    }
  }, [isOpen, product, initialVariantId]);

  useEffect(() => {
    if (isOpen && product) {
      setDetailTab("details");
      setIsLoading(true);
      setProductData(product);

      // Fetch fresh full product details including variants & pricing tiers
      apiClient
        .get(`/tenant/products/${product.id}`)
        .then((res) => {
          const freshData = res.data.success?.data?.product || product;
          setProductData(freshData);
          if (freshData.variants?.length > 0) {
            setSelectedVariantId((prev) =>
              prev && freshData.variants.some((v: any) => v.id === prev)
                ? prev
                : (freshData.variants.find((v: any) => v.is_active !== false) || freshData.variants[0]).id
            );
          }
        })
        .catch((err) => {
          console.error("Failed to load product details:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, product]);

  // Load history when history tab is active
  useEffect(() => {
    if (isOpen && detailTab === "history" && historyView === "stock" && productData) {
      const variantId = selectedVariantId || productData.variants?.[0]?.id;
      if (variantId) {
        setIsLoadingHistory(true);
        apiClient
          .get(`/tenant/products/variants/${variantId}/stock-history`)
          .then((res) => {
            setHistoryItems(res.data.success?.data?.history || []);
          })
          .catch((err) => { 
            console.error("Failed to load stock history:", err);
            setHistoryItems([]);
          })
          .finally(() => {
            setIsLoadingHistory(false);
          });
      }
    }
  }, [isOpen, detailTab, historyView, selectedVariantId, productData]);

  if (!product) return null;

  const currentProduct = productData || product;
  // In-house products: "Record Batch" is the primary action; Edit moves to the header
  const showBatch = !!onRecordBatch && !!currentProduct.is_made_in_house && madeInHouseEnabled;
  // Inactive variants (switched off, or removed in the product form) stay visible, last and greyed
  const variants = [...(currentProduct.variants || [])].sort(
    (a: any, b: any) => Number(a.is_active === false) - Number(b.is_active === false)
  );
  const activeVariant =
    variants.find((v: any) => v.id === selectedVariantId) || variants[0] || null;

  const isActive = currentProduct.status
    ? currentProduct.status.toLowerCase() === "active"
    : currentProduct.is_active !== false;

  // The selected variant's own photo, else the product's main photo
  const productImageUrl =
    activeVariant?.image_url ||
    (currentProduct.images && currentProduct.images[0] ? currentProduct.images[0] : currentProduct.imageUrl);

  // Extract primary retail price for active variant
  const defaultTier =
    activeVariant?.packaging_tiers?.find(
      (t: any) => t.is_default_sale_unit || t.is_base_unit
    ) || activeVariant?.packaging_tiers?.[0];
  const primaryRetailPrice =
    defaultTier?.prices?.find((p: any) => p.price_type === "retail")?.price ?? 0;
  const primaryWholesalePrice =
    defaultTier?.prices?.find((p: any) => p.price_type === "wholesale")?.price;

  const productTags: string[] = Array.isArray(currentProduct.tags)
    ? currentProduct.tags.filter(Boolean)
    : typeof currentProduct.tags === "string" && currentProduct.tags.trim()
      ? currentProduct.tags.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean)
      : [];

  const isOnline =
    currentProduct.is_available_online !== false &&
    currentProduct.isAvailableOnline !== false;

  const isSelectedVariantOnline = activeVariant
    ? activeVariant.is_available_online !== false &&
      activeVariant.isAvailableOnline !== false
    : isOnline;

  const selectedInactive = variants.length > 1 && activeVariant?.is_active === false;
  const activeVariantName =
    Object.values(activeVariant?.variant_attributes || {}).join(" / ") ||
    activeVariant?.sku ||
    "";

  const targetToToggle =
    variants.length > 1 && activeVariant
      ? {
          ...activeVariant,
          name: activeVariantName
            ? `${currentProduct.name} (${activeVariantName})`
            : currentProduct.name,
          is_available_online: isSelectedVariantOnline,
          isAvailableOnline: isSelectedVariantOnline,
          isVariant: true,
          productId: currentProduct.id,
        }
      : currentProduct;

  const currentDisplayOnline =
    variants.length > 1 ? isSelectedVariantOnline : isOnline;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="md"
      placement="right"
      classNames={{
        base: "min-w-[calc(100%-0.75rem)] sm:w-[500px] md:w-[540px] scrollbar-hide",
      }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-3">
          <div className="flex items-start justify-between gap-3 pr3">
            <div className="flex items-center gap-3 min-w-0">
              {productImageUrl ? (
                <img
                  src={productImageUrl}
                  alt={currentProduct.name}
                  className="h-11 w-11 rounded-lg object-cover border border-border bg-muted shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold capitalize text-foreground truncate">
                    {currentProduct.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-1 leading-[1.5] rounded text-[11px] font-semibold capitalize shrink-0 ${
                      isActive
                        ? "text-green-600 dark:text-green-400 bg-green-500/5"
                        : "text-muted-foreground bg-muted border border-border"
                    }`}
                  >
                    {currentProduct.status || (isActive ? "Active" : "Draft")}
                  </span>
                  {hasEcommerce && (
                    <button
                      type="button"
                      onClick={() => onToggleChannel && onToggleChannel(targetToToggle)}
                      disabled={!onToggleChannel}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 !leading-[1.5] rounded text-[11px] font-semibold border transition-all shrink-0",
                        currentDisplayOnline
                          ? "bg-muted text-foreground border-border/80 shadow-xs"
                          : "bg-muted/40 text-muted-foreground border-border/50",
                        onToggleChannel ? "cursor-pointer hover:bg-muted active:scale-95" : ""
                      )}
                      title={onToggleChannel ? "Click to change sales channel" : undefined}
                    >
                      <Icon
                        icon={currentDisplayOnline ? "solar:global-linear" : "iconoir:shop-window"}
                        className="h-3 w-3"
                      />
                      <span>{currentDisplayOnline ? "Online & POS" : "In-Store Only"}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  <span>{currentProduct.category || "Uncategorized"}</span>
                  {(activeVariant?.sku || currentProduct.sku) && (
                    <>
                      <span className="mx-1.5 opacity-50">·</span>
                      <span className="font-mono text-[11px]">
                        {activeVariant?.sku || currentProduct.sku}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            {showBatch && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                radius="lg"
                onClick={() => onEdit(currentProduct)}
                className="self-end h-9 w-9 text-xs font-semibold gap-1.5 border-border/70 shrink-0"
              >
                <Icon icon="andrsrxn:edit" className="h-3.5 w-3.5" />
                {/* Edit */}
              </Button>
            )}
          </div>
        </div>
      }
      body={
        <div className="space-y-4 pb-2 text-xs">
          {/* TAB 1: PRODUCT DETAILS */}
          {detailTab === "details" && (
            <div className="space-y-4">
              {/* Sales Channel Card if E-Commerce is enabled */}
              {hasEcommerce && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {isSelectedVariantOnline ? "Online Storefront & POS" : "In-Store POS Only"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-muted text-muted-foreground border border-border/40">
                          {selectedInactive ? "Inactive" : isSelectedVariantOnline ? "Published" : "Hidden Online"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {selectedInactive ? (
                          `Selected variant (${Object.values(activeVariant?.variant_attributes || {}).join(" / ") || activeVariant?.sku || "Variant"}) is inactive: it isn't sold at the till or online`
                        ) : variants.length > 1 ? (
                          isSelectedVariantOnline
                            ? `Selected variant (${Object.values(activeVariant?.variant_attributes || {}).join(" / ") || activeVariant?.sku || "Variant"}) is available online and for in-store checkout`
                            : `Selected variant (${Object.values(activeVariant?.variant_attributes || {}).join(" / ") || activeVariant?.sku || "Variant"}) is exclusive to physical in-store POS register`
                        ) : (
                          isOnline
                            ? "Item is live on online storefront and available for in-store checkout"
                            : "Item is restricted to physical in-store POS register"
                        )}
                      </p>
                    </div>
                  </div>
                  {onToggleChannel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleChannel(targetToToggle)}
                      className="h-7 text-[11px] font-semibold px-2.5 rounded-md shrink-0 ml-2"
                    >
                      Change
                    </Button>
                  )}
                </div>
              )}

              {/* Snapshot Highlight Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3  rounded-sm bg-muted/30">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                    Stock Level
                  </span>
                  <div className="font-bold text-foreground text-xs">
                    {activeVariant?.packaging_tiers &&
                    activeVariant.packaging_tiers.length > 0 ? (
                      <PackagingStockDisplay
                        quantity={activeVariant.stock_quantity ?? currentProduct.stock_quantity ?? 0}
                        baseUnitName={activeVariant.base_unit_name || "unit"}
                        packagingTiers={activeVariant.packaging_tiers}
                      />
                    ) : (
                      <span>
                        {activeVariant?.stock_quantity ?? currentProduct.stock_quantity ?? 0}{" "}
                        {activeVariant?.base_unit_name || "units"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                    Retail Price
                  </span>
                  <span className="font-bold text-foreground text-sm block">
                    <CurrencyDisplay
                      amount={Number(primaryRetailPrice || 0)}
                      showStyling={false}
                    />
                  </span>
                </div>

                <div className={cn("space-y-1.5 col-span-2 sm:col-span-1", !canSeeCosts && "hidden")}>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                    Cost Price
                  </span>
                  <span className="font-medium text-muted-foreground text-sm block">
                    <CurrencyDisplay
                      amount={Number(activeVariant?.cost_price_per_base_unit || 0)}
                      showStyling={false}
                    />
                  </span>
                </div>
              </div>

              {/* Description (if present) */}
              {currentProduct.description && (
                <div className="p-3 rounded border border-border/50 space-y-1">
                  <span className="text-xs font-semibold text-foreground block !tracking-wide">
                    Description
                  </span>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {currentProduct.description}
                  </p>
                </div>
              )}

              {/* Search Tags (if present) */}
              {productTags.length > 0 && (
                <div className="p-3 rounded border border-border/50 space-y-2">
                  {/* <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground block !tracking-wide">
                      Search Tags
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {productTags.length} {productTags.length === 1 ? "tag" : "tags"}
                    </span>
                  </div> */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {productTags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground shadow-2xs"
                      >
                        <span className="text-muted-foreground/80 font-mono text-[11px]">#</span>
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants & Packaging Tiers Matrix */}
              <div className="space-y-3">
                {variants.length > 1 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
                      {variants.map((v: any) => {
                        const isVInactive = v.is_active === false;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariantId(v.id)}
                            title={isVInactive ? "Inactive: not sold at the till or online" : undefined}
                            className={`px-3 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 ${
                              activeVariant?.id === v.id
                                ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                                : isVInactive
                                  ? "border-dashed border-border text-muted-foreground/60 hover:text-muted-foreground"
                                  : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <span>
                              {Object.values(v.variant_attributes || {}).join(" / ") ||
                                v.sku}
                            </span>
                            {isVInactive && (
                              <span className="text-[10px] font-medium opacity-80">Inactive</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeVariant ? (
                  <div className="border border-border/70 rounded-md overflow-hidden bg-card">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full min-w-[340px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider bg-muted/20">
                            <th className="p-2.5 whitespace-nowrap">Packaging Unit</th>
                            <th className="p-2.5 text-center whitespace-nowrap">Contains</th>
                            <th className="p-2.5 text-right whitespace-nowrap">Retail Price</th>
                            <th className="p-2.5 text-right whitespace-nowrap">Wholesale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {(activeVariant.packaging_tiers || []).length === 0 ? (
                            <tr>
                              <td className="p-2.5 font-medium text-foreground">
                                Base Unit ({activeVariant.base_unit_name || "unit"})
                              </td>
                              <td className="p-2.5 text-center font-mono text-muted-foreground">
                                1 {activeVariant.base_unit_name || "unit"}
                              </td>
                              <td className="p-2.5 text-right font-semibold text-foreground">
                                <CurrencyDisplay
                                  amount={Number(primaryRetailPrice || 0)}
                                  showStyling={false}
                                />
                              </td>
                              <td className="p-2.5 text-right text-muted-foreground">
                                —
                              </td>
                            </tr>
                          ) : (
                            activeVariant.packaging_tiers.map(
                              (tier: any, tIdx: number) => {
                                const retailPriceRec = tier.prices?.find(
                                  (p: any) => p.price_type === "retail"
                                );
                                const wholesalePriceRec = tier.prices?.find(
                                  (p: any) => p.price_type === "wholesale"
                                );

                                return (
                                  <tr key={tIdx} className="hover:bg-muted/10">
                                    <td className="p-2.5 font-medium text-foreground whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <span>{tier.name}</span>
                                        {tier.is_base_unit && (
                                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                            Base
                                          </span>
                                        )}
                                        {tier.is_default_sale_unit && (
                                          <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                                            POS
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-center font-mono text-muted-foreground whitespace-nowrap">
                                      {tier.units_per_tier}{" "}
                                      {activeVariant.base_unit_name || "unit"}s
                                    </td>
                                    <td className="p-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                                      {retailPriceRec ? (
                                        <CurrencyDisplay
                                          amount={Number(retailPriceRec.price || 0)}
                                          showStyling={false}
                                        />
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="p-2.5 text-right text-muted-foreground whitespace-nowrap">
                                      {wholesalePriceRec ? (
                                        <CurrencyDisplay
                                          amount={Number(wholesalePriceRec.price || 0)}
                                          showStyling={false}
                                        />
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                );
                              }
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground border border-dashed border-border/70 rounded-lg">
                    No variant information available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT HISTORY */}
          {detailTab === "history" && (
            <div className="space-y-3">
              {/* Stock movements · cost price changes · in-house batches */}
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                {([
                  ["stock", "Stock"],
                  ...(canSeeCosts ? [["cost", "Cost"]] : []),
                  ...(currentProduct.is_made_in_house && madeInHouseEnabled ? [["batches", "Batches"]] : []),
                  ["changes", "Changes"],
                ] as [typeof historyView, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryView(key)}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      historyView === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(historyView === "stock" || historyView === "cost") && variants.length > 1 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md border border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Variant Audit:
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto flex-1">
                    {variants.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded transition-all ${
                          activeVariant?.id === v.id
                            ? "bg-foreground text-background font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {Object.values(v.variant_attributes || {}).join(" / ") ||
                          v.sku}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {historyView === "cost" && (
                <CostHistoryList variantId={activeVariant?.id || null} unitName={activeVariant?.base_unit_name || "unit"} />
              )}
              {historyView === "batches" && <BatchHistoryList productId={currentProduct.id} />}
              {historyView === "changes" && <ProductChangesList productId={currentProduct.id} />}

              {historyView !== "stock" ? null : isLoadingHistory ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  <p className="text-xs">Loading audit trail...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-2 border border-dashed border-border/70 rounded-xl">
                  <Icon
                    icon="solar:history-linear"
                    className="h-8 w-8 mx-auto opacity-40 text-muted-foreground"
                  />
                  <p className="font-semibold text-foreground text-sm">
                    No Stock History Recorded
                  </p>
                  <p className="text-xs max-w-xs mx-auto">
                    Stock intakes, purchase receipts, or adjustments will appear here.
                  </p>
                </div>
              ) : (
                <div className={`space-y-2 ${variants.length === 1 ? 'max-h-[calc(100dvh-16.5rem)]' : 'max-h-[calc(100dvh-19.8rem)]'} overflow-y-auto pr-1`}>
                  {historyItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border border-border/70 rounded-lg p-2.5 space-y-1 bg-card/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.isAddition
                                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/5 text-destructive"
                            }`}
                          >
                            {item.isAddition ? "+" : "-"}
                            {item.quantity}{" "}
                            {item.baseUnitName || activeVariant?.base_unit_name || "units"}
                          </span>
                          <span className="font-semibold text-foreground text-xs capitalize">
                            {item.reason || item.type || "Adjustment"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {item.date
                            ? new Date(item.date).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded border border-border/30">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>By: {item.staffName || "Staff"}</span>
                        {item.previousQuantity !== undefined &&
                          item.newQuantity !== undefined && (
                            <span>
                              {item.previousQuantity} →{" "}
                              <strong className="text-foreground">{item.newQuantity}</strong>
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex flex-col gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDetailTab(detailTab === "details" ? "history" : "details")
            }
            className="h-10 w-full px-2.5 text-xs font-semibold flex items-center gap-1.5 border-border/70 hover:bg-muted shrink-0"
          >
            {detailTab === "details" ? (
              <>
                <Icon
                  icon="solar:history-linear"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
                <span>Audit History</span>
              </>
            ) : (
              <>
                <Icon
                  icon="solar:box-minimalistic-linear"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
                <span>Product Details</span>
              </>
            )}
          </Button>
          {showBatch && (
            <Button
              size="sm"
              type="button"
              onClick={() => onRecordBatch!(currentProduct.id)}
              className="w-full text-xs font-semibold flex items-center justify-center gap-2 h-10"
            >
              <Icon icon="fluent:beaker-20-regular" className="h-4 w-4" />
              <span>Record Batch</span>
            </Button>
          )}
          {onEdit && !showBatch && (
            <Button
              size="sm"
              type="button"
              // variant="outline"
              onClick={() => onEdit(currentProduct)}
              className="w-full text-xs font-semibold flex items-center justify-center gap-2 h-10"
            >
              <Icon icon="solar:pen-linear" className="h-4 w-4" />
              <span>Edit Product</span>
            </Button>
          )}
        </div>
      }
    />
  );
}
