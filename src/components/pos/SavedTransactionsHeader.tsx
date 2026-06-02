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
            className="shrink-0 flex items-center gap-2 h-10 py-1.5 pl-1.5 pr-3 rounded-full border-border bg-card group hover:bg-secondary transition-all duration-300"
            onClick={() => handleResume(transaction.id, transaction.customerName)}
          >
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarFallback className="bg-muted rounded-full group-hover:bg-card text-secondary-foreground text-[10px] font-bold border transition-all duration-300">
                {transaction.customerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start leading-[1.1]">
              <span className="text-[13px] font-bold">{transaction.customerName}</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-0.5"><ShoppingCart className="h-2.5 w-2.5" />{transaction.itemCount}</span>
                <span className="w-1 h-1 rounded-full bg-border"></span>
                <span>{transaction.time}</span>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Dropdown for Mobile (All) or Desktop (Hidden remaining) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 rounded-full h-10 px-3 md:px-4 text-xs font-bold"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="hidden lg:inline">{hiddenCount > 0 ? `+${hiddenCount} More` : 'Saved'}</span>
            <span className="lg:hidden">Saved ({savedTransactions.length})</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-[16px] shadow-lg border-border/60 max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel className="font-bold text-xs uppercase text-muted-foreground">All Saved Transactions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {savedTransactions.map((t) => (
            <DropdownMenuItem 
              key={t.id} 
              className="flex items-center gap-3 py-2 cursor-pointer rounded-lg"
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
