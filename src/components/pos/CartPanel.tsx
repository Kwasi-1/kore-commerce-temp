import React, { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, PauseCircle } from 'lucide-react';
import PaymentModal from './PaymentModal';

export default function CartPanel() {
  const { items, subtotal, discount, total, removeItem, updateQuantity, setDiscount, clearCart } = useCartStore();
  const [discountInput, setDiscountInput] = useState(discount.toString() || '');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');

  const handleDiscountApply = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0) {
      setDiscount(val);
    } else {
      setDiscount(0);
      setDiscountInput('0');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-pos-dark-card rounded-xl border border-gray-100 dark:border-pos-dark-border shadow-sm overflow-hidden transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-pos-dark-border bg-gray-50 dark:bg-pos-dark-panel">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Current Order</h2>
        <button
          onClick={clearCart}
          disabled={items.length === 0}
          className="flex items-center text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-2">
            <div className="p-4 rounded-full bg-gray-50 dark:bg-pos-dark-panel">
              <Banknote className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.productId} className="flex flex-col p-3 rounded-lg border border-gray-100 dark:border-pos-dark-border bg-gray-50/50 dark:bg-pos-dark-panel">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="font-medium text-gray-900 dark:text-white">
                  GHS {(item.price * item.quantity).toFixed(2)}
                </span>
                
                <div className="flex items-center bg-white dark:bg-pos-dark-card border border-gray-200 dark:border-pos-dark-border rounded-md shadow-sm overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) updateQuantity(item.productId, val);
                    }}
                    className="w-10 text-center text-sm font-semibold bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
                    min="1"
                  />
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary & Checkout */}
      <div className="p-4 border-t border-gray-100 dark:border-pos-dark-border bg-gray-50 dark:bg-pos-dark-panel space-y-4">
        
        {/* Discount Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Discount Amt"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            onBlur={handleDiscountApply}
            className="block w-full rounded-md border-gray-300 dark:border-pos-dark-border bg-white dark:bg-pos-dark-app text-gray-900 dark:text-white shadow-sm focus:border-pos-accent focus:ring-pos-accent sm:text-sm transition-colors py-2 px-3"
            min="0"
          />
          <button
            onClick={handleDiscountApply}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Apply
          </button>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal</span>
            <span>GHS {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-500 dark:text-red-400">
            <span>Discount</span>
            <span>- GHS {discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-pos-dark-border">
            <span>Total Payment</span>
            <span>GHS {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => {
              setDefaultPaymentMethod('cash');
              setIsPaymentModalOpen(true);
            }}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-pos-accent text-pos-accent-text font-bold rounded-lg shadow-sm hover:brightness-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all col-span-2 text-lg"
          >
            <Banknote className="h-5 w-5" />
            Cash Payment
          </button>
          
          <button
            onClick={() => {
              setDefaultPaymentMethod('mobile_money');
              setIsPaymentModalOpen(true);
            }}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FFCC00] text-black font-semibold rounded-lg shadow-sm hover:brightness-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            <Smartphone className="h-4 w-4" />
            MoMo
          </button>
          
          <button
            onClick={() => {
              setDefaultPaymentMethod('card');
              setIsPaymentModalOpen(true);
            }}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            <CreditCard className="h-4 w-4" />
            Card
          </button>

          <button
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all col-span-2"
          >
            <PauseCircle className="h-4 w-4" />
            Hold Order
          </button>
        </div>

      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
    </div>
  );
}
