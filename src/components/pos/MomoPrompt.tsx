import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { CustomInputTextField } from '@/components/shared/text-field';
import { NETWORKS, guessNetwork, phoneIsComplete, useMomoCharge, type Network } from './momoCharge';

/** What the payment window's bottom button (and the small link under it) should do right now. */
export interface MomoAction {
  label: string;
  onClick?: () => void;
  disabled: boolean;
  loading: boolean;
  link?: { label: string; onClick: () => void };
  /** A prompt is out: keep the payment tabs and the close button locked */
  locked: boolean;
}

interface Props {
  amount: number;
  /** The customer approved: complete the sale with this Paystack reference */
  onPaid: (reference: string, phone: string) => void;
  /** Fall back to "the customer paid, I checked it" */
  onManual: () => void;
  /** Called whenever the bottom button should change */
  onAction: (action: MomoAction) => void;
}

/** The customer's MoMo number, with the network guessed from it ("MTN · Change") or picked. */
export function MomoNumberField({ phone, onPhone, picked, onPick, autoFocus, label = 'Customer MoMo number' }: {
  phone: string;
  onPhone: (phone: string) => void;
  picked: Network | '';
  onPick: (network: Network) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  const [showNetworks, setShowNetworks] = useState(false);
  const guessed = guessNetwork(phone);
  const network = picked || guessed;
  const pills = showNetworks || !guessed || (!!picked && picked !== guessed);
  return (
    <div className="space-y-3">
      <CustomInputTextField
        label={label}
        labelPlacement="outside"
        type="tel"
        placeholder="e.g. 0241234567"
        value={phone}
        onChange={(e: any) => onPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))}
        inputProps={{ inputMode: 'tel', autoFocus }}
      />
      {phoneIsComplete(phone) && (
        pills ? (
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">Network</span>
            <div className="flex gap-1.5">
              {NETWORKS.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onPick(n.id)}
                  className={cn(
                    'flex-1 h-9 rounded-full border text-xs font-semibold transition-colors',
                    network === n.id ? 'border-foreground ring-foreground' : 'border-border hover:bg-muted',
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground !font-sans">
            Network: <b className="text-foreground">{NETWORKS.find((n) => n.id === network)?.label}</b>
            {' · '}
            <button type="button" onClick={() => setShowNetworks(true)} className="font-semibold text-foreground hover:underline">
              Change
            </button>
          </p>
        )
      )}
    </div>
  );
}

/**
 * Sends a MoMo payment prompt to the customer's phone and waits for them to approve it. The sale is
 * completed only once Paystack confirms the payment. The only action button is the payment
 * window's own; this reports what it should do through onAction.
 */
export default function MomoPrompt({ amount, onPaid, onManual, onAction }: Props) {
  const [phone, setPhone] = useState('');
  // Chosen by the cashier; otherwise the guess from the number is used
  const [picked, setPicked] = useState<Network | ''>('');
  const [otp, setOtp] = useState('');
  const { stage, message, busy, clock, send, submitOtp, reset } = useMomoCharge(onPaid);

  const network: Network | null = picked || guessNetwork(phone);
  const phoneComplete = phoneIsComplete(phone);

  const sendPrompt = () => {
    if (!network) {
      toast.error("Choose the customer's network");
      return;
    }
    send(amount, phone, network);
  };
  const cancel = () => {
    reset();
    setOtp('');
  };

  // Tell the payment window what its bottom button does now
  const amountText = `GHS ${amount.toFixed(2)}`;
  useEffect(() => {
    const manualLink = { label: 'Customer already paid? Confirm manually', onClick: onManual };
    if (stage === 'form') {
      onAction({ label: `Send prompt · ${amountText}`, onClick: sendPrompt, disabled: busy || !phoneComplete, loading: busy, link: manualLink, locked: false });
    } else if (stage === 'waiting') {
      onAction({ label: `Waiting for approval… ${clock}`, disabled: true, loading: true, link: { label: 'Cancel prompt', onClick: cancel }, locked: true });
    } else if (stage === 'otp') {
      onAction({ label: 'Submit code', onClick: () => submitOtp(otp), disabled: busy || otp.length < 4, loading: busy, link: { label: 'Cancel prompt', onClick: cancel }, locked: true });
    } else if (stage === 'failed') {
      onAction({ label: 'Send again', onClick: cancel, disabled: false, loading: false, link: { label: 'Confirm manually instead', onClick: onManual }, locked: false });
    } else {
      onAction({ label: 'Completing sale…', disabled: true, loading: true, locked: true });
    }
  }, [stage, busy, phoneComplete, otp, clock, amountText, network, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (stage === 'form') {
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <MomoNumberField phone={phone} onPhone={setPhone} picked={picked} onPick={setPicked} autoFocus />
        <p className="text-[11px] text-muted-foreground">The customer approves the prompt on their phone with their MoMo PIN.</p>
      </div>
    );
  }

  if (stage === 'waiting') {
    return (
      <div className="rounded-xl border border-border/70 p-5 text-center space-y-2 animate-in fade-in">
        <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
        <p className="font-bold">Waiting for the customer to approve</p>
        <p className="text-xs text-muted-foreground">{message || `A prompt was sent to ${phone}. They approve it with their MoMo PIN.`}</p>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div className="rounded-xl border border-border/70 p-4 space-y-3 animate-in fade-in">
        <p className="text-sm font-semibold">{message}</p>
        <CustomInputTextField
          label="Code from the customer's phone"
          labelPlacement="outside"
          placeholder="e.g. 123456"
          value={otp}
          onChange={(e: any) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && otp.length >= 4 && submitOtp(otp)}
          inputProps={{ inputMode: 'numeric', autoFocus: true }}
        />
      </div>
    );
  }

  if (stage === 'paid') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-2 animate-in fade-in">
        <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-600" />
        <p className="font-bold text-emerald-700 dark:text-emerald-400">Payment received</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-2 animate-in fade-in">
      <XCircle className="h-7 w-7 mx-auto text-destructive" />
      <p className="font-bold text-destructive">Not paid</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
