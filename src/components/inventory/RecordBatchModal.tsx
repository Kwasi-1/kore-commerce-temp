import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useScreenSize';
import { cn } from '@/lib/utils';

interface Props {
  productId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Line {
  variantId: string;
  label: string;
  unit: string;
  qty: string;
  amount: string; // "amount in each" (g / ml / pcs…), only used when splitting by size
  price: number | null; // retail per base unit, for the default price-based split
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs'];
const field =
  'w-full min-w-0 h-9 px-2.5 text-sm border border-border rounded-md bg-background tabular-nums focus:outline-none focus:border-foreground/40';
const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));
const blur = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

const retailPerUnit = (v: any): number | null => {
  const tiers = v.packaging_tiers || [];
  const t = tiers.find((x: any) => x.is_default_sale_unit) || tiers.find((x: any) => x.is_base_unit) || tiers[0];
  const price = t?.prices?.find((p: any) => p.price_type === 'retail')?.price;
  return price ? Number(price) / Math.max(Number(t.units_per_tier) || 1, 1) : null;
};

/**
 * Record a batch made in-house. The batch cost is materials only (ingredients + packaging used);
 * gas, electricity and labour belong in Expenses / Payroll. With several sizes the cost is split
 * by selling price, or by "amount in each" when the owner switches that on.
 * Mirrors helpers/custom/production.py on the backend.
 */
