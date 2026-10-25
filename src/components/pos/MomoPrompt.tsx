import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { cn } from '@/lib/utils';

interface Props {
  amount: number;
  /** The customer approved: complete the sale with this Paystack reference */
  onPaid: (reference: string, phone: string) => void;
  /** Fall back to "the customer paid, I checked it" */
  onManual: () => void;
}

const NETWORKS = [
  { id: 'mtn', label: 'MTN' },
  { id: 'vod', label: 'Telecel' },
  { id: 'tgo', label: 'AirtelTigo' },
] as const;
const GIVE_UP_AFTER_MS = 3 * 60_000;
const POLL_MS = 3_000;

type Stage = 'form' | 'waiting' | 'otp' | 'paid' | 'failed';

/** Guess the network from the number's prefix (the cashier can change it). */
const guessNetwork = (phone: string): 'mtn' | 'vod' | 'tgo' | null => {
  const d = phone.replace(/\D/g, '').replace(/^233/, '0');
  const p = d.slice(0, 3);
  if (['024', '054', '055', '059', '025', '053'].includes(p)) return 'mtn';
  if (['020', '050'].includes(p)) return 'vod';
  if (['026', '056', '027', '057'].includes(p)) return 'tgo';
  return null;
};

/**
 * Sends a MoMo payment prompt to the customer's phone and waits for them to approve it. The sale is
 * completed only once Paystack confirms the payment. Leaving while it's waiting cancels the prompt
 * (a late approval then shows under "MoMo paid without a sale" for a manager).
 */
export default function MomoPrompt({ amount, onPaid, onManual }: Props) {
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'vod' | 'tgo' | ''>('');
  const [stage, setStage] = useState<Stage>('form');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const refRef = useRef<string | null>(null);
  const startedAt = useRef(0);
  const stageRef = useRef<Stage>('form');
  stageRef.current = stage;

  const cancelPending = () => {
    const ref = refRef.current;
    if (ref && (stageRef.current === 'waiting' || stageRef.current === 'otp')) {
      apiClient.post(`/pos/momo/charge/${ref}/cancel`).catch(() => {});
    }
  };

  // Leaving (window closed, method changed) while it's waiting cancels the prompt
  useEffect(() => () => cancelPending(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCharge = (charge: any) => {
    if (!charge) return;
    if (charge.status === 'success') {
      setStage('paid');
      onPaid(charge.reference, charge.phone);
    } else if (charge.status === 'send_otp') {
      setStage('otp');
      setMessage(charge.display_text || 'Enter the code the customer received');
    } else if (charge.status === 'failed' || charge.status === 'cancelled') {
      setStage('failed');
      setMessage(charge.display_text || 'The customer declined or the prompt failed');
    } else {
      setStage('waiting');
      if (charge.display_text) setMessage(charge.display_text);
    }
  };

  // While waiting: ask the server every few seconds, and give up after 3 minutes
  useEffect(() => {
    if (stage !== 'waiting') return;
    const timer = window.setInterval(async () => {
      const elapsed = Date.now() - startedAt.current;
      setSecondsLeft(Math.max(0, Math.ceil((GIVE_UP_AFTER_MS - elapsed) / 1000)));
      if (elapsed > GIVE_UP_AFTER_MS) {
        cancelPending();
        setStage('failed');
        setMessage('The customer didn’t approve in time');
        return;
      }
      try {
        const r = await apiClient.get(`/pos/momo/charge/${refRef.current}`);
        if (stageRef.current === 'waiting') applyCharge(r.data?.success?.data?.charge);
      } catch {
        // connection blip: keep waiting, the next check may get through
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const net = network || guessNetwork(phone);
    if (!net) {
      toast.error("Choose the customer's network");
      return;
    }
    setBusy(true);
    try {
      const r = await apiClient.post('/pos/momo/charge', { amount, phone, provider: net });
      const charge = r.data?.success?.data?.charge;
      refRef.current = charge?.reference || null;
      startedAt.current = Date.now();
      setSecondsLeft(GIVE_UP_AFTER_MS / 1000);
      setMessage('');
      applyCharge(charge);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't send the prompt");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post(`/pos/momo/charge/${refRef.current}/otp`, { otp });
      startedAt.current = Date.now();
      applyCharge(r.data?.success?.data?.charge);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'That code didn’t work');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    cancelPending();
    refRef.current = null;
    setStage('form');
    setOtp('');
    setMessage('');
  };

  if (stage === 'form') {
    const guessed = guessNetwork(phone);
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">Customer MoMo number</span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="e.g. 0241234567"
            value={phone}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d+]/g, '').slice(0, 13);
              setPhone(v);
              if (!network || network === guessNetwork(phone)) setNetwork(guessNetwork(v) || '');
            }}
            className="w-full h-14 px-4 text-lg font-bold rounded-xl bg-background border border-border focus:outline-none focus:border-foreground/40"
          />
        </label>
        <div className="flex gap-1.5">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setNetwork(n.id)}
              className={cn(
                'flex-1 h-9 rounded-full border text-xs font-semibold transition-colors',
                (network || guessed) === n.id ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted',
              )}
            >
              {n.label}
            </button>
          ))}
        </div>
        <Button className="w-full h-12 rounded-full font-bold gap-2" onClick={send} disabled={busy || phone.replace(/\D/g, '').length < 10}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          Send prompt for <CurrencyDisplay amount={amount} showStyling={false} />
        </Button>
        <button type="button" onClick={onManual} className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground">
          Customer already paid? Confirm manually instead
        </button>
      </div>
    );
  }

  if (stage === 'waiting') {
    return (
      <div className="rounded-xl border border-border/70 p-5 text-center space-y-3 animate-in fade-in">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <div>
          <p className="font-bold">Waiting for the customer to approve</p>
          <p className="text-xs text-muted-foreground mt-1">{message || `A prompt was sent to ${phone}. They approve it with their MoMo PIN.`}</p>
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          Gives up in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </p>
        <Button variant="outline" className="rounded-full" onClick={reset}>Cancel</Button>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div className="rounded-xl border border-border/70 p-4 space-y-3 animate-in fade-in">
        <p className="text-sm font-semibold">{message}</p>
        <input
          inputMode="numeric"
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="Code from the customer's phone"
          className="w-full h-12 px-4 text-lg font-bold tracking-widest rounded-xl bg-background border border-border focus:outline-none"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={reset} disabled={busy}>Cancel</Button>
          <Button className="flex-1 rounded-full" onClick={submitOtp} disabled={busy || otp.length < 4}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit code'}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'paid') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-2 animate-in fade-in">
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
        <p className="font-bold text-emerald-700 dark:text-emerald-400">Payment received</p>
        <p className="text-xs text-muted-foreground">Completing the sale…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3 animate-in fade-in">
      <XCircle className="h-8 w-8 mx-auto text-destructive" />
      <div>
        <p className="font-bold text-destructive">Not paid</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-full" onClick={reset}>Try again</Button>
        <Button variant="outline" className="flex-1 rounded-full" onClick={onManual}>Confirm manually</Button>
      </div>
    </div>
  );
}
