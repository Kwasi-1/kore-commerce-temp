import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { formatPhoneNumber } from '@/hooks';
import { useCartStore } from '@/store/cartStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { posTotals } from '@/utils/posTotals';
import { cartFromSaved, claimCharge, type RecoverableCharge } from './momoRecovery';

const POLL_MS = 30_000;

interface Props {
  /** Open the payment window (the restored payment is offered there, held for this cashier) */
  onOpenPayment: () => void;
  /** The register can't take sales right now (e.g. no shift open) */
  blockedReason?: string | null;
}

/**
 * At the register: MoMo payments that were paid but never became a sale and that this cashier can
 * ring up (their own from the last 30 minutes, or ones a manager sent them). "Restore sale" holds
 * the payment for them, puts the items back in the cart and opens the payment window with it.
 */
export default function RestoreMomoBanner({ onOpenPayment, blockedReason }: Props) {
  const [charges, setCharges] = useState<RecoverableCharge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const momoPromptsReady = useFeaturesStore((s) => s.momo_prompts_ready);
  const { isOnline } = useNetworkStatus();

  const load = useCallback(() => {
    if (!isOnline || !momoPromptsReady) {
      setCharges([]);
      return;
    }
    apiClient.get('/pos/momo/recoverable').then((r) => {
      // Ones in sales still waiting to sync from this till are already used
      const queued = new Set<string>();
      useOfflineQueueStore.getState().queue
        .filter((t) => t.syncStatus === 'pending' || t.syncStatus === 'syncing')
        .forEach((t: any) => {
          if (t.payload?.paystackReference) queued.add(t.payload.paystackReference);
          (t.payload?.payments || []).forEach((p: any) => p.paystackReference && queued.add(p.paystackReference));
        });
      setCharges((r.data?.success?.data?.charges || []).filter((c: RecoverableCharge) => !queued.has(c.reference)));
    }).catch(() => {});
  }, [isOnline, momoPromptsReady]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('pos:transaction-completed', load);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pos:transaction-completed', load);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const restore = async (c: RecoverableCharge) => {
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    setBusy(c.reference);
    const ok = c.claimed_by_me || (await claimCharge(c.reference));
    setBusy(null);
    if (!ok) {
      load();
      return;
    }
    const cart = useCartStore.getState();
    // Whatever is in the cart now is kept aside, not lost
    if (cart.items.length > 0) {
      cart.saveTransaction('Set aside for a MoMo sale');
      toast('The cart you had is saved under Saved carts');
    }
    const items = cartFromSaved(c.cart || []);
    cart.replaceItems(items);
    // What the customer would pay now (tax is added on top when it's turned on)
    const restoredTotal = posTotals(useCartStore.getState().subtotal, 0, useFeaturesStore.getState().posSettings).total;
    if (Math.abs(restoredTotal - c.amount) >= 0.01) {
      toast(`Prices changed since then: the cart is now GHS ${restoredTotal.toFixed(2)}, the MoMo payment GHS ${c.amount.toFixed(2)}`, { duration: 6000 });
    }
    onOpenPayment();
  };

  if (charges.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      {charges.map((c) => {
        const heldByOther = !!c.claimed_by_name && !c.claimed_by_me;
        const hasCart = (c.cart || []).length > 0;
        return (
          <div key={c.reference} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 flex items-center gap-3">
            <History className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <b>MoMo payment to ring up:</b> GHS {c.amount.toFixed(2)} from {formatPhoneNumber(c.phone)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.released ? `Sent by a manager${c.staff_name ? ` · taken by ${c.staff_name}` : ''}. ` : 'Paid but the sale wasn’t completed. '}
                {heldByOther
                  ? `${c.claimed_by_name} is ringing it up.`
                  : hasCart
                  ? `${c.cart!.length} item${c.cart!.length === 1 ? '' : 's'} saved with it.`
                  : 'No items were saved with it: add them to the cart, then use it in the payment window.'}
              </p>
            </div>
            {!heldByOther && hasCart && (
              <button
                type="button"
                onClick={() => restore(c)}
                disabled={busy === c.reference}
                className="h-8 px-3 rounded-full bg-foreground text-background text-xs font-semibold shrink-0 hover:bg-foreground/90 inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {busy === c.reference && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Restore sale
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
