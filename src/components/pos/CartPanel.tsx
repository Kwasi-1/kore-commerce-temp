import React, { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import PaymentModal from "./PaymentModal";
import SaveTransactionModal from "./SaveTransactionModal";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PaymentMethodVisual from "./PaymentMethodVisual";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyDisplay } from "@/hooks";
import toast from "react-hot-toast";
import apiClient from "@/api/client";
import { Icon } from "@iconify/react";

interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_default_sale_unit: boolean;
  prices: {
    retail: number;
    wholesale: number | null;
  };
}

interface Product {
  id: string;
  variant_id: string;
  product_name: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string;
  category: string;
  description?: string;
  stock_quantity: number;
  stock_display: number;
  stock_display_unit: string;
  low_stock: boolean;
  sell_mode: 'unit_only' | 'pack_only' | 'flexible';
  packaging_tiers: PackagingTier[];
  variant_attributes: Record<string, string>;
  base_unit_name: string;
}

const flattenProducts = (parentProducts: any[]): Product[] => {
  const flat: Product[] = [];
  parentProducts.forEach(parent => {
    (parent.variants || []).forEach((variant: any) => {
      const attrValues = variant.variant_attributes ? Object.values(variant.variant_attributes).filter(Boolean) : [];
      const combinedName = attrValues.length > 0 
        ? `${parent.name} · ${attrValues.join(' · ')}`
        : parent.name;
        
      const defaultTier = variant.packaging_tiers.find((t: any) => t.is_default_sale_unit) || variant.packaging_tiers[0];
      const defaultPrice = defaultTier ? defaultTier.prices.retail : 0;

      flat.push({
        id: variant.variant_id,
        variant_id: variant.variant_id,
        product_name: parent.name,
        name: combinedName,
        sku: variant.sku,
        price: defaultPrice,
        imageUrl: parent.imageUrl || parent.images?.[0] || undefined,
        category: parent.category || 'General',
        description: parent.description,
        stock_quantity: variant.stock_quantity,
        stock_display: variant.stock_display,
        stock_display_unit: variant.stock_display_unit,
        low_stock: variant.low_stock,
        sell_mode: variant.sell_mode,
        packaging_tiers: variant.packaging_tiers,
        variant_attributes: variant.variant_attributes || {},
        base_unit_name: variant.base_unit_name || 'unit'
      });
    });
  });
  return flat;
};

interface CartPanelProps {
  isMobileView?: boolean;
  panelState?: "collapsed" | "default" | "expanded";
  onStateChange?: (state: "collapsed" | "default" | "expanded") => void;
  onHandleClick?: () => void;
}

