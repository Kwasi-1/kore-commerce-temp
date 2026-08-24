import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Printer, Download, Share2 } from 'lucide-react';
import { CurrencyDisplay, useReceiptHeader, useQuantityFormatter, formatPhoneNumber } from '@/hooks';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Icon } from '@iconify/react';

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
  const { storeName, storeLocation, storePhone } = useReceiptHeader(transaction);
  const { formatQuantity } = useQuantityFormatter();

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
    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 border-4 border-emerald-600 rounded text-emerald-600 font-extrabold px-3 py-1.5 sm:px-4 sm:py-2 rotate-[-12deg] opacity-75 uppercase tracking-widest text-xs sm:text-sm pointer-events-none select-none font-['AtypDisplay']">
      Settled
    </div>
  );

  const renderOutstandingFooter = (amount: number) => (
    <div className="mt-2.5 shrink-0 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 flex justify-center gap-2 rounded-md text-center font-bold text-[11px] uppercase tracking-wider">
      Outstanding Balance: <CurrencyDisplay amount={amount} showStyling={false} />
    </div>
  );

  const renderReceiptContent = (isForPrint = false) => {
    const isSettled = (transaction.balance_after || 0) <= 0;
    const balance = transaction.balance_after || 0;

    return (
      <div 
        id={isForPrint ? 'print-receipt-content' : `credit-receipt-${transaction.id}`}
        className={
          isForPrint
            ? "bg-white text-black w-[80mm] p-2 font-sans text-sm relative border-none"
            : "bg-white text-black p-4 sm:p-5 md:p-6 w-full h-full md:h-auto flex flex-col justify-between rounded-xl font-sans text-sm relative border border-border/20 shadow-sm min-h-0 overflow-hidden"
        }
      >
        {/* Top Content: Header + Info */}
        <div className="shrink-0">
          {/* Header */}
          <div className="text-center mb-3 sm:mb-4 relative">
            <h3 className="font-['AtypDisplay'] font-bold text-lg sm:text-xl tracking-wider mb-0.5 text-zinc-900 uppercase">{storeName}</h3>
            {storeLocation && <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{storeLocation}</p>}
            {storePhone && <p className="text-[10px] text-zinc-500">Tel: {storePhone}</p>}
            {isSettled && renderSettledStamp()}
          </div>

          {/* Info Section */}
          <div className="border-b border-dashed border-zinc-200 pb-2.5 mb-2.5 text-xs space-y-1 text-zinc-700">
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
              <span className="font-medium text-zinc-900">{debtor?.name}</span>
            </div>
            {debtor?.phone && (
              <div className="flex justify-between">
                <span className="font-semibold">Phone:</span>
                <span>{formatPhoneNumber(debtor.phone)}</span>
              </div>
            )}
            {(transaction.type === 'settlement' || transaction.type === 'consolidated') && (
              <div className="flex justify-between">
                <span className="font-semibold">Payment Method:</span>
                <span className="uppercase font-semibold text-zinc-900">{transaction.payment_method || 'CASH'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Content: Dynamically Sized Items / Breakdown Table */}
        <div className={isForPrint ? "mb-3" : "overflow-y-auto scrollbar-hide mb-2.5 max-h-[36vh] md:max-h-[38vh] min-h-0"}>
          {transaction.type === 'settlement' ? (
            /* CREDIT REPAYMENT RECEIPT */
            <div className="space-y-2 text-xs text-zinc-800">
              <div className="bg-zinc-50 p-2.5 rounded-md border border-zinc-100">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-500">Applied toward:</span>
                  <span className="font-mono font-bold text-zinc-900">{transaction.purchase_reference}</span>
                </div>
                {transaction.purchase_original_amount !== undefined && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Original Purchase Amt:</span>
                    <span className="font-semibold text-zinc-600"><CurrencyDisplay amount={transaction.purchase_original_amount} showStyling={false}/></span>
                  </div>
                )}
              </div>
            </div>
          ) : transaction.type === 'consolidated' ? (
            /* CONSOLIDATED SETTLEMENT RECEIPT */
            <div>
              <div className="sticky top-0 bg-white flex font-['AtypDisplay'] font-bold text-[10px] pb-1.5 uppercase tracking-wider text-zinc-900 border-b border-zinc-100 mb-2 z-10">
                <span className="flex-1">Purchase Reference</span>
                <span className="w-24 text-right">Applied Amount</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-800">
                {transaction.settlements?.map((s: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-mono font-medium text-zinc-900">{s.purchase_reference || s.purchase_id}</span>
                    <span className="font-semibold text-zinc-700">
                      <CurrencyDisplay amount={s.amount} showStyling={false} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CREDIT PURCHASE RECEIPT (DEFAULT) */
            <div>
              <div className="sticky top-0 bg-white flex font-['AtypDisplay'] font-bold text-[10px] pb-1.5 uppercase tracking-wider text-zinc-900 border-b border-zinc-100 mb-2 z-10">
                <span className="flex-1">Description</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-20 text-right">Total</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-800">
                {transaction.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start">
                    <span className="flex-1 pr-2 leading-tight font-medium text-left">{item.name}</span>
                    <span className="w-10 text-center text-zinc-500">{formatQuantity(item.quantity)}</span>
                    <span className="w-20 text-right font-semibold">
                      <CurrencyDisplay amount={item.subtotal || (item.price * item.quantity)} showStyling={false} />
                    </span>
                  </div>
                )) || (
                  <div className="flex items-start">
                    <span className="flex-1 pr-2 leading-tight font-medium text-left">Credit Purchase</span>
                    <span className="w-10 text-center text-zinc-500">1</span>
                    <span className="w-20 text-right font-semibold">
                      <CurrencyDisplay amount={transaction.amount} showStyling={false} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Content: Totals + Balances + Footer Stamp (Always Pinned at Bottom) */}
        <div className="shrink-0 mt-auto">
          {transaction.type === 'settlement' ? (
            <div className="space-y-1 text-xs text-zinc-800 pt-2 border-t border-dashed border-zinc-200">
              <div className="flex justify-between font-medium">
                <span>Repayment Amount</span>
                <span className="font-bold text-emerald-600">-<CurrencyDisplay amount={transaction.amount} showStyling={false} /></span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-dashed border-zinc-200 mt-1.5 uppercase text-zinc-900">
                <span>Remaining Purchase Debt</span>
                <span><CurrencyDisplay amount={balance} showStyling={false}/></span>
              </div>
            </div>
          ) : transaction.type === 'consolidated' ? (
            <div className="space-y-1 text-xs text-zinc-800 pt-2 border-t border-dashed border-zinc-200">
              <div className="flex justify-between font-medium">
                <span>Total Settlement</span>
                <span className="font-bold text-emerald-600 text-sm">-<CurrencyDisplay amount={transaction.amount} showStyling={false}/></span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-dashed border-zinc-200 mt-1.5 uppercase text-zinc-900">
                <span>Consolidated Remaining Debt</span>
                <span><CurrencyDisplay amount={balance} showStyling={false}/></span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-zinc-800 pt-2 border-t border-dashed border-zinc-200">
              <div className="flex justify-between font-medium">
                <span>Total Purchase</span>
                <span className="font-bold"><CurrencyDisplay amount={transaction.amount} showStyling={false} /></span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-sm pt-1.5 border-t border-dashed border-zinc-200 mt-1.5 uppercase text-zinc-900">
                <span>Remaining Purchase Debt</span>
                <span><CurrencyDisplay amount={balance} showStyling={false}/></span>
              </div>
            </div>
          )}

          {balance > 0 && renderOutstandingFooter(balance)}

          <div className="mt-4 sm:mt-6 text-center text-[9px] font-semibold text-zinc-400 flex flex-col items-center gap-0.5 uppercase tracking-widest">
            <span className="font-bold border border-zinc-200 px-3 py-0.5 rounded-full mb-0.5 text-[9px] tracking-wider text-zinc-500">
              {transaction.type === 'settlement' 
                ? 'CREDIT REPAYMENT RECORD' 
                : transaction.type === 'consolidated' 
                  ? 'CONSOLIDATED LEDGER RECORD' 
                  : 'CREDIT SALE RECORD'}
            </span>
            <span>Powered by HeadlessPOS</span>
          </div>
        </div>
      </div>
    );
  };

  const receiptTitle = transaction.type === 'settlement'
    ? 'Repayment Receipt'
    : transaction.type === 'consolidated'
      ? 'Consolidated Receipt'
      : 'Credit Sale Receipt';

  const modalBody = (
    <div className="flex flex-col md:flex-row w-full h-[95dvh] md:h-auto md:max-h-[90vh] bg-card min-h-0 overflow-hidden">
      {/* Mobile-Only Header Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 border-b border-border/50 bg-background shrink-0">
        <div className="min-w-0 pr-2">
          <h4 className="font-bold text-lg text-foreground truncate font-['AtypDisplay']">
            {receiptTitle}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mr-9">
          <Button
            size="icon-sm"
            variant="outline"
            radius="default"
            onClick={handlePrint}
            title="Print Receipt"
          >
            <Icon icon="solar:printer-minimalistic-linear" className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            radius="default"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Receipt Preview (Left Column on Desktop, Main on Mobile) */}
      <div className="w-full md:w-[380px] lg:w-[400px] bg-zinc-50 dark:bg-black/40 p-3 sm:p-4 md:p-5 flex-1 md:flex-initial flex flex-col min-h-0 h-full md:h-auto md:max-h-[90vh] overflow-hidden">
         {renderReceiptContent(false)}
      </div>

      {/* Right Column: Actions (Desktop Only) */}
      <div className="hidden md:flex flex-1 p-6 md:p-8 flex-col justify-center">
        <div className="max-w-xs mx-auto w-full space-y-4">
          <div className="mb-4">
            <h4 className="font-bold text-lg text-foreground font-['AtypDisplay']">
              {receiptTitle}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Receipt reference {transaction.reference}. Choose to print or download a digital copy for the customer.
            </p>
          </div>

          <Button 
            className="w-full h-12 rounded-full font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-sm"
            onClick={handlePrint}
          >
            <Icon icon="solar:printer-minimalistic-linear" className="h-4 w-4" />
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
        size="3xl"
        classNames={{
          base: 'min-h-[calc(98dvh-0.75rem)] md:min-h-[540px] md:max-h-[90vh]',
          body: "p-0 overflow-hidden md:max-h-[90vh]"
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
