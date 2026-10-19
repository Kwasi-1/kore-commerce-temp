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

const field =
  'w-full h-8 px-2 text-xs border border-border rounded-lg bg-card focus:outline-none focus:border-foreground/40';
const label = 'block text-[10px] font-bold uppercase text-muted-foreground mb-1';

const tierLabel = (t: TierRow, unitName: string) => {
  if (t.is_base_unit) return unitName || 'unit';
  const name = t.name.trim() || 'Pack';
  const units = toNum(t.units_per_tier);
  return units && units > 1 ? `${name} of ${units}` : name;
};

/**
 * The base unit plus optional packs (pack, crate, carton…), each with retail and wholesale
 * prices. Rows wrap to fit the available width — no horizontal scrolling.
 * When there's more than one size, two dropdowns pick the default at the till and on purchase orders.
 */
export default function TiersEditor({ tiers, onChange, unitName, cost }: Props) {
  const unit = unitName || 'unit';
  const update = (idx: number, patch: Partial<TierRow>) => onChange(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  const setDefault = (key: string, flag: 'is_default_sale_unit' | 'is_default_purchase_unit') =>
    onChange(tiers.map((t) => ({ ...t, [flag]: t.key === key })));

  const remove = (idx: number) => {
    const removed = tiers[idx];
    let next = tiers.filter((_, i) => i !== idx);
    // Keep exactly one default sale / purchase size: fall back to the base unit
    const baseKey = (next.find((t) => t.is_base_unit) || next[0])?.key;
    if (removed.is_default_sale_unit) next = next.map((t) => ({ ...t, is_default_sale_unit: t.key === baseKey }));
    if (removed.is_default_purchase_unit) next = next.map((t) => ({ ...t, is_default_purchase_unit: t.key === baseKey }));
    onChange(next);
  };

  const normaliseUnits = (idx: number) => {
    const n = toNum(tiers[idx].units_per_tier);
    update(idx, { units_per_tier: n === null || n < 2 ? '' : String(Math.round(n)) });
  };

  const saleKey = (tiers.find((t) => t.is_default_sale_unit) || tiers.find((t) => t.is_base_unit) || tiers[0])?.key;
  const buyKey = (tiers.find((t) => t.is_default_purchase_unit) || tiers.find((t) => t.is_base_unit) || tiers[0])?.key;

  return (
    <div className="space-y-2.5">
      {tiers.map((t, idx) => (
        <div key={t.key} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            {/* Size */}
            {t.is_base_unit ? (
              <div className="min-w-[9rem] flex-1">
                <span className={label}>Sold as</span>
                <div className="h-8 flex items-center gap-1.5 text-xs font-semibold capitalize">
                  {unit}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case text-muted-foreground">single unit</span>
                </div>
              </div>
            ) : (
              <div className="flex min-w-[14rem] flex-[2] items-end gap-2">
                <label className="flex-1 min-w-0">
                  <span className={label}>Pack name</span>
                  <input
                    className={cn(field, 'font-semibold')}
                    placeholder="e.g. Crate"
                    value={t.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                  />
                </label>
                <label className="w-24 shrink-0">
                  <span className={label}>{unit}s inside</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    step={1}
                    className={field}
                    placeholder="e.g. 24"
                    value={t.units_per_tier}
                    onWheel={blurOnWheel}
                    onChange={(e) => update(idx, { units_per_tier: e.target.value })}
                    onBlur={() => normaliseUnits(idx)}
                  />
                </label>
              </div>
            )}

            {/* Prices */}
            <label className="w-[8.5rem] shrink-0">
              <span className={label}>Retail price</span>
              <PriceInput
                value={t.retail_price}
                onChange={(v) => update(idx, { retail_price: v })}
                cost={cost}
                units={t.is_base_unit ? 1 : t.units_per_tier}
                placeholder={t.key === saleKey ? 'Required' : 'Optional'}
                ariaLabel={`Retail price per ${tierLabel(t, unit)}`}
              />
            </label>
            <label className="w-[8.5rem] shrink-0">
              <span className={label}>Wholesale</span>
              <PriceInput
                value={t.wholesale_price}
                onChange={(v) => update(idx, { wholesale_price: v })}
                cost={cost}
                units={t.is_base_unit ? 1 : t.units_per_tier}
                placeholder="Optional"
                ariaLabel={`Wholesale price per ${tierLabel(t, unit)}`}
              />
            </label>

            {!t.is_base_unit && (
              <button
                type="button"
                className="ml-auto h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(idx)}
                aria-label={`Remove ${tierLabel(t, unit)}`}
                title="Remove this pack size"
              >
                <Icon icon="lucide:trash-2" className="text-[14px]" />
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...tiers, makePackTier()])}
        className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <Icon icon="fluent:add-12-filled" className="text-[13px]" /> Add a pack size (e.g. crate of 24)
      </button>

      {/* Defaults only mean something once there's more than one size */}
      {tiers.length > 1 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>
              <span className={label}>Sold at the till by default as</span>
              <select className={field} value={saleKey} onChange={(e) => setDefault(e.target.value, 'is_default_sale_unit')}>
                {tiers.map((t) => (
                  <option key={t.key} value={t.key}>
                    {tierLabel(t, unit)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Ordered from suppliers by default as</span>
              <select className={field} value={buyKey} onChange={(e) => setDefault(e.target.value, 'is_default_purchase_unit')}>
                {tiers.map((t) => (
                  <option key={t.key} value={t.key}>
                    {tierLabel(t, unit)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            e.g. sell by the {unit}, order by the crate. To let cashiers choose the size at the till, set "How it's sold" to Units or packs.
          </p>
        </div>
      )}
    </div>
  );
}
