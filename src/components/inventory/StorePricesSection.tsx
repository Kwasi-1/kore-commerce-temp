import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/usePermissions';

interface Props {
  product: any;
}

type Prices = Record<string, Record<string, Record<string, number>>>; // location → tier → type → price

const mainPrice = (tier: any, type: string): number | null => {
  const list = Array.isArray(tier?.prices) ? tier.prices : [];
  const row = list.find((p: any) => (p.price_type || p.priceType) === type);
  if (row) return Number(row.price);
  if (tier?.prices && !Array.isArray(tier.prices) && tier.prices[type] != null) return Number(tier.prices[type]);
  return null;
};

/**
 * Store prices for one product (edit page, store prices switched on): each store's own price per
 * pack size, empty = the main price. Managers see only their own stores.
 */
export default function StorePricesSection({ product }: Props) {
  const can = useCan();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState<Prices>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get(`/tenant/store-prices/product/${product.id}`);
      const d = r.data?.success?.data || {};
      setActive(!!d.active);
      setStores(d.stores || []);
      setSaved(d.prices || {});
      setDraft({});
    } catch {
      setActive(false);
    }
  }, [product.id]);

  useEffect(() => {
    load();
  }, [load]);

  // One row per pack size and price type that has a main price
  const lines = useMemo(() => {
    const out: { key: string; tierId: string; type: string; label: string; main: number }[] = [];
    for (const v of product.variants || []) {
      const vLabel = Object.values(v.variant_attributes || {}).filter(Boolean).join(' / ');
      for (const t of v.packaging_tiers || []) {
        for (const type of ['retail', 'wholesale']) {
          const main = mainPrice(t, type);
          if (main === null) continue;
          out.push({
            key: `${t.id}:${type}`,
            tierId: t.id,
            type,
            label: [vLabel, t.name, type === 'wholesale' ? 'wholesale' : ''].filter(Boolean).join(' · '),
            main,
          });
        }
      }
    }
    return out;
  }, [product]);

  if (!active || stores.length === 0 || lines.length === 0) return null;

  const cellKey = (loc: string, key: string) => `${loc}|${key}`;
  const current = (loc: string, line: (typeof lines)[number]) => {
    const k = cellKey(loc, line.key);
    if (k in draft) return draft[k];
    const v = saved[loc]?.[line.tierId]?.[line.type];
    return v === undefined ? '' : String(v);
  };
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      for (const store of stores) {
        const prices = Object.entries(draft)
          .filter(([k]) => k.startsWith(`${store.id}|`))
          .map(([k, v]) => {
            const [, key] = k.split('|');
            const [tierId, type] = key.split(':');
            return { tier_id: tierId, price_type: type, price: v.trim() === '' ? null : Number(v) };
          });
        if (prices.length) await apiClient.put(`/tenant/store-prices/location/${store.id}`, { prices });
      }
      toast.success('Store prices saved');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Couldn't save store prices");
    } finally {
      setSaving(false);
    }
  };

  const editable = can('prices.store');

  return (
    <section className="bg-card rounded-xl border border-border p-4 md:p-6 mt-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold font-header tracking-tighter text-foreground">Store prices</h2>
          <p className="text-sm text-muted-foreground">Leave a store empty to use the main price.</p>
        </div>
        {editable && dirty && (
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" disabled={saving} onClick={() => setDraft({})}>Discard</Button>
            <Button variant="neutral" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2 pr-3">Pack size</th>
              <th className="text-right font-medium py-2 px-3 whitespace-nowrap">Main price</th>
              {stores.map((s) => (
                <th key={s.id} className="text-right font-medium py-2 px-3 whitespace-nowrap">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line) => (
              <tr key={line.key}>
                <td className="py-2 pr-3 text-foreground">{line.label || 'Unit'}</td>
                <td className="py-2 px-3 text-right text-muted-foreground">{line.main.toFixed(2)}</td>
                {stores.map((s) => {
                  const value = current(s.id, line);
                  const own = value !== '' && Number(value) !== line.main;
                  return (
                    <td key={s.id} className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {own && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">Store price</span>}
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          disabled={!editable}
                          value={value}
                          placeholder={line.main.toFixed(2)}
                          onChange={(e) => setDraft((d) => ({ ...d, [cellKey(s.id, line.key)]: e.target.value }))}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className="w-24 h-9 rounded-lg border border-border bg-background px-2 text-sm text-right disabled:opacity-60"
                          aria-label={`${s.name} price for ${line.label}`}
                        />
                        {editable && value !== '' && (
                          <button
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, [cellKey(s.id, line.key)]: '' }))}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                            title="Back to the main price"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
