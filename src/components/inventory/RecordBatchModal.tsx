import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
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
  extra: string;
  volume: string;
  price: number | null; // retail per base unit, for the price-based split
}

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
 * Record a batch made in-house (e.g. one pot of sobolo bottled in 3 sizes). The shared cost is split
 * between sizes by volume (or by selling price when sizes have no volume), plus each size's own
 * packaging cost. Matches helpers/custom/production.py on the backend.
 */
export default function RecordBatchModal({ productId, onClose, onSuccess }: Props) {
  const [productName, setProductName] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [sharedCost, setSharedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setSharedCost('');
    setNotes('');
    apiClient
      .get(`/tenant/products/${productId}`)
      .then((r) => {
        const p = r.data?.success?.data?.product;
        setProductName(p?.name || '');
        setLines(
          (p?.variants || [])
            .filter((v: any) => v.is_active !== false)
            .map((v: any) => ({
              variantId: v.id,
              label: Object.values(v.variant_attributes || {}).join(' / ') || p.name,
              unit: v.base_unit_name || 'unit',
              qty: '',
              extra: '',
              volume: v.volume_ml ? String(v.volume_ml) : '',
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
    const shared = num(sharedCost) ?? 0;
    const basis = made.length && made.every((l) => (num(l.volume) ?? 0) > 0) ? 'volume' : made.length && made.every((l) => l.price) ? 'price' : 'equal';
    const share = (l: Line) => (basis === 'volume' ? (num(l.volume) as number) : basis === 'price' ? (l.price as number) : 1);
    const total = made.reduce((s, l) => s + (num(l.qty) as number) * share(l), 0) || 1;
    const perUnit = new Map<string, number>();
    let totalCost = 0;
    made.forEach((l) => {
      const q = num(l.qty) as number;
      const part = (shared * q * share(l)) / total;
      perUnit.set(l.variantId, part / q + (num(l.extra) ?? 0));
      totalCost += part + q * (num(l.extra) ?? 0);
    });
    return { basis, perUnit, totalCost, madeCount: made.reduce((s, l) => s + (num(l.qty) as number), 0) };
  }, [lines, sharedCost]);

  const canSave = preview.madeCount > 0 && (num(sharedCost) ?? 0) >= 0 && !saving;

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiClient.post(`/tenant/products/${productId}/production-batches`, {
        shared_cost: num(sharedCost) ?? 0,
        basis: 'volume',
        notes: notes.trim() || undefined,
        lines: lines
          .filter((l) => (num(l.qty) ?? 0) > 0)
          .map((l) => ({
            variant_id: l.variantId,
            quantity: num(l.qty),
            extra_cost_per_unit: num(l.extra) ?? 0,
            ...(multi && num(l.volume) ? { volume_ml: num(l.volume) } : {}),
          })),
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

  return (
    <CustomModal
      isOpen={!!productId}
      onOpenChange={onClose}
      size="2xl"
      header={
        <div className="pt-2 px-2 border-b border-border/60 pb-3">
          <h2 className="text-lg font-bold !tracking-tight">Record batch{productName ? ` — ${productName}` : ''}</h2>
          <p className="text-xs md:text-[13px] text-muted-foreground">Adds the stock you made and works out the cost of each one.</p>
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
              <span className="block text-xs text-muted-foreground mb-1">
                {multi ? 'Shared cost — ingredients, gas, labour (GHS)' : 'Batch cost — ingredients, packaging, gas (GHS)'}
              </span>
              <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="e.g. 150" value={sharedCost} onWheel={blur} onChange={(e) => setSharedCost(e.target.value)} />
            </label>

            <div className="rounded-lg border border-border">
              <div
                className={cn(
                  'grid gap-2 px-3 py-2 border-b border-border bg-muted/40 text-[11px] text-muted-foreground',
                  multi ? 'grid-cols-[minmax(0,1.3fr)_5rem_6rem_5.5rem_5.5rem]' : 'grid-cols-[minmax(0,1.3fr)_5rem_6rem_5.5rem]',
                )}
              >
                <span>{multi ? 'Size' : 'Item'}</span>
                <span>Made</span>
                <span title="Bottle, label, cap — per item">Packaging each</span>
                {multi && <span title="Used to split the shared cost">Size (ml)</span>}
                <span className="text-right">Cost each</span>
              </div>
              <div className="divide-y divide-border">
                {lines.map((l) => {
                  const each = preview.perUnit.get(l.variantId);
                  return (
                    <div
                      key={l.variantId}
                      className={cn(
                        'grid gap-2 px-3 py-2 items-center [&>*]:min-w-0',
                        multi ? 'grid-cols-[minmax(0,1.3fr)_5rem_6rem_5.5rem_5.5rem]' : 'grid-cols-[minmax(0,1.3fr)_5rem_6rem_5.5rem]',
                      )}
                    >
                      <span className="text-sm font-medium capitalize truncate">{l.label}</span>
                      <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="0" value={l.qty} onWheel={blur} onChange={(e) => update(l.variantId, { qty: e.target.value })} aria-label={`${l.label} made`} />
                      <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="0.00" value={l.extra} onWheel={blur} onChange={(e) => update(l.variantId, { extra: e.target.value })} aria-label={`${l.label} packaging cost`} />
                      {multi && (
                        <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="e.g. 500" value={l.volume} onWheel={blur} onChange={(e) => update(l.variantId, { volume: e.target.value })} aria-label={`${l.label} size in ml`} />
                      )}
                      <span className="text-right text-sm tabular-nums">{each !== undefined ? `GHS ${each.toFixed(2)}` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {multi &&
                  (preview.basis === 'volume'
                    ? 'Shared cost split by size (ml).'
                    : preview.basis === 'price'
                      ? 'No sizes entered — shared cost split by selling price.'
                      : 'Shared cost split equally.')}
              </span>
              {preview.madeCount > 0 && (
                <span className="font-medium text-foreground">
                  {preview.madeCount} made · total GHS {preview.totalCost.toFixed(2)}
                </span>
              )}
            </div>

            <input className={field} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            <p className="text-[11px] text-muted-foreground">Don't also record these ingredients as an expense.</p>
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
