import { History } from 'lucide-react';
import { formatPhoneNumber } from '@/hooks';
import type { RecoverableCharge } from './momoRecovery';

export type { RecoverableCharge };

interface Props {
  charges: RecoverableCharge[];
  /** Can this payment go on this sale? (A MoMo payment can't be more than what's left: only cash
   * gives change. Without split payments it has to match the total.) */
  canUse: (charge: RecoverableCharge) => boolean;
  onUse: (charge: RecoverableCharge) => void;
  /** A "Use it" is being claimed with the server */
  busyRef?: string | null;
}

const ago = (iso: string | null) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  return mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
};

/**
 * MoMo prompts that were paid but never made it onto a sale (e.g. the payment window was closed
 * before the sale was completed), offered for this sale: the cashier's own from the last 30 minutes,
 * or ones a manager sent to them.
 */
export default function RecoverableMomo({ charges, canUse, onUse, busyRef }: Props) {
  if (!charges.length) return null;
  return (
    <div className="space-y-2">
      {charges.map((c) => {
        const heldByOther = !!c.claimed_by_name && !c.claimed_by_me;
        const usable = !heldByOther && canUse(c);
        return (
          <div key={c.reference} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
            <History className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                GHS {c.amount.toFixed(2)} MoMo from {formatPhoneNumber(c.phone)}, paid {ago(c.paid_at)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.released ? `Sent by a manager${c.staff_name ? `, taken by ${c.staff_name}` : ''}. ` : ''}
                {heldByOther
                  ? `${c.claimed_by_name} is ringing this up.`
                  : usable
                  ? 'It isn’t on a sale yet. Use it for this one?'
                  : 'It doesn’t fit this sale, so a manager has to sort it out'}
              </p>
            </div>
            {usable && (
              <button
                type="button"
                onClick={() => onUse(c)}
                disabled={busyRef === c.reference}
                className="h-8 px-3 rounded-full bg-foreground text-background text-xs font-semibold shrink-0 hover:bg-foreground/90 disabled:opacity-60"
              >
                Use it
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
