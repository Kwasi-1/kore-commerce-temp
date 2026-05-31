import { Button } from "@/components/ui/button";
import { useCartStore } from '@/store/cartStore';
import { Minus, Plus, Package } from 'lucide-react';

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

  return (
    <div 
      className={`bg-card rounded-[20px] border p-3 flex flex-col transition-all group h-[320px] cursor-pointer ${isInCart ? 'border-primary shadow-sm' : 'border-border hover:shadow-md'}`}
      onClick={() => {
        if (!isInCart) onAddToCart(product);
      }}
    >
      {/* 1:1 Image Container */}
      <div className="relative w-full pt-[100%] bg-[#f1f1f1] rounded-xl overflow-hidden mb-3 shrink-0">
        {/* Stock Badge */}
        <div className="absolute top-2 left-2 z-10 bg-[var(--sidebar-background)] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
          {product.quantity} Stock
        </div>
        
        {/* Image or Fallback */}
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 mix-blend-multiply group-hover:scale-105 transition-transform duration-500">
             <Package className="h-12 w-12 stroke-[1.5]" />
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="flex-1 flex flex-col pointer-events-none">
        <h3 className="text-[15px] font-bold text-foreground line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-[12px] text-muted-foreground line-clamp-2 leading-tight mb-2 flex-1">
          {product.description || product.sku}
        </p>
        
        <div className="font-bold text-[16px] text-foreground mb-3">
          ${product.price?.toFixed(2) || '0.00'}
        </div>
        
        {/* Action Button / Quantity Controls */}
        <div className="mt-auto pointer-events-auto">
          {isInCart ? (
            <div className="flex items-center justify-between w-full h-10 px-1 bg-muted rounded-full border border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleDecrement(); }}
                className="h-8 w-8 rounded-full hover:bg-background"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold text-[14px] w-8 text-center">{cartQuantity}</span>
              <Button
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleIncrement(); }}
                className="h-8 w-8 rounded-full bg-primary hover:brightness-95 text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
              className="w-full h-10 rounded-full border-border text-[13px] font-semibold text-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground transition-colors"
            >
              + Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
