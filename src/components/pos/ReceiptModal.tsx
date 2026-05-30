import React from 'react';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
}

export default function ReceiptModal({ isOpen, onClose, receiptData }: ReceiptModalProps) {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-pos-dark-card w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (Not printed) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-pos-dark-border print:hidden">
          <h2 className="font-semibold text-gray-900 dark:text-white">Receipt</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-pos-dark-panel transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Receipt Area */}
        <div id="receipt-content" className="flex-1 overflow-y-auto p-6 bg-white text-black font-mono text-sm print:p-0 print:w-full">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase">{receiptData.storeName || 'Store Name'}</h1>
            <p className="text-xs text-gray-600">{receiptData.storeAddress || 'Address not set'}</p>
            <p className="text-xs text-gray-600">Tel: {receiptData.storePhone || 'N/A'}</p>
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
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-3 mb-4">
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
                    <td className="py-1 text-right">{(item.subtotal || (item.price * item.quantity)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{receiptData.subtotal?.toFixed(2)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{receiptData.discount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm mt-2">
              <span>TOTAL:</span>
              <span>GHS {receiptData.totalAmount?.toFixed(2)}</span>
            </div>
          </div>

          {receiptData.paymentMethod === 'cash' && (
            <div className="mt-4 pt-2 border-t border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Tendered:</span>
                <span>{receiptData.amountTendered?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>{receiptData.changeGiven?.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-xs text-gray-600">
            <p>Thank you for your business!</p>
            <p className="mt-1">Powered by HeadlessPOS</p>
          </div>
        </div>

        {/* Footer (Not printed) */}
        <div className="p-4 border-t border-gray-100 dark:border-pos-dark-border flex gap-3 print:hidden bg-gray-50 dark:bg-pos-dark-panel">
          <button 
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 dark:bg-pos-dark-card dark:text-gray-200 dark:border-pos-dark-border dark:hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-pos-accent-text bg-pos-accent shadow-sm hover:brightness-95 transition-colors"
          >
            <Printer className="h-5 w-5" />
            Print
          </button>
        </div>

      </div>
    </div>
  );
}
