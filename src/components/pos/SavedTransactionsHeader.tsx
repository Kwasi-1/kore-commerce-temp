import React, { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Clock, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CustomModal from '@/components/modals/modal';
import toast from 'react-hot-toast';

export default function SavedTransactionsHeader() {
  const { savedTransactions, resumeTransaction, deleteSavedTransaction, clearAllSavedTransactions } = useCartStore();
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
          base: "!w-full !max-w-md rounded-[18px] sm:rounded-[20px] border border-border bg-background shadow-2xl mt-4 sm:mt-8 mx-3 sm:mx-auto",
          header: "pb-2 border-b border-border/40 px-4 sm:px-5 pt-4",
          body: "py-3 px-4"
        }}
        header={
          <div className="flex items-center justify-between w-full pr-6 px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-muted/70 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground leading-tight">Saved Transactions</h3>
                <p className="text-xs text-muted-foreground">{savedTransactions.length} held order{savedTransactions.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            {savedTransactions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all held transactions?")) {
                    clearAllSavedTransactions();
                    setIsModalOpen(false);
                    toast.success("Cleared all saved transactions");
                  }
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        }
        body={
          <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto scrollbar-hide scroll-smooth py-1 px-1">
            {savedTransactions.map((t) => {
              const subtotal = t.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
              const total = Math.max(0, subtotal - (t.discount || 0));
              return (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all gap-3"
                >
                  {/* Left Column: Avatar + Customer & Order Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border">
                      <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">
                        {t.customerInitials || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">{t.customerName}</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {t.itemCount || t.items.length} item{(t.itemCount || t.items.length) > 1 ? 's' : ''}
                        </span>
                        <span>&middot;</span>
                        <span>{t.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Stacked Price + Actions (Trash & Resume) */}
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight whitespace-nowrap">
                      GHS {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1">              
                      <Button
                        size="sm"
                        className="rounded-full h-7 px-3 text-xs font-semibold"
                        onClick={() => {
                          handleResume(t.id, t.customerName);
                          setIsModalOpen(false);
                        }}
                      >
                        Resume
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedTransaction(t.id);
                          toast.success(`Discarded ${t.customerName}`);
                        }}
                        title="Discard held order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
      />
    </>
  );
}

