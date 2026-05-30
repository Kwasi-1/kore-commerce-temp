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
  quantity: number; // stock
  imageUrl?: string;
  category: string;
}

export default function ProductSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  
  const addItem = useCartStore((state) => state.addItem);

  // Fetch initial products and categories
  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Use tenant/products to get the full list for browsing
      const url = activeCategory === 'All' 
        ? '/tenant/products' 
        : `/tenant/products?category=${encodeURIComponent(activeCategory)}`;
        
      const response = await apiClient.get(url);
      const fetchedProducts = response.data.data.products || [];
      setProducts(fetchedProducts);

      // Extract unique categories if we are on 'All'
      if (activeCategory === 'All') {
        const uniqueCategories = Array.from(new Set(fetchedProducts.map((p: Product) => p.category).filter(Boolean))) as string[];
        setCategories(['All', ...uniqueCategories]);
      }
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
        // First try SKU lookup (exact match)
        const response = await apiClient.get(`/pos/products/lookup?sku=${encodeURIComponent(searchTerm.trim())}`);
        
        if (response.data?.success?.data?.product) {
          const product = response.data.success.data.product;
          handleAddToCart(product);
          setSearchTerm('');
          return;
        }
      } catch (error: any) {
        // If 404, it wasn't an exact SKU, fall through to name search
        if (error.response?.status !== 404) {
          console.error('SKU lookup error:', error);
        }
      }

      // Fallback: search by name
      try {
        const searchResponse = await apiClient.get(`/pos/products/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const foundProducts = searchResponse.data?.success?.data?.products || [];
        setProducts(foundProducts);
        setActiveCategory('All');
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setIsLoading(false);
      }
    } else if (e.key === 'Enter' && searchTerm.trim() === '') {
      // Empty search resets to all products
      fetchProducts();
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast.error(`${product.name} is out of stock!`);
      // We still allow adding to cart depending on settings, but let's assume strict stock checking for now or let the backend reject it later.
      // We'll proceed to add it anyway but show a warning.
    }
    
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
    });
    
    // Optional feedback
    // toast.success(`Added ${product.name}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-pos-surface-panel dark:bg-pos-dark-panel rounded-xl border border-gray-100 dark:border-pos-dark-border shadow-sm transition-colors">
      
      {/* Header / Search */}
      <div className="p-4 border-b border-gray-100 dark:border-pos-dark-border space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-pos-dark-border rounded-lg leading-5 bg-white dark:bg-pos-dark-app text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pos-accent focus:border-pos-accent sm:text-sm transition-colors"
            placeholder="Search by name or scan SKU and press Enter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSearchTerm('');
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'bg-pos-accent text-pos-accent-text'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-pos-dark-card dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-pos-surface-app dark:bg-pos-dark-app">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pos-accent"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="bg-white dark:bg-pos-dark-card rounded-xl border border-gray-100 dark:border-pos-dark-border p-4 cursor-pointer hover:shadow-md hover:border-pos-accent dark:hover:border-pos-accent transition-all group flex flex-col h-full"
              >
                <div className="mb-2 flex justify-between items-start">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    {product.quantity} in stock
                  </span>
                </div>
                
                {product.imageUrl && (
                  <div className="h-32 mb-3 bg-gray-50 dark:bg-pos-dark-panel rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={product.imageUrl} alt={product.name} className="max-h-full object-contain" />
                  </div>
                )}
                
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-pos-accent transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.sku}</p>
                
                <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50 dark:border-pos-dark-border">
                  <span className="font-bold text-gray-900 dark:text-white">
                    GHS {product.price?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-xs text-pos-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Add +
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
