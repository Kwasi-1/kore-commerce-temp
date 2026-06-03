import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { Clock, ShoppingCart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import toast from 'react-hot-toast';

export default function SavedTransactionsHeader() {
  const { savedTransactions, resumeTransaction } = useCartStore();

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
            <span className='truncate max-w-[100px]'>
            {transaction.customerName}</span> &middot; <span className="text-xs">{transaction.time}</span>
          </Button>
        ))}
      </div>

      {/* Dropdown for Mobile (All) or Desktop (Hidden remaining) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            className="flex items-center gap-1.5 rounded-full h-10 px-3 md:px-4 text-sm font-bold"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="hidden lg:inline">{hiddenCount > 0 ? `+${hiddenCount}` : savedTransactions.length}</span>
            <span className="lg:hidden">{savedTransactions.length}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64 rounded-3xl shadow-lg border-border/60 max-h-[300px] overflow-y-auto max-w-xs w-full">
          <DropdownMenuLabel className="font-bold text-xs uppercase text-muted-foreground">All Saved Transactions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {savedTransactions.map((t) => (
            <DropdownMenuItem 
              key={t.id} 
              className="flex items-center gap-3 py-2 cursor-pointer rounded-xl"
              onClick={() => handleResume(t.id, t.customerName)}
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold border">
                  {t.customerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-bold truncate w-full">{t.customerName}</span>
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{t.itemCount} items</span>
                  <span>{t.time}</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
