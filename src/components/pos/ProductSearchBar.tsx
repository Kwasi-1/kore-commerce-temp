import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X } from 'lucide-react';
import apiClient from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import { useShift } from '@/hooks/useShift';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import ProductCard, { Product } from './ProductCard';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerBody, DrawerHeader } from '@nextui-org/react';

export default function ProductSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  // Store all category objects to display counts
  const [categories, setCategories] = useState<{name: string, count: number}[]>([]);
  // Use array for multi-select
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter Modal State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');

  const addItem = useCartStore((state) => state.addItem);
  const { currentShift } = useShift();

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
      const counts: Record<string, number> = {};
      fetchedProducts.forEach((p: Product) => {
        const catName = p.category || 'Others Product';
        counts[catName] = (counts[catName] || 0) + 1;
      });

      const catsArray = Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
      // Sort alphabetically or by count
      catsArray.sort((a, b) => b.count - a.count);
      setCategories(catsArray);

    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const initialRender = useRef(true);

  // Debounced search effect
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        performSearch(searchTerm.trim());
      } else {
        fetchProducts();
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const searchResponse = await apiClient.get(`/pos/products/search?q=${encodeURIComponent(query)}`);
      const foundProducts = searchResponse.data?.success?.data?.products || [];
      setProducts(foundProducts);
      setActiveCategories([]);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    // TEMPORARILY DISABLED SHIFT CHECK FOR TESTING
    if (false && !currentShift) {
      toast.error('You must start a shift first before adding items to the cart!');
      return;
    }
    
    if (product.stock_quantity !== undefined && product.stock_quantity <= 0) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }

    const currentQuantityInCart = useCartStore.getState().items.find(i => i.productId === product.id)?.quantity || 0;
    const stock = product.stock_quantity ?? Infinity;
    
    if (currentQuantityInCart >= stock) {
      toast.error(`Only ${stock} in stock!`);
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock_quantity: product.stock_quantity
    });
  };

  const toggleCategory = (catName: string) => {
    setActiveCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      }
      return [...prev, catName];
    });
  };

  const filteredProducts = activeCategories.length === 0 
    ? products 
    : products.filter(p => activeCategories.includes(p.category || 'Others Product'));

  // The categories to display in the dropdown/drawer (filtered by the local search inside the filter UI)
  const displayCategories = categories.filter(c => c.name.toLowerCase().includes(filterSearchTerm.toLowerCase()));

  // Render Category Checkbox List
  const renderCategoryCheckboxes = () => (
    <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-hide py-2">
      {displayCategories.map(cat => (
        <DropdownMenuCheckboxItem
          key={cat.name}
          checked={activeCategories.includes(cat.name)}
          onCheckedChange={() => toggleCategory(cat.name)}
          className="cursor-pointer"
          onSelect={(e) => e.preventDefault()} // prevent closing when checking
        >
          <div className="flex items-center justify-between w-full pr-2">
            <span>{cat.name}</span>
            <span className="text-muted-foreground text-xs ml-2">({cat.count})</span>
          </div>
        </DropdownMenuCheckboxItem>
      ))}
      {displayCategories.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">No categories found.</div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* Top Controls: Categories and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between pb-3 gap-3 shrink-0 border-b border-border/40 md:border-0 mb-3 md:mb-0">
        
        {/* Mobile Layout: Full Search + Filter */}
        <div className="w-full flex md:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-9 pr-10 py-2 border border-border rounded-full text-sm bg-transparent outline-none transition-colors"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            radius="full" 
            className={`shrink-0 h-10 w-10 border-border ${activeCategories.length > 0 ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            {activeCategories.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border border-background"></span>
            )}
          </Button>
        </div>

        {/* Desktop Layout: Category Pills */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide pr-4 flex-1">
          {/* Active Pills */}
          <button
            onClick={() => setActiveCategories([])}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
              activeCategories.length === 0
                ? 'bg-muted text-muted-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            All
          </button>
          
          {/* Show up to 4 popular or active categories */}
          {categories.slice(0, 4).map((cat) => {
            const isActive = activeCategories.includes(cat.name);
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border whitespace-nowrap ${
                  isActive
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {cat.name}
                {isActive && <X className="h-3.5 w-3.5 ml-0.5 opacity-70 hover:opacity-100" />}
              </button>
            )
          })}

          {/* Desktop Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full h-8 px-3 border-border bg-background hover:bg-secondary flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeCategories.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full font-bold">
                    {activeCategories.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 rounded-xl border-border/60 shadow-lg">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search categories..."
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary border-none rounded-lg outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {renderCategoryCheckboxes()}
              {activeCategories.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveCategories([])}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Search Bar */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
                    {isSearchActive ? (

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className="w-48 xl:w-64 pl-9 pr-10 py-2 border border-border rounded-full text-sm bg-transparent outline-none"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
           ) : (
          <Button 
            variant="outline"
            size="icon"
            onClick={() => setIsSearchActive(true)}
            className="rounded-full shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>)}
        </div>

      </div>

      {/* Product Grid */}
      <div 
        className="flex-1 overflow-y-auto pt-2 md:pt-4 scrollbar-hide"
        style={{
          maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)'
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full pt-10">
            <Spinner />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-10">
            <div className="bg-secondary p-6 rounded-full mb-4">
               <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">No products found</p>
            <p className="text-sm text-center max-w-[250px] mb-6">
              We couldn't find anything matching your criteria. Try adjusting your search or filters.
            </p>
            <div className="flex gap-3">
              {searchTerm && (
                <Button variant="outline" className="rounded-full font-bold" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
              {activeCategories.length > 0 && (
                <Button variant="secondary" className="rounded-full font-bold" onClick={() => setActiveCategories([])}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-28">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer 
        isOpen={isMobileFilterOpen} 
        onOpenChange={setIsMobileFilterOpen} 
        placement="bottom" 
        classNames={{ base: "bg-background rounded-t-[24px]" }}
      >
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="border-b border-border/40 py-4 flex flex-col gap-3">
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-lg">Filters</span>
                  {activeCategories.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveCategories([])} className="text-muted-foreground text-xs h-7 px-2">
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Find categories..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-secondary rounded-xl outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </DrawerHeader>
              <DrawerBody className="py-2 overflow-y-auto max-h-[50vh]">
                <div className="flex flex-col">
                  {displayCategories.map(cat => {
                    const isChecked = activeCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className="flex items-center justify-between w-full py-3 px-1 border-b border-border/20 last:border-0"
                      >
                        <span className={`text-sm ${isChecked ? 'font-bold text-primary' : 'text-foreground'}`}>
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                            {cat.count}
                          </span>
                          <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-border'}`}>
                            {isChecked && <X className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {displayCategories.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6">No categories match your search.</div>
                  )}
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

    </div>
  );
}
