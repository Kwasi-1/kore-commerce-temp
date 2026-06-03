import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import apiClient from '@/api/client';
import { CurrencyDisplay } from '@/hooks';
import { CheckCircle2, Printer, CreditCard, Smartphone, Banknote, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Switch } from '@nextui-org/react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMethod?: 'cash' | 'mobile_money' | 'card';
}

export default function PaymentModal({ isOpen, onClose, defaultMethod = 'cash' }: PaymentModalProps) {
  const { items, total, subtotal, discount, clearCart } = useCartStore();
  const tax = subtotal * 0.12;

  const [activeTab, setActiveTab] = useState<'cash' | 'mobile_money' | 'card'>(defaultMethod);
  const [amountTenderedStr, setAmountTenderedStr] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  
  // Credit Toggle
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [frozenCart, setFrozenCart] = useState<any>(null);
  
  const { posSettings } = useSettingsStore();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultMethod);
      setAmountTenderedStr('');
      setMomoNumber('');
      setIsCreditSale(false);
      setCustomerName('');
      setCustomerPhone('');
      setIsSuccess(false);
      setReceiptData(null);
      setFrozenCart(null);
    }
  }, [isOpen, defaultMethod]);

  const amountTendered = parseFloat(amountTenderedStr) || 0;
  const change = Math.max(0, amountTendered - total);

  const handleTransaction = async () => {
    if (activeTab === 'cash' && !isCreditSale && amountTendered < total) {
      toast.error('Tendered amount is less than total due');
      return;
    }

    if (activeTab === 'mobile_money' && !isCreditSale && !momoNumber) {
      toast.error('Phone number is required for MoMo');
      return;
    }
    
    if (isCreditSale && posSettings.require_customer_for_credit && (!customerName || !customerPhone)) {
      toast.error('Customer Name and Phone are required for Credit Sales');
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
        paymentMethod: isCreditSale ? 'credit' : activeTab,
        isCreditSale,
        customerDetails: isCreditSale ? { name: customerName, phone: customerPhone } : undefined
      };

      if (!isCreditSale) {
        if (activeTab === 'cash') {
          payload.amountTendered = amountTendered;
        } else {
          payload.paystackReference = `POS-MOCK-${Date.now()}`;
        }
      }

      const response = await apiClient.post('/pos/transactions', payload);
      
      toast.success('Payment successful!', { id: toastId });
      setReceiptData(response.data.data?.receipt || { receiptNumber: 'RCP-' + Date.now().toString().slice(-4), dateCreated: new Date().toISOString() });
      setFrozenCart({ items, subtotal, discount, tax, total });
      clearCart();
      setIsSuccess(true);
      
      if (posSettings.auto_print === 'always') {
        setTimeout(() => window.print(), 100);
      }
      
    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(error.response?.data?.error?.message || 'Transaction failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  const renderReceiptPreview = () => {
    const displayItems = frozenCart ? frozenCart.items : items;
    const displaySubtotal = frozenCart ? frozenCart.subtotal : subtotal;
    const displayDiscount = frozenCart ? frozenCart.discount : discount;
    const displayTax = frozenCart ? frozenCart.tax : tax;
    const displayTotal = frozenCart ? frozenCart.total : total;

    return (
    <div className="bg-muted/50 dark:bg-foreground text-black p-8 print:p-2 rounded-xl print:rounded-none shadow-sm print:shadow-none relative h-full flex flex-col font-mono text-sm border border-border/20 print:border-none">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="font-bold text-2xl tracking-widest mb-1">VYSION STORE</h3>
        <p className="text-xs text-zinc-500 uppercase">123 Commerce St, Accra, Ghana</p>
      </div>

      <div className="border-b border-dashed border-zinc-300 pb-3 mb-3 flex justify-between text-xs uppercase font-semibold">
        <span>{receiptData ? receiptData.receiptNumber : 'TX-PREVIEW'}</span>
        <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex font-bold text-[10px] border-b border-dashed border-zinc-300 pb-2 mb-2 uppercase tracking-wider text-zinc-800">
          <span className="flex-1">Description</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-20 text-right">Total</span>
        </div>
        <div className="space-y-2">
          {displayItems.map((item: any) => (
            <div key={item.productId} className="flex text-[13px] font-medium items-start">
              <span className="flex-1 pr-2 leading-tight">{item.name}</span>
              <span className="w-10 text-center text-zinc-700">{item.quantity}</span>
              <span className="w-20 text-right font-bold"><CurrencyDisplay amount={item.price * item.quantity} /></span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-6 pt-3 space-y-1.5 border-t border-dashed border-zinc-300">
        <div className="flex justify-between text-xs text-zinc-700 font-medium uppercase">
          <span>Subtotal</span>
          <span><CurrencyDisplay amount={displaySubtotal} /></span>
        </div>
        {displayDiscount > 0 && (
          <div className="flex justify-between text-xs text-zinc-700 font-medium uppercase">
            <span>Discount</span>
            <span>-<CurrencyDisplay amount={displayDiscount} /></span>
          </div>
        )}
        <div className="flex justify-between text-xs text-zinc-700 font-medium uppercase">
          <span>Tax (12%)</span>
          <span><CurrencyDisplay amount={displayTax} /></span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-3 border-t border-dashed border-zinc-300 mt-3 uppercase">
          <span>Total</span>
          <span><CurrencyDisplay amount={displayTotal} /></span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs font-semibold text-zinc-600 flex flex-col items-center gap-1 uppercase">
        {isCreditSale && <span className="font-bold border border-zinc-800 px-3 py-1 rounded-full mb-2 text-[10px] tracking-wider text-zinc-800">CREDIT SALE</span>}
        {!isCreditSale && <span>Paid via {activeTab.replace('_', ' ')}</span>}
        <span className="mt-3 text-[10px] tracking-widest">Thank you!</span>
        <div className="mt-3 opacity-60 print:hidden">
           <svg className="w-40 h-8" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0,0 h2 v20 h-2 z M4,0 h1 v20 h-1 z M7,0 h4 v20 h-4 z M13,0 h2 v20 h-2 z M17,0 h1 v20 h-1 z M20,0 h3 v20 h-3 z M25,0 h1 v20 h-1 z M28,0 h2 v20 h-2 z M32,0 h4 v20 h-4 z M38,0 h1 v20 h-1 z M41,0 h2 v20 h-2 z M45,0 h3 v20 h-3 z M50,0 h1 v20 h-1 z M53,0 h2 v20 h-2 z M57,0 h4 v20 h-4 z M63,0 h1 v20 h-1 z M66,0 h2 v20 h-2 z M70,0 h3 v20 h-3 z M75,0 h1 v20 h-1 z M78,0 h2 v20 h-2 z M82,0 h4 v20 h-4 z M88,0 h1 v20 h-1 z M91,0 h2 v20 h-2 z M95,0 h3 v20 h-3 z M99,0 h1 v20 h-1 z" fill="currentColor"/></svg>
        </div>
        {posSettings.receipt_footer && (
          <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 w-full text-center text-[10px] leading-relaxed hidden print:block whitespace-pre-wrap">
            {posSettings.receipt_footer}
          </div>
        )}
      </div>
    </div>
  )};

  const renderPaymentFlow = () => (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex justify-between items-end border-b border-border/50 pb-4">
        <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wider">Payment Details</span>
      </div>

      {/* Credit Toggle Section (Moved to top) */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer group rounded-xl p-3 -mx-3 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50"
          onClick={() => setIsCreditSale(!isCreditSale)}
        >
          <div>
            <h4 className="font-bold text-foreground text-[15px]">Mark as Credit Sale</h4>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">Customer will pay at a later date</p>
          </div>
          <div className={`transition-colors ${isCreditSale ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Switch 
               isSelected={isCreditSale} 
               onValueChange={setIsCreditSale} 
               color="default" 
               size="sm"
               classNames={{ wrapper: "mr-0" }}
            />
          </div>
        </div>

        {isCreditSale && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <CustomInputTextField
              label="Customer Name"
              labelPlacement="outside"
              placeholder="Enter customer name..."
              value={customerName}
              onChange={(e: any) => setCustomerName(e.target.value)}
              className="bg-secondary/30 rounded-xl border-border/50"
            />
            <CustomInputTextField
              label="Phone Number"
              labelPlacement="outside"
              placeholder="+233"
              value={customerPhone}
              onChange={(e: any) => setCustomerPhone(e.target.value)}
              className="bg-secondary/30 rounded-xl border-border/50"
            />
          </div>
        )}
      </div>

      {/* Show Payment Methods ONLY if not credit sale */}
      {!isCreditSale && (
        <>
          <div className="flex p-1 bg-secondary/50 rounded-full mb-6 border border-border/50">
            {[
              { id: 'cash', label: 'Cash' },
              { id: 'mobile_money', label: 'MoMo' },
              { id: 'card', label: 'Card' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-6">
            {activeTab === 'cash' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CustomInputTextField
                  label="Amount Tendered"
                  labelPlacement="outside"
                  type="number"
                  placeholder="0.00"
                  value={amountTenderedStr}
                  onChange={(e: any) => setAmountTenderedStr(e.target.value)}
                  autoFocus
                  className="h-14 text-xl font-bold rounded-xl bg-background border-border"
                />
                
                {amountTenderedStr && amountTendered >= total && (
                  <div className="bg-secondary rounded-xl p-4 flex items-center justify-between border border-border/50 animate-in fade-in">
                    <span className="text-foreground font-bold uppercase tracking-wider text-xs">Change Due</span>
                    <span className="text-2xl font-black text-foreground">
                      <CurrencyDisplay amount={change} />
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mobile_money' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CustomInputTextField
                  label="Mobile Number"
                  labelPlacement="outside"
                  type="tel"
                  placeholder="+233"
                  value={momoNumber}
                  onChange={(e: any) => setMomoNumber(e.target.value)}
                  className="h-14 text-lg font-bold rounded-xl bg-background border-border"
                />
                <div className="p-4 bg-secondary rounded-lg text-sm font-medium borde border-border/50 text-muted-foreground">
                  The customer will receive a secure payment prompt on their phone.
                </div>
              </div>
            )}

            {activeTab === 'card' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center bgsecondary/30 rounded-lg p-8 border border-border/50 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mb-3" />
                <h4 className="font-bold text-base mb-1 text-foreground">Charge Card Terminal</h4>
                <p className="text-xs text-muted-foreground font-medium max-w-[200px]">
                  Process payment on physical terminal, then confirm below.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom Footer */}
      <div className="mt-auto pt-6 border-t border-border/50">
        <div className="flex justify-between items-end mb-4 px-1">
          <span className="text-muted-foreground font-bold text-sm uppercase tracking-wider">Total</span>
          <span className="text-3xl font-black tracking-tight text-foreground"><CurrencyDisplay amount={total} /></span>
        </div>
        <Button
          onClick={handleTransaction}
          disabled={isProcessing || total === 0 || (activeTab === 'cash' && !isCreditSale && amountTendered < total)}
          className="w-full h-14 rounded-full font-bold text-[16px] transition-all bg-foreground text-background hover:bg-foreground/90 shadow-sm"
        >
          {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isCreditSale ? 'Complete Credit Sale' : 'Complete Transaction'}
        </Button>
      </div>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-in zoom-in-95 duration-300 fade-in fill-mode-forwards">
      <div className="mb-6 text-foreground">
        <CheckCircle2 className="h-16 w-16" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Transaction Complete</h2>
      <p className="text-muted-foreground font-medium mb-8 text-sm">
        Order <span className="text-foreground font-bold">{receiptData?.receiptNumber}</span> processed successfully.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button className="w-full h-12 rounded-full font-bold gap-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground shadow-none" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground py-2">
          <span>Auto-print is {posSettings.auto_print.toUpperCase()}</span>
        </div>

        <Button onClick={handleDone} className="w-full h-12 rounded-full font-bold mt-4 bg-foreground text-background hover:bg-foreground/90 shadow-sm">
          Done
        </Button>
      </div>
    </div>
  );

  const modalBody = (
    <div className="flex flex-col md:flex-row w-full h-full">
      {/* Left Column: Receipt Preview */}
      <div className={`w-full md:w-[380px] lg:w-[400px]  borde border-border rounded-xl flex-shrink-0 ${isSuccess ? 'hidden md:block print:block print:w-full print:border-none print:p-0' : ''}`}>
         {renderReceiptPreview()}
      </div>

      {/* Right Column: Flow */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto relative bg-card">
        <div className="max-w-md mx-auto h-full flex flex-col justify-center">
           {isSuccess ? renderSuccessScreen() : renderPaymentFlow()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={() => { if (!isProcessing) onClose(); }}
        size="4xl"
        classNames={{
          body: "p-0 overflow-hidden max-h-[90vh] p-2 ",
          header: "hidden"
        }}
        body={modalBody}
      />
      {/* Print Portal - Rendered at document root, only visible during print */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div id="print-portal" className="hidden">
           {renderReceiptPreview()}
        </div>,
        document.body
      )}
    </>
  );
}
