import React, { useState, useRef, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Trash2, Plus, Minus, CreditCard, ChevronRight, Ticket, ShoppingCart } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { Button } from '../ui/button';

export default function CartPanel() {
  const { items, subtotal, discount, total, removeItem, updateQuantity, clearCart, setDiscount } = useCartStore();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('card');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when items are added
  const itemsLength = items.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [itemsLength]);

  // Dynamic 10% discount logic
  useEffect(() => {
    if (isPromoApplied) {
      setDiscount(subtotal * 0.10);
    } else {
      setDiscount(0);
    }
  }, [subtotal, isPromoApplied, setDiscount]);

  // Hardcoded for UI demo
  const taxRate = 0.12;
  const taxAmount = subtotal * taxRate;
  const calculatedTotal = subtotal + taxAmount - discount;

  return (
    <div className="flex flex-col h-full bg-background rounded-[24px] shadow-sm border border-border overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="text-[20px] font-bold text-foreground">Detail Transaction</h2>
        <Button
          variant="ghost"
          onClick={clearCart}
          disabled={items.length === 0}
          className="flex items-center gap-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive h-auto py-1.5 px-3 text-sm font-semibold"
        >
          <Trash2 className="h-4 w-4" />
          Reset Order
        </Button>
      </div>

      {/* Cart Items List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide pb-4"
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-10">
            <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-2 animate-in zoom-in-50 duration-500">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-bold text-foreground">Your cart is empty</p>
            <p className="text-[13px] text-muted-foreground/80 max-w-[220px] text-center leading-relaxed">
              Tap items from the product grid to add them to the transaction.
            </p>
          </div>
        ) : (
          items.map((item) => {
            // Generate initials for fallback image (e.g., "Sony WH-1000XM4" -> "SW")
            const initials = item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            
            return (
              <div key={item.productId} className="flex gap-4 p-3 rounded-[24px] border border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Item Image / Fallback */}
                <div className="w-[84px] h-[84px] rounded-[16px] flex-shrink-0 overflow-hidden flex items-center justify-center relative" style={{ backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}40` }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover mix-blend-multiply opacity-90" />
                  ) : (
                    <span className="font-bold text-[22px] tracking-widest text-foreground/70 mix-blend-multiply">{initials}</span>
                  )}
                </div>
                
                {/* Item Info */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  {/* Top Row: Title & Trash */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <h3 className="font-bold text-[15px] text-foreground line-clamp-1 pr-2 tracking-tight">{item.name}</h3>
                      {/* Variants Badges */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="border border-border/80 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">Size 42</span>
                        <span className="border border-border/80 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span> Green
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      className="h-8 w-8 rounded-full shrink-0 shadow-sm bg-[#e6173a] hover:bg-[#d80028]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Bottom Row: Controls & Total */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center justify-between w-[90px] h-9 px-1 bg-[#f1f1f1] rounded-full">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded-full hover:bg-black/5 text-foreground"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-bold text-[13px] text-center w-6">{item.quantity.toString().padStart(2, '0')}</span>
                      <Button
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="font-bold text-[15px] text-foreground tracking-tight">
                      <span className="text-muted-foreground text-[12px] font-semibold mr-1">Total</span>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary & Checkout Section */}
      <div className="p-6 bg-card border-t border-border mt-auto flex flex-col gap-5">
        
        {/* Promo Section */}
        <div className="flex items-center justify-between p-3 rounded-[16px] border border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center">
              <Ticket className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Promo New User (10%)</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className={`rounded-full h-9 px-4 text-[13px] font-bold shadow-sm transition-colors border-none ${isPromoApplied ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive' : 'bg-primary hover:brightness-95 text-primary-foreground'}`}
            onClick={() => setIsPromoApplied(!isPromoApplied)}
          >
            {isPromoApplied ? 'Remove Promo' : 'Apply Promo'}
          </Button>
        </div>

        {/* Totals */}
        <div className="space-y-3 px-1">
          <div className="flex justify-between text-[15px] text-muted-foreground font-medium">
            <span>Sub-Total</span>
            <span className="text-foreground font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[15px] text-muted-foreground font-medium">
            <span>Tax (12%)</span>
            <span className="text-foreground font-semibold">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[15px] text-muted-foreground font-medium">
            <span>Discount</span>
            <span className="text-foreground font-semibold">-${discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[18px] font-bold text-foreground pt-1">
            <span>Total Payment</span>
            <span>${calculatedTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-3">
            <div className="h-8 flex items-center">
              {/* Fake Mastercard logo circles */}
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-red-500 mix-blend-multiply opacity-90"></div>
                <div className="h-6 w-6 rounded-full bg-yellow-400 mix-blend-multiply opacity-90"></div>
              </div>
            </div>
            <span className="font-semibold text-[15px]">Credit Card</span>
          </div>
          <Button 
            variant="ghost"
            onClick={() => {
              setDefaultPaymentMethod('card');
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent px-2 h-auto py-1"
          >
            Change Method <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Continue Button */}
        <Button
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={items.length === 0}
          className="w-full py-4 font-bold rounded-full h-auto"
        >
          Continue
        </Button>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
    </div>
  );
}
