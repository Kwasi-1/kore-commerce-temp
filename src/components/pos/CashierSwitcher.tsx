import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

// Mock cashiers list
const MOCK_CASHIERS = [
  { id: '1', name: 'Kwame Mensah', role: 'cashier', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'Ama Osei', role: 'cashier', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'Kofi Yeboah', role: 'cashier', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'Abena Agyei', role: 'cashier', avatar: 'https://i.pravatar.cc/150?img=4' },
];

export default function CashierSwitcher() {
  const { login, tenant } = useAuthStore();
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleCashierClick = (cashier: any) => {
    setSelectedCashier(cashier);
    setIsPopoverOpen(false);
    setPin('');
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock PIN validation (any 4 digits works for now)
    if (pin.length >= 4) {
      toast.success(`Logged in as ${selectedCashier.name}`);
      // Log the cashier in
      login('mock_token', 'mock_refresh', selectedCashier, tenant || { id: 't1', name: 'Default Tenant', plan: 'pro' });
      setIsPinModalOpen(false);
    } else {
      toast.error('Invalid PIN');
    }
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="flex -space-x-2 mr-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background rounded-full">
            {MOCK_CASHIERS.slice(0, 3).map((cashier, idx) => (
              <div key={cashier.id} className={`h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden z-[${3-idx}]`}>
                <img src={cashier.avatar} alt={cashier.name} className="h-full w-full object-cover" />
              </div>
            ))}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 rounded-xl border-border/60 shadow-lg">
          <div className="mb-2 px-2 pt-1 pb-2 border-b border-border/40">
            <h4 className="font-semibold text-sm text-foreground">Select Cashier</h4>
          </div>
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-hide">
            {MOCK_CASHIERS.map(cashier => (
              <button
                key={cashier.id}
                onClick={() => handleCashierClick(cashier)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-border/50">
                  <img src={cashier.avatar} alt={cashier.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-foreground leading-tight">{cashier.name}</span>
                  <span className="text-[12px] font-medium text-muted-foreground capitalize">{cashier.role}</span>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Enter PIN</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            {selectedCashier && (
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden border-2 border-border shadow-sm">
                  <img src={selectedCashier.avatar} alt={selectedCashier.name} className="h-full w-full object-cover" />
                </div>
                <p className="font-bold text-lg">{selectedCashier.name}</p>
              </div>
            )}
            
            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                className="text-center text-2xl tracking-[0.5em] h-14 font-bold rounded-xl"
                autoFocus
              />
              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-[15px]">
                Unlock Register
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
