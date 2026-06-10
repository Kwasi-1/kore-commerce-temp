import React, { useState, useEffect, useRef } from 'react';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import CartPanel from '@/components/pos/CartPanel';
import RegisterHeader from '@/components/pos/RegisterHeader';
import ShiftModal from '@/components/pos/ShiftModal';
import { CurrencyDisplay } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { PlayCircle, ShoppingCart } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useShift } from '@/hooks/useShift';

interface CartToast {
  id: string;
  productName: string;
  itemsCount: number;
  totalPrice: number;
}

export default function Register() {
  const { currentShift, openShift, isLoading } = useShift();
  const { staffUser } = useAuthStore();
  
  // Cart state for the mobile floating button
  const { items, subtotal, discount } = useCartStore();
  const taxRate = 0.12;
  const calculatedTotal = subtotal + (subtotal * taxRate) - discount;

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isOpeningShift, setIsOpeningShift] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [snapPoint, setSnapPoint] = useState<number | string | null>(0.85);

  // Desktop Collapsible Cart State
  const [panelState, setPanelState] = useState<'collapsed' | 'default' | 'expanded'>('default');
  const [isShaking, setIsShaking] = useState(false);

  // Custom Toast State (FIFO queue)
  const [activeToast, setActiveToast] = useState<CartToast | null>(null);
  const [toastQueue, setToastQueue] = useState<CartToast[]>([]);

  const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
  const prevTotalQty = useRef(totalQty);

  // Watch items count for collapsed state quick add
  useEffect(() => {
    if (totalQty > prevTotalQty.current) {
      if (panelState === 'collapsed') {
        const addedItem = items[items.length - 1];
        const addedName = addedItem ? addedItem.name : 'Product';

        // Trigger shake
        setIsShaking(true);

        // Add to toast queue
        const newToast: CartToast = {
          id: Math.random().toString(),
          productName: addedName,
          itemsCount: items.length,
          totalPrice: calculatedTotal,
        };
        setToastQueue(prev => [...prev, newToast]);

        // Reset shaking state after shake animation (300ms)
        setTimeout(() => {
          setIsShaking(false);
        }, 300);
      }
    }
    prevTotalQty.current = totalQty;
  }, [totalQty, panelState, items, calculatedTotal]);

  // FIFO Toast processing
  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setToastQueue(prev => prev.slice(1));
      setActiveToast(nextToast);
    }
  }, [activeToast, toastQueue]);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const handleDragHandleClick = () => {
    if (panelState === 'default') {
      if (items.length === 0) {
        setPanelState('collapsed');
      } else {
        setPanelState('expanded');
      }
    } else if (panelState === 'expanded') {
      setPanelState('default');
    } else if (panelState === 'collapsed') {
      setPanelState('default');
    }
  };

  useEffect(() => {
    // If the user is logged in, finished loading shift data, and there's no open shift
    if (staffUser && !isLoading && !currentShift) {
      setIsShiftModalOpen(true);
    }
  }, [staffUser, isLoading, currentShift]);

  const handleOpenShift = async (float: number) => {
    setIsOpeningShift(true);
    const success = await openShift(float);
    setIsOpeningShift(false);
    if (success) {
      setIsShiftModalOpen(false);
    }
    return success;
  };

  return (
    <div className="flex flex-col h-full bg-background p-3 pt-5 md:p-6 overflow-hidden relative">
      
      {/* Extracted Header Component */}
      <RegisterHeader />

      {/* Main Content: Split View */}
      <div className="flex flex-1 gap-6 min-h-0 relative">
        
        {/* Left Panel: Products */}
        <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden relative pb-16 lg:pb-0">
          <ProductSearchBar isCartCollapsed={panelState === 'collapsed'} />
        </div>

        {/* Backdrop Overlay for Expanded State */}
        {panelState === 'expanded' && (
          <div 
            onClick={() => setPanelState('default')}
            className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-20 cursor-pointer animate-in fade-in duration-200"
          />
        )}

        {/* Right Panel: Cart (Desktop only) */}
        <div className={`hidden lg:flex flex-col relative transition-all ease-out ${
          panelState === 'expanded' ? 'duration-250' : 'duration-300'
        } ${
          panelState === 'collapsed' 
            ? 'w-0 opacity-0 translate-x-full shrink-0 pointer-events-none' 
            : panelState === 'expanded'
              ? 'absolute top-0 right-0 h-full w-[75%] max-w-[75vw] z-30 shadow-[0_0_50px_rgba(0,0,0,0.15)] rounded-l-[24px] border-l border-border bg-secondary'
              : 'w-[420px] shrink-0'
        }`}>
          <CartPanel 
            panelState={panelState} 
            onStateChange={setPanelState} 
            onHandleClick={handleDragHandleClick}
          />
          
          {/* Cart Block Overlay */}
          {false && !isLoading && !currentShift && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[24px] border border-border/50">
              <div className="bg-card p-6 rounded-2xl shadow-lg border border-border text-center max-w-[320px]">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Shift Closed</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  You must open a new shift before processing any transactions.
                </p>
                <Button 
                  onClick={() => setIsShiftModalOpen(true)}
                  className="w-full rounded-xl font-bold"
                >
                  Start Shift
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Desktop Floating Pill (State 1) */}
      {panelState === 'collapsed' && (
        <>
          {/* Active Toast Stack at the Top Center */}
          {activeToast && (
            <div className="hidden lg:block absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-down-toast">
              <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-full px-6 py-3 flex items-center gap-2 text-foreground font-semibold text-sm">
                <span className="text-emerald-500 font-bold text-base">✓</span>
                <span>{activeToast.productName} added</span>
                <span className="text-muted-foreground/60 mx-1">|</span>
                <span>Cart: {activeToast.itemsCount} {activeToast.itemsCount === 1 ? 'item' : 'items'} · <CurrencyDisplay amount={activeToast.totalPrice} /></span>
              </div>
            </div>
          )}

          {/* Collapsed Pill at the Bottom Center */}
          <div className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setPanelState('default')}
              className={`h-14 px-6 rounded-full bg-primary hover:bg-primary/90 hover:brightness-105 border border-white/10 shadow-xl flex items-center gap-3 text-primary-foreground font-bold hover:scale-105 transition-all duration-300 ${
                isShaking ? 'animate-shake-pill' : ''
              }`}
              title="Expand panel"
            >
              <span className="text-lg">🛒</span>
              <span className="text-sm font-semibold tracking-tight">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
              <span className="text-muted-foreground/40 font-normal">·</span>
              <span className="text-lg tracking-tight">
                <CurrencyDisplay amount={calculatedTotal} />
              </span>
            </button>
          </div>
        </>
      )}

      {/* Mobile Floating Cart Button */}
      <div className="lg:hidden absolute bottom-4 left-4 right-4 z-40">
        <Button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full h-14 rounded-2xl bg-primary/90 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-between px-5 text-primary-foreground hover:bg-primary transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-primary">
                  {items.length}
                </span>
              )}
            </div>
            <span className="font-semibold text-sm">View Cart</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <CurrencyDisplay amount={calculatedTotal} />
          </span>
        </Button>
      </div>

      {/* Mobile Cart Drawer */}
      <Drawer 
        open={isMobileCartOpen} 
        onOpenChange={setIsMobileCartOpen}
        snapPoints={[0.85, 1]}
        activeSnapPoint={snapPoint}
        setActiveSnapPoint={setSnapPoint}
        fadeFromIndex={0}
      >
        <DrawerContent className="bg-background h-full max-h-[100vh] outline-none">
          <div className={`flex-1 h-full flex flex-col relative overflow-hidden transition-all duration-300 ${snapPoint === 0.85 ? 'pb-[15vh]' : 'pb-0'}`}>
            <CartPanel isMobileView={true} />

            {/* Cart Block Overlay (Mobile) */}
            {false && !isLoading && !currentShift && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-t border-border/50">
                <div className="bg-card p-6 rounded-2xl shadow-lg border border-border text-center max-w-[320px]">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Shift Closed</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    You must open a new shift before processing any transactions.
                  </p>
                  <Button 
                    onClick={() => {
                      setIsMobileCartOpen(false);
                      setIsShiftModalOpen(true);
                    }}
                    className="w-full rounded-xl font-bold"
                  >
                    Start Shift
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <ShiftModal 
        isOpen={isShiftModalOpen} 
        onOpenChange={setIsShiftModalOpen} 
        onOpenShift={handleOpenShift}
        isOpening={isOpeningShift}
      />
    </div>
  );
}
