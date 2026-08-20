import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

interface ResetStaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  onSuccess?: () => void;
}

export function ResetStaffPinModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: ResetStaffPinModalProps) {
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('1234');
      setShowPin(false);
    }
  }, [isOpen, staff]);

  if (!staff) return null;

  const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put(`/tenant/staff/${staff.id}/pin`, { pin });
      toast.success(`POS PIN reset to ${pin}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Reset PIN error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to reset PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isLoading) onClose();
      }}
      size="md"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">Reset POS PIN</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {staffName} ({staff.email})
          </p>
        </div>
      }
      body={
        <form id="reset-pin-form" onSubmit={handleSubmit} className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter a new 4-digit PIN for register and terminal unlock.
          </p>

          <CustomInputTextField
            label="4-Digit POS PIN"
            name="pos_pin"
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
            }}
            placeholder="1234"
            required
            endContent={
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors focus:outline-none cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="reset-pin-form"
            disabled={isLoading || pin.length !== 4}
            className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full hover:bg-primary/90"
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            Reset PIN
          </Button>
        </div>
      }
    />
  );
}

export default ResetStaffPinModal;
