import React, { useState, useEffect } from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/hooks";
import { Icon } from "@iconify/react/dist/iconify.js";
import apiClient from "@/api/client";
import { PackagingStockDisplay } from "@/components/inventory/PackagingStockDisplay";
import { getTierBreakdown } from "@/utils/packaging";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onEdit?: (product: any) => void;
  onToggleStatus?: (product: any) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  onEdit,
  onToggleStatus,
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

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="xl"
      placement="right"
      classNames={{
        base: "sm:w-[520px] md:w-[580px] scrollbar-hide",
      }}
      header={
        <div className="pt-2 px-1 md:px-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center justify-between gap-2 md:pr-6">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {currentProduct.name}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* History Toggle Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDetailTab(detailTab === "details" ? "history" : "details")
                }
                className="h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 border-border/80 hover:bg-muted"
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
                    <span>View Details</span>
                  </>
                )}
              </Button>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                  isActive
                    ? "text-green-600 bg-green-50 dark:bg-green-950/40 border border-green-200/50 dark:border-green-800/30"
                    : "text-muted-foreground bg-muted border border-border"
                }`}
              >
                {currentProduct.status || (isActive ? "Active" : "Draft")}
              </span>
            </div>
          </div>

          <p className="text-xs md:text-[13px] text-muted-foreground font-normal mt-0.5">
            Category:{" "}
            <strong className="text-foreground">
              {currentProduct.category || "Uncategorized"}
            </strong>
            {currentProduct.sku && (
              <>
                {" "}
                · SKU: <span className="font-mono">{currentProduct.sku}</span>
              </>
            )}
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2 text-xs">
          {/* TAB 1: PRODUCT DETAILS */}
          {detailTab === "details" && (
            <div className="space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-lg bg-muted/20 border border-border/40">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">
                    Total Stock
                  </span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block">
                    {currentProduct.total_stock_base_units ??
                      currentProduct.stock_quantity ??
                      0}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {activeVariant?.base_unit_name || "units"}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">
                    Variants
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {variants.length || 1}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">
                    Total Sold
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {currentProduct.stats?.sold || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase !tracking-wider">
                    Catalog Views
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {currentProduct.stats?.views || 0}
                  </span>
                </div>
              </div>

              {/* Product Images Gallery (if available) */}
              {currentProduct.images && currentProduct.images.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase !tracking-wider block">
                    Images
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {currentProduct.images.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Product preview ${i + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-border bg-muted shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {currentProduct.description && (
                <div className="p-3 rounded-lg border border-border/50 bg-muted/10 space-y-1">
                  <span className="text-[11px] font-semibold text-foreground block">
                    Description
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentProduct.description}
                  </p>
                </div>
              )}

              {/* Variants & Packaging Tiers Matrix */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Variants & Packaging Tiers ({variants.length || 1})
                  </span>
                  {variants.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[280px]">
                      {variants.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                            (activeVariant?.id === v.id)
                              ? "bg-foreground text-background border-foreground shadow-xs"
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
                  <div className="border border-border/70 rounded-lg overflow-hidden">
                    {/* Variant Overview Header */}
                    <div className="p-3 bg-muted/30 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground text-xs flex items-center gap-2">
                          <span>
                            {Object.values(
                              activeVariant.variant_attributes || {}
                            ).join(" / ") || activeVariant.sku}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                            {activeVariant.sku}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>
                            Base unit: <strong>{activeVariant.base_unit_name || "unit"}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Cost price:{" "}
                            <strong>
                              <CurrencyDisplay
                                amount={Number(
                                  activeVariant.cost_price_per_base_unit || 0
                                )}
                                showStyling={false}
                              />
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Stock Level
                        </span>
                        <div className="font-bold text-foreground text-xs">
                          {activeVariant.packaging_tiers && activeVariant.packaging_tiers.length > 0 ? (
                            <PackagingStockDisplay
                              quantity={activeVariant.stock_quantity || 0}
                              baseUnitName={activeVariant.base_unit_name || "unit"}
                              packagingTiers={activeVariant.packaging_tiers}
                            />
                          ) : (
                            <span>
                              {activeVariant.stock_quantity || 0}{" "}
                              {activeVariant.base_unit_name || "units"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Packaging Tiers Price Breakdown Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] uppercase !tracking-wider bg-muted/10">
                            <th className="p-2.5">Packaging Tier</th>
                            <th className="p-2.5 text-center">Units per Tier</th>
                            <th className="p-2.5 text-right">Retail Price</th>
                            <th className="p-2.5 text-right">Wholesale Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {(activeVariant.packaging_tiers || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-4 text-center text-muted-foreground text-xs"
                              >
                                Standard Base Unit (1:1)
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
                                            Default POS
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-center font-mono text-muted-foreground">
                                      {tier.units_per_tier} {activeVariant.base_unit_name || "unit"}s
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
                                    <td className="p-2.5 text-right text-muted-foreground font-medium">
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

          {/* TAB 2: AUDIT / EDIT HISTORY */}
          {detailTab === "history" && (
            <div className="space-y-3">
              {/* Variant Selector for Multi-variant products */}
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
                  <p className="text-xs max-w-sm mx-auto">
                    When stock intakes, purchase receipts, or adjustments occur for
                    this product, the audit timeline will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border border-border/70 rounded-lg p-3 space-y-1.5 bg-card/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.isAddition
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
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
                        <span className="text-[11px] text-muted-foreground">
                          {item.date
                            ? new Date(item.date).toLocaleString()
                            : "—"}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/30">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span>
                          By: <strong className="text-foreground">{item.staffName || "Staff"}</strong>
                        </span>
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
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 w-full pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus(currentProduct)}
                className={`text-xs font-medium flex items-center gap-1.5 w-full sm:w-auto justify-center ${
                  isActive
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <Icon
                  icon={
                    isActive
                      ? "solar:pause-circle-linear"
                      : "solar:play-circle-linear"
                  }
                  className="h-4 w-4"
                />
                <span>{isActive ? "Set to Draft" : "Activate Product"}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onClose}
              className="text-xs font-medium flex-1 sm:flex-none"
            >
              Close
            </Button>
            {onEdit && (
              <Button
                size="sm"
                type="button"
                onClick={() => onEdit(currentProduct)}
                className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
              >
                <Icon icon="solar:pen-linear" className="h-3.5 w-3.5" />
                <span>Edit Product</span>
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}
