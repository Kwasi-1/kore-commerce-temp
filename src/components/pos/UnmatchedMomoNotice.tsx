import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';

interface Charge {
  reference: string;
  amount: number;
  phone: string;
  paid_at: string | null;
  date_created: string | null;
}

/**
 * Managers: MoMo prompts the customer paid that never became a sale (e.g. approved after the cashier
 * gave up). Shown only when there are some; each is marked with how it was handled.
 */
export default function UnmatchedMomoNotice() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = () =>
    apiClient
      .get('/pos/momo/unmatched')
      .then((r) => setCharges(r.data?.success?.data?.charges || []))
      .catch(() => setCharges([]));

  useEffect(() => {
    load();
  }, []);

  const resolve = async (ref: string) => {
    const note = (notes[ref] || '').trim();
    if (!note) {
      toast.error('Say how it was handled');
      return;
    }
    setSaving(ref);
    try {
      await apiClient.post(`/pos/momo/charge/${ref}/resolve`, { note });
      toast.success('Marked as handled');
      setCharges((list) => list.filter((c) => c.reference !== ref));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't save");
    } finally {
      setSaving(null);
    }
  };

  if (charges.length === 0) return null;
  const total = charges.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3 text-left"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-sm flex-1">
          <b>{charges.length} MoMo payment{charges.length === 1 ? '' : 's'} without a sale</b>{' '}
          <span className="text-muted-foreground">(<CurrencyDisplay amount={total} showStyling={false} />). Customers paid but no sale was completed.</span>
        </span>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">Review</span>
      </button>

      <CustomModal
        isOpen={open}
        onOpenChange={() => setOpen(false)}
        size="lg"
        scrollBehavior="inside"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-3">
            <h3 className="text-lg font-bold text-foreground">MoMo payments without a sale</h3>
            <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
              The customer approved these after the sale was abandoned. Refund them or ring up the sale, then note what you did.
            </p>
          </div>
        }
        body={
          <div className="py-3 space-y-3">
            {charges.map((c) => (
              <div key={c.reference} className="rounded-xl border border-border/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{c.phone}</span>
                  <span className="font-bold tabular-nums"><CurrencyDisplay amount={c.amount} /></span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {c.paid_at ? new Date(c.paid_at).toLocaleString() : ''} · Ref {c.reference}
                </p>
                <div className="flex gap-2">
                  <input
                    value={notes[c.reference] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [c.reference]: e.target.value }))}
                    placeholder="e.g. Refunded in cash, or rang up the sale"
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
                  />
                  <Button size="sm" className="rounded-full" disabled={saving === c.reference} onClick={() => resolve(c.reference)}>
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        }
      />
    </>
  );
}
