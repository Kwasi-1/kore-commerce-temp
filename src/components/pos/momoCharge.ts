import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';

export const NETWORKS = [
  { id: 'mtn', label: 'MTN' },
  { id: 'vod', label: 'Telecel' },
  { id: 'tgo', label: 'AirtelTigo' },
] as const;
export type Network = (typeof NETWORKS)[number]['id'];
const GIVE_UP_AFTER_MS = 3 * 60_000;
const POLL_MS = 3_000;

export type MomoStage = 'form' | 'waiting' | 'otp' | 'paid' | 'failed';

/** Guess the network from the number's prefix (ported numbers can be wrong, so it can be changed). */
export const guessNetwork = (phone: string): Network | null => {
  const d = phone.replace(/\D/g, '').replace(/^233/, '0');
  const p = d.slice(0, 3);
  if (['024', '054', '055', '059', '025', '053'].includes(p)) return 'mtn';
  if (['020', '050'].includes(p)) return 'vod';
  if (['026', '056', '027', '057'].includes(p)) return 'tgo';
  return null;
};

export const phoneIsComplete = (phone: string) => phone.replace(/\D/g, '').replace(/^233/, '0').length >= 10;

/**
 * One MoMo payment prompt: send it, wait for the customer to approve (asking the server every few
 * seconds, giving up after 3 minutes), take an OTP when the network asks for one, or cancel it.
 * Unmounting while it's waiting cancels the prompt (a late approval then shows under "MoMo paid
 * without a sale" for a manager).
 */
export function useMomoCharge(onPaid: (reference: string, phone: string) => void) {
  const [stage, setStage] = useState<MomoStage>('form');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const refRef = useRef<string | null>(null);
  const startedAt = useRef(0);
  const stageRef = useRef<MomoStage>('form');
  stageRef.current = stage;
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const cancelPending = () => {
    const ref = refRef.current;
    if (ref && (stageRef.current === 'waiting' || stageRef.current === 'otp')) {
      apiClient.post(`/pos/momo/charge/${ref}/cancel`).catch(() => {});
    }
  };

  useEffect(() => () => cancelPending(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCharge = (charge: any) => {
    if (!charge) return;
    if (charge.status === 'success') {
      setStage('paid');
      onPaidRef.current(charge.reference, charge.phone);
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

  const send = async (amount: number, phone: string, provider: Network) => {
    setBusy(true);
    try {
      const r = await apiClient.post('/pos/momo/charge', { amount, phone, provider });
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

  const submitOtp = async (otp: string) => {
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
    setMessage('');
  };

  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  return { stage, message, busy, clock, send, submitOtp, reset };
}
