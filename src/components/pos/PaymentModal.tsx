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
          variant_id: item.variant_id,
          packaging_tier_id: item.packaging_tier_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price_type: item.price_type
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
      setReceiptData(response.data.success?.data?.receipt || { receiptNumber: 'RCP-' + Date.now().toString().slice(-4), dateCreated: new Date().toISOString() });
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
      <div className="bg-white text-black p-6 print:p-2 rounded-xl print:rounded-none shadow-sm print:shadow-none relative h-full flex flex-col font-sans text-sm border border-border/20 print:border-none">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-['AtypDisplay'] font-bold text-xl tracking-wider mb-1 text-zinc-900">VYSION STORE</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">123 Commerce St, Accra, Ghana</p>
          <p className="text-[10px] text-zinc-500">Tel: +233 24 123 4567</p>
        </div>

        {/* Info Section */}
        <div className="border-b border-dashed border-zinc-200 pb-3 mb-3 text-xs space-y-1 text-zinc-700">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span className="font-mono font-bold text-zinc-950">{receiptData ? receiptData.receiptNumber : 'TX-PREVIEW'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Payment:</span>
            <span className="uppercase font-semibold text-zinc-900">
              {isCreditSale ? 'CREDIT' : activeTab.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide mb-4">
          <div className="flex font-['AtypDisplay'] font-bold text-[10px] border-b border-zinc-100 pb-2 mb-2 uppercase tracking-wider text-zinc-900">
            <span className="flex-1 text-left">Description</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-20 text-right">Total</span>
          </div>
          <div className="space-y-2 text-xs text-zinc-800">
            {displayItems.map((item: any) => (
              <div key={item.productId} className="flex flex-col border-b border-zinc-100/50 pb-1.5 last:border-0">
                <div className="flex items-start">
                  <span className="flex-1 pr-2 leading-tight font-medium text-left">{item.name}</span>
                  <span className="w-10 text-center text-zinc-500">{item.quantity}</span>
                  <span className="w-20 text-right font-semibold">
                    <CurrencyDisplay amount={item.price * item.quantity} />
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 text-left font-medium">
                  {item.tier_name} · GHS {item.price.toLocaleString()} each
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-xs text-zinc-800 pt-3 border-t border-dashed border-zinc-200">
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span><CurrencyDisplay amount={displaySubtotal} /></span>
          </div>
          {displayDiscount > 0 && (
            <div className="flex justify-between font-medium">
              <span>Discount</span>
              <span className="text-emerald-600">-<CurrencyDisplay amount={displayDiscount} /></span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Tax (12%)</span>
            <span><CurrencyDisplay amount={displayTax} /></span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
            <span>Total</span>
            <span><CurrencyDisplay amount={displayTotal} /></span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[9px] font-semibold text-zinc-400 flex flex-col items-center gap-1 uppercase tracking-widest">
          {isCreditSale && (
            <span className="font-bold border border-zinc-200 px-3 py-1 rounded-full mb-1 text-[9px] tracking-wider text-zinc-500">
              CREDIT SALE RECORD
            </span>
          )}
          <span>Powered by HeadlessPOS</span>
          {posSettings.receipt_footer && (
            <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 w-full text-center text-[9px] leading-relaxed hidden print:block whitespace-pre-wrap text-zinc-500">
              {posSettings.receipt_footer}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentFlow = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-6 flex justify-between items-end border-b border-border/50 pb-4 shrink-0">
        <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wider">Payment Details</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 scrollbar-hide space-y-6">
        {/* Credit Toggle Section (Moved to top) */}
        <div>
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
            <div className="flex p-1 bg-secondary/50 rounded-lg border border-border/50 shrink-0">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'mobile_money', label: 'MoMo' },
                { id: 'card', label: 'Card' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
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
      </div>

      {/* Bottom Footer */}
      <div className="mt-auto pt-6 border-t border-border/50 shrink-0">
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
    <div className="flex flex-col md:flex-row w-full h-[80vh] min-h-0 overflow-hidden">
      {/* Left Column: Receipt Preview */}
      <div className={`w-full md:w-[380px] lg:w-[400px] bg-zinc-50 dark:bg-black/40 border border-border rounded-xl p-4 md:p-6 flex-shrink-0 flex flex-col min-h-0 ${isSuccess ? 'hidden md:block print:block print:w-full print:border-none print:p-0 ' : ''}`}>
         {renderReceiptPreview()}
      </div>

      {/* Right Column: Flow */}
      <div className="flex-1 p-6 md:p-8 overflow-hidden relative bg-card flex flex-col min-h-0">
        <div className="max-w-md mx-auto w-full h-full flex flex-col justify-between min-h-0">
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
