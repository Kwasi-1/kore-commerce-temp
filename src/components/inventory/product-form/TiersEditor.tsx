import { Icon } from '@iconify/react/dist/iconify.js';
import { cn } from '@/lib/utils';
import PriceInput from './PriceInput';
import SellModePicker from './SellModePicker';
import type { SellMode, TierRow } from './types';
import { blurOnWheel, makePackTier, toNum } from './utils';

interface Props {
  tiers: TierRow[];
  onChange: (tiers: TierRow[]) => void;
  unitName: string;
  cost: string;
  sellMode: SellMode;
  onSellModeChange: (m: SellMode) => void;
}

const field = 'w-full min-w-0 h-8 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40';
const gridCols = 'grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_2rem] gap-2 items-center [&>*]:min-w-0';

const tierLabel = (t: TierRow, unitName: string) => {
  if (t.is_base_unit) return unitName || 'unit';
  const name = t.name.trim() || 'Pack';
  const units = toNum(t.units_per_tier);
  return units && units > 1 ? `${name} of ${units}` : name;
};

/**
 * Pack sizes (pack, crate, carton…) and wholesale prices. Stays out of the way until a pack
 * exists; then shows one compact table and a single line for the till / ordering defaults.
 */
export default function TiersEditor({ tiers, onChange, unitName, cost, sellMode, onSellModeChange }: Props) {
  const unit = unitName || 'unit';
  const baseIdx = Math.max(tiers.findIndex((t) => t.is_base_unit), 0);
  const hasPacks = tiers.length > 1;

  const update = (idx: number, patch: Partial<TierRow>) => onChange(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  const setDefault = (key: string, flag: 'is_default_sale_unit' | 'is_default_purchase_unit') =>
    onChange(tiers.map((t) => ({ ...t, [flag]: t.key === key })));

  const addPack = () => {
    onChange([...tiers, makePackTier()]);
    // A product with packs is usually sold both ways; the user can still change it
    if (!hasPacks && sellMode === 'unit_only') onSellModeChange('flexible');
  };

  const remove = (idx: number) => {
    const removed = tiers[idx];
    let next = tiers.filter((_, i) => i !== idx);
    const baseKey = (next.find((t) => t.is_base_unit) || next[0])?.key;
    if (removed.is_default_sale_unit) next = next.map((t) => ({ ...t, is_default_sale_unit: t.key === baseKey }));
    if (removed.is_default_purchase_unit) next = next.map((t) => ({ ...t, is_default_purchase_unit: t.key === baseKey }));
    onChange(next);
    if (next.length === 1) onSellModeChange('unit_only');
  };

  const normaliseUnits = (idx: number) => {
    const n = toNum(tiers[idx].units_per_tier);
    update(idx, { units_per_tier: n === null || n < 2 ? '' : String(Math.round(n)) });
  };

  const saleKey = (tiers.find((t) => t.is_default_sale_unit) || tiers[baseIdx])?.key;
  const buyKey = (tiers.find((t) => t.is_default_purchase_unit) || tiers[baseIdx])?.key;

  const addButton = (
    <button type="button" onClick={addPack} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
      <Icon icon="fluent:add-12-filled" className="text-[12px]" /> Add pack size
    </button>
  );

  // No packs: just the single unit's wholesale price
  if (!hasPacks) {
    return (
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="w-36">
          <span className="block text-[11px] text-muted-foreground mb-1">Wholesale per {unit}</span>
          <PriceInput
            value={tiers[baseIdx]?.wholesale_price || ''}
            onChange={(v) => update(baseIdx, { wholesale_price: v })}
            cost={cost}
            placeholder="Optional"
            ariaLabel={`Wholesale price per ${unit}`}
          />
        </label>
        <div className="pb-2">{addButton}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className={cn(gridCols, 'hidden sm:grid text-[11px] text-muted-foreground')}>
          <span>Size</span>
          <span>{unit}s inside</span>
          <span>Retail</span>
          <span>Wholesale</span>
          <span />
        </div>
        {tiers.map((t, idx) => (
          <div key={t.key} className={gridCols}>
            {t.is_base_unit ? (
              <>
                <span className="h-8 flex items-center text-xs font-semibold capitalize">{unit}</span>
                <span className="h-8 flex items-center text-xs text-muted-foreground">1</span>
              </>
            ) : (
              <>
                <input
                  className={cn(field, 'font-semibold')}
                  placeholder="Pack name, e.g. Crate"
                  value={t.name}
                  aria-label="Pack name"
                  onChange={(e) => update(idx, { name: e.target.value })}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  step={1}
                  className={field}
                  placeholder="Qty"
                  value={t.units_per_tier}
                  aria-label={`${unit}s inside`}
                  onWheel={blurOnWheel}
                  onChange={(e) => update(idx, { units_per_tier: e.target.value })}
                  onBlur={() => normaliseUnits(idx)}
                />
              </>
            )}
            <PriceInput
              value={t.retail_price}
              onChange={(v) => update(idx, { retail_price: v })}
              cost={cost}
              units={t.is_base_unit ? 1 : t.units_per_tier}
              placeholder={t.key === saleKey ? 'Required' : 'Retail'}
              ariaLabel={`Retail price per ${tierLabel(t, unit)}`}
            />
            <PriceInput
              value={t.wholesale_price}
              onChange={(v) => update(idx, { wholesale_price: v })}
              cost={cost}
              units={t.is_base_unit ? 1 : t.units_per_tier}
              placeholder="Optional"
              ariaLabel={`Wholesale price per ${tierLabel(t, unit)}`}
            />
            {t.is_base_unit ? (
              <span className="hidden sm:block" />
            ) : (
              <button
                type="button"
                className="h-8 w-8 justify-self-end inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(idx)}
                aria-label={`Remove ${tierLabel(t, unit)}`}
                title="Remove"
              >
                <Icon icon="lucide:trash-2" className="text-[14px]" />
              </button>
            )}
          </div>
        ))}
        {addButton}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
        <SellModePicker value={sellMode} onChange={onSellModeChange} />
        <label className="inline-flex items-center gap-1.5 text-muted-foreground">
          Sell by
          <select className={cn(field, 'w-auto')} value={saleKey} onChange={(e) => setDefault(e.target.value, 'is_default_sale_unit')}>
            {tiers.map((t) => (
              <option key={t.key} value={t.key}>
                {tierLabel(t, unit)}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5 text-muted-foreground" title="Default size on purchase orders">
          Order by
          <select className={cn(field, 'w-auto')} value={buyKey} onChange={(e) => setDefault(e.target.value, 'is_default_purchase_unit')}>
            {tiers.map((t) => (
              <option key={t.key} value={t.key}>
                {tierLabel(t, unit)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
