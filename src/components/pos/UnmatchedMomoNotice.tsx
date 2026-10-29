import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay, formatPhoneNumber } from '@/hooks';
import { cn } from '@/lib/utils';

interface Charge {
  reference: string;
  amount: number;
  phone: string;
  paid_at: string | null;
  date_created: string | null;
  staff_name: string | null;
  /** The cashier who took it can still use it at the till until then */
  cashier_can_use_until: string | null;
  /** A manager let any cashier use it at the till */
  released: boolean;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
}

const ago = (iso: string | null) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};
const minsLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

/**
 * Managers: MoMo prompts the customer paid that never became a sale (e.g. the payment window was
 * closed, or the customer approved after the cashier gave up). Each one is either released to the
 * tills so the sale can be rung up with it, or sorted out another way (e.g. refunded) and noted.
 * Money only: no products were sold, so nothing goes to Returns.
 */
export default function UnmatchedMomoNotice() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [history, setHistory] = useState<Charge[] | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = () =>
    apiClient
      .get('/pos/momo/unmatched')
      .then((r) => setCharges(r.data?.success?.data?.charges || []))
      .catch(() => setCharges([]));
  const loadHistory = () =>
    apiClient
      .get('/pos/momo/unmatched', { params: { resolved: 1 } })
      .then((r) => setHistory(r.data?.success?.data?.charges || []))
      .catch(() => setHistory([]));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open && tab === 'done') loadHistory();
  }, [open, tab]);

  const resolve = async (ref: string) => {
    const note = (notes[ref] || '').trim();
    if (!note) {
      toast.error('Say how it was handled');
      return;
    }
    setSaving(ref);
    try {
      await apiClient.post(`/pos/momo/charge/${ref}/resolve`, { note });
      toast.success('Marked as sorted out');
      setCharges((list) => list.filter((c) => c.reference !== ref));
      setHistory(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't save");
    } finally {
      setSaving(null);
    }
  };

  const release = async (ref: string) => {
    setSaving(ref);
    try {
      await apiClient.post(`/pos/momo/charge/${ref}/release`);
      toast.success('Any cashier can now use it: it shows when they open the payment window');
      setCharges((list) => list.map((c) => (c.reference === ref ? { ...c, released: true, cashier_can_use_until: null } : c)));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't release it");
    } finally {
      setSaving(null);
    }
  };

  if (charges.length === 0) return null;
  const total = charges.reduce((s, c) => s + c.amount, 0);

  const renderOpen = (c: Charge) => (
    <div key={c.reference} className="rounded-xl border border-border/70 p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{formatPhoneNumber(c.phone)}</p>
          <p className="text-[11px] text-muted-foreground">
            Paid {ago(c.paid_at)}{c.staff_name ? ` · taken by ${c.staff_name}` : ''} · {timeOf(c.paid_at)}
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums shrink-0"><CurrencyDisplay amount={c.amount} /></span>
      </div>

      {c.cashier_can_use_until && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {c.staff_name || 'The cashier'} can still use it at the till for {minsLeft(c.cashier_can_use_until)} min. Check before refunding.
        </p>
      )}
      {c.released && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
          <Store className="h-3.5 w-3.5 shrink-0" />
          Released to the tills: any cashier is offered it when they open the payment window.
        </p>
      )}

      {!c.released && (
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full"
          disabled={saving === c.reference}
          onClick={() => release(c.reference)}
        >
          Use at a till (ring up the sale)
        </Button>
      )}
      <div className="flex gap-2">
        <input
          value={notes[c.reference] || ''}
          onChange={(e) => setNotes((n) => ({ ...n, [c.reference]: e.target.value }))}
          placeholder="Or note how it was sorted out, e.g. Refunded to their MoMo"
          className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
        />
        <Button size="sm" className="rounded-full" disabled={saving === c.reference} onClick={() => resolve(c.reference)}>
          Done
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/70 truncate">Ref {c.reference}</p>
    </div>
  );

  const renderDone = (c: Charge) => (
    <div key={c.reference} className="rounded-xl border border-border/70 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{formatPhoneNumber(c.phone)}</span>
        <span className="font-bold tabular-nums"><CurrencyDisplay amount={c.amount} /></span>
      </div>
      <p className="text-xs text-foreground">“{c.resolution_note}”</p>
      <p className="text-[11px] text-muted-foreground">
        {c.resolved_by_name ? `${c.resolved_by_name} · ` : ''}{timeOf(c.resolved_at)}
        {c.staff_name ? ` · taken by ${c.staff_name}` : ''}
      </p>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTab('open');
          setOpen(true);
        }}
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
          <div className="pt-2 px-1 border-b border-border/50 pb-3 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">MoMo payments without a sale</h3>
              <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
                The customer paid but the sale was never completed. Ring up the sale with it at a till, or sort it out
                (e.g. refund it) and note what you did. No products were sold, so nothing goes to Returns.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
              {([['open', `To sort out (${charges.length})`], ['done', 'Sorted out']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'h-8 px-4 rounded-full text-xs font-semibold transition-colors',
                    tab === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
        body={
          <div className="py-3 space-y-3">
            {tab === 'open' && charges.map(renderOpen)}
            {tab === 'done' && history === null && <p className="text-xs text-muted-foreground">Loading…</p>}
            {tab === 'done' && history?.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing sorted out in the last 30 days.</p>
            )}
            {tab === 'done' && history?.map(renderDone)}
          </div>
        }
      />
    </>
  );
}
