import { useId } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { cn } from '@/lib/utils';
import PriceInput from './PriceInput';
import type { TierRow } from './types';
import { blurOnWheel, makePackTier, toNum } from './utils';

interface Props {
  tiers: TierRow[];
  onChange: (tiers: TierRow[]) => void;
  unitName: string;
  cost: string;
}

const cellInput =
  'w-full h-8 px-2 text-xs border border-border rounded-lg bg-card focus:outline-none focus:border-foreground/40 disabled:opacity-70 disabled:bg-muted/30';

/**
 * Packaging tiers (unit, pack, carton…) with retail + wholesale prices and the default
 * sale / purchase tier. Defaults are radio buttons, so exactly one of each is always set.
 */
export default function TiersEditor({ tiers, onChange, unitName, cost }: Props) {
  const group = useId();

  const update = (idx: number, patch: Partial<TierRow>) => onChange(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  const setDefault = (idx: number, flag: 'is_default_sale_unit' | 'is_default_purchase_unit') =>
    onChange(tiers.map((t, i) => ({ ...t, [flag]: i === idx })));

  const remove = (idx: number) => {
    const removed = tiers[idx];
    let next = tiers.filter((_, i) => i !== idx);
    // Keep exactly one default sale / purchase tier
    const baseIdx = Math.max(next.findIndex((t) => t.is_base_unit), 0);
    if (removed.is_default_sale_unit) next = next.map((t, i) => ({ ...t, is_default_sale_unit: i === baseIdx }));
    if (removed.is_default_purchase_unit) next = next.map((t, i) => ({ ...t, is_default_purchase_unit: i === baseIdx }));
    onChange(next);
  };

  const normaliseUnits = (idx: number) => {
    const n = toNum(tiers[idx].units_per_tier);
    update(idx, { units_per_tier: n === null || n < 2 ? '' : String(Math.round(n)) });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
              <th className="p-2.5">Sold as</th>
              <th className="p-2.5 w-24">Units inside</th>
              <th className="p-2.5 w-36">Retail price</th>
              <th className="p-2.5 w-32">Wholesale</th>
              <th className="p-2.5 w-16 text-center" title="Default tier at the till">Sell</th>
              <th className="p-2.5 w-16 text-center" title="Default tier on purchase orders">Buy</th>
              <th className="p-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.map((t, idx) => (
              <tr key={t.key}>
                <td className="p-2">
                  {t.is_base_unit ? (
                    <div className="h-8 px-2 flex items-center rounded-lg bg-muted/30 text-xs font-semibold capitalize">
                      {unitName || 'Unit'}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(base)</span>
                    </div>
                  ) : (
                    <input
                      className={cn(cellInput, 'font-semibold')}
                      placeholder="e.g. Pack, Crate"
                      value={t.name}
                      aria-label="Pack name"
                      onChange={(e) => update(idx, { name: e.target.value })}
                    />
                  )}
                </td>
                <td className="p-2">
                  {t.is_base_unit ? (
                    <div className="h-8 px-2 flex items-center text-xs text-muted-foreground">1</div>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      step={1}
                      className={cellInput}
                      placeholder="e.g. 24"
                      value={t.units_per_tier}
                      aria-label="Units inside this pack"
                      onWheel={blurOnWheel}
                      onChange={(e) => update(idx, { units_per_tier: e.target.value })}
                      onBlur={() => normaliseUnits(idx)}
                    />
                  )}
                </td>
                <td className="p-2">
                  <PriceInput
                    value={t.retail_price}
                    onChange={(v) => update(idx, { retail_price: v })}
                    cost={cost}
                    units={t.is_base_unit ? 1 : t.units_per_tier}
                    placeholder={t.is_default_sale_unit ? 'Required' : 'Optional'}
                    ariaLabel={`Retail price per ${t.is_base_unit ? unitName : t.name || 'pack'}`}
                  />
                </td>
                <td className="p-2">
                  <PriceInput
                    value={t.wholesale_price}
                    onChange={(v) => update(idx, { wholesale_price: v })}
                    cost={cost}
                    units={t.is_base_unit ? 1 : t.units_per_tier}
                    placeholder="Optional"
                    ariaLabel="Wholesale price"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="radio"
                    name={`${group}-sale`}
                    className="h-4 w-4 accent-primary"
                    checked={t.is_default_sale_unit}
                    onChange={() => setDefault(idx, 'is_default_sale_unit')}
                    aria-label="Default tier at the till"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="radio"
                    name={`${group}-buy`}
                    className="h-4 w-4 accent-primary"
                    checked={t.is_default_purchase_unit}
                    onChange={() => setDefault(idx, 'is_default_purchase_unit')}
                    aria-label="Default tier on purchase orders"
                  />
                </td>
                <td className="p-2 text-right">
                  {!t.is_base_unit && (
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(idx)}
                      aria-label={`Remove ${t.name || 'pack'}`}
                    >
                      <Icon icon="lucide:trash-2" className="text-[14px]" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Sell or buy in packs? Add a pack and say how many {unitName || 'units'} are inside. <b>Sell</b> / <b>Buy</b> pick the default at the till and on purchase orders.
        </p>
        <button
          type="button"
          onClick={() => onChange([...tiers, makePackTier()])}
          className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
        >
          <Icon icon="fluent:add-12-filled" className="text-[13px]" /> Add pack
        </button>
      </div>
    </div>
  );
}
