import { Button } from "@/components/ui/button";

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
  return (
    <div className="bg-card rounded-[20px] border border-border p-3 flex flex-col hover:shadow-md transition-shadow group h-[320px]">
      {/* 1:1 Image Container */}
      <div className="relative w-full pt-[100%] bg-muted rounded-xl overflow-hidden mb-3">
        {/* Stock Badge */}
        <div className="absolute top-2 left-2 z-10 bg-[var(--sidebar-background)] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
          {product.quantity} Stock
        </div>
        
        {/* Image */}
        <img 
          src={product.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=random`} 
          alt={product.name} 
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-500" 
        />
      </div>
      
      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-[15px] font-bold text-foreground line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-[12px] text-muted-foreground line-clamp-2 leading-tight mb-2 flex-1">
          {product.description || product.sku}
        </p>
        
        <div className="font-bold text-[16px] text-foreground mb-3">
          ${product.price?.toFixed(2) || '0.00'}
        </div>
        
        <Button 
          variant="outline"
          onClick={() => onAddToCart(product)}
          className="w-full rounded-full border-border text-[13px] font-semibold text-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground transition-colors mt-auto"
        >
          + Add to Cart
        </Button>
      </div>
    </div>
  );
}
