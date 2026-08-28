import React, { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Clock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CustomModal from '@/components/modals/modal';
import toast from 'react-hot-toast';

export default function SavedTransactionsHeader() {
  const { savedTransactions, resumeTransaction } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (savedTransactions.length === 0) {
    return null;
  }

  const handleResume = (id: string, name: string) => {
    resumeTransaction(id);
    toast.success(`Resumed transaction for ${name}`);
  };

  const visibleTransactions = savedTransactions.slice(0, 2);
  const hiddenCount = Math.max(0, savedTransactions.length - 2);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Desktop: Visible Pills */}
        <div className="hidden lg:flex items-center gap-2">
          {visibleTransactions.map((transaction) => (
            <Button
              key={transaction.id}
              variant="outline"
              className="shrink-0 flex items-center h-10 px-4 rounded-full border-foreground/10 bg-card hover:bg-secondary transition-all duration-300 text-sm font-semibold"
              onClick={() => handleResume(transaction.id, transaction.customerName)}
            >
              <span className="truncate max-w-[100px]">{transaction.customerName}</span> &middot; <span className="text-xs text-muted-foreground">{transaction.time}</span>
            </Button>
          ))}
        </div>

        {/* Desktop Overflow Button (opens Top Modal) */}
        <div className="hidden lg:flex">
          <Button 
            variant="secondary" 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full h-10 px-3.5 text-sm font-semibold"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{hiddenCount > 0 ? `+${hiddenCount}` : savedTransactions.length}</span>
          </Button>
        </div>

        {/* Mobile: Bordered Single Counter Button (opens Top Modal) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex lg:hidden items-center gap-1.5 h-10 px-2.5 rounded-full border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-colors shrink-0"
          title="View saved transactions"
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{savedTransactions.length}</span>
        </button>
      </div>

      {/* Top Modal for Saved Transactions */}
      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(prev => !prev)}
        onClose={() => setIsModalOpen(false)}
        placement="top"
        size="md"
        classNames={{
          base: "!w-full !max-w-md rounded-[20px] sm:rounded-3xl border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
          header: "pb-2 border-b border-border/40 px-4 sm:px-6 pt-4",
          body: "py-3 px-4 sm:px-6"
        }}
        header={
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground leading-tight">Saved Transactions</h3>
                <p className="text-xs text-muted-foreground">{savedTransactions.length} held order{savedTransactions.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        }
        body={
          <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1 py-1">
            {savedTransactions.map((t) => {
              const subtotal = t.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
              const total = Math.max(0, subtotal - (t.discount || 0));
              const itemCount = t.itemCount || t.items.length;
              return (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border">
                      <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">
                        {t.customerInitials || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm font-bold text-foreground truncate">{t.customerName}</span>
                        <span className="text-muted-foreground text-xs">&middot;</span>
                        <span className="text-xs font-bold text-foreground shrink-0">
                          GHS {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                        <span className="flex items-center gap-1 shrink-0">
                          <ShoppingCart className="h-3 w-3" />
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                        <span>&middot;</span>
                        <span className="shrink-0">{t.time}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="rounded-full h-8 px-3.5 text-xs font-semibold shrink-0"
                    onClick={() => {
                      handleResume(t.id, t.customerName);
                      setIsModalOpen(false);
                    }}
                  >
                    Resume
                  </Button>
                </div>
              );
            })}
          </div>
        }
      />
    </>
  );
}

