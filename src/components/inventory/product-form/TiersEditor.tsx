import { Icon } from '@iconify/react/dist/iconify.js';
import { cn } from '@/lib/utils';
import { useIsPhone } from '@/hooks/useScreenSize';
import PriceInput from './PriceInput';
import SellModePicker from './SellModePicker';
import type { SellMode, TierRow } from './types';
import { blurOnWheel, isMadeOf, makePackTier, resolveTierUnits, tierUnits, toNum } from './utils';

interface Props {
  tiers: TierRow[];
  onChange: (tiers: TierRow[]) => void;
  unitName: string;
  cost: string;
  sellMode: SellMode;
  onSellModeChange: (m: SellMode) => void;
  /** Set by save validation; the editor is scrolled to via `id`. */
  error?: string;
  id?: string;
}

const field = 'w-full min-w-0 h-8 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40';
const gridCols = 'grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_7rem_7rem_2rem] gap-2 items-center [&>*]:min-w-0';

const tierLabel = (t: TierRow, unitName: string) => {
  if (t.is_base_unit) return unitName || 'unit';
  const name = t.name.trim() || 'Pack';
  const units = toNum(t.units_per_tier);
  return units && units > 1 ? `${name} of ${units}` : name;
};

const money = (n: number) => `GHS ${n.toFixed(2)}`;

/**
 * Pack sizes (pack, crate, carton…) and wholesale prices. Stays out of the way until a pack
 * exists; then shows one compact table and a single line for the till / ordering defaults.
 * A pack can be made of a smaller pack (bag = 10 × pack); it's still saved in base units.
 */
