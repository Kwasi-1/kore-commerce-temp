import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category: string;
  description?: string;
}

export default function ProductSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{name: string, count: number}[]>([{name: 'All Product', count: 0}]);
  const [activeCategory, setActiveCategory] = useState('All Product');
  const [isLoading, setIsLoading] = useState(false);
  
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/products');
      const fetchedProducts = response.data.data.products || [];
      setProducts(fetchedProducts);

      // Compute categories and counts
      const counts: Record<string, number> = { 'All Product': fetchedProducts.length };
      fetchedProducts.forEach((p: Product) => {
        const catName = p.category || 'Others Product';
        counts[catName] = (counts[catName] || 0) + 1;
      });

      const catsArray = Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
      // Sort so 'All Product' is first
      catsArray.sort((a, b) => a.name === 'All Product' ? -1 : b.name === 'All Product' ? 1 : 0);
      setCategories(catsArray);

    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      setIsLoading(true);
      try {
        const searchResponse = await apiClient.get(`/pos/products/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const foundProducts = searchResponse.data?.success?.data?.products || [];
        setProducts(foundProducts);
        setActiveCategory('All Product');
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setIsLoading(false);
      }
    } else if (e.key === 'Enter' && searchTerm.trim() === '') {
      fetchProducts();
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast.error(`${product.name} is out of stock!`);
    }
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
    });
  };

  const filteredProducts = activeCategory === 'All Product' 
    ? products 
    : products.filter(p => (p.category || 'Others Product') === activeCategory);

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* Top Controls: Categories and Search */}
      <div className="flex items-center justify-between p-6 pb-2 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pr-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                setActiveCategory(cat.name);
                setIsSearchActive(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
                activeCategory === cat.name
                  ? 'border-[#b6ff56] text-foreground'
                  : 'border-border text-muted-foreground hover:border-gray-300'
              }`}
            >
              <span className="whitespace-nowrap">{cat.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeCategory === cat.name ? 'bg-[#b6ff56] text-[#1a1a1a]' : 'bg-muted text-muted-foreground'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {isSearchActive && (
            <input
              autoFocus
              type="text"
              className="px-4 py-2 border border-border rounded-full text-sm bg-transparent outline-none w-48 transition-all"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              onBlur={() => { if(!searchTerm) setIsSearchActive(false) }}
            />
          )}
          <button 
            onClick={() => setIsSearchActive(true)}
            className="h-10 w-10 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b6ff56]"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-[20px] border border-border p-3 flex flex-col hover:shadow-md transition-shadow group h-[320px]"
              >
                {/* 1:1 Image Container */}
                <div className="relative w-full pt-[100%] bg-[#F5F5F5] rounded-xl overflow-hidden mb-3">
                  {/* Stock Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-[#1A1A1A] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
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
                  
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="w-full py-2.5 rounded-full border border-border text-[13px] font-semibold text-foreground hover:bg-[#b6ff56] hover:border-[#b6ff56] hover:text-[#1a1a1a] transition-colors mt-auto"
                  >
                    + Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
