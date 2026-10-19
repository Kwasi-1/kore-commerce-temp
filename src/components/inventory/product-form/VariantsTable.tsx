import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import PriceInput from './PriceInput';
import TiersEditor from './TiersEditor';
import SellModePicker, { SELL_MODES } from './SellModePicker';
import VariantImagePicker from './VariantImagePicker';
import type { GalleryImage, RowErrors, SellMode, VariantRow } from './types';
import { blurOnWheel, enterToNextField, saleTierIndex, setSaleTierRetail, variantLabel } from './utils';

interface Props {
  variants: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  errors: Record<string, RowErrors>;
  isEditing: boolean;
  gallery: GalleryImage[];
  trackExpiryEnabled: boolean;
}

const input =
  'w-full h-8 px-2 text-xs border rounded-md bg-card focus:outline-none focus:border-foreground/40 tabular-nums disabled:opacity-70 disabled:bg-muted/30 disabled:cursor-not-allowed';

const rowLabel = 'block text-[10px] font-bold uppercase text-muted-foreground mb-1 truncate';

export default function VariantsTable({ variants, onChange, errors, isEditing, gallery, trackExpiryEnabled }: Props) {
  // Bulk edit (only filled-in fields are applied)
  const [bulk, setBulk] = useState({ stock: '', cost: '', retail: '', wholesale: '', lowStock: '', sellMode: '' as '' | SellMode });

  const update = (key: string, patch: Partial<VariantRow>) => onChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const remove = (key: string) => onChange(variants.filter((v) => v.key !== key));

  const applyBulk = () => {
    const filled = Object.entries(bulk).filter(([, val]) => val !== '');
    if (filled.length === 0) return;
    onChange(
      variants.map((v) => {
        let next = { ...v };
        if (bulk.stock !== '' && !isEditing) next.stock_quantity = bulk.stock;
        if (bulk.cost !== '') next.cost_price_per_base_unit = bulk.cost;
        if (bulk.lowStock !== '') next.low_stock_threshold = bulk.lowStock;
        if (bulk.sellMode) next.sell_mode = bulk.sellMode;
        if (bulk.retail !== '') next = { ...next, packaging_tiers: setSaleTierRetail(next.packaging_tiers, bulk.retail) };
        if (bulk.wholesale !== '') {
          const i = saleTierIndex(next.packaging_tiers);
          next = { ...next, packaging_tiers: next.packaging_tiers.map((t, idx) => (idx === i ? { ...t, wholesale_price: bulk.wholesale } : t)) };
        }
        return next;
      }),
    );
    setBulk({ stock: '', cost: '', retail: '', wholesale: '', lowStock: '', sellMode: '' });
  };

  const bulkFilled = Object.values(bulk).some((v) => v !== '');

  const saleUnitHint = (v: VariantRow) => {
    const t = v.packaging_tiers[saleTierIndex(v.packaging_tiers)];
    return t && !t.is_base_unit ? `per ${t.name || 'pack'}` : `per ${v.base_unit_name || 'unit'}`;
  };

  const extraTiers = (v: VariantRow) => v.packaging_tiers.filter((t) => !t.is_base_unit).length;

  const detailsPanel = (v: VariantRow) => (
    <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-3 md:p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Unit name</span>
          <input
            className={cn(input, 'border-border')}
            value={v.base_unit_name}
            placeholder="e.g. bottle"
            onChange={(e) => update(v.key, { base_unit_name: e.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Low stock alert</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            className={cn(input, 'border-border')}
            value={v.low_stock_threshold}
            placeholder="5"
            onWheel={blurOnWheel}
            onChange={(e) => update(v.key, { low_stock_threshold: e.target.value })}
          />
        </label>
        {trackExpiryEnabled && (
          <label className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 h-[3.25rem] self-end">
            <span>
              <span className="block text-xs font-semibold">Track expiry dates</span>
              <span className="block text-[10px] text-muted-foreground">Batches and expiry alerts at the till</span>
            </span>
            <Switch checked={v.track_expiry} onCheckedChange={(val) => update(v.key, { track_expiry: val })} />
          </label>
        )}
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">How it's sold</span>
        <SellModePicker value={v.sell_mode} onChange={(m) => update(v.key, { sell_mode: m })} />
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Sizes & prices</span>
        <TiersEditor
          tiers={v.packaging_tiers}
          onChange={(tiers) => update(v.key, { packaging_tiers: tiers })}
          unitName={v.base_unit_name}
          cost={v.cost_price_per_base_unit}
        />
      </div>
    </div>
  );

  const packsButton = (v: VariantRow) => (
    <button
      type="button"
      onClick={() => update(v.key, { isExpanded: !v.isExpanded })}
      aria-expanded={v.isExpanded}
      className={cn(
        'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap',
        v.isExpanded ? 'border-foreground/30 bg-muted' : 'border-border hover:bg-muted',
      )}
    >
      <Icon icon="fluent:box-multiple-20-regular" className="text-[14px]" />
      Packs & more
      {extraTiers(v) > 0 && <span className="ml-0.5 rounded-full bg-foreground text-background px-1.5 text-[10px] leading-4">{extraTiers(v)}</span>}
      <Icon icon={v.isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-[13px] opacity-60" />
    </button>
  );

  const deleteButton = (v: VariantRow) => (
    <button
      type="button"
      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
      onClick={() => remove(v.key)}
      aria-label={`Remove ${variantLabel(v)}`}
      title="Remove this variant"
    >
      <Icon icon="lucide:trash-2" className="text-[15px]" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Bulk edit */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase">Set for all variants</h4>
          <span className="text-[10px] text-muted-foreground">Only the fields you fill in are applied</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          {!isEditing && (
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Opening stock</span>
              <input type="number" inputMode="decimal" min={0} className={cn(input, 'border-border')} placeholder="e.g. 24" value={bulk.stock} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Cost / unit</span>
            <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} placeholder="e.g. 3.20" value={bulk.cost} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, cost: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Retail price</span>
            <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} placeholder="e.g. 5.00" value={bulk.retail} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, retail: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Wholesale</span>
            <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} placeholder="Optional" value={bulk.wholesale} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, wholesale: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Low stock alert</span>
            <input type="number" inputMode="decimal" min={0} className={cn(input, 'border-border')} placeholder="e.g. 5" value={bulk.lowStock} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, lowStock: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">How it's sold</span>
            <select className={cn(input, 'border-border')} value={bulk.sellMode} onChange={(e) => setBulk({ ...bulk, sellMode: e.target.value as any })}>
              <option value="">Keep current</option>
              {SELL_MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!bulkFilled}
            onClick={applyBulk}
            className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
          >
            Apply to all {variants.length}
          </button>
        </div>
      </div>

      {/* Rows: one layout for every width. Line 1 = identity + price (the field that must not be missed),
          line 2 = SKU / stock / cost. Everything wraps instead of scrolling sideways. */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {variants.map((v) => {
          const err = errors[v.key] || {};
          const saleTier = v.packaging_tiers[saleTierIndex(v.packaging_tiers)];
          const stockLocked = isEditing && !!v.id;
          return (
            <div key={v.key} className={cn('p-3 space-y-2.5', (err.retail || err.sku) && 'bg-destructive/[0.03]')}>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <VariantImagePicker value={v.image} gallery={gallery} label={variantLabel(v)} onChange={(img) => update(v.key, { image: img })} size="md" />
                <div className="min-w-[8rem] flex-1 pt-1">
                  <div className="font-semibold text-sm text-foreground capitalize truncate">{Object.values(v.variant_attributes).join(' / ')}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {Object.keys(v.variant_attributes).join(' / ')}
                    {v.id ? '' : ' · new'}
                  </div>
                </div>
                <label className="w-full sm:w-40 shrink-0">
                  <span className={rowLabel}>
                    Retail price <span className="text-destructive">*</span>
                    <span className="ml-1 font-normal normal-case">{saleUnitHint(v)}</span>
                  </span>
                  <PriceInput
                    id={`pf-variant-${v.key}-retail`}
                    value={saleTier?.retail_price || ''}
                    onChange={(val) => update(v.key, { packaging_tiers: setSaleTierRetail(v.packaging_tiers, val) })}
                    cost={v.cost_price_per_base_unit}
                    units={saleTier?.is_base_unit ? 1 : saleTier?.units_per_tier}
                    error={err.retail}
                    ariaLabel={`Retail price for ${variantLabel(v)}`}
                  />
                </label>
                <div className="flex items-center gap-1 self-start sm:pt-[1.15rem] ml-auto">
                  {packsButton(v)}
                  {deleteButton(v)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <label className="col-span-2 sm:col-span-1">
                  <span className={rowLabel}>SKU / Barcode</span>
                  <input
                    id={`pf-variant-${v.key}-sku`}
                    className={cn(input, 'font-mono', err.sku ? 'border-destructive' : 'border-border')}
                    value={v.sku}
                    onKeyDown={enterToNextField}
                    onChange={(e) => update(v.key, { sku: e.target.value, skuEdited: true })}
                    aria-label={`SKU for ${variantLabel(v)}`}
                  />
                  {err.sku && <span className="block text-[10px] font-semibold text-destructive mt-0.5">{err.sku}</span>}
                </label>
                <label>
                  <span className={rowLabel}>{stockLocked ? 'In stock (locked)' : 'Opening stock'}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="0"
                    disabled={stockLocked}
                    title={stockLocked ? 'Change stock with Stock Adjustments or Stock In' : undefined}
                    className={cn(input, 'border-border')}
                    value={v.stock_quantity}
                    onWheel={blurOnWheel}
                    onChange={(e) => update(v.key, { stock_quantity: e.target.value })}
                    aria-label={`Stock for ${variantLabel(v)}`}
                  />
                </label>
                <label>
                  <span className={rowLabel}>Cost / {v.base_unit_name || 'unit'}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Optional"
                    className={cn(input, 'border-border')}
                    value={v.cost_price_per_base_unit}
                    onWheel={blurOnWheel}
                    onChange={(e) => update(v.key, { cost_price_per_base_unit: e.target.value })}
                    aria-label={`Cost for ${variantLabel(v)}`}
                  />
                </label>
              </div>

              {v.isExpanded && detailsPanel(v)}
            </div>
          );
        })}
      </div>
      {isEditing && (
        <p className="text-[11px] text-muted-foreground">
          Stock for existing variants is changed with <b>Stock Adjustments</b> or <b>Stock In</b>. Removing a variant hides it from sale but keeps its sales history.
        </p>
      )}
    </div>
  );
}
