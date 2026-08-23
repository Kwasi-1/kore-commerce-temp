import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { Wallet, History, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { format } from 'date-fns';

interface CustomerCreditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDebtor: any;
  creditPurchases: any[];
  isPurchasesLoading: boolean;
  onSettleAll: () => void;
  onSettleSpecific: (purchase: any) => void;
  onViewLatestReceipt?: () => void;
  onDownloadPaymentPDF?: (repayment: any, purchaseRef: string) => void;
}

export default function CustomerCreditDetailModal({
  isOpen,
  onClose,
  selectedDebtor,
  creditPurchases,
  isPurchasesLoading,
  onSettleAll,
  onSettleSpecific,
  onViewLatestReceipt,
  onDownloadPaymentPDF,
}: CustomerCreditDetailModalProps) {
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  if (!selectedDebtor) return null;

  const initials = selectedDebtor.name
    ? selectedDebtor.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'C';

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="md"
      header={
        <div className="flex items-center gap-2 pt-1 border-b border-border/50 pb-2">
          <Icon icon="solar:wallet-money-linear" className="h-4 w-4 text-foreground" />
          <span className="text-lg font-bold text-foreground !tracking-tight">Credit Ledger Account</span>
        </div>
      }
      body={
        <div className="flex-1 overflow-y-auto px-1 pt-1 pb-3 text-left space-y-5">
          {/* Customer Overview Card */}
          <div className="text-center pb-5 border-b border-border/50">
            <div className="mx-auto h-12 w-12 rounded-md bg-muted/40 border border-border/30 flex items-center justify-center text-foreground font-bold text-base mb-2.5">
              {initials}
            </div>
            <h3 className="text-lg font-bold text-foreground">{selectedDebtor.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedDebtor.phone || selectedDebtor.email || 'No contact info'}</p>
            
            <div className="mt-4 bg-muted/30 p-3.5 rounded-md inline-block w-full max-w-[320px]">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Outstanding Balance
              </p>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                <CurrencyDisplay amount={selectedDebtor.outstanding_debt || 0} />
              </p>
            </div>

            <div className="mt-3.5 flex justify-center">
              <Button 
                onClick={onSettleAll}
                disabled={selectedDebtor.outstanding_debt <= 0}
                className="w-full max-w-[320px]"
              >
                <Icon icon="solar:wallet-money-linear" className="h-4 w-4" />
                Settle Total Debt
              </Button>
            </div>
          </div>

          {/* Credit Purchases List */}
          <div>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/50">
              <h4 className="text-xs font-bold text-muted-foreground uppercase !tracking-wider flex items-center gap-1.5">
                {/* <History className="h-3.5 w-3.5" /> */}
                Credit Purchases History
              </h4>
              {creditPurchases.length > 0 && onViewLatestReceipt && (
                <button
                  onClick={onViewLatestReceipt}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Latest Receipt
                </button>
              )}
            </div>

            {isPurchasesLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading credit purchases...</div>
            ) : creditPurchases.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">No credit purchases on record.</div>
            ) : (
              <div className="space-y-3">
                {creditPurchases.map((p) => {
                  const isExpanded = expandedPurchaseId === p.id;
                  const isSettled = p.status === 'settled';
                  const isPartial = p.status === 'partial';

                  return (
                    <div key={p.id} className="border border-border/70 rounded-md overflow-hidden bg-card text-card-foreground">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                        className="p-3.5 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-foreground">{p.reference}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            isSettled
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                              : isPartial
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'text-destructive bg-destructive/5 border-destructive/20'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 text-xs text-muted-foreground mt-0.5">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground/70">Date</p>
                            <p className="font-medium text-foreground">{format(new Date(p.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground/70">Original</p>
                            <p className="font-medium text-foreground"><CurrencyDisplay amount={p.original_amount} showStyling={false} /></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-muted-foreground/70">Remaining</p>
                            <p className="font-bold text-foreground"><CurrencyDisplay amount={p.outstanding_debt} showStyling={false} /></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end text-[11px] text-muted-foreground pt-1">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </div>
                      </div>

                      {/* Accordion Expanded Panel */}
                      {isExpanded && (
                        <div className="p-3.5 border-t border-border/60 bg-muted/20 space-y-3.5">
                          {/* Items Table */}
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Items in Purchase</p>
                            <div className="border border-border/50 rounded overflow-hidden bg-card text-xs">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border/50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2 text-center">Qty</th>
                                    <th className="p-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.items?.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-border/40 last:border-none">
                                      <td className="p-2 font-medium">{item.name}</td>
                                      <td className="p-2 text-center text-muted-foreground">{item.quantity}</td>
                                      <td className="p-2 text-right font-semibold"><CurrencyDisplay amount={item.subtotal || (item.price * item.quantity)} showStyling={false} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Repayments History */}
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Payments Made</p>
                            {p.repayments && p.repayments.length > 0 ? (
                              <div className="space-y-1.5 bg-card border border-border/50 rounded p-2.5">
                                {p.repayments.map((r: any) => (
                                  <div 
                                    key={r.id}
                                    onClick={() => onDownloadPaymentPDF && onDownloadPaymentPDF(r, p.reference)}
                                    className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Download className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                                      <div>
                                        <p className="font-semibold text-foreground">{r.reference}</p>
                                        <p className="text-[10px] text-muted-foreground">{format(new Date(r.date), 'MMM dd, yyyy')}</p>
                                      </div>
                                    </div>
                                    <span className="font-bold text-foreground">-<CurrencyDisplay amount={r.amount} showStyling={false} /></span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                            )}
                          </div>

                          {/* Settle Specific Button */}
                          {p.outstanding_debt > 0 && (
                            <Button
                              onClick={() => onSettleSpecific(p)}
                              size="sm"
                              className="w-full mt-1 font-semibold"
                              variant="outline"
                            >
                              <Icon icon="solar:wallet-money-linear" className="h-3.5 w-3.5 mr-1.5" />
                              Settle This Purchase (<CurrencyDisplay amount={p.outstanding_debt} showStyling={false} />)
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
