import { useEffect, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { MomoNumberField } from './MomoPrompt';
import { guessNetwork, phoneIsComplete, useMomoCharge, type Network } from './momoCharge';

interface Props {
  amount: number;
  /** The customer approved this part: it's paid with this Paystack reference */
  onPaid: (reference: string, phone: string) => void;
  /** A prompt is out (the line and the payment window stay locked until it's settled) */
  onPending: (pending: boolean) => void;
  /** Fall back to "the customer paid, I checked it" for this part */
  onManual: () => void;
}

/**
 * The MoMo part of a split payment, paid by a prompt to the customer's phone. Unlike the one-payment
 * prompt it has its own buttons, because the window's button completes the whole sale once every
 * part is paid.
 */
export default function SplitMomoPrompt({ amount, onPaid, onPending, onManual }: Props) {
  const [phone, setPhone] = useState('');
  const [picked, setPicked] = useState<Network | ''>('');
  const [otp, setOtp] = useState('');
  const { stage, message, busy, clock, send, submitOtp, reset } = useMomoCharge(onPaid);
  const network = picked || guessNetwork(phone);

  const pending = stage === 'waiting' || stage === 'otp';
  useEffect(() => onPending(pending), [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onPending(false), []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const link = 'w-full text-xs font-semibold text-muted-foreground hover:text-foreground';

  if (stage === 'form') {
    return (
      <div className="space-y-2.5">
        <MomoNumberField phone={phone} onPhone={setPhone} picked={picked} onPick={setPicked} />
        <Button
          type="button"
          onClick={sendPrompt}
          disabled={busy || !phoneIsComplete(phone) || !(amount > 0)}
          className="w-full h-10 rounded-full font-semibold gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send prompt · GHS {amount.toFixed(2)}
        </Button>
        <button type="button" onClick={onManual} className={link}>
          Customer already paid? Confirm manually
        </button>
      </div>
    );
  }

  if (stage === 'waiting') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          <p className="text-xs font-semibold flex-1">{message || `Waiting for ${phone} to approve`}</p>
          <span className="text-xs tabular-nums text-muted-foreground">{clock}</span>
        </div>
        <button type="button" onClick={cancel} className={link}>Cancel prompt</button>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold">{message}</p>
        <CustomInputTextField
          label="Code from the customer's phone"
          labelPlacement="outside"
          placeholder="e.g. 123456"
          value={otp}
          onChange={(e: any) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && otp.length >= 4 && submitOtp(otp)}
          inputProps={{ inputMode: 'numeric', autoFocus: true }}
        />
        <Button type="button" onClick={() => submitOtp(otp)} disabled={busy || otp.length < 4} className="w-full h-10 rounded-full font-semibold gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit code
        </Button>
        <button type="button" onClick={cancel} className={link}>Cancel prompt</button>
      </div>
    );
  }

  if (stage === 'failed') {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2.5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium flex-1">{message || 'Not paid'}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={cancel} className="flex-1 h-9 rounded-full text-xs font-semibold">Send again</Button>
          <Button type="button" variant="outline" onClick={onManual} className="flex-1 h-9 rounded-full text-xs font-semibold">Confirm manually</Button>
        </div>
      </div>
    );
  }

  // Paid: the line shows it (see PaymentModal)
  return null;
}
