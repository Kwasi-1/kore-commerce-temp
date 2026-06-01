import { Button } from "@/components/ui/button";
import { useCartStore } from '@/store/cartStore';
import { Minus, Plus, Box } from 'lucide-react';
import React, { useRef, useState, useEffect } from "react";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { items, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find(i => i.productId === product.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;
  
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [inputValue, setInputValue] = useState(cartQuantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(cartQuantity.toString());
  }, [cartQuantity]);

  const handleIncrement = () => {
    updateQuantity(product.id, cartQuantity + 1);
  };

  const handleDecrement = () => {
    if (cartQuantity <= 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, cartQuantity - 1);
    }
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleQtyBlur = () => {
    setIsEditingQty(false);
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || val <= 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, val);
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleCardClick = () => {
    if (!isInCart) {
      onAddToCart(product);
    } else if (!isEditingQty) {
      // If it's already in cart and we tap the card, we could increment it,
      // or we can just let them use the quantity controls.
      // Let's increment on tap to make it super fast for POS
      handleIncrement();
    }
  };

  return (
    <div 
      className={`bg-card rounded-xl md:rounded-[18px] border p-2.5 flex flex-col transition-all group cursor-pointer select-none ${isInCart ? 'ring-1 ring-foreground/10 dark:ring-foreground/15 shadow-sm' : 'border-border hover:shadow-md'}`}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative w-full pt-[85%] lg:pt-[75%] bg-muted/50 rounded-lg md:rounded-xl overflow-hidden mb-2.5 shrink-0">
        {/* Stock Badge */}
        <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-md border border-border text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          {product.quantity} Stock
        </div>
        
        {/* Image or Fallback */}
        {product.imageUrl ? (
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

        {/* Quantity Overlay (Mobile specific, or when no action bar) */}
        {isInCart && !isEditingQty && (
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
      </div>
      
      {/* Product Info */}
      <div className="flex-1 flex flex-col pointer-events-none px-0.5">
        <h3 className="text-[14px] font-bold text-foreground line-clamp-1 leading-tight mb-0.5">
          {product.name}
        </h3>
        <p className="text-[12px] text-muted-foreground/70 line-clamp-1 leading-tight mb-1.5 font-medium">
          {product.sku}
        </p>
        
        <div className="font-bold text-[15px] text-foreground tracking-tight">
          ${product.price?.toFixed(2) || '0.00'}
        </div>
      </div>

      {/* Action Bar (Hidden on Mobile) */}
      <div className="mt-2.5 pointer-events-auto hidden md:block">
        {isInCart ? (
          <div className="flex items-center justify-between w-full h-10 px-1 bg-secondary rounded-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleDecrement(); }}
              className="h-8 w-8 rounded-full hover:bg-background text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            
            {isEditingQty ? (
              <input 
                ref={inputRef}
                type="number"
                min="1"
                className="w-10 h-7 text-center font-bold text-sm bg-background border border-border rounded-md outline-none no-spin-buttons"
                value={inputValue}
                onChange={handleQtyChange}
                onBlur={handleQtyBlur}
                onKeyDown={handleQtyKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="font-bold text-[14px] w-10 text-center cursor-pointer hover:text-primary transition-colors"
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
              className="h-8 w-8 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full h-10 rounded-full border-border text-[13px] font-bold text-foreground hover:bg-muted transition-colors shadow-sm flex items-center gap-2 justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
             Add to Cart
          </Button>
        )}
      </div>

      {/* Mobile Input State (When editing qty on mobile, since action bar is hidden) */}
      {isInCart && isEditingQty && (
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
