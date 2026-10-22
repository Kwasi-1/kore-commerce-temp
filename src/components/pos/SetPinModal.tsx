import { useEffect, useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import PinInput from './PinInput';

interface SetPinModalProps {
  isOpen: boolean;
  staff: {
    id: string;
    name: string;
    role: string;
  } | null;
  /** Receives the signed-in session returned by the server */
  onSuccess: (resData: any) => void;
  onCancel: () => void;
}

/** Replace the default PIN (1234) with a personal one: choose it, then enter it again. */
export default function SetPinModal({ isOpen, staff, onSuccess, onCancel }: SetPinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPin('');
    setConfirmPin('');
    setStep('enter');
    setErrorMsg(null);
  }, [isOpen]);

  const startOver = (message: string) => {
    setErrorMsg(message);
    setPin('');
    setConfirmPin('');
    setStep('enter');
  };

  const onFirstComplete = (value: string) => {
    if (value === '1234') {
      startOver('Choose a PIN other than 1234.');
      return;
    }
    setStep('confirm');
  };

  const onConfirmComplete = (value: string) => {
    if (value !== pin) startOver("PINs didn't match. Try again.");
  };

  const handleSubmit = async () => {
    if (pin.length !== 4 || confirmPin !== pin) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.post('/pos/auth/change-pin', {
        staff_id: staff?.id,
        old_pin: '1234',
        new_pin: pin,
      });
      toast.success('PIN saved');
      onSuccess(response.data.success?.data);
    } catch (err: any) {
      startOver(err.response?.data?.error?.message || 'Failed to save PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onCancel}
      size="sm"
      header={
        <div className="pt-2 px-1">
          <h2 className="text-lg font-bold text-foreground">Set your PIN</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {staff ? `For ${staff.name} · ` : ''}used to sign in at the till
          </p>
        </div>
      }
      body={
        <div className="py-3 space-y-3">
          <p className="text-sm text-center text-muted-foreground">
            {step === 'enter' ? 'Choose a 4-digit PIN' : 'Enter it again'}
          </p>
          {step === 'enter' ? (
            <PinInput
              key="enter"
              value={pin}
              onChange={(v) => {
                setPin(v);
                if (errorMsg) setErrorMsg(null);
              }}
              onComplete={onFirstComplete}
              error={!!errorMsg}
              autoFocus
            />
          ) : (
            <PinInput key="confirm" value={confirmPin} onChange={setConfirmPin} onComplete={onConfirmComplete} autoFocus />
          )}
          {errorMsg && <p className="text-[12px] text-center text-destructive">{errorMsg}</p>}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            onClick={() => (step === 'confirm' ? (setStep('enter'), setConfirmPin('')) : onCancel())}
            disabled={isSubmitting}
            className="w-full"
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || step !== 'confirm' || confirmPin.length !== 4 || confirmPin !== pin}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {isSubmitting ? 'Saving…' : 'Save PIN'}
          </Button>
        </div>
      }
    />
  );
}
