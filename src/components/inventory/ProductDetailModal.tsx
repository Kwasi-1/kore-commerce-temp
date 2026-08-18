import React, { useState, useEffect } from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/hooks";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Package } from "lucide-react";
import apiClient from "@/api/client";
import { PackagingStockDisplay } from "@/components/inventory/PackagingStockDisplay";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onEdit?: (product: any) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  onEdit,
}: ProductDetailModalProps) {
  const [detailTab, setDetailTab] = useState<"details" | "history">("details");
  const [productData, setProductData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

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
            setSelectedVariantId(freshData.variants[0].id);
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
    if (isOpen && detailTab === "history" && productData) {
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
  }, [isOpen, detailTab, selectedVariantId, productData]);

  if (!product) return null;

  const currentProduct = productData || product;
  const variants = currentProduct.variants || [];
  const activeVariant =
    variants.find((v: any) => v.id === selectedVariantId) || variants[0] || null;

  const isActive = currentProduct.status
    ? currentProduct.status.toLowerCase() === "active"
    : currentProduct.is_active !== false;

  const productImageUrl =
    currentProduct.images && currentProduct.images[0]
      ? currentProduct.images[0]
      : currentProduct.imageUrl;

  // Extract primary retail price for active variant
  const defaultTier =
    activeVariant?.packaging_tiers?.find(
      (t: any) => t.is_default_sale_unit || t.is_base_unit
    ) || activeVariant?.packaging_tiers?.[0];
  const primaryRetailPrice =
    defaultTier?.prices?.find((p: any) => p.price_type === "retail")?.price ?? 0;
  const primaryWholesalePrice =
    defaultTier?.prices?.find((p: any) => p.price_type === "wholesale")?.price;

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
          <div className="flex items-start justify-between gap-3 pr-6">
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
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold uppercase text-foreground truncate">
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
          </div>
        </div>
      }
      body={
        <div className="space-y-4 pb-2 text-xs">
          {/* TAB 1: PRODUCT DETAILS */}
          {detailTab === "details" && (
            <div className="space-y-4">
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

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
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

              {/* Variants & Packaging Tiers Matrix */}
              <div>
                <div className="flex items-center justify-between">
                  {/* <span className="text-xs font-bold text-foreground">
                    Packaging Tiers & Pricing
                  </span> */}
                  {variants.length > 1 && (
                    <div className="justify-end ml-auto flex items-center gap-1 overflow-x-auto max-w-[260px] pb-2.5">
                      {variants.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-[5px] border transition-all ${
                            activeVariant?.id === v.id
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {Object.values(v.variant_attributes || {}).join(" / ") ||
                            v.sku}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {activeVariant ? (
                  <div className="border border-border/70 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider bg-muted/20">
                          <th className="p-2.5">Packaging Unit</th>
                          <th className="p-2.5 text-center">Contains</th>
                          <th className="p-2.5 text-right">Retail Price</th>
                          <th className="p-2.5 text-right">Wholesale</th>
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
                                  <td className="p-2.5 font-medium text-foreground">
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
                                  <td className="p-2.5 text-center font-mono text-muted-foreground">
                                    {tier.units_per_tier}{" "}
                                    {activeVariant.base_unit_name || "unit"}s
                                  </td>
                                  <td className="p-2.5 text-right font-semibold text-foreground">
                                    {retailPriceRec ? (
                                      <CurrencyDisplay
                                        amount={Number(retailPriceRec.price || 0)}
                                        showStyling={false}
                                      />
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right text-muted-foreground">
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
              {variants.length > 1 && (
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

              {isLoadingHistory ? (
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
          {onEdit && (
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
