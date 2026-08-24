import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  History, 
  AlertTriangle 
} from 'lucide-react';
import { APP_CONFIG } from '@/config/app.config';

export interface ReturnItem {
  variant_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  condition: 'sellable' | 'damaged' | 'expired';
  packaging_tier_id?: string;
  packaging_tier_name?: string;
}

export interface ReturnRecord {
  id: string;
  original_transaction_id: string;
  original_transaction_ref?: string;
  reason: 'defective' | 'wrong_item' | 'customer_dissatisfied' | 'expired' | 'other';
  refund_method: 'cash' | 'original_payment_method' | 'store_credit';
  status: 'pending' | 'approved' | 'rejected';
  total_refund_amount: number;
  items: ReturnItem[];
  notes?: string;
  initiated_by_name?: string;
  approved_by_name?: string;
  date_created?: string;
  approved_at?: string;
}

interface ReturnDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReturn: ReturnRecord | null;
}

const reasonLabels: Record<string, string> = {
  defective: 'Defective Product',
  wrong_item: 'Wrong Item Handed',
  customer_dissatisfied: 'Customer Dissatisfaction',
  expired: 'Expired Date',
  other: 'Other Reason'
};

const methodLabels: Record<string, string> = {
  cash: 'Cash Reversal',
  original_payment_method: 'Original Payment Method',
  store_credit: 'Store Credit'
};

const formatGHS = (amt: number) => {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amt);
};

