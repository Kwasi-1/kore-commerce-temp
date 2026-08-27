import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import { useShift } from '@/hooks/useShift';
import { useFeaturesStore } from '@/store/featuresStore';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import ProductCard, { Product, PackagingTier } from './ProductCard';
import { Spinner } from '@/components/ui/spinner';
import { useRegisterPreferencesStore, playCartChime } from '@/store/registerPreferencesStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProductCacheStore } from '@/store/productCacheStore';
import { cn } from '@/lib/utils';

interface ProductSearchBarProps {
  isCartCollapsed?: boolean;
}

export default function ProductSearchBar({ isCartCollapsed = false }: ProductSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [renderedCollapsed, setRenderedCollapsed] = useState(isCartCollapsed);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  const { gridDensity, defaultPriceType, soundEffectsEnabled, hideOutOfStock, togglePreference, setPreference } = useRegisterPreferencesStore();

  const getGridColsClass = () => {
    if (renderedCollapsed) {
      switch (gridDensity) {
        case 'compact':
          return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8';
        case 'large':
          return 'grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5';
        case 'normal':
        default:
          return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6';
      }
    } else {
      switch (gridDensity) {
        case 'compact':
          return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6';
        case 'large':
          return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4';
        case 'normal':
        default:
          return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5';
      }
    }
  };

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setRenderedCollapsed(isCartCollapsed);
      setIsTransitioning(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [isCartCollapsed]);
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
  const { posSettings } = useFeaturesStore();
  const isShiftRequired = Boolean(posSettings?.pos_shift_management_enabled);

  // Offline support
  const { isOnline } = useNetworkStatus();
  const { products: cachedProducts, categories: cachedCategories, setCache: setProductCache } = useProductCacheStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const parseVal = (v: any, fallback = 0): number => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'object') return typeof v.parsedValue === 'number' ? v.parsedValue : (parseFloat(v.source || '0') || fallback);
    const num = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(num) ? fallback : num;
  };

  const parseWholesaleVal = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') {
      if (typeof v.parsedValue === 'number') return v.parsedValue;
      if (v.source) {
        const p = parseFloat(v.source);
        return isNaN(p) ? null : p;
      }
      return null;
    }
    const num = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(num) ? null : num;
  };

  const flattenProducts = (rawProducts: any[]): Product[] => {
    const flat: Product[] = [];
    rawProducts.forEach(item => {
      // Case A: Item is already a direct variant object (returned by /pos/products/search)
      if (item.variant_id && item.packaging_tiers) {
        const attrValues = item.variant_attributes ? Object.values(item.variant_attributes).filter(Boolean) : [];
        const parentName = item.product_name || item.name || '';
        const combinedName = attrValues.length > 0 
          ? `${parentName} · ${attrValues.join(' · ')}`
          : parentName;
          
        const defaultTier = item.packaging_tiers.find((t: any) => t.is_default_sale_unit) || item.packaging_tiers[0];
        const rawRetailPrice = defaultTier ? parseVal(defaultTier.prices?.retail, 0) : 0;
        const stockDisplayVal = parseVal(item.stock_display, item.stock_quantity ?? 0);

        // Normalize packaging_tiers prices if they come as { source, parsedValue }
        const normalizedTiers = (item.packaging_tiers || []).map((t: any) => ({
          ...t,
          prices: {
            retail: parseVal(t.prices?.retail, 0),
            wholesale: parseWholesaleVal(t.prices?.wholesale)
          }
        }));

        flat.push({
          id: item.variant_id,
          variant_id: item.variant_id,
          product_name: parentName,
          name: combinedName,
          sku: item.sku,
          price: rawRetailPrice,
          imageUrl: item.imageUrl || item.images?.[0] || undefined,
          category: item.category || 'General',
          description: item.description,
          stock_quantity: item.stock_quantity ?? 0,
          stock_display: stockDisplayVal,
          stock_display_unit: item.stock_display_unit || 'unit',
          low_stock: item.low_stock || false,
          sell_mode: item.sell_mode || 'unit_only',
          packaging_tiers: normalizedTiers,
          variant_attributes: item.variant_attributes || {},
          base_unit_name: item.base_unit_name || 'unit',
          expiry_warning: item.expiry_warning
        });
        return;
      }

      // Case B: Item is a parent product containing a nested variants array (from GET /pos/products)
      (item.variants || []).forEach((variant: any) => {
        const attrValues = variant.variant_attributes ? Object.values(variant.variant_attributes).filter(Boolean) : [];
        const combinedName = attrValues.length > 0 
          ? `${item.name} · ${attrValues.join(' · ')}`
          : item.name;
          
        const defaultTier = variant.packaging_tiers.find((t: any) => t.is_default_sale_unit) || variant.packaging_tiers[0];
        const defaultPrice = defaultTier ? parseVal(defaultTier.prices?.retail, 0) : 0;
        const stockDisplayVal = parseVal(variant.stock_display, variant.stock_quantity ?? 0);

        const normalizedTiers = (variant.packaging_tiers || []).map((t: any) => ({
          ...t,
          prices: {
            retail: parseVal(t.prices?.retail, 0),
            wholesale: parseWholesaleVal(t.prices?.wholesale)
          }
        }));

        flat.push({
          id: variant.variant_id,
          variant_id: variant.variant_id,
          product_name: item.name,
          name: combinedName,
          sku: variant.sku,
          price: defaultPrice,
          imageUrl: item.imageUrl || item.images?.[0] || undefined,
          category: item.category || 'General',
          description: item.description,
          stock_quantity: variant.stock_quantity ?? 0,
          stock_display: stockDisplayVal,
          stock_display_unit: variant.stock_display_unit || 'unit',
          low_stock: variant.low_stock || false,
          sell_mode: variant.sell_mode || 'unit_only',
          packaging_tiers: normalizedTiers,
          variant_attributes: variant.variant_attributes || {},
          base_unit_name: variant.base_unit_name || 'unit',
          expiry_warning: variant.expiry_warning
        });
      });
    });
    return flat;
  };

  const fetchProducts = async (silent = false) => {
    // If offline, fall back to cache
    if (!navigator.onLine) {
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setCategories(cachedCategories);
      }
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const response = await apiClient.get('/pos/products');
      const fetchedProducts = response.data.success?.data?.products || [];

      // Compute categories and counts
      const counts: Record<string, number> = {};
      fetchedProducts.forEach((p: any) => {
        const catName = p.category || 'Others Product';
        counts[catName] = (counts[catName] || 0) + 1;
      });

      const catsArray = Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
      catsArray.sort((a, b) => b.count - a.count);
      setCategories(catsArray);

      // Flatten nested variants for listing
      const flatProducts = flattenProducts(fetchedProducts);
      setProducts(flatProducts);

      // Write to offline cache
      setProductCache(flatProducts, catsArray);

    } catch (error) {
      console.error('Failed to fetch products:', error);
      // On network error, fall back to cache silently
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setCategories(cachedCategories);
        if (!silent) toast.error('Showing cached products (could not reach server)');
      } else {
        if (!silent) toast.error('Failed to load products');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Silent update listener for completed transactions
  useEffect(() => {
    const handleTransactionCompleted = () => {
      fetchProducts(true);
    };

    window.addEventListener('pos:transaction-completed', handleTransactionCompleted);
    return () => {
      window.removeEventListener('pos:transaction-completed', handleTransactionCompleted);
    };
  }, []);

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
    // Offline: filter the local cache instead of hitting the API
    if (!navigator.onLine) {
      const lower = query.toLowerCase();
      const filtered = cachedProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower)
      );
      setProducts(filtered);
      setActiveCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResponse = await apiClient.get(`/pos/products/search?q=${encodeURIComponent(query)}`);
      const foundProducts = searchResponse.data?.success?.data?.products || [];
      setProducts(flattenProducts(foundProducts));
      setActiveCategories([]);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product, selectedTier?: PackagingTier, quantityMultiplier: number = 1) => {
    if (isShiftRequired && !currentShift) {
      toast.error('You must start a shift first before adding items to the cart!');
      return;
    }

    const tier = selectedTier || product.packaging_tiers.find(t => t.is_default_sale_unit) || product.packaging_tiers[0];
    if (!tier) {
      toast.error('No packaging tier defined for this variant!');
      return;
    }
    
    const stock = product.stock_quantity ?? Infinity;
    if (stock <= 0) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }

    // Expiry warning confirmation (warn-but-allow rule)
    if (product.expiry_warning?.has_warning && product.expiry_warning.days_until_expiry <= 0) {
      const proceed = window.confirm("This item may be expired. Continue?");
      if (!proceed) return;
    }

    const cartKey = `${product.variant_id}-${tier.id}`;
    const currentQuantityInCart = useCartStore.getState().items.find(i => i.productId === cartKey)?.quantity || 0;
    const addedQty = Math.round(quantityMultiplier * 1000) / 1000;
    const incrementedQtyInBaseUnits = (currentQuantityInCart + addedQty) * tier.units_per_tier;

    if (incrementedQtyInBaseUnits > stock) {
      toast.error(`Only ${product.stock_display} ${product.stock_display_unit} in stock!`);
      return;
    }

    const activePrice = (defaultPriceType === 'wholesale' && tier.prices.wholesale !== null)
      ? tier.prices.wholesale
      : tier.prices.retail;
      
    const activePriceType = (defaultPriceType === 'wholesale' && tier.prices.wholesale !== null)
      ? 'wholesale'
      : 'retail';

    addItem({
      productId: cartKey,
      name: product.name,
      sku: product.sku,
      price: activePrice,
      quantity: addedQty,
      imageUrl: product.imageUrl,
      category: product.category,
      stock_quantity: product.stock_quantity,
      variant_id: product.variant_id,
      packaging_tier_id: tier.id,
      tier_name: tier.name,
      units_per_tier: tier.units_per_tier,
      unit_price: activePrice,
      price_type: activePriceType,
      packaging_tiers: product.packaging_tiers
    });

    if (soundEffectsEnabled) {
      playCartChime();
    }
  };

  const toggleCategory = (catName: string) => {
    setActiveCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      }
      return [...prev, catName];
    });
  };

  // Filter products by active categories and out-of-stock preference
  let filteredProducts = activeCategories.length === 0 
    ? products 
    : products.filter(p => activeCategories.includes(p.category || 'Others Product'));

  if (hideOutOfStock) {
    filteredProducts = filteredProducts.filter(p => (p.stock_quantity ?? 0) > 0);
  }

  const totalActiveFilters = activeCategories.length + (hideOutOfStock ? 1 : 0);

  const hasOutOfStockProducts = products.some(p => (p.stock_quantity ?? 0) <= 0);

  // The categories to display in the dropdown/drawer (filtered by the local search inside the filter UI)
  const displayCategories = categories.filter(c => c.name.toLowerCase().includes(filterSearchTerm.toLowerCase()));

  // Render Category Checkbox List
  const renderCategoryCheckboxes = () => (
    <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto scrollbar-hide py-1">
      {displayCategories.map(cat => (
        <DropdownMenuCheckboxItem
          key={cat.name}
          checked={activeCategories.includes(cat.name)}
          onCheckedChange={() => toggleCategory(cat.name)}
          className="cursor-pointer rounded-md"
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

      {/* Offline Notice Banner */}
      {!isOnline && (
        <div className="hidden md:flex flex-col gap-1.5 mb-2 shrink-0 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span>Offline Mode — Showing cached products. Cash &amp; Manual MoMo only.</span>
          </div>
          {/* Stale cache warning — shown when cache is more than 1 hour old */}
          {(() => {
            const cachedAt = useProductCacheStore.getState().cachedAt;
            const isStaleHour = cachedAt && (Date.now() - cachedAt) > 60 * 60 * 1000;
            return isStaleHour ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-semibold">
                <span>⚠️ Product catalog was last synced over 1 hour ago. Prices and stock may be outdated.</span>
              </div>
            ) : null;
          })()}
        </div>
      )}
      
      {/* Top Controls: Categories, In Stock Filter and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between pb-3 gap-3 shrink-0 border-b border-border/40 md:border-0 mb-3 md:mb-0">
        
        {/* Mobile Layout: Full Search + Filter */}
        <div className="w-full flex md:hidden items-center gap-2">
          <div className="relative flex-1">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            radius="full" 
            className={`shrink-0 h-10 w-10 border-border relative ${totalActiveFilters > 0 ? 'bg-muted/20 text-foreground border-border' : ''}`}
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <Icon icon="lets-icons:filter" className="h-4 w-4" />
            {totalActiveFilters > 0 && (
              <span className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-full border border-background z-30"></span>
            )}
          </Button>
        </div>

        {/* Desktop Layout: Category Pills + Quick "In Stock Only" Toggle */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide pr-4 flex-1">
          {/* All Categories Pill */}
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
          
          {/* Show up to 3 popular or active categories */}
          {categories.slice(0, 3).map((cat) => {
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
                {isActive && <Icon icon="solar:close-circle-linear" className="h-3.5 w-3.5 ml-0.5 opacity-70 hover:opacity-100" />}
              </button>
            );
          })}

          {/* Quick 1-Tap "In Stock Only" Toggle Pill (Only shown if store has out-of-stock items or if currently active) */}
          {(hasOutOfStockProducts || hideOutOfStock) && (
            <button
              onClick={() => togglePreference('hideOutOfStock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all border whitespace-nowrap ${
                hideOutOfStock
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
              title="Toggle to hide out of stock products"
            >
              <Icon icon={hideOutOfStock ? "solar:box-minimalistic-bold" : "solar:box-minimalistic-linear"} className="h-3.5 w-3.5" />
              <span>In Stock Only</span>
              {hideOutOfStock && (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse ml-0.5" />
              )}
            </button>
          )}

          {/* Desktop Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`rounded-full h-8 px-3 border-border bg-background hover:bg-secondary flex items-center gap-1.5 ${
                  totalActiveFilters > 0 ? 'pr-1.5' : ''
                }`}
              >
                <Icon icon="lets-icons:filter" className="h-3.5 w-3.5" />
                <span>Filters</span>
                {totalActiveFilters > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full font-bold">
                    {totalActiveFilters}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-72 p-2.5 rounded-2xl border-border/60 shadow-lg">
              {/* Stock Status Switch in Dropdown (shown if store has out of stock items or filter is active) */}
              {(hasOutOfStockProducts || hideOutOfStock) && (
                <div 
                  onClick={() => togglePreference('hideOutOfStock')}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors mb-2.5 bg-muted/30 border border-border/40"
                >
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:box-minimalistic-linear" className="h-4 w-4 text-foreground/80" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">In Stock Only</span>
                      <span className="text-[10px] text-muted-foreground">Hide 0-stock products</span>
                    </div>
                  </div>
                  <Switch 
                    checked={hideOutOfStock} 
                    onCheckedChange={(val) => setPreference('hideOutOfStock', val)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Categories Search & List */}
              <div className="relative mb-2">
                <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search categories..."
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-full outline-none focus:ring-0 focus:border-foreground/10 bg-background"
                />
              </div>

              {renderCategoryCheckboxes()}

              {totalActiveFilters > 0 && (
                <div className="pt-2 mt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
                    onClick={() => {
                      setActiveCategories([]);
                      setPreference('hideOutOfStock', false);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Expanding Search Bar */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Icon 
              icon="solar:magnifer-linear" 
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors" 
            />
            <input
              ref={desktopSearchInputRef}
              type="text"
              className={cn(
                "h-9 rounded-full pl-9 text-sm bg-transparent border border-border outline-none transition-all duration-300 ease-in-out font-medium",
                "focus:border-foreground",
                isSearchActive || searchTerm
                  ? "w-48 lg:w-60 xl:w-72 pr-8 placeholder:opacity-100 shadow-xs"
                  : "w-9 pr-0 cursor-pointer placeholder:opacity-0 hover:bg-secondary"
              )}
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchActive(true)}
              onBlur={() => {
                if (!searchTerm.trim()) {
                  setIsSearchActive(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (searchTerm) {
                    setSearchTerm('');
                  } else {
                    setIsSearchActive(false);
                    desktopSearchInputRef.current?.blur();
                  }
                }
              }}
            />
            {searchTerm && (
              <button 
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchActive(false);
                  desktopSearchInputRef.current?.blur();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center p-0.5 rounded-full hover:bg-muted/80 transition-colors"
              >
                <Icon icon="ant-design:close-outlined" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Product Grid */}
      <div 
        className="flex-1 overflow-y-auto pt-2 md:pt-4 scrollbar-hide px-1 -mx-1"
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
               <Icon icon="solar:magnifer-linear" className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">No products found</p>
            <p className="text-sm text-center max-w-[280px] mb-6">
              {hideOutOfStock && products.length > 0
                ? "All matching items are currently out of stock. Try toggling off 'In Stock Only' or adjusting filters."
                : "We couldn't find anything matching your criteria. Try adjusting your search or filters."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {searchTerm && (
                <Button 
                  variant="outline" 
                  className="rounded-full font-semibold" 
                  onClick={() => {
                    setSearchTerm('');
                    setIsSearchActive(false);
                    desktopSearchInputRef.current?.blur();
                  }}
                >
                  Clear Search
                </Button>
              )}
              {hideOutOfStock && (
                <Button 
                  variant="outline" 
                  className="rounded-full font-semibold" 
                  onClick={() => setPreference('hideOutOfStock', false)}
                >
                  Show Out of Stock
                </Button>
              )}
              {activeCategories.length > 0 && (
                <Button variant="secondary" className="rounded-full font-semibold" onClick={() => setActiveCategories([])}>
                  Clear Categories
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div 
            className={`grid gap-3 md:gap-4 pb-28 transition-opacity duration-100 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            } ${getGridColsClass()}`}
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer (using app UI Drawer) */}
      <Drawer open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <DrawerContent className="max-h-[50vh] p-0 border-t border-border bg-background rounded-t-[24px]">
          <div className="px-6 pb-4 border-b border-border/40 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 ">
              <DrawerTitle className="text-lg font-bold text-foreground !tracking-normal">Filters</DrawerTitle>
              <div className="flex items-center gap-2">
                {totalActiveFilters > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setActiveCategories([]);
                      setPreference('hideOutOfStock', false);
                    }} 
                    className="text-muted-foreground text-xs h-7 px-2 hover:text-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile In-Stock Switch */}
            {(hasOutOfStockProducts || hideOutOfStock) && (
              <div 
                onClick={() => togglePreference('hideOutOfStock')}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Icon icon="solar:box-minimalistic-bold" className={`h-5 w-5 text-muted-foreground`} />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground mb-1">In Stock Only</span>
                    <span className="text-xs text-muted-foreground">Hide out-of-stock products</span>
                  </div>
                </div>
                <Switch 
                  checked={hideOutOfStock} 
                  onCheckedChange={(val) => setPreference('hideOutOfStock', val)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Search Categories */}
            <div className="relative w-full">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Find categories..."
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none focus:ring-0 focus:border-foreground/10"
              />
            </div>
          </div>

          {/* Categories List in Mobile Drawer */}
          <div className="px-6 py-2 overflow-y-auto max-h-[45vh] flex flex-col divide-y divide-border/20">
            {displayCategories.map(cat => {
              const isChecked = activeCategories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className="flex items-center justify-between w-full py-3 px-1 border-b border-border/20 last:border-0"
                >
                  <span className={`text-sm ${isChecked ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                      {cat.count}
                    </span>
                    <Checkbox 
                      checked={isChecked}
                      onCheckedChange={() => toggleCategory(cat.name)}
                      onClick={(e) => e.stopPropagation()}
                      className='h-5 w-5 rounded-md'
                    />
                  </div>
                </button>
              );
            })}
            {displayCategories.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">No categories match your search.</div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
