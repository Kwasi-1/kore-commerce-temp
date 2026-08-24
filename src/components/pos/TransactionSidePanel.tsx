import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCcw } from 'lucide-react';
import { useCurrency, useReceiptHeader, useQuantityFormatter, formatPhoneNumber } from '@/hooks';
import { APP_CONFIG } from '@/config/app.config';

interface TransactionSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  onReprint: () => void;
  onIssueRefund: () => void;
}

const getVal = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object') {
    if (typeof val.parsedValue === 'number') return val.parsedValue;
    if (typeof val.amount === 'number') return val.amount;
    if (typeof val.source === 'string') return parseFloat(val.source) || 0;
    if (typeof val.source === 'number') return val.source;
  }
  return 0;
};

export default function TransactionSidePanel({
  isOpen,
  onClose,
  receiptData,
  onReprint,
  onIssueRefund
}: TransactionSidePanelProps) {
  const { formatAmount } = useCurrency();
  const { formatQuantity } = useQuantityFormatter();
  const { storeName, storeLocation, storePhone } = useReceiptHeader(receiptData);
  const cashierName = receiptData?.cashierName || receiptData?.cashier?.name || 'Staff';
  const rawPaymentMethod = (receiptData?.paymentMethod || receiptData?.payment?.method || 'cash').toLowerCase();
  const displayPaymentMethod = rawPaymentMethod === 'mobile_money_manual'
    ? 'MoMo (Manual)'
    : rawPaymentMethod === 'mobile_money'
      ? 'Mobile Money'
      : rawPaymentMethod.replace('_', ' ');
  const momoPhone = receiptData?.momoNumber || receiptData?.payment?.momoNumber || receiptData?.momo_number || receiptData?.customer_phone;
  const subtotal = getVal(receiptData?.subtotal ?? receiptData?.summary?.subtotal);
  const totalAmount = getVal(receiptData?.totalAmount ?? receiptData?.total ?? receiptData?.summary?.total ?? receiptData?.summary?.totalAmount);
  const amountTendered = getVal(receiptData?.amountTendered ?? receiptData?.payment?.amountTendered);
  const changeGiven = getVal(receiptData?.changeGiven ?? receiptData?.payment?.changeGiven);
  const discount = getVal(receiptData?.discount);
  const tax = receiptData?.tax !== undefined ? getVal(receiptData?.tax) : undefined;
  const isRefunded = receiptData?.status === 'refunded' || receiptData?.orderStatus === 'refunded';

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="md"
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-lg">Transaction Details</span>
        </div>
      }
      body={
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/10">
          {receiptData ? (
            <div 
              id="receipt-content" 
              className="bg-white text-black p-6 rounded-xl relative border border-border/20 font-sans text-sm shadow-sm print:p-0 print:w-full print:border-none print:shadow-none"
            >
              {/* Refunded Stamp */}
              {isRefunded && (
                <div className="absolute top-6 right-6 border-4 border-red-600 rounded text-red-600 font-extrabold px-4 py-2 rotate-[-12deg] opacity-75 uppercase tracking-widest text-sm pointer-events-none select-none font-['AtypDisplay']">
                  Refunded
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="font-['AtypDisplay'] font-bold text-xl tracking-wider mb-1 text-zinc-900 uppercase">
                  {storeName}
                </h1>
                {storeLocation && (
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {storeLocation}
                  </p>
                )}
                {storePhone && (
                  <p className="text-[10px] text-zinc-500">
                    Tel: {storePhone}
                  </p>
                )}
              </div>

              {/* Info Section */}
              <div className="border-b border-dashed border-zinc-200 pb-3 mb-3 text-xs space-y-1 text-zinc-700">
                <div className="flex justify-between">
                  <span className="font-semibold">Receipt #:</span>
                  <span className="font-mono font-bold text-zinc-950">
                    {receiptData.receiptNumber || receiptData.id?.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Date:</span>
                  <span>{new Date(receiptData.date || Date.now()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Cashier:</span>
                  <span>{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Payment:</span>
                  <span className="uppercase font-semibold text-zinc-900">{displayPaymentMethod}</span>
                </div>
                {momoPhone && (
                  <div className="flex justify-between">
                    <span className="font-semibold">MoMo Phone:</span>
                    <span className="font-mono font-bold text-zinc-950">{formatPhoneNumber(momoPhone)}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border-b border-dashed border-zinc-200 pb-3 mb-3">
                <div className="flex font-['AtypDisplay'] font-bold text-[10px] pb-2 uppercase tracking-wider text-zinc-900 border-b border-zinc-100 mb-2">
                  <span className="flex-1 text-left">Item</span>
                  <span className="w-10 text-center">Qty</span>
                  <span className="w-20 text-right">Total</span>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-800">
                  {receiptData.items?.map((item: any, i: number) => {
                    const itemSubtotal = getVal(item.subtotal ?? (getVal(item.unitPrice || item.price) * item.quantity));
                    return (
                      <div key={i} className="flex items-start">
                        <span className="flex-1 pr-2 leading-tight font-medium text-left">
                          {item.productName || item.name}
                        </span>
                        <span className="w-10 text-center text-zinc-500">{formatQuantity(item.quantity)}</span>
                        <span className="w-20 text-right font-semibold">
                          {formatAmount(itemSubtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-xs text-zinc-800">
                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>{formatAmount(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>Discount</span>
                    <span className="text-emerald-600">-{formatAmount(discount)}</span>
                  </div>
                )}
                {tax !== undefined && (
                  <div className="flex justify-between font-medium">
                    <span>Tax (12%)</span>
                    <span>{formatAmount(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
                  <span>Total</span>
                  <span>GHS {formatAmount(totalAmount)}</span>
                </div>
              </div>

              {rawPaymentMethod === 'cash' && amountTendered > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 space-y-1 text-xs text-zinc-700">
                  <div className="flex justify-between">
                    <span>Tendered:</span>
                    <span className="font-semibold text-zinc-900">{formatAmount(amountTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className="font-semibold text-zinc-900">{formatAmount(changeGiven)}</span>
                  </div>
                </div>
              )}

              <div className="mt-8 text-center text-[9px] font-semibold text-zinc-400 flex flex-col items-center gap-1 uppercase tracking-widest">
                <span>Thank you for your business!</span>
                <span>{APP_CONFIG.receiptFooter}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Loading details...
            </div>
          )}
        </div>
      }
      footer={
        receiptData ? (
          <div className="flex flex-col gap-3 w-full pb-4">
            <Button 
              variant="default"
              className="w-full"
              onClick={onReprint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Reprint Receipt
            </Button>
            <Button 
              variant="destructive"
              className="w-full"
              onClick={onIssueRefund}
              disabled={isRefunded}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {isRefunded ? 'Already Refunded' : 'Issue Refund'}
            </Button>
          </div>
        ) : null
      }
    />
  );
}
