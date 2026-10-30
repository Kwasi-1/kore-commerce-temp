import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay, formatPhoneNumber } from '@/hooks';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Charge {
  reference: string;
  amount: number;
  phone: string;
  paid_at: string | null;
  date_created: string | null;
  staff_id: string | null;
  staff_name: string | null;
  /** Who it was sent to, to ring up the sale */
  released_to: string[];
  released_to_names: string[];
  /** Someone is ringing it up right now */
  claimed_by_name: string | null;
  has_cart: boolean;
  /** The cashier who took it can still use it at the till until then */
  cashier_can_use_until: string | null;
  /** Sent to cashiers to ring up the sale */
  released: boolean;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
  refund_txn_id: string | null;
  // History only
  outcome?: 'sale' | 'cash_refund' | 'momo_refund' | 'other';
  receipt_number?: string | null;
  completed_by_name?: string | null;
  completed_at?: string | null;
  can_reopen?: boolean;
}

interface Drawer {
  shift_id: string;
  cashier_name: string;
  mine: boolean;
}

type Mode = 'send' | 'refund' | 'other';

const ago = (iso: string | null) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};
const minsLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
const timeOf = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

const pill = (on: boolean) => cn(
  'h-8 px-3 rounded-full border text-xs font-semibold transition-colors',
  on ? 'border-foreground/70 border-2' : 'border-border hover:bg-muted',
);

/**
 * Managers: MoMo prompts the customer paid that never became a sale (e.g. the payment window was
 * closed, or the customer approved after the cashier gave up). Each one is sent to a cashier to
 * complete the sale, refunded (in cash from a drawer, or to their MoMo), or noted as handled another
 * way. Money only: no products were sold, so nothing goes to Returns.
 */
