import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface SaveTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveTransactionModal({ isOpen, onClose }: SaveTransactionModalProps) {
  const [customerName, setCustomerName] = useState('');
  const { items, saveTransaction } = useCartStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setCurrentTime(new Date());
    }
  }, [isOpen]);

  const handleSave = () => {
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    saveTransaction(customerName);
    toast.success('Transaction saved successfully');
    setCustomerName('');
    onClose();
  };

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      header={<h3 className="text-xl font-bold">Save Transaction</h3>}
      body={
        <div className="grid gap-5">
          <CustomInputTextField
            label="Customer Name / Reference (Optional)"
            labelPlacement="outside"
            placeholder="e.g. John Doe, Table 4, Waiting..."
            value={customerName}
            onChange={(e: any) => setCustomerName(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary p-3 rounded-md flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Date</span>
                <span className="text-xs font-semibold">{formattedDate}</span>
              </div>
            </div>
            <div className="bg-secondary p-3 rounded-md flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Time</span>
                <span className="text-xs font-semibold">{formattedTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-secondary/10 border border-border p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
              <span className="text-sm font-semibold text-secondary-foreground">Items in Cart</span>
            </div>
            <span className="text-lg font-bold text-secondary-foreground">{items.length}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 w-full pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-full font-bold">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-full font-bold">
            Save Transaction
          </Button>
        </div>
      }
    />
  );
}
