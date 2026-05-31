import React, { useState } from 'react';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import CartPanel from '@/components/pos/CartPanel';
import RegisterHeader from '@/components/pos/RegisterHeader';
import ShiftModal from '@/components/pos/ShiftModal';
import { useShift } from '@/hooks/useShift';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

export default function Register() {
  const { currentShift, openShift, isLoading } = useShift();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isOpeningShift, setIsOpeningShift] = useState(false);

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
    <div className="flex flex-col h-full bg-background p-6 overflow-hidden relative">
      
      {/* Extracted Header Component */}
      <RegisterHeader />

      {/* Main Content: Split View */}
      <div className="flex flex-1 gap-6 min-h-0 relative">
        
        {/* Left Panel: Products */}
        <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden relative">
          <ProductSearchBar />
          
          {/* Products Block Overlay */}
          {!isLoading && !currentShift && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-[24px]">
              {/* Optional: subtle lock icon or text here, but the main CTA is on the cart */}
            </div>
          )}
        </div>

        {/* Right Panel: Cart */}
        <div className="w-[420px] shrink-0 flex flex-col relative">
          <CartPanel />
          
          {/* Cart Block Overlay */}
          {!isLoading && !currentShift && (
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

      <ShiftModal 
        isOpen={isShiftModalOpen} 
        onOpenChange={setIsShiftModalOpen} 
        onOpenShift={handleOpenShift}
        isOpening={isOpeningShift}
      />
    </div>
  );
}
