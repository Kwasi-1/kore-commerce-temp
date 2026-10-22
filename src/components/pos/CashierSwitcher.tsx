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
import toast from 'react-hot-toast';
import PinInput from './PinInput';
import SetPinModal from './SetPinModal';
import { useFeaturesStore } from '@/store/featuresStore';

export default function CashierSwitcher() {
  const { login, tenant } = useAuthStore();
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSetPinOpen, setIsSetPinOpen] = useState(false);

  const getStaffName = (cashier: any) => {
    if (!cashier) return 'Staff Member';
    if (cashier.name) return cashier.name;
    if (cashier.first_name || cashier.last_name) {
      return `${cashier.first_name || ''} ${cashier.last_name || ''}`.trim();
    }
    return cashier.email?.split('@')[0] || 'Staff Member';
  };

  useEffect(() => {
    const fetchCashiers = async () => {
      try {
        const response = await apiClient.get('/pos/auth/staff');
        const rawStaff = response.data.success?.data?.staff || [];
        const formatted = rawStaff.map((s: any) => ({
          ...s,
          name: getStaffName(s)
        }));
        setCashiers(formatted);
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
    setPinError(null);
    setIsPinModalOpen(true);
  };

  // Switch the whole session to the chosen person: the server checks their PIN and returns their
  // own login, so sales, permissions and approvals are theirs (not whoever signed in earlier).
  const switchTo = (data: any) => {
    const cashierName = getStaffName(data?.staff || selectedCashier);
    login(
      data.access_token,
      data.refresh_token,
      data.staff,
      data.tenant || tenant,
      false,
      data.grace_info ?? null
    );
    useFeaturesStore.getState().loadFeatures();
    toast.success(`Signed in as ${cashierName}`);
    setIsPinModalOpen(false);
    setPin('');
  };

  const handlePinSubmit = async (value: string = pin) => {
    if (value.length !== 4 || !selectedCashier || isVerifying) return;
    setIsVerifying(true);
    setPinError(null);
    try {
      const response = await apiClient.post('/pos/auth/verify-pin', { staff_id: selectedCashier.id, pin: value });
      const data = response.data.success?.data || {};
      if (!data.access_token) throw new Error('No login returned');
      if (data.is_default_pin) {
        // Still on the default 1234: they choose their own PIN first (SetPinModal signs them in)
        setIsPinModalOpen(false);
        setIsSetPinOpen(true);
        return;
      }
      switchTo(data);
    } catch (error: any) {
      setPinError(error?.response?.data?.error?.message || 'Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const getAvatarUrl = (cashier: any) => {
    const name = getStaffName(cashier);
    return cashier.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  };

  const pinModalBody = (
    <div className="flex flex-col items-center justify-center space-y-6 pt-2 pb-4">
      {selectedCashier && (
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden border-2 border-border shadow-sm">
            <img src={getAvatarUrl(selectedCashier)} alt={getStaffName(selectedCashier)} className="h-full w-full object-cover" />
          </div>
          <p className="font-bold text-lg">{getStaffName(selectedCashier)}</p>
        </div>
      )}
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePinSubmit();
        }}
        className="w-full space-y-4"
        autoComplete="off"
      >
        <PinInput
          value={pin}
          onChange={(v) => {
            setPin(v);
            if (pinError) setPinError(null);
          }}
          onComplete={handlePinSubmit}
          error={!!pinError}
          disabled={isVerifying}
          autoFocus
        />
        {pinError && <p className="text-center text-[13px] font-medium text-destructive">{pinError}</p>}
        <Button
          type="submit"
          variant="secondary"
          disabled={pin.length !== 4 || isVerifying}
          className="w-full h-12 rounded-xl font-bold text-[15px] shadow-sm"
        >
          {isVerifying ? 'Checking…' : 'Unlock Register'}
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
          <img src={getAvatarUrl(cashier)} alt={getStaffName(cashier)} className="h-full w-full object-cover" />
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
          <PopoverContent className="w-64 p-2 rounded-2xl border-border/60 shadow-lg">
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
                  <img src={getAvatarUrl(cashier)} alt={getStaffName(cashier)} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-foreground leading-tight">{getStaffName(cashier)}</span>
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

      <SetPinModal
        isOpen={isSetPinOpen}
        staff={selectedCashier ? { id: selectedCashier.id, name: getStaffName(selectedCashier), role: selectedCashier.role } : null}
        onSuccess={(resData: any) => {
          setIsSetPinOpen(false);
          if (resData?.access_token) switchTo(resData);
        }}
        onCancel={() => setIsSetPinOpen(false)}
      />
    </>
  );
}
