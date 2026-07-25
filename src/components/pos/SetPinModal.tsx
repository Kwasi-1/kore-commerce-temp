import React, { useState, useRef } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Lock, ShieldCheck } from 'lucide-react';

interface SetPinModalProps {
  isOpen: boolean;
  staff: {
    id: string;
    name: string;
    role: string;
  } | null;
  onSuccess: (newPin: string) => void;
  onCancel: () => void;
}

export default function SetPinModal({ isOpen, staff, onSuccess, onCancel }: SetPinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitInput = (
    index: number,
    value: string,
    targetArr: string[],
    setTargetArr: (val: string[]) => void
  ) => {
    setErrorMsg(null);
    if (!/^[0-9]*$/.test(value)) return;

    const updated = [...targetArr];
    updated[index] = value;
    setTargetArr(updated);

    if (value !== '' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // When 4 digits entered in 'enter' step
    if (step === 'enter' && updated.every((d) => d !== '')) {
      const full = updated.join('');
      if (full === '1234') {
        setErrorMsg('Please choose a secure PIN other than default 1234');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }
      setStep('confirm');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }

    // When 4 digits entered in 'confirm' step
    if (step === 'confirm' && updated.every((d) => d !== '')) {
      const firstPin = pin.join('');
      const secondPin = updated.join('');
      if (firstPin !== secondPin) {
        setErrorMsg('PINs do not match. Please try again.');
        setStep('enter');
        setPin(['', '', '', '']);
        setConfirmPin(['', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    targetArr: string[]
  ) => {
    if (e.key === 'Backspace' && !targetArr[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const firstPin = pin.join('');
    const secondPin = confirmPin.join('');

    if (firstPin.length !== 4 || secondPin.length !== 4) {
      setErrorMsg('Please enter a 4-digit PIN.');
      return;
    }

    if (firstPin !== secondPin) {
      setErrorMsg('PINs do not match. Try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.post('/pos/auth/change-pin', {
        staff_id: staff?.id,
        old_pin: '1234',
        new_pin: firstPin,
      });

      const resData = response.data.success?.data;
      toast.success('Personal 4-digit PIN saved successfully!');
      onSuccess(resData);
    } catch (err: any) {
      console.error('Save PIN error:', err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPinArr = step === 'enter' ? pin : confirmPin;
  const setArrFn = step === 'enter' ? setPin : setConfirmPin;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onCancel}
      size="md"
      header={
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Set Your Security PIN</h3>
            <p className="text-xs font-semibold text-muted-foreground">
              {staff ? `Setting 4-digit PIN for ${staff.name}` : 'Create a 4-digit personal PIN'}
            </p>
          </div>
        </div>
      }
      body={
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center space-y-1">
            <h4 className="text-base font-bold text-foreground">
              {step === 'enter' ? 'Choose a 4-Digit Personal PIN' : 'Confirm Your 4-Digit PIN'}
            </h4>
            <p className="text-xs text-muted-foreground font-medium max-w-xs">
              {step === 'enter'
                ? 'Replace default 1234 with a private PIN for quick terminal unlocks.'
                : 'Re-enter your 4-digit PIN to confirm.'}
            </p>
          </div>

          {/* 4-digit input boxes */}
          <div className="flex gap-3 my-2">
            {currentPinArr.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitInput(i, e.target.value, currentPinArr, setArrFn)}
                onKeyDown={(e) => handleKeyDown(i, e, currentPinArr)}
                className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border transition-all ${
                  errorMsg
                    ? 'border-destructive bg-destructive/5 text-destructive'
                    : 'border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none'
                }`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-destructive animate-pulse text-center">
              {errorMsg}
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex justify-between w-full pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 'confirm') {
                setStep('enter');
                setConfirmPin(['', '', '', '']);
              } else {
                onCancel();
              }
            }}
            className="rounded-full font-bold px-6"
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || pin.join('').length !== 4 || confirmPin.join('').length !== 4}
            className="rounded-full font-bold px-8 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            {isSubmitting ? 'Saving PIN...' : 'Save & Continue'}
          </Button>
        </div>
      }
    />
  );
}
