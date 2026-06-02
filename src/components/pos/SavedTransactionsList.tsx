import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { Clock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

export default function SavedTransactionsList() {
  const { savedTransactions, resumeTransaction } = useCartStore();

  if (savedTransactions.length === 0) {
    return null;
  }

  const handleResume = (id: string, name: string) => {
    resumeTransaction(id);
    toast.success(`Resumed transaction for ${name}`);
  };

  return (
    <div className="w-full pb-3 border-b border-border/40 mb-3 md:mb-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 h-full rounded-full bg-secondary text-muted-foreground mr-1">
          <Clock className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Saved ({savedTransactions.length})</span>
        </div>

        {savedTransactions.map((transaction) => (
          <Button
            key={transaction.id}
            variant="outline"
            className="shrink-0 flex items-center gap-3 h-auto py-2 pl-2 pr-4 rounded-full border-border bg-card group group-hover:bg-secondary transition-all duration-300"
            onClick={() => handleResume(transaction.id, transaction.customerName)}
          >
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarFallback className="bg-muted rounded-full group-hover:bg-card text-secondary-foreground text-xs font-bold border transition-all duration-300">
                {transaction.customerInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-bold leading-none">{transaction.customerName}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {transaction.itemCount}
                </span>
                <span className="w-1 h-1 rounded-full bg-border"></span>
                <span>{transaction.time}</span>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