export default function UnmatchedMomoNotice() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [history, setHistory] = useState<Charge[] | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [saving, setSaving] = useState<string | null>(null);
  const me = useAuthStore((s) => s.staffUser);
  // The one action open on a payment (send / refund / note)
  const [active, setActive] = useState<{ ref: string; mode: Mode } | null>(null);
  // Send to a cashier: who can ring up the sale (default: the cashier who took it, and you)
  const [staffList, setStaffList] = useState<{ id: string; name: string }[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  // Refund
  const [refundKind, setRefundKind] = useState<'cash_refund' | 'momo_refund'>('cash_refund');
  const [drawers, setDrawers] = useState<Drawer[] | null>(null);
  const [drawer, setDrawer] = useState('');
  const [txnId, setTxnId] = useState('');
  const [note, setNote] = useState('');

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

  const errorOf = (err: any, fallback: string) => err?.response?.data?.error?.message || fallback;

  const startSend = (c: Charge) => {
    setActive({ ref: c.reference, mode: 'send' });
    setChosen(new Set(c.released ? c.released_to : [c.staff_id, me?.id].filter(Boolean) as string[]));
    if (!staffList) {
      apiClient.get('/tenant/staff', { params: { per_page: 100 } }).then((r) => {
        const staff = r.data?.success?.data?.staff || [];
        setStaffList(staff.filter((s: any) => s.is_active !== false).map((s: any) => ({ id: s.id, name: s.name })));
      }).catch(() => setStaffList([]));
    }
  };

  const startRefund = (c: Charge) => {
    setActive({ ref: c.reference, mode: 'refund' });
    setTxnId('');
    setDrawers(null);
    apiClient.get('/pos/momo/refund-drawers').then((r) => {
      const list: Drawer[] = r.data?.success?.data?.drawers || [];
      setDrawers(list);
      setDrawer(list[0]?.shift_id || '');
      setRefundKind(list.length ? 'cash_refund' : 'momo_refund');
    }).catch(() => setDrawers([]));
  };

  const startNote = (c: Charge) => {
    setActive({ ref: c.reference, mode: 'other' });
    setNote('');
  };

  const send = async (ref: string) => {
    setSaving(ref);
    try {
      const r = await apiClient.post(`/pos/momo/charge/${ref}/release`, { staff_ids: Array.from(chosen) });
      const names = (staffList || []).filter((s) => chosen.has(s.id)).map((s) => s.name);
      toast.success('Sent: it shows on their register to restore the sale');
      setActive(null);
      setCharges((list) => list.map((c) => (c.reference === ref
        ? { ...c, ...r.data?.success?.data?.charge, released: true, cashier_can_use_until: null, released_to: Array.from(chosen), released_to_names: names }
        : c)));
    } catch (err: any) {
      toast.error(errorOf(err, "Couldn't send it"));
    } finally {
      setSaving(null);
    }
  };

  const resolve = async (ref: string, body: Record<string, unknown>, done: string) => {
    setSaving(ref);
    try {
      await apiClient.post(`/pos/momo/charge/${ref}/resolve`, body);
      toast.success(done);
      setActive(null);
      setCharges((list) => list.filter((c) => c.reference !== ref));
      setHistory(null);
    } catch (err: any) {
      toast.error(errorOf(err, "Couldn't save"));
    } finally {
      setSaving(null);
    }
  };

  const reopen = async (ref: string) => {
    setSaving(ref);
    try {
      await apiClient.post(`/pos/momo/charge/${ref}/reopen`);
      toast.success('Back under To sort out');
      await Promise.all([load(), loadHistory()]);
    } catch (err: any) {
      toast.error(errorOf(err, "Couldn't reopen it"));
    } finally {
      setSaving(null);
    }
  };

  if (charges.length === 0) return null;
  const total = charges.reduce((s, c) => s + c.amount, 0);

  const renderSend = (c: Charge) => (
    <div className="rounded-lg border border-border/70 p-2.5 space-y-2">
      <p className="text-xs font-semibold">Who can ring up the sale?</p>
      {staffList === null ? (
        <p className="text-[11px] text-muted-foreground">Loading staff…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {staffList.map((s) => {
            const on = chosen.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setChosen((set) => {
                  const next = new Set(set);
                  if (on) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                })}
                className={pill(on)}
              >
                {s.id === me?.id ? `${s.name} (you)` : s.name}
                {s.id === c.staff_id ? ' · took it' : ''}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {c.has_cart ? 'It shows on their register with the items, ready to complete.' : 'No items were saved with it: they add the items, then use it.'}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setActive(null)}>Cancel</Button>
        <Button size="sm" className="flex-1 rounded-full" disabled={saving === c.reference || chosen.size === 0} onClick={() => send(c.reference)}>
          Send
        </Button>
      </div>
    </div>
  );

  const renderRefund = (c: Charge) => (
    <div className="rounded-lg border border-border/70 p-2.5 space-y-2.5">
      <div className="flex gap-1.5">
        <button type="button" className={pill(refundKind === 'cash_refund')} onClick={() => setRefundKind('cash_refund')}>
          Cash from a drawer
        </button>
        <button type="button" className={pill(refundKind === 'momo_refund')} onClick={() => setRefundKind('momo_refund')}>
          To their MoMo
        </button>
      </div>
      {refundKind === 'cash_refund' ? (
        drawers === null ? (
          <p className="text-[11px] text-muted-foreground">Loading drawers…</p>
        ) : drawers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No drawer is open. Start a shift, or refund to their MoMo.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">Which drawer is the cash coming from?</p>
            <div className="flex flex-wrap gap-1.5">
              {drawers.map((d) => (
                <button key={d.shift_id} type="button" className={pill(drawer === d.shift_id)} onClick={() => setDrawer(d.shift_id)}>
                  {d.mine ? 'Your drawer' : `${d.cashier_name}'s drawer`}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <input
          value={txnId}
          onChange={(e) => setTxnId(e.target.value.replace(/[^\w.-]/g, '').slice(0, 60))}
          placeholder="Transaction ID from the MoMo alert (optional)"
          className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setActive(null)}>Cancel</Button>
        <Button
          size="sm"
          className="flex-1 rounded-full"
          disabled={saving === c.reference || (refundKind === 'cash_refund' && !drawer)}
          onClick={() => resolve(
            c.reference,
            refundKind === 'cash_refund' ? { type: 'cash_refund', shift_id: drawer } : { type: 'momo_refund', txn_id: txnId },
            'Refund recorded',
          )}
        >
          Refund GHS {c.amount.toFixed(2)}
        </Button>
      </div>
    </div>
  );

  const renderNote = (c: Charge) => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={note}
          autoFocus
          onChange={(e) => setNote(e.target.value)}
          placeholder="How was it sorted out?"
          className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
        />
        <Button
          size="sm"
          className="rounded-full"
          disabled={saving === c.reference || !note.trim()}
          onClick={() => resolve(c.reference, { type: 'other', note: note.trim() }, 'Marked as sorted out')}
        >
          Done
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        This closes it: it can&apos;t be rung up after.{' '}
        <button type="button" className="font-semibold underline" onClick={() => setActive(null)}>Cancel</button>
      </p>
    </div>
  );

  const renderOpen = (c: Charge) => {
    const mode = active?.ref === c.reference ? active.mode : null;
    const held = !!c.claimed_by_name;
    return (
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
            {c.staff_name || 'The cashier'} can still use it at the till for {minsLeft(c.cashier_can_use_until)} min.
          </p>
        )}
        {c.released && mode !== 'send' && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              {held
                ? `${c.claimed_by_name} is ringing it up now.`
                : c.released_to_names?.length
                ? `Sent to ${c.released_to_names.join(' and ')}. Waiting for the sale.`
                : 'Sent to the tills. Waiting for the sale.'}
            </span>
            {!held && !mode && (
              <button type="button" onClick={() => startSend(c)} className="font-semibold underline shrink-0">Change</button>
            )}
          </div>
        )}

        {mode === 'send' && renderSend(c)}
        {mode === 'refund' && renderRefund(c)}
        {mode === 'other' && renderNote(c)}

        {!mode && !held && (
          c.released ? (
            <div className="flex items-center justify-between text-[11px]">
              <button type="button" onClick={() => startRefund(c)} className="font-semibold text-muted-foreground hover:text-foreground">
                Refund instead
              </button>
              <button type="button" onClick={() => startNote(c)} className="text-muted-foreground hover:text-foreground">
                Something else?
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => startSend(c)}>
                  Send to a cashier
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => startRefund(c)}>
                  Refund
                </Button>
              </div>
              <button type="button" onClick={() => startNote(c)} className="w-full text-[11px] text-muted-foreground hover:text-foreground">
                Sorted it out another way? Add a note
              </button>
            </>
          )
        )}
        <p className="text-[10px] text-muted-foreground/70 truncate">Ref {c.reference}</p>
      </div>
    );
  };

  const outcomeText = (c: Charge) => {
    if (c.outcome === 'sale') {
      return `Completed as sale ${c.receipt_number || ''}${c.completed_by_name ? ` by ${c.completed_by_name}` : ''}`.replace('  ', ' ');
    }
    const by = c.resolved_by_name ? ` · by ${c.resolved_by_name}` : '';
    if (c.outcome === 'momo_refund') return `Refunded to their MoMo${c.refund_txn_id ? ` (txn ${c.refund_txn_id})` : ''}${by}`;
    if (c.outcome === 'cash_refund') return `${c.resolution_note || 'Refunded in cash'}${by}`;
    return `“${c.resolution_note}”${by}`;
  };

  const renderDone = (c: Charge) => (
    <div key={c.reference} className="rounded-xl border border-border/70 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{formatPhoneNumber(c.phone)}</span>
        <span className="font-bold tabular-nums"><CurrencyDisplay amount={c.amount} /></span>
      </div>
      <p className="text-xs text-foreground">{outcomeText(c)}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {timeOf(c.outcome === 'sale' ? c.completed_at : c.resolved_at)}
          {c.staff_name ? ` · taken by ${c.staff_name}` : ''}
        </p>
        {c.can_reopen && (
          <button
            type="button"
            disabled={saving === c.reference}
            onClick={() => reopen(c.reference)}
            className="text-[11px] font-semibold underline shrink-0 disabled:opacity-50"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTab('open');
          setActive(null);
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
            <h3 className="text-lg font-bold text-foreground">MoMo payments without a sale</h3>
            <div className="inline-flex rounded-full border-border/70 bg-muted/40 p-0.5">
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
          <div className="py-3 space-y-3 pb-6">
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