export default function ReturnDetailModal({
  isOpen,
  onClose,
  selectedReturn
}: ReturnDetailModalProps) {
  if (!selectedReturn) return null;

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('drawer-return-receipt-print');
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Refund Receipt</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-4 bg-white">
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="md"
      header={
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-2">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">Return Detail Record</h3>
            <p className="text-xs text-muted-foreground font-mono">
              #{selectedReturn?.id?.slice(0, 8)?.toUpperCase() || '—'}
            </p>
          </div>
        </div>
      }
      body={
        <div className="flex-1 overflow-y-auto px-1 pt-1 pb-4 text-left">
          <div className="space-y-6">
            {/* Hero Summary Card */}
            <div className="bg-gradient-to-b from-muted/30 to-muted/30 p-5 rounded-lg flex flex-col items-center text-center relative overflow-hidden shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">
                Refund Amount Issued
              </span>
              <div className="text-3xl font-extrabold text-foreground font tracking-tight my-1">
                <CurrencyDisplay amount={selectedReturn.total_refund_amount} />
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`capitalize text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${
                  selectedReturn.status === 'approved'
                    ? 'bg-green-400/10 text-green-600 border-green-500/20'
                    : selectedReturn.status === 'rejected'
                      ? 'bg-red-500/10 text-red-600 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                }`}>
                  {selectedReturn.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {selectedReturn.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                  {selectedReturn.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                  {selectedReturn.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 w-full flex justify-between items-center text-xs text-muted-foreground font-mono">
                <span>Orig Receipt: <strong className="text-foreground">{selectedReturn.original_transaction_ref || '—'}</strong></span>
                <span>Return ID: <strong className="text-foreground">{selectedReturn.id}</strong></span>
              </div>
            </div>

            {/* Return Information Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase !tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
                <FileText className="h-3.5 w-3.5 text-primary" /> Return Details
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-lg border border-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Reason</span>
                  <span className="font-semibold text-foreground">{reasonLabels[selectedReturn.reason] || selectedReturn.reason || 'Other'}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Refund Method</span>
                  <span className="font-semibold capitalize text-foreground">{selectedReturn.refund_method?.replace('_', ' ') || 'Cash'}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Initiated By</span>
                  <span className="font-semibold text-foreground">{selectedReturn.initiated_by_name || 'Staff'}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-muted/30">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Created Date</span>
                  <span className="font-semibold text-foreground">
                    {selectedReturn.date_created ? format(new Date(selectedReturn.date_created), 'MMM dd, yyyy h:mm a') : '—'}
                  </span>
                </div>
                {selectedReturn.status === 'approved' && (
                  <>
                    <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Authorized By</span>
                      <span className="font-semibold text-foreground">{selectedReturn.approved_by_name || 'System Admin'}</span>
                    </div>
                    <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Approved At</span>
                      <span className="font-semibold text-foreground">
                        {selectedReturn.approved_at ? format(new Date(selectedReturn.approved_at), 'MMM dd, yyyy h:mm a') : '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {selectedReturn.notes && (
                <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 mt-2">
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Notes / Remarks</span>
                  <p className="text-xs leading-relaxed font-medium text-foreground">{selectedReturn.notes}</p>
                </div>
              )}
            </div>

            {/* Returned Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase !tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
                <History className="h-3.5 w-3.5 text-primary" /> Returned Items
              </h4>

              <div className="border border-border/60 rounded-xl overflow-hidden bg-card text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/60 text-muted-foreground text-[10px] uppercase border-b border-border/60 font-bold">
                      <th className="p-3">Item</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {selectedReturn.items?.map((item, idx) => {
                      const itemName = item.product_name && item.product_name !== 'Unit' 
                        ? item.product_name 
                        : item.packaging_tier_name && item.packaging_tier_name !== 'Unit'
                          ? item.packaging_tier_name
                          : 'Returned Item';
                      
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <p className="font-semibold text-foreground capitalize">{itemName}</p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {item.packaging_tier_name || 'Unit'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-medium text-foreground">{item.quantity}</td>
                          <td className="p-3 text-right font-semibold text-foreground">
                            <CurrencyDisplay amount={item.unit_price} />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize inline-flex items-center gap-1 border ${
                              item.condition === 'sellable'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                : 'bg-red-500/10 text-red-600 border-red-500/20'
                            }`}>
                              {item.condition === 'sellable' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {item.condition}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Printable Receipt Hidden Container */}
            <div className="hidden">
              <div 
                id="drawer-return-receipt-print"
                className="bg-white text-zinc-950 p-6 font-sans text-xs space-y-4 max-w-[320px] mx-auto text-left"
              >
                <div className="text-center pb-3 border-b border-dashed border-zinc-200">
                  <span className="border border-red-500 text-red-500 font-extrabold px-3 py-1 rounded text-[10px] tracking-widest inline-block uppercase rotate-[-5deg] mb-3">
                    Customer Return
                  </span>
                  <h4 className="font-bold text-sm tracking-wider uppercase">{APP_CONFIG.defaultStoreName}</h4>
                  <p className="text-[9px] text-zinc-500">REFUND RECEIPT</p>
                </div>

                <div className="space-y-1 text-[10px] pb-3 border-b border-dashed border-zinc-200">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Return ID:</span>
                    <span className="font-mono font-bold text-zinc-900">{selectedReturn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Orig Receipt #:</span>
                    <span className="font-mono text-zinc-900">{selectedReturn.original_transaction_ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Date Processed:</span>
                    <span>{new Date(selectedReturn.approved_at || selectedReturn.date_created || '').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Auth Manager:</span>
                    <span className="font-semibold">{selectedReturn.approved_by_name || 'System Admin'}</span>
                  </div>
                </div>

                <div className="pb-3 border-b border-dashed border-zinc-200">
                  <div className="flex text-[9px] font-bold pb-1 text-zinc-900 border-b border-zinc-100 mb-1.5 uppercase">
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-16 text-right">Refund</span>
                  </div>
                  <div className="space-y-1">
                    {selectedReturn.items?.map((item, i) => (
                      <div key={i} className="flex items-start text-[10px]">
                        <div className="flex-1 pr-1 capitalize">
                          <p className="font-medium leading-none text-zinc-900">{item.product_name || 'Item'}</p>
                          <span className="text-[8px] text-zinc-400 capitalize font-mono">Condition: {item.condition}</span>
                        </div>
                        <span className="w-12 text-center text-zinc-500">{item.quantity}</span>
                        <span className="w-16 text-right font-semibold text-zinc-950">
                          {formatGHS(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center font-bold text-sm text-zinc-950 uppercase pt-1.5">
                  <span>Total Refunded</span>
                  <span>{formatGHS(selectedReturn.total_refund_amount)}</span>
                </div>

                <div className="text-center text-[9px] text-zinc-400 font-semibold pt-4 border-t border-dashed border-zinc-200 uppercase tracking-widest">
                  <span>Refund Method: {methodLabels[selectedReturn.refund_method] || selectedReturn.refund_method}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      footer={
        selectedReturn.status === 'approved' ? (
          <div className="w-full">
            <Button 
              onClick={handlePrintReceipt}
              className="w-full text-primary-foreground font-semibold h-10 gap-2 text-xs shadow-xs transition-all"
            >
              <Icon icon="solar:printer-minimalistic-linear" className="h-4 w-4" /> Reprint Refund Receipt
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
