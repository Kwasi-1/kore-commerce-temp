import { Button } from "@/components/ui/button";
import { useCartStore } from '@/store/cartStore';
import { CurrencyDisplay } from '@/hooks';
import { Minus, Plus, Box, X } from 'lucide-react';
import React, { useRef, useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import toast from "react-hot-toast";
import { useRegisterPreferencesStore, playCartChime } from '@/store/registerPreferencesStore';

export interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_default_sale_unit: boolean;
  prices: {
    retail: number;
    wholesale: number | null;
  };
}

export interface Product {
  id: string; // variant_id
  variant_id: string;
  product_name: string;
  name: string; // displays "Product Name · Variant Attributes"
  sku: string;
  price: number; // retail price of default tier
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
  expiry_warning?: {
    has_warning: boolean;
    earliest_expiry: string;
    days_until_expiry: number;
  } | null;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, selectedTier?: PackagingTier, quantityMultiplier?: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { items, updateQuantity, removeItem } = useCartStore();
  const [showTierSelector, setShowTierSelector] = useState(false);

  const { 
    showProductImages, 
    showStockCount, 
    gridDensity, 
    defaultPriceType, 
    soundEffectsEnabled,
    showSubPacks
  } = useRegisterPreferencesStore();

  // Density styles dictionary
  const densityStyles = {
    compact: {
      card: "p-1.5 md:p-2 rounded-lg md:rounded-xl",
      imageMb: "mb-1.5",
      title: "text-[12px] font-semibold leading-tight line-clamp-1 mb-0.5",
      subtitle: "text-[10px] line-clamp-1 leading-tight mb-0.5 font-medium",
      sku: "text-[9px] mb-1 font-normal",
      price: "text-[13px] tracking-tight",
      actionBarMt: "mt-1.5",
      btnHeight: "h-8",
      btnText: "text-[11px]",
      btnIconSize: "h-3 w-3",
      qtyInput: "w-8 h-6 text-xs",
      qtyText: "text-[12px] w-6",
      qtyBtnSize: "h-6.5 w-6.5"
    },
    normal: {
      card: "p-2.5 rounded-xl md:rounded-[18px]",
      imageMb: "mb-2.5",
      title: "text-[14px] font-bold text-foreground line-clamp-1 leading-tight mb-0.5",
      subtitle: "text-[12px] text-muted-foreground/80 line-clamp-1 leading-tight mb-0.5 font-semibold",
      sku: "text-[11px] text-muted-foreground/60 line-clamp-1 leading-tight mb-1.5 font-medium",
      price: "text-[15px] tracking-tight",
      actionBarMt: "mt-2.5",
      btnHeight: "h-10",
      btnText: "text-[13px]",
      btnIconSize: "h-3.5 w-3.5",
      qtyInput: "w-10 h-7 text-sm",
      qtyText: "text-[14px] w-10",
      qtyBtnSize: "h-8 w-8"
    },
    large: {
      card: "p-3.5 pb-4 md:p-4 rounded-2xl md:rounded-[22px]",
      imageMb: "mb-3.5",
      title: "text-[16px] font-extrabold text-foreground line-clamp-2 leading-tight mb-1",
      subtitle: "text-[13px] text-muted-foreground/85 line-clamp-1 leading-tight mb-1 font-bold",
      sku: "text-[12px] text-muted-foreground/60 line-clamp-1 leading-tight mb-2 font-semibold",
      price: "text-[18px] tracking-tight",
      actionBarMt: "mt-3.5",
      btnHeight: "h-11",
      btnText: "text-[14px]",
      btnIconSize: "h-4 w-4",
      qtyInput: "w-12 h-8 text-base",
      qtyText: "text-[16px] w-12",
      qtyBtnSize: "h-9 w-9"
    }
  }[gridDensity];

  // Determine target tier for automatic modes
  const getTargetTier = (p: Product) => {
    if (p.sell_mode === 'unit_only') {
      return p.packaging_tiers.find(t => t.units_per_tier === 1) || p.packaging_tiers[0];
    }
    if (p.sell_mode === 'pack_only') {
      return p.packaging_tiers.find(t => t.is_default_sale_unit) || p.packaging_tiers[0];
    }
    return null;
  };

