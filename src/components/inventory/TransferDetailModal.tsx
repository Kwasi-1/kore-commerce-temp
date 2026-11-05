import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCan } from '@/hooks/usePermissions';
import { useFeaturesStore } from '@/store/featuresStore';
import { TRANSFER_STATUS_LABELS, transferStatusClass } from '@/components/inventory/transferStatus';

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'missing', label: 'Missing' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'other', label: 'Other' },
];

interface Props {
  transferId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

type Mode = 'view' | 'dispatch' | 'receive' | 'cancel' | 'reject';

/** One transfer: its items and timeline, and the next step (approve, dispatch, receive, cancel). */
export default function TransferDetailModal({ transferId, onClose, onChanged }: Props) {
  const can = useCan();
  const needsApproval = useFeaturesStore((s) => Boolean(s.posSettings?.transfers_require_approval));
  const [t, setT] = useState<any>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!transferId) return;
    setT(null);
    setMode('view');
    setReason('');
    apiClient
      .get(`/tenant/transfers/${transferId}`)
      .then((r) => setT(r.data?.success?.data?.transfer))
      .catch((e) => toast.error(e?.response?.data?.error?.message || "Couldn't load the transfer"));
  }, [transferId]);

  const startQuantities = (m: 'dispatch' | 'receive') => {
    const q: Record<string, number> = {};
    for (const it of t.items) q[it.id] = m === 'dispatch' ? it.qtyRequested : it.qtyDispatched ?? 0;
    setQty(q);
    setReasons({});
    setMode(m);
  };

  const run = async (action: string, body?: any) => {
    setBusy(true);
    try {
      const r = await apiClient.post(`/tenant/transfers/${t.id}/${action}`, body || {});
      setT(r.data?.success?.data?.transfer);
      toast.success(r.data?.success?.message || 'Done');
      setMode('view');
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const unit = (it: any) => it.baseUnitName || 'unit';
  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number(n).toLocaleString());

  const footer = () => {
    if (!t) return null;
    if (mode === 'dispatch') {
      return (
        <Footer onBack={() => setMode('view')} busy={busy} primary="Dispatch" onPrimary={() =>
          run('dispatch', { items: t.items.map((it: any) => ({ item_id: it.id, quantity: qty[it.id] ?? 0 })) })} />
      );
    }
    if (mode === 'receive') {
      return (
        <Footer onBack={() => setMode('view')} busy={busy} primary="Confirm receipt" onPrimary={() =>
          run('receive', {
            items: t.items.map((it: any) => ({ item_id: it.id, quantity_received: qty[it.id] ?? 0, reason: reasons[it.id] })),
          })} />
      );
    }
    if (mode === 'cancel' || mode === 'reject') {
      return (
        <Footer onBack={() => setMode('view')} busy={busy} primary={mode === 'cancel' ? 'Cancel transfer' : 'Reject'}
          onPrimary={() => run(mode, { reason })} />
      );
    }
    const actions: React.ReactNode[] = [];
    const open = ['requested', 'approved', 'dispatched'].includes(t.status);
    if (t.status === 'requested' && needsApproval && can('stock.approve')) {
      actions.push(<Button key="rej" variant="outline" disabled={busy} onClick={() => setMode('reject')}>Reject</Button>);
      actions.push(<Button key="app" variant="neutral" disabled={busy} onClick={() => run('approve')}>Approve</Button>);
    }
    if ((t.status === 'approved' || (t.status === 'requested' && !needsApproval)) && can('stock.transfer')) {
      actions.push(<Button key="dis" variant="neutral" disabled={busy} onClick={() => startQuantities('dispatch')}>Dispatch</Button>);
    }
    if (t.status === 'dispatched' && can('stock.transfer')) {
      actions.push(<Button key="rec" variant="neutral" disabled={busy} onClick={() => startQuantities('receive')}>Receive</Button>);
    }
    return (
      <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:justify-between">
        {open && can('stock.transfer') ? (
          <Button variant="ghost" disabled={busy} onClick={() => setMode('cancel')}>Cancel transfer</Button>
        ) : <span />}
        <div className="flex flex-col-reverse sm:flex-row gap-2">{actions}</div>
      </div>
    );
  };

  return (
    <CustomModal
      isOpen={!!transferId}
      onOpenChange={() => !busy && onClose()}
      size="2xl"
      header={
        t && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{t.reference}</h3>
            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', transferStatusClass(t.status))}>
              {TRANSFER_STATUS_LABELS[t.status] || t.status}
            </span>
          </div>
        )
      }
      body={
        !t ? (
          <div className="py-10 flex justify-center"><div className="h-6 w-6 rounded-full border-2 border-border border-t-foreground animate-spin" /></div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              {t.fromLocationName} <span className="text-muted-foreground">→</span> {t.toLocationName}
            </p>

            <div className="rounded-xl border border-border divide-y divide-border">
              {t.items.map((it: any) => {
                const short = mode === 'receive' && (qty[it.id] ?? 0) < (it.qtyDispatched ?? 0);
                return (
                  <div key={it.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {it.productName}{it.variantLabel ? ` · ${it.variantLabel}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {it.sku} · requested {fmt(it.qtyRequested)}
                          {it.qtyDispatched !== null ? ` · sent ${fmt(it.qtyDispatched)}` : ''}
                          {it.qtyReceived !== null ? ` · received ${fmt(it.qtyReceived)}` : ''} {unit(it)}s
                        </p>
                        {it.discrepancyReason && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {REASONS.find((r) => r.value === it.discrepancyReason)?.label || it.discrepancyReason}
                            {it.discrepancyNote ? `: ${it.discrepancyNote}` : ''}
                          </p>
                        )}
                        {it.batches?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Batches: {it.batches.map((b: any) => `${fmt(b.quantity)} exp. ${b.expiry_date || '—'}`).join(', ')}
                          </p>
                        )}
                      </div>
                      {(mode === 'dispatch' || mode === 'receive') && (
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          max={mode === 'receive' ? it.qtyDispatched ?? undefined : undefined}
                          value={Number.isFinite(qty[it.id]) ? qty[it.id] : ''}
                          onChange={(e) => setQty((q) => ({ ...q, [it.id]: parseFloat(e.target.value) }))}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className="w-24 h-9 rounded-lg border border-border bg-background px-2 text-sm text-right"
                          aria-label={`${mode === 'dispatch' ? 'Quantity sent' : 'Quantity received'} for ${it.productName}`}
                        />
                      )}
                    </div>
                    {short && (
                      <div className="flex flex-wrap gap-1.5">
                        {REASONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setReasons((x) => ({ ...x, [it.id]: r.value }))}
                            className={cn(
                              'h-7 px-2.5 rounded-full border text-xs',
                              reasons[it.id] === r.value ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground',
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(mode === 'cancel' || mode === 'reject') && (
              <div>
                <p className="text-sm text-foreground mb-1.5">Reason</p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder={mode === 'cancel' ? 'e.g. no longer needed' : 'e.g. stock reserved'}
                />
                {mode === 'cancel' && t.status === 'dispatched' && (
                  <p className="text-xs text-muted-foreground mt-1.5">The stock in transit goes back to {t.fromLocationName}.</p>
                )}
              </div>
            )}

            {t.notes && <p className="text-sm text-muted-foreground">{t.notes}</p>}

            <div className="text-xs text-muted-foreground space-y-0.5">
              {[
                ['Requested', t.requestedBy, t.requestedAt],
                ['Approved', t.approvedBy, t.approvedAt],
                ['Dispatched', t.dispatchedBy, t.dispatchedAt],
                ['Received', t.receivedBy, t.receivedAt],
                [t.status === 'rejected' ? 'Rejected' : 'Cancelled', t.cancelledBy, t.cancelledAt],
              ]
                .filter(([, , at]) => at)
                .map(([label, by, at]) => (
                  <p key={label as string}>
                    {label} {format(new Date(at as string), 'd MMM yyyy, HH:mm')}{by ? ` by ${by}` : ''}
                    {label !== 'Requested' && t.cancelReason && (label === 'Rejected' || label === 'Cancelled') ? ` · ${t.cancelReason}` : ''}
                  </p>
                ))}
            </div>
          </div>
        )
      }
      footer={footer()}
    />
  );
}

function Footer({ onBack, busy, primary, onPrimary }: { onBack: () => void; busy: boolean; primary: string; onPrimary: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button variant="outline" disabled={busy} onClick={onBack}>Back</Button>
      <Button variant="neutral" disabled={busy} onClick={onPrimary}>{busy ? 'Working…' : primary}</Button>
    </div>
  );
}
