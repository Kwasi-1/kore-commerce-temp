import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import ProductCard, { Product } from './ProductCard';

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
      imageUrl: product.imageUrl
    });
  };

  const filteredProducts = activeCategory === 'All Product' 
    ? products 
    : products.filter(p => (p.category || 'Others Product') === activeCategory);

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* Top Controls: Categories and Search */}
      <div className="flex items-center justify-between pb-2 shrink-0">
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
                  ? 'text-foreground'
                  : 'border-border text-muted-foreground hover:border-gray-300'
              }`}
            >
              <span className="whitespace-nowrap">{cat.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeCategory === cat.name ? 'bg-primary text-[#1a1a1a]' : 'bg-muted text-muted-foreground'
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
          <Button 
            variant="outline"
            size="icon"
            onClick={() => setIsSearchActive(true)}
            className="rounded-full shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      <div 
        className="flex-1 overflow-y-auto pt-6 scrollbar-hide"
        style={{
          maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)'
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b6ff56]"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