export default function TiersEditor({ tiers, onChange, unitName, cost, sellMode, onSellModeChange, error, id }: Props) {
  const isPhone = useIsPhone();
  const unit = unitName || 'unit';
  const baseIdx = Math.max(tiers.findIndex((t) => t.is_base_unit), 0);
  const base = tiers[baseIdx];
  const hasPacks = tiers.length > 1;

  const commit = (next: TierRow[]) => onChange(resolveTierUnits(next));
  const update = (idx: number, patch: Partial<TierRow>) => commit(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  const setDefault = (key: string, flag: 'is_default_sale_unit' | 'is_default_purchase_unit') =>
    onChange(tiers.map((t) => ({ ...t, [flag]: t.key === key })));

  const addPack = () => {
    onChange([...tiers, { ...makePackTier(), contains: '', of: '' }]);
    // A product with packs is usually sold both ways; the user can still change it
    if (!hasPacks && sellMode === 'unit_only') onSellModeChange('flexible');
  };

  const remove = (idx: number) => {
    const removed = tiers[idx];
    // Packs made of the removed one keep their size, counted in base units
    let next = tiers
      .filter((_, i) => i !== idx)
      .map((t) => (t.of === removed.key ? { ...t, of: '', contains: t.units_per_tier } : t));
    const baseKey = (next.find((t) => t.is_base_unit) || next[0])?.key;
    if (removed.is_default_sale_unit) next = next.map((t) => ({ ...t, is_default_sale_unit: t.key === baseKey }));
    if (removed.is_default_purchase_unit) next = next.map((t) => ({ ...t, is_default_purchase_unit: t.key === baseKey }));
    commit(next);
    if (next.length === 1) onSellModeChange('unit_only');
  };

  const normaliseCount = (idx: number) => {
    const n = toNum(tiers[idx].contains ?? tiers[idx].units_per_tier);
    update(idx, { contains: n === null || n < 1 ? '' : String(Math.round(n)) });
  };

  const saleKey = (tiers.find((t) => t.is_default_sale_unit) || tiers[baseIdx])?.key;
  const buyKey = (tiers.find((t) => t.is_default_purchase_unit) || tiers[baseIdx])?.key;

  /** Gentle warnings under a pack row: its size or price looks like a typo. */
  const rowHint = (t: TierRow, idx: number) => {
    const units = tierUnits(t);
    if (units < 2) return null;
    const same = tiers.find((o, i) => i !== idx && !o.is_base_unit && tierUnits(o) === units);
    if (same) return { warn: true, text: `Same size as ${same.name.trim() || 'another pack'}` };
    for (const type of ['retail', 'wholesale'] as const) {
      const packPrice = toNum(type === 'retail' ? t.retail_price : t.wholesale_price);
      const single = toNum(type === 'retail' ? base?.retail_price : base?.wholesale_price);
      if (packPrice && single && packPrice / units > single + 0.005) {
        return {
          warn: true,
          text: `${type === 'retail' ? 'Retail' : 'Wholesale'} works out at ${money(packPrice / units)} per ${unit}, more than one ${unit} (${money(single)}). Check how many it holds.`,
        };
      }
    }
    return t.of ? { warn: false, text: `= ${units} ${unit}s` } : null;
  };

  const addButton = (
    <button type="button" onClick={addPack} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
      <Icon icon="fluent:add-12-filled" className="text-[12px]" /> Add pack size
    </button>
  );

  const errorLine = error ? <p className="text-[11px] font-semibold text-destructive">{error}</p> : null;

  // No packs: just the single unit's wholesale price
  if (!hasPacks) {
    return (
      <div id={id} className="space-y-2 scroll-mt-24">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <label className="w-36">
            <span className="block text-[11px] text-muted-foreground mb-1">Wholesale per {unit}</span>
            <PriceInput
              value={base?.wholesale_price || ''}
              onChange={(v) => update(baseIdx, { wholesale_price: v })}
              cost={cost}
              placeholder="Optional"
              ariaLabel={`Wholesale price per ${unit}`}
            />
          </label>
          <div className="pb-2">{addButton}</div>
        </div>
        {errorLine}
      </div>
    );
  }

  return (
    <div id={id} className="space-y-3 scroll-mt-24">
      <div className="space-y-2">
        <div className={cn(gridCols, 'hidden sm:grid text-[11px] text-muted-foreground')}>
          <span>Size</span>
          <span>Contains</span>
          <span>Retail</span>
          <span>Wholesale</span>
          <span />
        </div>
        {tiers.map((t, idx) => {
          const hint = t.is_base_unit ? null : rowHint(t, idx);
          // A pack can be made of the base unit or another named pack (never one made of itself)
          const madeOf = tiers.filter((o) => o.is_base_unit || (o.key !== t.key && o.name.trim() && !isMadeOf(tiers, o, t.key)));
          return (
            <div key={t.key} className={gridCols}>
              {t.is_base_unit ? (
                <>
                  <span className="h-8 flex items-center text-xs font-semibold capitalize">{unit}</span>
                  <span className="h-8 flex items-center text-xs text-muted-foreground">1 {unit}</span>
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
                  <div className="flex items-center gap-1 min-w-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      className={cn(field, 'w-14 shrink-0')}
                      placeholder="Qty"
                      value={t.contains ?? t.units_per_tier}
                      aria-label={`How many in ${t.name.trim() || 'this pack'}`}
                      onWheel={blurOnWheel}
                      onChange={(e) => update(idx, { contains: e.target.value })}
                      onBlur={() => normaliseCount(idx)}
                    />
                    {madeOf.length > 1 ? (
                      <select
                        className={cn(field, 'flex-1 px-1')}
                        value={(madeOf.find((o) => o.key === t.of) || madeOf.find((o) => o.is_base_unit) || madeOf[0]).key}
                        aria-label={`${t.name.trim() || 'Pack'} is made of`}
                        onChange={(e) => {
                          const o = tiers.find((x) => x.key === e.target.value);
                          update(idx, { of: o && !o.is_base_unit ? o.key : '' });
                        }}
                      >
                        {madeOf.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.is_base_unit ? `${unit}s` : o.name.trim()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground truncate">{unit}s</span>
                    )}
                  </div>
                </>
              )}
              <PriceInput
                value={t.retail_price}
                onChange={(v) => update(idx, { retail_price: v })}
                cost={cost}
                units={t.is_base_unit ? 1 : t.units_per_tier}
                placeholder={t.key === saleKey ? (isPhone ? 'Retail (required)' : 'Required') : 'Retail'}
                ariaLabel={`Retail price per ${tierLabel(t, unit)}`}
              />
              <PriceInput
                value={t.wholesale_price}
                onChange={(v) => update(idx, { wholesale_price: v })}
                cost={cost}
                units={t.is_base_unit ? 1 : t.units_per_tier}
                // On phones there are no column headers, so the placeholder names the field
                placeholder={isPhone ? 'Wholesale (optional)' : 'Optional'}
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
              {hint && (
                <p
                  className={cn(
                    'col-span-full -mt-1 text-[10px] leading-tight sm:col-start-2',
                    hint.warn ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                  )}
                >
                  {hint.text}
                </p>
              )}
            </div>
          );
        })}
        {addButton}
        {errorLine}
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
        <label className="inline-flex items-center gap-1.5 text-muted-foreground" title="Default size on purchase orders and when receiving stock">
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
