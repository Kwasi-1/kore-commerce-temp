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

  const renderReceiptContent = (isForPrint = false) => {
    return (
      <div 
        id={isForPrint ? 'print-receipt-content' : `credit-receipt-${transaction.id}`}
        className={`bg-white text-black p-6 rounded-xl font-mono text-sm max-w-sm mx-auto ${isForPrint ? 'w-[80mm] p-2 border-none' : 'border border-border/20 shadow-sm'}`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl tracking-wider mb-1">VYSION STORE</h3>
          <p className="text-xs text-zinc-500 uppercase">123 Commerce St, Accra, Ghana</p>
          <p className="text-xs text-zinc-500">Tel: +233 24 123 4567</p>
        </div>

        <div className="border-b border-dashed border-zinc-300 pb-3 mb-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span>{transaction.reference}</span>
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
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-zinc-300 pb-3 mb-3">
          <div className="flex font-bold text-[10px] pb-2 uppercase tracking-wider text-zinc-800">
            <span className="flex-1">Description</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-20 text-right">Total</span>
          </div>
          <div className="space-y-1 text-xs">
            {transaction.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start">
                <span className="flex-1 pr-2 leading-tight">{item.name}</span>
                <span className="w-10 text-center text-zinc-700">{item.quantity}</span>
                <span className="w-20 text-right font-bold">
                  <CurrencyDisplay amount={item.subtotal || (item.price * item.quantity)} />
                </span>
              </div>
            )) || (
              <div className="flex items-start">
                <span className="flex-1 pr-2 leading-tight">Credit Purchase</span>
                <span className="w-10 text-center text-zinc-700">1</span>
                <span className="w-20 text-right font-bold">
                  <CurrencyDisplay amount={transaction.amount} />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zinc-700 font-medium">
            <span>Total Purchase</span>
            <span className="font-bold"><CurrencyDisplay amount={transaction.amount} /></span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-zinc-300 mt-2 uppercase">
            <span>Outstanding Balance</span>
            <span><CurrencyDisplay amount={transaction.balance_after} /></span>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] font-semibold text-zinc-600 flex flex-col items-center gap-1 uppercase">
          <span className="font-bold border border-zinc-800 px-3 py-1 rounded-full mb-2 text-[10px] tracking-wider text-zinc-800">CREDIT LEDGER RECORD</span>
          <span className="mt-2 text-[9px] tracking-widest">Powered by HeadlessPOS</span>
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
            <h4 className="font-bold text-lg text-foreground">Credit Sale Receipt</h4>
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
