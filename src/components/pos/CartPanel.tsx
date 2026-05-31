import React, { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Trash2, Plus, Minus, CreditCard, ChevronRight, Ticket } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { Button } from '../ui/button';

export default function CartPanel() {
  const { items, subtotal, discount, total, removeItem, updateQuantity, clearCart } = useCartStore();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('card');

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
      <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <p className="text-sm font-medium">Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.productId} className="flex flex-col p-4 rounded-[20px] border border-border bg-card shadow-sm gap-3">
              <div className="flex gap-4">
                {/* Item Image */}
                <div className="w-[72px] h-[72px] rounded-xl bg-[#F5F5F5] flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} alt={item.name} className="w-full h-full object-cover mix-blend-multiply opacity-90" />
                </div>
                
                {/* Item Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[15px] text-foreground line-clamp-1">{item.name}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">Size 42 • Green</p> {/* Mock variant */}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      className="h-8 w-8 rounded-full shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded-full bg-muted hover:bg-gray-200 dark:hover:bg-gray-800"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-semibold text-[14px] w-4 text-center">{item.quantity.toString().padStart(2, '0')}</span>
                      <Button
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-full bg-primary hover:brightness-95 text-primary-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-[15px] text-foreground">
                      Total ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary & Checkout Section */}
      <div className="p-6 bg-card border-t border-border mt-auto flex flex-col gap-5">
        
        {/* Promo Section */}
        <div className="flex items-center justify-between p-3 rounded-[16px] border border-border bg-background">
          <div className="flex items-center gap-3 pl-1">
            <div className="text-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="text-[14px] font-semibold text-foreground">Promo New User (10%)</span>
          </div>
          <Button size="sm" className="rounded-full px-4 text-[13px] font-bold">
            Change Promo
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
