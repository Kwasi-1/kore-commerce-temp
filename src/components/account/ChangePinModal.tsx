import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import PinInput from '@/components/pos/PinInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'confirm';

const PROMPTS: Record<Step, string> = {
  current: 'Enter your current PIN',
  new: 'Choose a new 4-digit PIN',
  confirm: 'Enter the new PIN again',
};

/** Change your own till PIN: current PIN, then the new one twice. */
export default function ChangePinModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = (to: Step = 'current', message: string | null = null) => {
    setStep(to);
    if (to === 'current') setCurrent('');
    setNext('');
    setConfirm('');
    setError(message);
  };

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post('/auth/staff/change-pin', { current_pin: current, new_pin: next });
      toast.success('PIN changed');
      onClose();
    } catch (e: any) {
      const status = e?.response?.data?.error?.status;
      const message = e?.response?.data?.error?.message || 'Failed to change PIN';
      // A wrong current PIN sends them back to the start; anything else back to choosing a new one
      reset(status === 'INVALID_PIN' || status === 'LOCKED' ? 'current' : 'new', message);
    } finally {
      setSaving(false);
    }
  };

  const value = step === 'current' ? current : step === 'new' ? next : confirm;
  const setValue = step === 'current' ? setCurrent : step === 'new' ? setNext : setConfirm;

  const onComplete = (pin: string) => {
    if (step === 'current') setStep('new');
    else if (step === 'new') {
      if (pin === '1234') reset('new', 'Choose a PIN other than 1234.');
      else setStep('confirm');
    } else if (pin !== next) {
      reset('new', "PINs didn't match. Try again.");
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => !saving && onClose()}
      size="sm"
      header={
        <div className="pt-2 px-1">
          <h2 className="text-lg font-bold text-foreground">Change PIN</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Used to sign in at the till</p>
        </div>
      }
      body={
        <div className="py-3 space-y-3">
          <p className="text-sm text-center text-muted-foreground">{PROMPTS[step]}</p>
          <PinInput
            key={step}
            value={value}
            onChange={(v) => {
              setValue(v);
              if (error) setError(null);
            }}
            onComplete={onComplete}
            error={!!error}
            autoFocus
          />
          {error && <p className="text-[12px] text-center text-destructive">{error}</p>}
          {step === 'current' && (
            <p className="text-[11px] text-center text-muted-foreground">Forgot it? A manager can reset it on the Staff page.</p>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            onClick={() => (step === 'current' ? onClose() : reset(step === 'confirm' ? 'new' : 'current'))}
            disabled={saving}
            className="w-full"
          >
            {step === 'current' ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={save}
            disabled={saving || step !== 'confirm' || confirm.length !== 4 || confirm !== next}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {saving ? 'Saving…' : 'Save PIN'}
          </Button>
        </div>
      }
    />
  );
}
