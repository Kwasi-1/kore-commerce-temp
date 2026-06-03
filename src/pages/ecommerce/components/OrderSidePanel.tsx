import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, Package, Download, RefreshCcw, Phone, MessageCircle } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks/useCurrency';
import { StatusBadge } from '@/components/ui/status-badge';
import { CustomSelectField } from '@/components/shared/text-field';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { EcommerceInvoice } from './EcommerceInvoice';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface OrderSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onUpdateStatusClick: (order: any, newStatus: string) => void;
  onIssueRefundClick: () => void;
  onPrintInvoice: () => void;
}

export default function OrderSidePanel({
  isOpen,
  onClose,
  order,
  onUpdateStatusClick,
  onIssueRefundClick,
  onPrintInvoice
}: OrderSidePanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!order) return null;

  const handleDownloadPDF = async () => {
    const wrapperElement = document.getElementById(`invoice-wrapper-${order.id}`);
    const invoiceElement = document.getElementById(`invoice-${order.id}`);
    if (!wrapperElement || !invoiceElement) return;

    setIsDownloading(true);
    
    // Temporarily remove hidden from the wrapper
    wrapperElement.classList.remove('hidden');
    wrapperElement.style.position = 'absolute';
    wrapperElement.style.top = '-9999px';
    wrapperElement.style.left = '-9999px';
    
    // Set width on the inner invoice element
    invoiceElement.style.width = '794px'; 

    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${order.reference}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      invoiceElement.style.width = '';
      wrapperElement.style.position = '';
      wrapperElement.style.top = '';
      wrapperElement.style.left = '';
      wrapperElement.classList.add('hidden');
      setIsDownloading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="md"
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{order.reference}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>
          <StatusBadge status={order.status} />
        </div>
      }
      body={
        <>
          {/* Print Only Invoice */}
          <div id={`invoice-wrapper-${order.id}`} className="hidden print:block w-full">
            <EcommerceInvoice order={order} />
          </div>

          {/* Screen Only Panel Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 print:hidden">
            
            {/* Status Updater */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'refunded' && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Update Status</span>
                <CustomSelectField
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Processing', value: 'processing' },
                    { label: 'Shipped', value: 'shipped' },
                    { label: 'Delivered', value: 'delivered' },
                    { label: 'Cancelled', value: 'cancelled' },
                  ]}
                  value={order.status}
                  inputProps={{
                    onChange: (e) => onUpdateStatusClick(order, e.target.value)
                  }}
                  labelPlacement="outside"
                  className="w-full"
                />
              </div>
            )}

            {/* Customer & Delivery Section */}
            <div className="flex flex-col gap-4 pb-6 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer & Delivery Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground mb-1 tracking-tight">
                    <User className="h-4 w-4 text-primary" />
                    {order.customer_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                  {order.customer_phone || true ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <button className="text-sm text-muted-foreground dark:text-primary hover:underline flex items-center gap-1 mt-1 transition-colors">
                          <Phone className="w-3 h-3" />
                          {order.customer_phone || '024 123 4567'}
                        </button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Contact Customer">
                        <DropdownItem 
                          key="call" 
                          startContent={<Phone className="w-4 h-4" />}
                          onClick={() => window.open(`tel:${order.customer_phone || '0241234567'}`, '_self')}
                        >
                          Call
                        </DropdownItem>
                        <DropdownItem 
                          key="whatsapp" 
                          startContent={<MessageCircle className="w-4 h-4 text-green-500" />}
                          onClick={() => window.open(`https://wa.me/${(order.customer_phone || '0241234567').replace(/[^0-9]/g, '')}`, '_blank')}
                        >
                          WhatsApp
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground mb-1 tracking-tight">
                    <MapPin className="h-4 w-4 text-primary" />
                    Store Pickup
                  </div>
                  <div className="text-sm text-muted-foreground">Standard Delivery</div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</h3>
              <div className="border border-border/50 rounded-lg overflow-hidden bg-card shadow-sm">
                <div className="divide-y divide-border/50">
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div className="h-10 w-10 bg-muted/30 rounded-md flex items-center justify-center border border-border/50">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Sample Product</div>
                        <div className="text-xs text-muted-foreground">SKU-12345</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm"><CurrencyDisplay amount={order.total_amount} /></div>
                      <div className="text-xs text-muted-foreground">Qty: {order.items_count}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/10 p-4 space-y-3 border-t border-border/50 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment Method</span>
                    <span className="capitalize font-medium text-foreground flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-primary" />
                      {order.payment_method?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span><CurrencyDisplay amount={order.total_amount} /></span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-3 border-t border-border/50 text-foreground">
                    <span>Total</span>
                    <span className=""><CurrencyDisplay amount={order.total_amount} /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      }
      footer={
        <div className="flex flex-col gap-3 w-full pb-4 print:hidden">
          <Button 
            variant="outline"
            className="w-full"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating PDF...' : 'Download Invoice'}
          </Button>
          <Button 
            variant="destructive"
            className="w-full"
            onClick={onIssueRefundClick}
            disabled={order.status === 'refunded' || order.status === 'partially_refunded'}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {(order.status === 'refunded' || order.status === 'partially_refunded') ? 'Already Refunded' : 'Issue Refund'}
          </Button>
        </div>
      }
    />
  );
}
