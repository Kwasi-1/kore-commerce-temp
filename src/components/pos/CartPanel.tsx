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
        <button
          onClick={clearCart}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors text-sm font-semibold disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Reset Order
        </button>
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
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-semibold text-[14px] w-4 text-center">{item.quantity.toString().padStart(2, '0')}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-full bg-[#b6ff56] flex items-center justify-center text-[#1a1a1a] hover:brightness-95 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
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
          <button className="px-4 py-1.5 bg-[#b6ff56] text-[#1a1a1a] text-[13px] font-bold rounded-full hover:brightness-95 transition-colors">
            Change Promo
          </button>
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
          <button 
            onClick={() => {
              setDefaultPaymentMethod('card');
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Change Method <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={items.length === 0}
          className="w-full py-4 bg-accent text-[#1a1a1a] text-[18px] font-bold rounded-[16px] shadow-sm hover:brightness-95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all mt-2"
        >
          Continue
        </button>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
    </div>
  );
}