export default function RecordBatchModal({ productId, onClose, onSuccess }: Props) {
  const isMobile = useIsMobile();
  const [productName, setProductName] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [cost, setCost] = useState('');
  const [bySize, setBySize] = useState(false);
  const [unit, setUnit] = useState('g');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setCost('');
    setNotes('');
    apiClient
      .get(`/tenant/products/${productId}`)
      .then((r) => {
        const p = r.data?.success?.data?.product;
        const active = (p?.variants || []).filter((v: any) => v.is_active !== false);
        setProductName(p?.name || '');
        setUnit(p?.content_unit || 'g');
        // Sizes already set up → keep splitting by size
        setBySize(active.length > 1 && active.every((v: any) => v.volume_ml));
        setLines(
          active.map((v: any) => ({
            variantId: v.id,
            label: Object.values(v.variant_attributes || {}).join(' / ') || p.name,
            unit: v.base_unit_name || 'unit',
            qty: '',
            amount: v.volume_ml ? String(v.volume_ml) : '',
            price: retailPerUnit(v),
          })),
        );
      })
      .catch(() => toast.error('Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const multi = lines.length > 1;
  const update = (id: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.variantId === id ? { ...l, ...patch } : l)));

  // Live preview of the backend's split
  const preview = useMemo(() => {
    const made = lines.filter((l) => (num(l.qty) ?? 0) > 0);
    const total = num(cost) ?? 0;
    const basis =
      bySize && made.length && made.every((l) => (num(l.amount) ?? 0) > 0)
        ? 'size'
        : made.length && made.every((l) => l.price)
          ? 'price'
          : 'equal';
    const share = (l: Line) => (basis === 'size' ? (num(l.amount) as number) : basis === 'price' ? (l.price as number) : 1);
    const weight = made.reduce((s, l) => s + (num(l.qty) as number) * share(l), 0) || 1;
    const each = new Map<string, number>();
    made.forEach((l) => each.set(l.variantId, (total * share(l)) / weight));
    return { basis, each, count: made.reduce((s, l) => s + (num(l.qty) as number), 0), madeLines: made.length };
  }, [lines, cost, bySize]);

  const missingAmounts = bySize && lines.some((l) => (num(l.qty) ?? 0) > 0 && !(num(l.amount) ?? 0));
  const canSave = preview.count > 0 && (num(cost) ?? 0) >= 0 && !missingAmounts && !saving;

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiClient.post(`/tenant/products/${productId}/production-batches`, {
        shared_cost: num(cost) ?? 0,
        basis: bySize ? 'size' : 'price',
        ...(bySize ? { content_unit: unit } : {}),
        notes: notes.trim() || undefined,
        lines: lines
          .filter((l) => (num(l.qty) ?? 0) > 0)
          .map((l) => ({ variant_id: l.variantId, quantity: num(l.qty), ...(bySize && num(l.amount) ? { amount: num(l.amount) } : {}) })),
      });
      toast.success(r.data?.success?.message || 'Batch recorded');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to record batch');
    } finally {
      setSaving(false);
    }
  };

  const costEach = (l: Line) => {
    const v = preview.each.get(l.variantId);
    return v !== undefined ? `GHS ${v.toFixed(2)}` : '—';
  };

  const qtyInput = (l: Line) => (
    <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="0" value={l.qty} onWheel={blur} onChange={(e) => update(l.variantId, { qty: e.target.value })} aria-label={`${l.label} — how many made`} />
  );
  const amountInput = (l: Line) => (
    <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder={unit === 'pcs' ? 'e.g. 10' : 'e.g. 500'} value={l.amount} onWheel={blur} onChange={(e) => update(l.variantId, { amount: e.target.value })} aria-label={`${l.label} — amount in each (${unit})`} />
  );
  const cols = bySize ? 'grid-cols-[minmax(0,1.4fr)_6rem_7rem_6rem]' : 'grid-cols-[minmax(0,1.4fr)_7rem_6rem]';

  const splitNote = !multi || preview.madeLines < 2
    ? null
    : preview.basis === 'size'
      ? `Split by amount in each (${unit})`
      : preview.basis === 'price'
        ? 'Split by selling price'
        : 'Split equally (no selling prices set)';

  return (
    <CustomModal
      isOpen={!!productId}
      onOpenChange={onClose}
      size="2xl"
      header={
        <div className="pt-2 px-2 border-b border-border/60 pb-3">
          <h2 className="text-lg font-bold !tracking-tight">Record batch{productName ? ` — ${productName}` : ''}</h2>
          <p className="text-xs md:text-[13px] text-muted-foreground !tracking-tight">Adds what you made to stock and works out the cost of each.</p>
        </div>
      }
      body={
        loading ? (
          <div className="py-10 flex justify-center">
            <Icon icon="lucide:loader-2" className="animate-spin text-xl" />
          </div>
        ) : (
          <div className="py-2 space-y-4">
            <label className="block">
              <span className="block text-xs text-muted-foreground mb-1">Ingredients & packaging used (GHS)</span>
              <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="e.g. 180" value={cost} onWheel={blur} onChange={(e) => setCost(e.target.value)} />
              <span className="block mt-1 text-[11px] text-muted-foreground">
                What you used for this batch. Gas, electricity and labour go in Expenses / Payroll.
              </span>
            </label>

            {!isMobile ? (
              <div className="rounded-lg border border-border">
                <div className={cn('grid gap-2 px-3 py-2 border-b border-border bg-muted/40 text-[11px] text-muted-foreground', cols)}>
                  <span>{multi ? 'Size' : 'Item'}</span>
                  <span>How many made</span>
                  {bySize && (
                    <span className="flex items-center gap-1">
                      Amount in each
                      <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-5 rounded border border-border bg-background text-[11px]" aria-label="Unit">
                        {UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </span>
                  )}
                  <span className="text-right">Cost each</span>
                </div>
                <div className="divide-y divide-border">
                  {lines.map((l) => (
                    <div key={l.variantId} className={cn('grid gap-2 px-3 py-2 items-center [&>*]:min-w-0', cols)}>
                      <span className="text-sm font-medium capitalize truncate">{l.label}</span>
                      {qtyInput(l)}
                      {bySize && amountInput(l)}
                      <span className="text-right text-sm tabular-nums">{costEach(l)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {bySize && (
                  <label className="flex items-center justify-between text-xs text-muted-foreground">
                    Amount measured in
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-sm">
                      {UNITS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                )}
                {lines.map((l) => (
                  <div key={l.variantId} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize truncate">{l.label}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{costEach(l)}</span>
                    </div>
                    <div className={cn('grid gap-2', bySize ? 'grid-cols-2' : 'grid-cols-1')}>
                      <label>
                        <span className="block text-[11px] text-muted-foreground mb-1">How many made</span>
                        {qtyInput(l)}
                      </label>
                      {bySize && (
                        <label>
                          <span className="block text-[11px] text-muted-foreground mb-1">Amount in each ({unit})</span>
                          {amountInput(l)}
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {splitNote}
                {multi && (
                  <button type="button" onClick={() => setBySize((v) => !v)} className="ml-2 font-semibold text-foreground hover:underline">
                    {bySize ? 'Split by selling price instead' : 'Split by size instead ›'}
                  </button>
                )}
              </span>
              {preview.count > 0 && <span className="font-medium">{preview.count} made</span>}
            </div>
            {missingAmounts && <p className="text-[11px] text-destructive">Enter the amount in each for every size you made.</p>}

            <input className={field} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
        )
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="hidden md:flex">
            Cancel
          </Button>
          <Button size="sm" disabled={!canSave} onClick={save} className="bg-primary text-primary-foreground font-semibold px-5">
            {saving ? 'Saving…' : 'Record batch'}
          </Button>
        </div>
      }
    />
  );
}
