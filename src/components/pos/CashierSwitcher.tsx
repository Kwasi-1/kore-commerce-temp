import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import toast from 'react-hot-toast';

export default function CashierSwitcher() {
  const { login, tenant } = useAuthStore();
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    const fetchCashiers = async () => {
      try {
        const response = await apiClient.get('/tenant/staff');
        // Filter to only show active staff who could potentially be cashiers
        // The mock returns a list of staff, some might be owners/managers
        setCashiers(response.data.data?.staff || []);
      } catch (error) {
        console.error('Failed to fetch cashiers:', error);
      }
    };
    fetchCashiers();
  }, []);

  const handleCashierClick = (cashier: any) => {
    setSelectedCashier(cashier);
    setIsPopoverOpen(false);
    setPin('');
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const getAvatarUrl = (cashier: any) => {
    return cashier.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cashier.name)}&background=random`;
  };

  const pinModalBody = (
    <div className="flex flex-col items-center justify-center space-y-6 pt-2 pb-4">
      {selectedCashier && (
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden border-2 border-border shadow-sm">
            <img src={getAvatarUrl(selectedCashier)} alt={selectedCashier.name} className="h-full w-full object-cover" />
          </div>
          <p className="font-bold text-lg">{selectedCashier.name}</p>
        </div>
      )}
      
      <form onSubmit={handlePinSubmit} className="w-full space-y-6">
        <CustomInputTextField
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="****"
          className="text-center text-2xl tracking-[0.5em] font-bold"
          autoFocus
        />
        <Button type="submit" variant="secondary" className="w-full h-12 rounded-xl font-bold text-[15px] shadow-sm">
          Unlock Register
        </Button>
      </form>
    </div>
  );

  const hasMultipleCashiers = cashiers.length > 1;

  const triggerButton = (
    <button 
      className={`flex -space-x-2 mr-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background rounded-full ${hasMultipleCashiers ? 'hover:opacity-80 transition-opacity' : 'cursor-default'}`}
    >
      {cashiers.slice(0, 3).map((cashier, idx) => (
        <div key={cashier.id} className={`h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden z-[${3-idx}]`}>
          <img src={getAvatarUrl(cashier)} alt={cashier.name} className="h-full w-full object-cover" />
        </div>
      ))}
      {cashiers.length === 0 && (
        <div className="h-8 w-8 rounded-full border-2 border-background bg-gray-200 overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Staff" alt="staff" className="h-full w-full object-cover" />
        </div>
      )}
    </button>
  );

  return (
    <>
      {hasMultipleCashiers ? (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 rounded-xl border-border/60 shadow-lg">
          <div className="mb-2 px-2 pt-1 pb-2 border-b border-border/40">
            <h4 className="font-semibold text-sm text-foreground">Select Cashier</h4>
          </div>
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-hide">
            {cashiers.map(cashier => (
              <button
                key={cashier.id}
                onClick={() => handleCashierClick(cashier)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-border/50">
                  <img src={getAvatarUrl(cashier)} alt={cashier.name} className="h-full w-full object-cover" />
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
      ) : (
        triggerButton
      )}

      <CustomModal
        isOpen={isPinModalOpen}
        onOpenChange={() => setIsPinModalOpen(!isPinModalOpen)}
        size="sm"
        header={
          <div className="flex items-center justify-center w-full text-xl font-bold pt-2">
            Enter PIN
          </div>
        }
        body={pinModalBody}
      />
    </>
  );
}
