import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CreditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: any;
  transaction: any;
}

export default function CreditReceiptModal({
  isOpen,
  onClose,
  debtor,
  transaction
}: CreditReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const invoiceElement = document.getElementById(`credit-receipt-${transaction.id}`);
    if (!invoiceElement) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${transaction.reference}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderSettledStamp = () => (
    <div className="absolute top-6 right-6 border-4 border-emerald-600 rounded text-emerald-600 font-extrabold px-4 py-2 rotate-[-12deg] opacity-75 uppercase tracking-widest text-sm pointer-events-none select-none font-['AtypDisplay']">
      Settled
    </div>
  );

  const renderOutstandingFooter = (amount: number) => (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-center font-bold text-[11px] uppercase tracking-wider">
      Outstanding Balance: <CurrencyDisplay amount={amount} />
    </div>
  );

  const renderReceiptContent = (isForPrint = false) => {
    const isSettled = (transaction.balance_after || 0) <= 0;
    const balance = transaction.balance_after || 0;

    return (
      <div 
        id={isForPrint ? 'print-receipt-content' : `credit-receipt-${transaction.id}`}
        className={`bg-white text-black p-6 rounded-xl font-sans text-sm max-w-sm mx-auto relative ${isForPrint ? 'w-[80mm] p-2 border-none' : 'border border-border/20 shadow-sm'}`}
      >
        {/* Header */}
        <div className="text-center mb-6 relative">
          <h3 className="font-['AtypDisplay'] font-bold text-xl tracking-wider mb-1 text-zinc-900">VYSION STORE</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">123 Commerce St, Accra, Ghana</p>
          <p className="text-[10px] text-zinc-500">Tel: +233 24 123 4567</p>
          {isSettled && renderSettledStamp()}
        </div>

        {/* Info Section */}
        <div className="border-b border-dashed border-zinc-200 pb-3 mb-3 text-xs space-y-1 text-zinc-700">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span className="font-mono font-bold text-zinc-950">{transaction.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{new Date(transaction.date).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Customer:</span>
            <span>{debtor?.name}</span>
          </div>
          {debtor?.phone && (
            <div className="flex justify-between">
              <span className="font-semibold">Phone:</span>
              <span>{debtor.phone}</span>
            </div>
          )}
          {(transaction.type === 'settlement' || transaction.type === 'consolidated') && (
            <div className="flex justify-between">
              <span className="font-semibold">Payment Method:</span>
              <span className="uppercase font-semibold text-zinc-900">{transaction.payment_method || 'CASH'}</span>
            </div>
          )}
        </div>

        {/* Content Body Based on Type */}
        {transaction.type === 'settlement' ? (
          /* CREDIT REPAYMENT RECEIPT */
          <>
            <div className="border-b border-dashed border-zinc-200 pb-3 mb-3 space-y-2 text-xs text-zinc-800">
              <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-500">Applied toward:</span>
                  <span className="font-mono font-bold text-zinc-900">{transaction.purchase_reference}</span>
                </div>
                {transaction.purchase_original_amount !== undefined && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Original Purchase Amt:</span>
                    <span className="font-semibold text-zinc-600"><CurrencyDisplay amount={transaction.purchase_original_amount} /></span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 text-xs text-zinc-800">
              <div className="flex justify-between font-medium">
                <span>Repayment Amount</span>
                <span className="font-bold text-emerald-600">-<CurrencyDisplay amount={transaction.amount} /></span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
                <span>Remaining Purchase Debt</span>
                <span><CurrencyDisplay amount={balance} /></span>
              </div>
            </div>
          </>
        ) : transaction.type === 'consolidated' ? (
          /* CONSOLIDATED SETTLEMENT RECEIPT */
          <>
            <div className="border-b border-dashed border-zinc-200 pb-3 mb-3">
              <div className="flex font-['AtypDisplay'] font-bold text-[10px] pb-2 uppercase tracking-wider text-zinc-900 border-b border-zinc-100 mb-2">
                <span className="flex-1">Purchase Reference</span>
                <span className="w-24 text-right">Applied Amount</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-800">
                {transaction.settlements?.map((s: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-mono font-medium text-zinc-900">{s.purchase_reference || s.purchase_id}</span>
                    <span className="font-semibold text-zinc-700">
                      <CurrencyDisplay amount={s.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs text-zinc-800">
              <div className="flex justify-between font-medium">
                <span>Total Settlement</span>
                <span className="font-bold text-emerald-600">-<CurrencyDisplay amount={transaction.amount} /></span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
                <span>Consolidated Remaining Debt</span>
                <span><CurrencyDisplay amount={balance} /></span>
              </div>
            </div>
          </>
        ) : (
          /* CREDIT PURCHASE RECEIPT (DEFAULT) */
          <>
            <div className="border-b border-dashed border-zinc-200 pb-3 mb-3">
              <div className="flex font-['AtypDisplay'] font-bold text-[10px] pb-2 uppercase tracking-wider text-zinc-900 border-b border-zinc-100 mb-2">
                <span className="flex-1">Description</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-20 text-right">Total</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-800">
                {transaction.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start">
                    <span className="flex-1 pr-2 leading-tight font-medium text-left">{item.name}</span>
                    <span className="w-10 text-center text-zinc-500">{item.quantity}</span>
                    <span className="w-20 text-right font-semibold">
                      <CurrencyDisplay amount={item.subtotal || (item.price * item.quantity)} />
                    </span>
                  </div>
                )) || (
                  <div className="flex items-start">
                    <span className="flex-1 pr-2 leading-tight font-medium text-left">Credit Purchase</span>
                    <span className="w-10 text-center text-zinc-500">1</span>
                    <span className="w-20 text-right font-semibold">
                      <CurrencyDisplay amount={transaction.amount} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 text-xs text-zinc-800">
              <div className="flex justify-between font-medium">
                <span>Total Purchase</span>
                <span className="font-bold"><CurrencyDisplay amount={transaction.amount} /></span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
                <span>Remaining Purchase Debt</span>
                <span><CurrencyDisplay amount={balance} /></span>
              </div>
            </div>
          </>
        )}

        {balance > 0 && renderOutstandingFooter(balance)}

        <div className="mt-8 text-center text-[9px] font-semibold text-zinc-400 flex flex-col items-center gap-1 uppercase tracking-widest">
          <span className="font-bold border border-zinc-200 px-3 py-1 rounded-full mb-1 text-[9px] tracking-wider text-zinc-500">
            {transaction.type === 'settlement' 
              ? 'CREDIT REPAYMENT RECORD' 
              : transaction.type === 'consolidated' 
                ? 'CONSOLIDATED LEDGER RECORD' 
                : 'CREDIT SALE RECORD'}
          </span>
          <span>Powered by HeadlessPOS</span>
        </div>
      </div>
    );
  };

  const modalBody = (
    <div className="flex flex-col md:flex-row w-full h-full bg-card">
      {/* Left Column: Receipt Preview */}
      <div className="w-full md:w-[380px] bg-zinc-50 dark:bg-black/40 border-r border-border p-6 flex-shrink-0 flex items-center justify-center">
         {renderReceiptContent(false)}
      </div>

      {/* Right Column: Actions */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
        <div className="max-w-xs mx-auto w-full space-y-4">
          <div className="mb-4">
            <h4 className="font-bold text-lg text-foreground font-['AtypDisplay']">
              {transaction.type === 'settlement' 
                ? 'Repayment Receipt' 
                : transaction.type === 'consolidated' 
                  ? 'Consolidated Receipt' 
                  : 'Credit Sale Receipt'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Receipt reference {transaction.reference}. Choose to print or download a digital copy for the customer.
            </p>
          </div>

          <Button 
            className="w-full h-12 rounded-full font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>

          <Button 
            className="w-full h-12 rounded-full font-bold gap-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground shadow-none" 
            variant="outline" 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Generating PDF...' : 'Download Invoice'}
          </Button>

          <Button 
            onClick={onClose}
            variant="ghost" 
            className="w-full h-12 rounded-full font-semibold border-none hover:bg-muted"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="2xl"
        classNames={{
          body: "p-0 overflow-hidden max-h-[90vh]"
        }}
        body={modalBody}
      />
      {/* Print Portal - Rendered at document root, only visible during print */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div id="print-portal" className="hidden">
           {renderReceiptContent(true)}
        </div>,
        document.body
      )}
    </>
  );
}
