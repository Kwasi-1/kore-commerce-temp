import React, { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Ticket,
  ShoppingCart,
  Box,
  ArrowLeft
} from "lucide-react";
import PaymentModal from "./PaymentModal";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CurrencyDisplay } from "@/hooks";
import toast from "react-hot-toast";

interface CartPanelProps {
  isMobileView?: boolean;
}

export default function CartPanel({ isMobileView = false }: CartPanelProps) {
  const {
    items,
    subtotal,
    discount,
    total,
    removeItem,
    updateQuantity,
    clearCart,
    setDiscount,
  } = useCartStore();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<"cash" | "mobile_money" | "card">("card");
  
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Promo State
  const [activePromo, setActivePromo] = useState<{type: "percentage" | "fixed", value: number} | null>(null);
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState<number>(10);
  const [isPromoPopoverOpen, setIsPromoPopoverOpen] = useState(false);
  
  // Popover Form State
  const [promoMode, setPromoMode] = useState<"percentage" | "fixed">("percentage");
  const [promoInput, setPromoInput] = useState<string>("10");

  const itemsLength = items.length;
  useEffect(() => {
    if (scrollRef.current && mobileStep === 1) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [itemsLength, mobileStep]);

  // If cart is empty, reset mobile step
  useEffect(() => {
    if (items.length === 0) {
      setMobileStep(1);
    }
  }, [items.length]);

  // Calculate discount based on activePromo
  useEffect(() => {
    if (activePromo) {
      if (activePromo.type === 'percentage') {
        setDiscount(subtotal * (activePromo.value / 100));
      } else {
        setDiscount(activePromo.value);
      }
    } else {
      setDiscount(0);
    }
  }, [subtotal, activePromo, setDiscount]);

  const taxRate = 0.12;
  const taxAmount = subtotal * taxRate;
  const calculatedTotal = subtotal + taxAmount - discount;

  const handleAddDiscountClick = () => {
    setActivePromo({ type: 'percentage', value: defaultDiscountPercent });
    setPromoMode('percentage');
    setPromoInput(defaultDiscountPercent.toString());
  };

  const handleApplyPromo = () => {
    const val = parseFloat(promoInput);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid discount amount.");
      return;
    }
    if (promoMode === 'percentage' && val > 100) {
      toast.error("Percentage discount cannot exceed 100%.");
      return;
    }
    if (promoMode === 'fixed' && val > subtotal) {
      toast.error("Fixed discount cannot exceed the subtotal.");
      return;
    }

    setActivePromo({ type: promoMode, value: val });
    if (promoMode === 'percentage') {
      setDefaultDiscountPercent(val); // Save new percentage default
    }
    setIsPromoPopoverOpen(false);
    toast.success("Discount applied successfully!");
  };

  const handleRemovePromo = () => {
    setActivePromo(null);
    setIsPromoPopoverOpen(false);
  };

  // Mobile Views
  const showItemsList = !isMobileView || mobileStep === 1;
  const showSummary = !isMobileView || mobileStep === 2;

  return (
    <div className="flex flex-col h-full bg-secondary overflow-hidden lg:border lg:rounded-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          {isMobileView && mobileStep === 2 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full -ml-2" 
              onClick={() => setMobileStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-[18px] font-bold text-foreground">
            {isMobileView && mobileStep === 2 ? 'Checkout' : 'Detail Transaction'}
          </h2>
        </div>
        
        {(!isMobileView || mobileStep === 1) && (
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 rounded-full bg-background border border-border text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-3 text-[13px] font-semibold shadow-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset Order
          </Button>
        )}
      </div>

      {/* Cart Items */}
      {showItemsList && (
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto px-5 space-y-3 scrollbar-hide ${isMobileView ?"pb-12 [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]" : "pb-4" } `}
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-10">
              <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-2">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-[15px] font-bold text-foreground">
                Your cart is empty
              </p>
              <p className="text-[13px] text-muted-foreground/80 max-w-[220px] text-center leading-relaxed">
                Tap items from the product grid to add them to the transaction.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 p-3 rounded-[20px] bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Image */}
                <div className="w-[88px] h-[88px] rounded-[14px] flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Box className="h-9 w-9 text-muted-foreground/30 stroke-[1.5]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-[14px] text-foreground line-clamp-1 tracking-tight pr-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="border border-border rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Size 42
                        </span>
                        <span className="border border-border rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600 inline-block"></span>
                          Green
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      className="h-8 w-8 rounded-full shrink-0 bg-[#e6173a] hover:bg-[#d80028] shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Bottom row: qty + total */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-secondary rounded-full px-1 py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="h-7 w-7 rounded-full hover:bg-black/5 text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-bold text-[13px] w-6 text-center">
                        {item.quantity.toString().padStart(2, "0")}
                      </span>
                      <Button
                        size="icon"
                        onClick={() => {
                          const stock = item.stock_quantity ?? Infinity;
                          if (item.quantity >= stock) {
                            toast.error(`Only ${stock} in stock!`);
                            return;
                          }
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="h-7 w-7 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-bold text-[14px] text-foreground tracking-tight">
                      <span className="text-muted-foreground text-[12px] font-semibold mr-1">
                        Total
                      </span>
                      <CurrencyDisplay amount={item.price * item.quantity} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Actions (Depends on Step) */}
      {items.length > 0 && (
        <div className="px-5 pb-5 pt-2 rounded-t-2xl bg-transparent flex flex-col gap-3 shrink-0">
          
          {/* Mobile Step 1 Actions */}
          {isMobileView && mobileStep === 1 && (
            <Button
              onClick={() => setMobileStep(2)}
              className="w-full py-4 font-bold text-[16px] rounded-full h-auto shadow-lg"
            >
              Continue to Checkout
            </Button>
          )}

          {/* Desktop OR Mobile Step 2 Actions */}
          {showSummary && (
            <>
              <div className="flex flex-col gap-2.5 bg-card border rounded-[1.55rem] px-2 py-2">
                {/* Promo Logic */}
                {activePromo && (
                  <div className="flex items-center justify-between p-2 rounded-full bg-secondary">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-card text-muted-foreground flex items-center justify-center">
                      <Ticket className="h-4 w-4" />
                      </div>
                      <p className="text-[14px] font-bold text-foreground">
                        {activePromo.type === 'percentage' ? `Promo (${activePromo.value}%)` : `Discount ($${activePromo.value})`}
                      </p>
                    </div>

                    <Popover open={isPromoPopoverOpen} onOpenChange={setIsPromoPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          className="rounded-full h-9 px-4 text-[13px] font-bold shadow-sm transition-colors"
                        >
                          Change Promo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4 rounded-2xl" align="end">
                        <div className="space-y-4">
                          <h4 className="font-bold text-sm">Edit Discount</h4>
                          <div className="flex bg-secondary p-0.5 rounded-full">
                            <button 
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === 'percentage' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => { setPromoMode('percentage'); setPromoInput(defaultDiscountPercent.toString()); }}
                            >
                              Percentage (%)
                            </button>
                            <button 
                              className={`flex-1 text-[12px] font-bold py-2 rounded-full transition-all ${promoMode === 'fixed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => { setPromoMode('fixed'); setPromoInput('0'); }}
                            >
                              Fixed Amount ($)
                            </button>
                          </div>
                          
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                              {promoMode === 'percentage' ? '%' : '$'}
                            </span>
                            <input 
                              type="number" 
                              className="w-full pl-8 pr-3 py-2 bg-background border rounded-lg text-sm font-bold outline-none no-spin-buttons"
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value)}
                            />
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button radius="full" size="sm" onClick={handleApplyPromo} className="w-full font-bold text-[12px]">Apply Changes</Button>
                            <Button variant="outline" radius="full" size="sm" onClick={handleRemovePromo} className="w-full font-bold text-destructive bg-inherit text-destructive text-[12px]">Remove Discount</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) }

                {/* Totals */}
                <div className="space-y-2.5 p-3 border rounded-[1.25rem]">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Sub-Total
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={subtotal} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Tax (12%)
                    </span>
                    <span className="text-foreground font-semibold">
                      <CurrencyDisplay amount={taxAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-muted-foreground font-medium">
                      Discount
                    </span>
                    <span className="text-muted-foreground font-semibold dark:text-primary flex items-center gap-1">
                      -<CurrencyDisplay amount={discount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-foreground pt-1">
                    <span>Total Payment</span>
                    <span><CurrencyDisplay amount={calculatedTotal} /></span>
                  </div>
                </div>
              </div>

              {!activePromo && (
              <div className="flex items-center justify-end px-2 -my-2">
                <Button 
                  variant="link" 
                  onClick={handleAddDiscountClick}
                  className="dark:text-primary text-xs h-fit px-2"
                >
                  + Add Discount
                </Button>
              </div>)}

              {/* Payment Method */}
              <div className="flex items-center justify-between bg-card py-2.5 px-4 rounded-full border">
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full bg-red-500 border border-card"></div>
                    <div className="h-6 w-6 rounded-full bg-yellow-400 border border-card"></div>
                  </div>
                  <span className="font-semibold text-[14px]">Credit Card</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDefaultPaymentMethod("card");
                    setIsPaymentModalOpen(true);
                  }}
                  className="flex items-center gap-0.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent px-1 h-auto py-1"
                >
                  Change Method <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Complete Transaction */}
              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={items.length === 0}
                className="w-full py-4 font-bold text-[16px] rounded-full h-auto"
              >
                {isMobileView ? "Complete Transaction" : "Continue"}
              </Button>
            </>
          )}

        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
    </div>
  );
}
