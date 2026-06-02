import React, { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import apiClient from '@/api/client';
import CashCalculator from './CashCalculator';
import ReceiptModal from './ReceiptModal';
import { CurrencyDisplay } from '@/hooks';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMethod?: 'cash' | 'mobile_money' | 'card';
}

export default function PaymentModal({ isOpen, onClose, defaultMethod = 'cash' }: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'cash' | 'mobile_money' | 'card'>(defaultMethod);
  const [amountTendered, setAmountTendered] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  const { items, total, clearCart } = useCartStore();

  if (!isOpen) return null;

  const handleTransaction = async () => {
    if (activeTab === 'cash' && amountTendered < total) {
      toast.error('Tendered amount is less than total due');
      return;
    }

    if (activeTab === 'mobile_money' && !phoneNumber) {
      toast.error('Phone number is required for MoMo');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Processing payment...');

    try {
      const payload: any = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: activeTab,
      };

      if (activeTab === 'cash') {
        payload.amountTendered = amountTendered;
      } else {
        // Backend requires a paystackReference for card/momo. 
        // Providing a mock reference since terminal flow is separate.
        payload.paystackReference = `POS-MOCK-${Date.now()}`;
      }

      const response = await apiClient.post('/pos/transactions', payload);
      
      toast.success('Payment successful!', { id: toastId });
      clearCart();
      setReceiptData(response.data.data.receipt); // The backend returns receipt data
      
    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(error.response?.data?.error?.message || 'Transaction failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
    onClose();
  };

  // If receipt is open, overlay it over the payment modal
  if (receiptData) {
    return (
      <ReceiptModal 
        isOpen={true} 
        onClose={handleCloseReceipt} 
        receiptData={receiptData} 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-card text-card-foreground w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted">
          <h2 className="text-xl font-bold text-foreground">Complete Payment</h2>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-muted-foreground hover:text-foreground dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'cash', label: 'Cash' },
            { id: 'mobile_money', label: 'MoMo' },
            { id: 'card', label: 'Card' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={isProcessing}
              className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary dark:text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-gray-700  dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-muted'
              } disabled:opacity-50`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 flex justify-between items-end border-b border-border pb-4">
            <span className="text-muted-foreground font-medium">Total Due</span>
            <span className="text-3xl font-bold text-foreground tracking-tight">
              <CurrencyDisplay amount={total} />
            </span>
          </div>

          <div className="min-h-[160px]">
            {activeTab === 'cash' && (
              <CashCalculator 
                totalDue={total} 
                onAmountTenderedChange={setAmountTendered} 
              />
            )}

            {activeTab === 'mobile_money' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 text-lg bg-muted border border-border rounded-lg focus:ring-primary focus:border-primary transition-colors text-foreground"
                    placeholder="e.g. 024XXXXXXX"
                  />
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-900/30">
                  Instruction: The customer will receive a payment prompt on their phone.
                </div>
              </div>
            )}

            {activeTab === 'card' && (
              <div className="flex flex-col items-center justify-center h-32 space-y-3">
                <div className="animate-pulse p-4 rounded-full bg-gray-100 dark:bg-muted">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-muted-foreground font-medium">
                  Swipe or tap card on terminal, then confirm.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-muted">
          <button
            onClick={handleTransaction}
            disabled={isProcessing || total === 0}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
