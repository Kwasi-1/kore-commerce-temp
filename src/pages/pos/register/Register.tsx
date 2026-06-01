import React, { useState, useEffect } from 'react';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import CartPanel from '@/components/pos/CartPanel';
import RegisterHeader from '@/components/pos/RegisterHeader';
import ShiftModal from '@/components/pos/ShiftModal';
import { useShift } from '@/hooks/useShift';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { PlayCircle, ShoppingCart } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

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
          <ProductSearchBar />
        </div>

        {/* Right Panel: Cart (Desktop only) */}
        <div className="hidden lg:flex w-[420px] shrink-0 flex-col relative">
          <CartPanel />
          
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

      {/* Mobile Floating Cart Button */}
      <div className="lg:hidden absolute bottom-4 left-4 right-4 z-40">
        <Button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full h-14 rounded-2xl bg-primary/90 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-between px-5 text-primary-foreground hover:bg-primary transition-all"
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
            GHS {calculatedTotal.toFixed(2)}
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
