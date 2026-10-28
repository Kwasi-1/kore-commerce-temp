import { History } from 'lucide-react';
import { formatPhoneNumber } from '@/hooks';

export interface RecoverableCharge {
  reference: string;
  amount: number;
  phone: string;
  paid_at: string | null;
}

interface Props {
  charges: RecoverableCharge[];
  /** Can this payment go on this sale? (A MoMo payment can't be more than what's left: only cash
   * gives change. Without split payments it has to match the total.) */
  canUse: (charge: RecoverableCharge) => boolean;
  onUse: (charge: RecoverableCharge) => void;
}

const ago = (iso: string | null) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return mins < 1 ? 'just now' : `${mins} min ago`;
};

/**
 * MoMo prompts this cashier got paid recently that never made it onto a sale (e.g. the payment
 * window was closed before the sale was completed), offered for this sale.
 */
export default function RecoverableMomo({ charges, canUse, onUse }: Props) {
  if (!charges.length) return null;
  return (
    <div className="space-y-2">
      {charges.map((c) => {
        const usable = canUse(c);
        return (
          <div key={c.reference} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
            <History className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                GHS {c.amount.toFixed(2)} MoMo from {formatPhoneNumber(c.phone)}, paid {ago(c.paid_at)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {usable ? 'It isn’t on a sale yet. Use it for this one?' : 'It doesn’t fit this sale, so a manager has to sort it out'}
              </p>
            </div>
            {usable && (
              <button
                type="button"
                onClick={() => onUse(c)}
                className="h-8 px-3 rounded-full bg-foreground text-background text-xs font-semibold shrink-0 hover:bg-foreground/90"
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