  const targetTier = getTargetTier(product);
  const cartItem = targetTier ? items.find(i => i.productId === `${product.variant_id}-${targetTier.id}`) : null;
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;
  
  // For flexible mode or unit mode, check if any tier/unit of this variant is in the cart
  const variantCartItems = items.filter(i => i.variant_id === product.variant_id);
  const totalVariantQty = variantCartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartBaseUnits = variantCartItems.reduce((sum, i) => {
    const tierUnits = i.units_per_tier || 1;
    return sum + (i.quantity * tierUnits);
  }, 0);
  const isVariantInCart = variantCartItems.length > 0;

  // Calculate dynamic in-cart remaining stock
  const baseStock = product.stock_quantity ?? 0;
  const effectiveBaseStock = Math.max(0, baseStock - totalCartBaseUnits);

  const defaultSaleTier = product.packaging_tiers?.find(t => t.is_default_sale_unit) || product.packaging_tiers?.[0];
  const unitsPerTier = defaultSaleTier?.units_per_tier || 1;
  const effectiveDisplayStock = effectiveBaseStock / unitsPerTier;
  const activeStockUnit = defaultSaleTier?.name || product.stock_display_unit || product.base_unit_name || 'Unit';

  const [isEditingQty, setIsEditingQty] = useState(false);
  const [inputValue, setInputValue] = useState(cartQuantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(cartQuantity.toString());
  }, [cartQuantity]);

  useEffect(() => {
    if (!showTierSelector) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTierSelector(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTierSelector]);

  const handleIncrement = () => {
    if (!targetTier) return;
    const currentQtyInBaseUnits = cartQuantity * targetTier.units_per_tier;
    const stock = product.stock_quantity ?? Infinity;
    if (currentQtyInBaseUnits + targetTier.units_per_tier > stock) {
      toast.error(`Only ${product.stock_display} ${product.stock_display_unit} in stock!`);
      return;
    }
    updateQuantity(cartItem!.productId, cartQuantity + 1);
    if (soundEffectsEnabled) {
      playCartChime();
    }
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    if (cartQuantity > 1) {
      updateQuantity(cartItem.productId, cartQuantity - 1);
    } else {
      removeItem(cartItem.productId);
    }
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleQtyBlur = () => {
    if (!targetTier || !cartItem) return;
    let newQty = parseFloat(inputValue);
    const stock = product.stock_quantity ?? Infinity;
    
    if (isNaN(newQty) || newQty < 0.01){
      newQty = 1;
    } else if (newQty * targetTier.units_per_tier > stock) {
      newQty = stock / targetTier.units_per_tier;
      if (newQty < 0.01) {
        removeItem(cartItem.productId);
        setIsEditingQty(false);
        return;
      }
      toast.error(`Only ${product.stock_display} ${product.stock_display_unit} in stock!`);
    }
    
    setInputValue(newQty.toString());
    updateQuantity(cartItem.productId, newQty);
    setIsEditingQty(false);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQtyBlur();
    }
  };

  const isOutOfStock = effectiveBaseStock === 0;

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (product.sell_mode === 'flexible') {
      setShowTierSelector(true);
    } else {
      if (!isInCart) {
        onAddToCart(product, targetTier || undefined);
        if (soundEffectsEnabled) {
          playCartChime();
        }
      } else if (!isEditingQty) {
        handleIncrement();
      }
    }
  };

  // Compute card display title & subtitle
  const displayTitle = product.product_name || product.name.split(' · ')[0];
  const attributeValues = product.variant_attributes ? Object.values(product.variant_attributes).filter(Boolean) : [];
  const displaySubtitle = attributeValues.length > 0 ? attributeValues.join(' · ') : null;

  // Determine active default pricing based on preference
  const defaultTier = targetTier || product.packaging_tiers.find(t => t.is_default_sale_unit) || product.packaging_tiers[0];
  const activePrice = defaultPriceType === 'wholesale'
    ? (defaultTier?.prices.wholesale ?? defaultTier?.prices.retail ?? product.price)
    : (defaultTier?.prices.retail ?? product.price);

  return (
    <div 
      className={`relative bg-card border flex flex-col transition-all group select-none ${densityStyles.card} ${
        (product.sell_mode === 'flexible' ? isVariantInCart : isInCart) 
          ? 'ring-1 ring-foreground/10 dark:ring-foreground/15 shadow-sm' 
          : 'border-border hover:shadow-md'
      } ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleCardClick}
    >
      {/* Tier Selector Dropdown Modal (Portaled to document.body to prevent parent container clipping) */}
      {showTierSelector && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setShowTierSelector(false);
          }}
        >
          <div 
            className="bg-card border border-border rounded-2xl p-4 sm:p-5 max-w-[350px] sm:max-w-sm w-[calc(100%-1.5rem)] shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-sm sm:text-base text-foreground capitalize truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground">Select unit to add to cart</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowTierSelector(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[60vh] scrollbar-hide pr-0.5">
              {product.packaging_tiers.map((tier) => {
                const tierPrice = defaultPriceType === 'wholesale' 
                  ? (tier.prices.wholesale ?? tier.prices.retail) 
                  : tier.prices.retail;
                const cartItemForTier = items.find(i => i.productId === `${product.variant_id}-${tier.id}`);
                const qtyInCart = cartItemForTier?.quantity || 0;
                const isMultiUnit = tier.units_per_tier > 1;

                return (
                  <div
                    key={tier.id}
                    className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product, tier);
                        setShowTierSelector(false);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/60 transition-colors text-left group/tier"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 text-muted-foreground/70 flex items-center justify-center shrink-0">
                          <Box className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5 capitalize">
                            {tier.name}
                            {tier.units_per_tier > 1 && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({tier.units_per_tier} {product.base_unit_name}s)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-secondary-foreground">
                            <CurrencyDisplay amount={tierPrice} showStyling={false} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {qtyInCart > 0 && (
                          <span className="text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {qtyInCart} in cart
                          </span>
                        )}
                        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-80 group-hover/tier:opacity-100 transition-opacity">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>

                    {/* Quick Sub-Unit Presets (Half Pack, Quarter Pack) for Multi-Unit Tiers */}
                    {isMultiUnit && showSubPacks && (
                      <div className="px-3 py-2 border-t border-border/40 flex items-center gap-1.5 bg-background/40">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                          Sub-Pack:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product, tier, 0.5);
                            setShowTierSelector(false);
                          }}
                          className="px-2.5 py-0.5 rounded-md border border-border bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground font-bold text-[10px] flex items-center gap-1 transition-all"
                        >
                          <span>½ Pack</span>
                          <span className="text-[9px] text-muted-foreground font-normal">
                            ({Math.round(tier.units_per_tier * 0.5)} {product.base_unit_name}s)
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product, tier, 0.25);
                            setShowTierSelector(false);
                          }}
                          className="px-2.5 py-0.5 rounded-md border border-border bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground font-bold text-[10px] flex items-center gap-1 transition-all"
                        >
                          <span>¼ Pack</span>
                          <span className="text-[9px] text-muted-foreground font-normal">
                            ({Math.round(tier.units_per_tier * 0.25)} {product.base_unit_name}s)
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/20 rounded-xl md:rounded-[18px]">
          <div className="bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold shadow-lg transform -rotate-12">
            Out of Stock
          </div>
        </div>
      )}

      {/* Image Container */}
      <div className={`relative w-full pt-[85%] lg:pt-[75%] bg-muted/50 rounded-lg md:rounded-xl overflow-hidden ${densityStyles.imageMb} shrink-0`}>
        {/* Stock Badge */}
        {showStockCount && (
          <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-md border border-border text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {Number(effectiveDisplayStock.toFixed(2)).toString()} {activeStockUnit}{effectiveDisplayStock > 1 && "s"}
          </div>
        )}

        {/* Expiry Warning Badge */}
        {product.expiry_warning?.has_warning && (
          <div className={`absolute bottom-2 left-2 z-10 font-bold text-[9px] px-2 py-0.5 rounded-full shadow-sm ${
            product.expiry_warning.days_until_expiry <= 0 
              ? 'bg-destructive text-destructive-foreground animate-pulse' 
              : 'bg-amber-500 text-black'
          }`}>
            {product.expiry_warning.days_until_expiry <= 0 
              ? 'Expired' 
              : `Exp: ${product.expiry_warning.days_until_expiry} days`}
          </div>
        )}

        {/* Quantity Overlay for Flexible (total in cart) */}
        {product.sell_mode === 'flexible' && isVariantInCart && (
          <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold h-7 min-w-7 px-1.5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
            {totalVariantQty}
          </div>
        )}
        
        {/* Quantity Overlay (Mobile specific, or when no action bar) */}
        {product.sell_mode !== 'flexible' && isInCart && !isEditingQty && (
           <div 
             className="md:hidden absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold h-7 min-w-7 px-1.5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in"
             onClick={(e) => {
               e.stopPropagation();
               setIsEditingQty(true);
               setTimeout(() => inputRef.current?.focus(), 50);
             }}
           >
             {cartQuantity}
           </div>
        )}
        
        {/* Image or Fallback */}
        {(showProductImages && product.imageUrl) ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 transition-transform duration-500 group-hover:scale-105">
             <Box className="h-12 w-12 stroke-[1.5]" />
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="flex-1 flex flex-col pointer-events-none px-0.5">
        <h3 className={densityStyles.title}>
          {displayTitle}
        </h3>
        {displaySubtitle ? (
          <p className={densityStyles.subtitle}>
            {displaySubtitle}
          </p>
        ):(
        <p className={densityStyles.sku}>
          {product.sku}
        </p>
        )}
        
        <div className={`font-bold text-foreground tracking-tight ${densityStyles.price}`}>
          <CurrencyDisplay amount={activePrice || 0} />
        </div>
      </div>

      {/* Action Bar (Hidden on Mobile) */}
      <div className={`pointer-events-auto hidden md:block ${densityStyles.actionBarMt}`}>
        {product.sell_mode === 'flexible' ? (
          <Button 
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setShowTierSelector(true); }}
            className={`w-full ${densityStyles.btnHeight} rounded-full border-border ${densityStyles.btnText} font-bold text-foreground hover:bg-muted transition-colors shadow-sm flex items-center gap-1.5 justify-center`}
          >
            <Plus className={densityStyles.btnIconSize} />
            <span>Select Unit</span>
          </Button>
        ) : isInCart ? (
          <div className={`flex items-center justify-between w-full ${densityStyles.btnHeight} px-1 bg-secondary rounded-full`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleDecrement(); }}
              className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-background text-foreground"
            >
              <Minus className={densityStyles.btnIconSize} />
            </Button>
            
            {isEditingQty ? (
              <input 
                ref={inputRef}
                type="number"
                min="1"
                className={`${densityStyles.qtyInput} text-center font-bold bg-background border border-border rounded-md outline-none no-spin-buttons`}
                value={inputValue}
                onChange={handleQtyChange}
                onBlur={handleQtyBlur}
                onKeyDown={handleQtyKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className={`font-bold ${densityStyles.qtyText} text-center cursor-pointer hover:text-primary transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingQty(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              >
                {cartQuantity}
              </span>
            )}

            <Button
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleIncrement(); }}
              className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
            >
              <Plus className={densityStyles.btnIconSize} />
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline"
            onClick={(e) => { 
              e.stopPropagation(); 
              onAddToCart(product, targetTier || undefined); 
              if (soundEffectsEnabled) {
                playCartChime();
              }
            }}
            className={`w-full ${densityStyles.btnHeight} rounded-full border-border ${densityStyles.btnText} font-bold text-foreground hover:bg-muted transition-colors shadow-sm flex items-center gap-1.5 justify-center`}
          >
            <Plus className={densityStyles.btnIconSize} />
             Add to Cart
          </Button>
        )}
      </div>

      {/* Mobile Input State (When editing qty on mobile, since action bar is hidden) */}
      {product.sell_mode !== 'flexible' && isInCart && isEditingQty && (
        <div className="mt-2 pointer-events-auto md:hidden">
          <input 
            ref={inputRef}
            type="number"
            min="1"
            className="w-full h-9 text-center font-bold text-sm bg-secondary border border-border rounded-lg outline-none no-spin-buttons"
            value={inputValue}
            onChange={handleQtyChange}
            onBlur={handleQtyBlur}
            onKeyDown={handleQtyKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