export default function CartPanel({ 
  isMobileView = false,
  panelState = 'default',
  onStateChange,
  onHandleClick
}: CartPanelProps) {
  const {
    items,
    subtotal,
    discount,
    total,
    savedTransactions,
    removeItem,
    updateQuantity,
    clearCart,
    setDiscount,
    resumeTransaction,
    addItem,
  } = useCartStore();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    "cash" | "mobile_money" | "card"
  >("card");

  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const prevPanelStateRef = useRef(panelState);

  const PAYMENT_METHODS = {
    card: {
      label: "Credit Card",
      icon: <PaymentMethodVisual method="card" size="sm" />,
    },
    cash: {
      label: "Cash",
      icon: <PaymentMethodVisual method="cash" size="sm" />,
    },
    mobile_money: {
      label: "Mobile Money",
      icon: <PaymentMethodVisual method="mobile_money" size="sm" />,
    },
  };

  const selectedPaymentMethod = PAYMENT_METHODS[defaultPaymentMethod];

  // Expanded Overlay live search states & logic
  const [expandedSearchTerm, setExpandedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Inline editing state for quantities
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<string>("");

  const handleBlurQty = (productId: string, stockQuantity?: number) => {
    const item = items.find(i => i.productId === productId);
    const unitsPerTier = item ? item.units_per_tier : 1;
    let newQty = parseInt(editingQtyValue, 10);
    const stock = stockQuantity ?? Infinity;
    
    if (isNaN(newQty) || newQty < 1) {
      newQty = 1;
    } else if (newQty * unitsPerTier > stock) {
      newQty = Math.floor(stock / unitsPerTier);
      if (newQty < 1) {
        removeItem(productId);
        setEditingProductId(null);
        return;
      }
      toast.error(`Only ${newQty} in stock!`);
    }
    
    updateQuantity(productId, newQty);
    setEditingProductId(null);
  };

  useEffect(() => {
    if (expandedSearchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const response = await apiClient.get(`/pos/products/search?q=${encodeURIComponent(expandedSearchTerm)}`);
        const found = response.data?.success?.data?.products || [];
        setSearchResults(flattenProducts(found));
      } catch (err) {
        console.error('Failed to search products in expanded panel:', err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [expandedSearchTerm]);

  const nextStateTooltip = panelState === 'default'
    ? (items.length === 0 ? 'Collapse panel' : 'Expand panel')
    : panelState === 'expanded'
      ? 'Collapse panel'
      : 'Expand panel';

  // Promo State
  const [activePromo, setActivePromo] = useState<{
    type: "percentage" | "fixed";
    value: number;
  } | null>(null);
  const [defaultDiscountPercent, setDefaultDiscountPercent] =
    useState<number>(10);
  const [isPromoPopoverOpen, setIsPromoPopoverOpen] = useState(false);

  // Popover Form State
  const [promoMode, setPromoMode] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [promoInput, setPromoInput] = useState<string>("10");

  const itemsLength = items.length;
  useEffect(() => {
    if (scrollRef.current && mobileStep === 1) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [itemsLength, mobileStep]);

  useEffect(() => {
    if (panelState === 'expanded') {
      const isTransitioning = prevPanelStateRef.current !== 'expanded';
      // Expand transition takes ~250-300ms, so delay scroll until it completes
      const delay = isTransitioning ? 350 : 50;

      const timer = setTimeout(() => {
        if (expandedScrollRef.current) {
          expandedScrollRef.current.scrollTo({
            top: expandedScrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, delay);

      prevPanelStateRef.current = panelState;
      return () => clearTimeout(timer);
    } else {
      prevPanelStateRef.current = panelState;
    }
  }, [itemsLength, panelState]);

  // If cart is empty, reset mobile step
  useEffect(() => {
    if (items.length === 0) {
      setMobileStep(1);
    }
  }, [items.length]);

  // Calculate discount based on activePromo
  useEffect(() => {
    if (activePromo) {
      if (activePromo.type === "percentage") {
        setDiscount(subtotal * (activePromo.value / 100));
      } else {
        setDiscount(activePromo.value);
      }
    } else {
      setDiscount(0);
    }
  }, [subtotal, activePromo, setDiscount]);

  const taxRate = 0.12;
  const taxAmount = subtotal * taxRate;
  const calculatedTotal = subtotal + taxAmount - discount;

  const handleAddDiscountClick = () => {
    setActivePromo({ type: "percentage", value: defaultDiscountPercent });
    setPromoMode("percentage");
    setPromoInput(defaultDiscountPercent.toString());
  };

  const handleApplyPromo = () => {
    const val = parseFloat(promoInput);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid discount amount.");
      return;
    }
    if (promoMode === "percentage" && val > 100) {
      toast.error("Percentage discount cannot exceed 100%.");
      return;
    }
    if (promoMode === "fixed" && val > subtotal) {
      toast.error("Fixed discount cannot exceed the subtotal.");
      return;
    }

    setActivePromo({ type: promoMode, value: val });
    if (promoMode === "percentage") {
      setDefaultDiscountPercent(val); // Save new percentage default
    }
    setIsPromoPopoverOpen(false);
    toast.success("Discount applied successfully!");
  };

  const handleRemovePromo = () => {
    setActivePromo(null);
    setIsPromoPopoverOpen(false);
  };

  // Mobile Views
  const showItemsList = !isMobileView || mobileStep === 1;
  const showSummary = !isMobileView || mobileStep === 2;

  // Expanded Two-Column Overlay Layout (Desktop only)
  if (panelState === 'expanded' && !isMobileView) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden lg:border lg:rounded-[24px] relative pt-8 shadow-sm">
        {/* Centered Drag Handle */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onHandleClick}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors focus:outline-none"
            title={nextStateTooltip}
          >
            <Icon icon="streamline-freehand:menu-navigation-horizontal" />
          </button>
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {/* <span className="text-xl font-bold text-foreground">≡</span> */}
            <h2 className="text-[18px] font-bold text-foreground font-header">
              Detail Transaction
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-background border border-border hover:bg-secondary h-9 px-4 text-[13px] font-semibold shadow-none text-muted-foreground hover:text-foreground"
            >
              <Icon icon="solar:diskette-linear" className="h-4 w-4" />
              Save
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-background border border-border text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-4 text-[13px] font-semibold shadow-none"
            >
              <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 ml-1"
              onClick={() => onStateChange?.('default')}
            >
              <Icon icon="solar:close-square-linear" className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Expanded 2-Column Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Scrollable Cart Items List */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border/60 overflow-hidden bg-background">
            <div className="px-6 py-4 border-b border-border/40 shrink-0">
              <h3 className="font-bold text-[15px] text-muted-foreground">
                Cart Items ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>
            </div>
            
            <div ref={expandedScrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-20">
                  <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center">
                    <Icon icon="solar:cart-large-linear" className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-[14px] font-bold text-foreground">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center border border-border/40">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon icon="solar:box-linear" className="h-5 w-5 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate pr-2">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold">
                          <span className="border border-border rounded-full px-2 py-0.5 text-primary bg-primary/10">
                            {item.tier_name}
                          </span>
                          {item.price_type === 'wholesale' && (
                            <span className="border border-amber-500/25 rounded-full px-2 py-0.5 text-amber-600 bg-amber-50 dark:bg-amber-950/20 font-bold">
                              Wholesale
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 bg-secondary border border-border/40 rounded-full px-1 py-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                      >
                        <Icon icon="ic:outline-minus" className="h-2.5 w-2.5" />
                      </Button>
                      {editingProductId === item.productId ? (
                        <input
                          type="number"
                          min="1"
                          className="w-10 h-6 text-center font-bold text-xs bg-background border border-border rounded outline-none no-spin-buttons"
                          value={editingQtyValue}
                          onChange={(e) => setEditingQtyValue(e.target.value)}
                          onBlur={() => handleBlurQty(item.productId, item.stock_quantity)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleBlurQty(item.productId, item.stock_quantity);
                            } else if (e.key === 'Escape') {
                              setEditingProductId(null);
                            }
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                        />
                      ) : (
                        <span 
                          className="font-bold text-xs w-5 text-center cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setEditingProductId(item.productId);
                            setEditingQtyValue(item.quantity.toString());
                          }}
                        >
                          {item.quantity.toString().padStart(2, "0")}
                        </span>
                      )}
                      <Button
                        size="icon"
                        onClick={() => {
                          const stock = item.stock_quantity ?? Infinity;
                          if ((item.quantity + 1) * item.units_per_tier > stock) {
                            toast.error(`Only ${Math.floor(stock / item.units_per_tier)} packages in stock!`);
                            return;
                          }
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="h-6 w-6 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
                      >
                        <Icon icon="ic:outline-plus" className="h-2.5 w-2.5" />
                      </Button>
                    </div>

                    {/* Price and Remove Row */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="font-bold text-sm text-foreground text-right min-w-[70px]">
                        <CurrencyDisplay amount={item.price * item.quantity} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.productId)}
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive shadow-none shrink-0"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Totals, Search and Checkout Controls */}
          <div className="w-[420px] shrink-0 flex flex-col bg-secondary p-5 overflow-y-auto scrollbar-hide justify-between">
            <div className="space-y-5">
              {/* Product Search & Add */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Quick Search & Add
                </label>
                
                {/* Search Bar Input */}
                <div className="relative">
                  <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4.5 w-4.5" />
                  <input
                    type="text"
                    placeholder="Search & add product"
                    value={expandedSearchTerm}
                    onChange={(e) => setExpandedSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-background border border-border rounded-full text-sm font-semibold outline-none focus:ring-0 focus:ring-primary/40 focus:borderprimary transition-all"
                  />
                  {expandedSearchTerm && (
                    <button
                      onClick={() => setExpandedSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center"
                    >
                      <Icon icon="solar:close-circle-linear" className="h-4.5 w-4.5" />
                    </button>
                  )}
                  
                  {/* Expanded Search Dropdown */}
                  {expandedSearchTerm.trim() !== '' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-[20px] shadow-xl z-50 max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-hide">
                      {isSearchLoading ? (
                        <div className="py-6 text-center text-xs text-muted-foreground font-semibold flex items-center justify-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin" />
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground font-semibold">
                          No products found.
                        </div>
                      ) : (
                        searchResults.map((p) => {
                          const tier = p.packaging_tiers.find(t => t.is_default_sale_unit) || p.packaging_tiers[0];
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (!tier) {
                                  toast.error("No packaging tier defined for this variant!");
                                  return;
                                }
                                const cartKey = `${p.variant_id}-${tier.id}`;
                                const currentInCart = items.find(i => i.productId === cartKey)?.quantity || 0;
                                const stock = p.stock_quantity ?? Infinity;
                                if (stock <= 0) {
                                  toast.error(`${p.name} is out of stock!`);
                                  return;
                                }
                                if ((currentInCart + 1) * tier.units_per_tier > stock) {
                                  toast.error(`Only ${p.stock_display} ${p.stock_display_unit} in stock!`);
                                  return;
                                }
                                
                                addItem({
                                  productId: cartKey,
                                  name: p.name,
                                  sku: p.sku,
                                  price: tier.prices.retail,
                                  imageUrl: p.imageUrl,
                                  category: p.category,
                                  stock_quantity: p.stock_quantity,
                                  variant_id: p.variant_id,
                                  packaging_tier_id: tier.id,
                                  tier_name: tier.name,
                                  units_per_tier: tier.units_per_tier,
                                  unit_price: tier.prices.retail,
                                  price_type: 'retail'
                                });
                                
                                setExpandedSearchTerm('');
                                toast.success(`${p.name} added to cart`);
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-secondary rounded-[14px] text-left transition-colors"
                            >
                              <div className="h-10 w-10 bg-muted rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">📦</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground font-semibold">
                                  Stock: {p.stock_display} {p.stock_display_unit}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-foreground shrink-0">
                                <CurrencyDisplay amount={tier ? tier.prices.retail : p.price} />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary calculations */}
              <div className="flex flex-col gap-2.5 bg-card border rounded-[1.55rem] px-2 py-2">
                {activePromo && (
                  <div className="flex items-center justify-between p-2 rounded-full bg-secondary">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-card text-muted-foreground flex items-center justify-center">
                        <Icon icon="solar:ticket-linear" className="h-4 w-4" />
                      </div>
                      <p className="text-[14px] font-bold text-foreground">
                        {activePromo.type === "percentage"
                          ? `Promo (${activePromo.value}%)`
                          : `Discount ($${activePromo.value})`}
                      </p>
                    </div>

                    <Popover
                      open={isPromoPopoverOpen}
                      onOpenChange={setIsPromoPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button className="rounded-full h-9 px-4 text-[13px] font-bold shadow-sm transition-colors">
                          Change Promo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-4 rounded-2xl"
                        align="end"
                      >
                        <div className="space-y-4">
                          <h4 className="font-bold text-sm">Edit Discount</h4>
                          <div className="flex bg-secondary p-0.5 rounded-full">
                            <button
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === "percentage" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={() => {
                                setPromoMode("percentage");
                                setPromoInput(
                                  defaultDiscountPercent.toString(),
                                );
                              }}
                            >
                              Percentage (%)
                            </button>
                            <button
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === "fixed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={() => {
                                setPromoMode("fixed");
                                setPromoInput("0");
                              }}
                            >
                              Fixed Amount ($)
                            </button>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                              {promoMode === "percentage" ? "%" : "$"}
                            </span>
                            <input
                              type="number"
                              className="w-full pl-8 pr-3 py-2 bg-background border rounded-lg text-sm font-bold outline-none no-spin-buttons"
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value)}
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              radius="full"
                              size="sm"
                              onClick={handleApplyPromo}
                              className="w-full font-bold text-[12px]"
                            >
                              Apply Changes
                            </Button>
                            <Button
                              variant="outline"
                              radius="full"
                              size="sm"
                              onClick={handleRemovePromo}
                              className="w-full font-bold text-destructive bg-inherit text-destructive text-[12px]"
                            >
                              Remove Discount
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="space-y-2.5 p-3 border rounded-[1.25rem]">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Sub-Total
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={subtotal} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Tax (12%)
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={taxAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Discount
                    </span>
                    <span className="text-muted-foreground font-semibold dark:text-primary flex items-center gap-1">
                      -<CurrencyDisplay amount={discount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-foreground pt-1">
                    <span>Total Payment</span>
                    <span>
                      <CurrencyDisplay amount={calculatedTotal} />
                    </span>
                  </div>
                </div>
              </div>

              {!activePromo && (
                <div className="flex items-center justify-end px-2 -my-2">
                  <Button
                    variant="link"
                    onClick={handleAddDiscountClick}
                    className="dark:text-primary text-xs h-fit px-2"
                  >
                    + Add Discount
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 shrink-0">
              {/* Payment Method */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between bg-card py-2.5 px-4 rounded-full border cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        <PaymentMethodVisual
                          method={defaultPaymentMethod as any}
                          size="md"
                        />
                      </div>
                      <span className="font-bold text-[14px]">
                        {selectedPaymentMethod.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-0.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent px-1 h-auto py-1"
                    >
                      Change Method <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-3xl shadow-lg border-border/60 p-1.5 space-y-1"
                >
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setDefaultPaymentMethod(key as any)}
                      className={`flex items-center gap-3 py-2.5 pl-5 cursor-pointer rounded-2xl font-semibold ${defaultPaymentMethod === key ? "bg-primary/10 dark:text-primary" : ""}`}
                    >
                      {method.icon}
                      {method.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Complete Transaction */}
              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={items.length === 0}
                className="w-full py-4 font-bold text-[16px] rounded-full h-auto"
              >
                Continue
              </Button>
            </div>

          </div>

        </div>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          defaultMethod={defaultPaymentMethod}
        />
        <SaveTransactionModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-secondary overflow-hidden lg:border lg:rounded-[24px] ${!isMobileView ? "pt-8 relative" : ""}`}>
      {/* Centered Drag Handle (Desktop only) */}
      {!isMobileView && (
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 mt-2">
          <button
            onClick={onHandleClick}
            className="w-fit h-fit flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors focus:outline-none"
            title={nextStateTooltip}
          >
            <Icon icon="streamline-freehand:menu-navigation-horizontal" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 md:pt-0 pb-4 md:pb-3 shrink-0">
        <div className="flex items-center gap-2">
          {isMobileView && mobileStep === 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full -ml-2"
              onClick={() => setMobileStep(1)}
            >
              <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-[18px] font-bold text-foreground">
            {isMobileView && mobileStep === 2
              ? "Checkout"
              : "Detail Transaction"}
          </h2>
        </div>

        {(!isMobileView || mobileStep === 1) && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-background border border-border hover:bg-secondary h-9 px-3 text-[13px] font-semibold shadow-none text-muted-foreground hover:text-foreground"
            >
              <Icon icon="solar:diskette-linear" className="h-3.5 w-3.5" />
              {/* Save */}
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-background border border-border text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-3 text-[13px] font-semibold shadow-none"
            >
              <Icon icon="solar:trash-bin-trash-linear" className="h-3.5 w-3.5" />
              {/* Reset Order */}
            </Button>
          </div>
        )}
      </div>

      {/* Cart Items */}
      {showItemsList && (
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto px-5 space-y-3 scrollbar-hide ${isMobileView ? "pb-12 [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]" : "pb-4"} `}
        >
          {items.length === 0 ? (
            savedTransactions.length > 0 ? (
              <div className="flex flex-col gap-3 py-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground text-[15px] font-header tracking-[-0.01rem]">
                    Saved Transactions
                  </h3>
                  <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-full">
                    {savedTransactions.length}
                  </span>
                </div>
                {savedTransactions.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="flex flex-col items-start gap-2 h-auto py-3 px-4 rounded-[20px] bg-card border-transparent dark:border-border hover:bg-card hover:dark:border-primary/30 hover:border-foreground/10 transition-all text-left shadow-sm w-full group"
                    onClick={() => {
                      resumeTransaction(t.id);
                      toast.success(`Resumed ${t.customerName}`);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground transition-colors">
                          {t.customerInitials}
                        </div>
                        <span className="font-bold text-foreground text-sm truncate max-w-[180px] md:max-w-[200px]">
                          {t.customerName}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground mt-1">
                      <div className="flex items-center gap-1.5 ml-1">
                        <Icon icon="solar:cart-large-linear" className="h-3.5 w-3.5" />
                        {t.itemCount} items
                      </div>
                      <span className="bg-background group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors px-3 py-1 rounded-full border border-border shadow-sm font-bold text-[10px] uppercase tracking-wide duration-300">
                        Resume
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-10">
                <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-2">
                  <Icon icon="solar:cart-large-linear" className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-[15px] font-bold text-foreground">
                  Your cart is empty
                </p>
                <p className="text-[13px] text-muted-foreground/80 max-w-[220px] text-center leading-relaxed">
                  Tap items from the product grid to add them to the
                  transaction.
                </p>
              </div>
            )
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 p-3 rounded-[20px] bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Image */}
                <div className="w-[88px] h-[88px] rounded-[14px] flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon icon="solar:box-linear" className="h-9 w-9 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-[14px] text-foreground line-clamp-1 tracking-tight pr-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="border border-border rounded-full px-2 py-0.5 text-[11px] font-bold text-primary bg-primary/10">
                          {item.tier_name}
                        </span>
                        {item.price_type === 'wholesale' && (
                          <span className="border border-amber-500/25 rounded-full px-2 py-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20">
                            Wholesale
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      className="h-8 w-8 rounded-full shrink-0 bg-[#e6173a] hover:bg-[#d80028] shadow-sm"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Bottom row: qty + total */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-secondary rounded-full px-1 py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="h-7 w-7 rounded-full hover:bg-black/5 text-foreground"
                      >
                        <Icon icon="ic:outline-minus" className="h-3 w-3" />
                      </Button>
                      {editingProductId === item.productId ? (
                        <input
                          type="number"
                          min="1"
                          className="w-10 h-7 text-center font-bold text-xs bg-background border border-border rounded outline-none no-spin-buttons"
                          value={editingQtyValue}
                          onChange={(e) => setEditingQtyValue(e.target.value)}
                          onBlur={() => handleBlurQty(item.productId, item.stock_quantity)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleBlurQty(item.productId, item.stock_quantity);
                            } else if (e.key === 'Escape') {
                              setEditingProductId(null);
                            }
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                        />
                      ) : (
                        <span 
                          className="font-bold text-[13px] w-6 text-center cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setEditingProductId(item.productId);
                            setEditingQtyValue(item.quantity.toString());
                          }}
                        >
                          {item.quantity.toString().padStart(2, "0")}
                        </span>
                      )}
                      <Button
                        size="icon"
                        onClick={() => {
                          const stock = item.stock_quantity ?? Infinity;
                          if ((item.quantity + 1) * item.units_per_tier > stock) {
                            toast.error(`Only ${Math.floor(stock / item.units_per_tier)} packages in stock!`);
                            return;
                          }
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="h-7 w-7 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
                      >
                        <Icon icon="material-symbols:add-rounded" className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-bold text-[14px] text-foreground tracking-tight">
                      <span className="text-muted-foreground text-[12px] font-semibold mr-1">
                        Total
                      </span>
                      <CurrencyDisplay amount={item.price * item.quantity} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Actions (Depends on Step) */}
      {items.length > 0 && (
        <div className="px-5 pb-5 pt-2 rounded-t-2xl bg-transparent flex flex-col gap-3 shrink-0">
          {/* Mobile Step 1 Actions */}
          {isMobileView && mobileStep === 1 && (
            <Button
              onClick={() => setMobileStep(2)}
              className="w-full py-4 font-bold text-[16px] rounded-full h-auto shadow-lg"
            >
              Continue to Checkout
            </Button>
          )}

          {/* Desktop OR Mobile Step 2 Actions */}
          {showSummary && (
            <>
              <div className="flex flex-col gap-2.5 bg-card border rounded-[1.55rem] px-2 py-2">
                {/* Promo Logic */}
                {activePromo && (
                  <div className="flex items-center justify-between p-2 rounded-full bg-secondary">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-card text-muted-foreground flex items-center justify-center">
                        <Icon icon="solar:ticket-linear" className="h-4 w-4" />
                      </div>
                      <p className="text-[14px] font-bold text-foreground">
                        {activePromo.type === "percentage"
                          ? `Promo (${activePromo.value}%)`
                          : `Discount ($${activePromo.value})`}
                      </p>
                    </div>

                    <Popover
                      open={isPromoPopoverOpen}
                      onOpenChange={setIsPromoPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button className="rounded-full h-9 px-4 text-[13px] font-bold shadow-sm transition-colors">
                          Change Promo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-4 rounded-2xl"
                        align="end"
                      >
                        <div className="space-y-4">
                          <h4 className="font-bold text-sm">Edit Discount</h4>
                          <div className="flex bg-secondary p-0.5 rounded-full">
                            <button
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === "percentage" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={() => {
                                setPromoMode("percentage");
                                setPromoInput(
                                  defaultDiscountPercent.toString(),
                                );
                              }}
                            >
                              Percentage (%)
                            </button>
                            <button
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === "fixed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={() => {
                                setPromoMode("fixed");
                                setPromoInput("0");
                              }}
                            >
                              Fixed Amount ($)
                            </button>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                              {promoMode === "percentage" ? "%" : "$"}
                            </span>
                            <input
                              type="number"
                              className="w-full pl-8 pr-3 py-2 bg-background border rounded-lg text-sm font-bold outline-none no-spin-buttons"
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value)}
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              radius="full"
                              size="sm"
                              onClick={handleApplyPromo}
                              className="w-full font-bold text-[12px]"
                            >
                              Apply Changes
                            </Button>
                            <Button
                              variant="outline"
                              radius="full"
                              size="sm"
                              onClick={handleRemovePromo}
                              className="w-full font-bold text-destructive bg-inherit text-destructive text-[12px]"
                            >
                              Remove Discount
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-2.5 p-3 border rounded-[1.25rem]">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Sub-Total
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={subtotal} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Tax (12%)
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={taxAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Discount
                    </span>
                    <span className="text-muted-foreground font-semibold dark:text-primary flex items-center gap-1">
                      -<CurrencyDisplay amount={discount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-foreground pt-1">
                    <span>Total Payment</span>
                    <span>
                      <CurrencyDisplay amount={calculatedTotal} />
                    </span>
                  </div>
                </div>
              </div>

              {!activePromo && (
                <div className="flex items-center justify-end px-2 -my-2">
                  <Button
                    variant="link"
                    onClick={handleAddDiscountClick}
                    className="dark:text-primary text-xs h-fit px-2"
                  >
                    + Add Discount
                  </Button>
                </div>
              )}

              {/* Payment Method */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between bg-card py-2.5 px-4 rounded-full border cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        <PaymentMethodVisual
                          method={defaultPaymentMethod as any}
                          size="md"
                        />
                      </div>
                      <span className="font-bold text-[14px]">
                        {selectedPaymentMethod.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-0.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent px-1 h-auto py-1"
                    >
                      Change Method <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-3xl shadow-lg border-border/60 p-1.5 space-y-1"
                >
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setDefaultPaymentMethod(key as any)}
                      className={`flex items-center gap-3 py-2.5 pl-5 cursor-pointer rounded-2xl font-semibold ${defaultPaymentMethod === key ? "bg-primary/10 dark:text-primary" : ""}`}
                    >
                      {method.icon}
                      {method.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Complete Transaction */}
              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={items.length === 0}
                className="w-full py-4 font-bold text-[16px] rounded-full h-auto"
              >
                {isMobileView ? "Complete Transaction" : "Continue"}
              </Button>
            </>
          )}
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
      <SaveTransactionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
}
