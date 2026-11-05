import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { POProductPickerModal, CatalogVariant } from '@/components/inventory/POProductPickerModal';
import { useFeaturesStore } from '@/store/featuresStore';
import { useLocationStore } from '@/store/locationStore';

export interface TransferLine {
  variant_id: string;
  product_name: string;
  sku: string;
  tier_id: string;
  tier_name: string;
  units_per_tier: number;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Prefill (from the stock grid): where it comes from and goes, and the lines */
  initial?: { from?: string; to?: string; lines?: TransferLine[] } | null;
}

/** New transfer: from, to, items (in any pack size), notes; "Transfer now" when instant transfers are on. */
export default function TransferFormModal({ isOpen, onClose, onCreated, initial }: Props) {
  const locations = useLocationStore((s) => s.locations).filter((l) => l.status === 'active');
  const instantOn = useFeaturesStore((s) => Boolean(s.posSettings?.transfers_instant));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const wh = locations.find((l) => l.type === 'warehouse');
    setFrom(initial?.from || wh?.id || locations[0]?.id || '');
    setTo(initial?.to || locations.find((l) => l.id !== (initial?.from || wh?.id || locations[0]?.id))?.id || '');
    setLines(initial?.lines || []);
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the modal opens
  }, [isOpen]);

  const addFromPicker = (picked: { variant: CatalogVariant; quantity: number; tier_id: string }[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const p of picked) {
        const tier = p.variant.packaging_tiers.find((t) => t.id === p.tier_id) || p.variant.default_tier;
        if (next.some((l) => l.variant_id === p.variant.variant_id && l.tier_id === tier.id)) continue;
        next.push({
          variant_id: p.variant.variant_id,
          product_name: p.variant.variant_name ? `${p.variant.product_name} · ${p.variant.variant_name}` : p.variant.product_name,
          sku: p.variant.sku,
          tier_id: tier.id,
          tier_name: tier.name,
          units_per_tier: tier.units_per_tier || 1,
          quantity: p.quantity || 1,
        });
      }
      return next;
    });
  };

  const submit = async (instant: boolean) => {
    if (!from || !to) return toast.error('Choose where the stock comes from and where it goes');
    if (from === to) return toast.error('Pick two different locations');
    if (lines.length === 0) return toast.error('Add at least one item');
    if (lines.some((l) => !(l.quantity > 0))) return toast.error('Quantities must be more than 0');
    setSaving(true);
    try {
      const res = await apiClient.post('/tenant/transfers', {
        from_location_id: from,
        to_location_id: to,
        notes,
        instant,
        items: lines.map((l) => ({ variant_id: l.variant_id, packaging_tier_id: l.tier_id, quantity: l.quantity })),
      });
      toast.success(res.data?.success?.message || 'Transfer requested');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't create the transfer");
    } finally {
      setSaving(false);
    }
  };

  const options = locations.map((l) => ({ label: l.type === 'warehouse' ? `${l.name} (warehouse)` : l.name, value: l.id }));

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={() => !saving && onClose()}
        size="2xl"
        header={<h3 className="text-base font-bold text-foreground pt-2">New transfer</h3>}
        body={
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomSelectField
                label="From"
                options={options}
                value={from}
                inputProps={{ onSelectionChange: (k: any) => setFrom(String(Array.from(k)[0] || '')) }}
              />
              <CustomSelectField
                label="To"
                options={options.filter((o) => o.value !== from)}
                value={to}
                inputProps={{ onSelectionChange: (k: any) => setTo(String(Array.from(k)[0] || '')) }}
              />
            </div>

            <div className="rounded-xl border border-border divide-y divide-border">
              {lines.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">No items yet</p>
              ) : (
                lines.map((l, i) => (
                  <div key={`${l.variant_id}-${l.tier_id}`} className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{l.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.sku} · {l.tier_name}
                        {l.units_per_tier > 1 ? ` of ${l.units_per_tier}` : ''}
                      </p>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={Number.isFinite(l.quantity) ? l.quantity : ''}
                      onChange={(e) =>
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, quantity: parseFloat(e.target.value) } : x)))
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="w-20 h-9 rounded-lg border border-border bg-background px-2 text-sm text-right"
                      aria-label={`Quantity of ${l.product_name}`}
                    />
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={`Remove ${l.product_name}`}
                    >
                      <Icon icon="mdi:close" className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
              <Icon icon="mdi:plus" className="h-4 w-4" />
              Add items
            </Button>

            <CustomTextareaField label="Notes" value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:justify-end">
            <Button variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            {instantOn && (
              <Button variant="outline" disabled={saving} onClick={() => submit(true)}>
                Transfer now
              </Button>
            )}
            <Button variant="neutral" disabled={saving} onClick={() => submit(false)}>
              {saving ? 'Saving…' : 'Request transfer'}
            </Button>
          </div>
        }
      />
      <POProductPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectItems={addFromPicker}
        existingVariantIds={lines.map((l) => l.variant_id)}
      />
    </>
  );
}
