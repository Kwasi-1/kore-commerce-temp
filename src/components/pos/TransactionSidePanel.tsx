import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCcw } from 'lucide-react';
import { useCurrency } from '@/hooks';

interface TransactionSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  onReprint: () => void;
  onIssueRefund: () => void;
}

export default function TransactionSidePanel({
  isOpen,
  onClose,
  receiptData,
  onReprint,
  onIssueRefund
}: TransactionSidePanelProps) {
  const { formatAmount } = useCurrency();

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
            <div id="receipt-content" className="bg-card text-card-foreground p-6 rounded-xl border border-border font-mono text-sm shadow-sm print:p-0 print:w-full print:border-none print:shadow-none">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase">{receiptData.storeName || 'Store Name'}</h1>
                <p className="text-xs text-muted-foreground">{receiptData.storeAddress || 'Address not set'}</p>
                <p className="text-xs text-muted-foreground">Tel: {receiptData.storePhone || 'N/A'}</p>
              </div>

              <div className="mb-4 text-xs">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(receiptData.date || Date.now()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span>{receiptData.receiptNumber || receiptData.id?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{receiptData.cashierName || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="uppercase">{receiptData.paymentMethod}</span>
                </div>
                {receiptData.status === 'refunded' && (
                  <div className="flex justify-between text-destructive font-bold mt-1">
                    <span>Status:</span>
                    <span className="uppercase">REFUNDED</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-border py-3 mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Item</th>
                      <th className="pb-2 font-semibold text-center">Qty</th>
                      <th className="pb-2 font-semibold text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 line-clamp-1 break-all">{item.productName || item.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{formatAmount(item.subtotal || (item.price * item.quantity))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(receiptData.subtotal)}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatAmount(receiptData.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2">
                  <span>TOTAL:</span>
                  <span>GHS {formatAmount(receiptData.totalAmount)}</span>
                </div>
              </div>

              {receiptData.paymentMethod === 'cash' && (
                <div className="mt-4 pt-2 border-t border-border space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Tendered:</span>
                    <span>{formatAmount(receiptData.amountTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>{formatAmount(receiptData.changeGiven)}</span>
                  </div>
                </div>
              )}

              <div className="mt-8 text-center text-xs text-muted-foreground">
                <p>Thank you for your business!</p>
                <p className="mt-1">Powered by HeadlessPOS</p>
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
              disabled={receiptData.status === 'refunded'}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {receiptData.status === 'refunded' ? 'Already Refunded' : 'Issue Refund'}
            </Button>
          </div>
        ) : null
      }
    />
  );
}
