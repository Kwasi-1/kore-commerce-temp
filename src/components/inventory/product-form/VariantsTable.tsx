import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/useScreenSize';
import { cn } from '@/lib/utils';
import PriceInput from './PriceInput';
import TiersEditor from './TiersEditor';
import VariantImagePicker from './VariantImagePicker';
import BulkCostHelper from './BulkCostHelper';
import type { GalleryImage, RowErrors, VariantRow } from './types';
import { blurOnWheel, enterToNextField, saleTierIndex, setSaleTierRetail, variantLabel } from './utils';

interface Props {
  variants: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  errors: Record<string, RowErrors>;
  isEditing: boolean;
  gallery: GalleryImage[];
  trackExpiryEnabled: boolean;
  /** Made in-house: no opening stock (batches add it), no bulk-buy helper, size (ml) per variant. */
  madeInHouse?: boolean;
  /** False for people without "Profit & costs": cost cells show "Hidden" and can't be edited. */
  canSeeCosts?: boolean;
}

const input =
  'w-full min-w-0 h-8 px-2 text-xs border rounded-md bg-background focus:outline-none focus:border-foreground/40 tabular-nums disabled:opacity-60 disabled:bg-muted/30 disabled:cursor-not-allowed';
const small = 'block text-[11px] text-muted-foreground mb-1';
// Variant · SKU · Stock · Cost · Price · actions  (no Stock column for a new in-house product)
const colsNoStock =
  'grid grid-cols-[minmax(8rem,1.5fr)_minmax(6rem,1fr)_minmax(4.5rem,0.6fr)_minmax(6.5rem,0.9fr)_4.25rem] gap-2 items-start [&>*]:min-w-0';
const colsWithStock = 'grid grid-cols-[minmax(8rem,1.5fr)_minmax(6rem,1fr)_minmax(3.5rem,0.5fr)_minmax(4.5rem,0.6fr)_minmax(6.5rem,0.9fr)_4.25rem] gap-2 items-start [&>*]:min-w-0';

const emptyBulk = { stock: '', cost: '', retail: '', wholesale: '', lowStock: '' };

export default function VariantsTable({ variants, onChange, errors, isEditing, gallery, trackExpiryEnabled, madeInHouse = false, canSeeCosts = true }: Props) {
  const showStock = !(madeInHouse && !isEditing);
  const cols = showStock ? colsWithStock : colsNoStock;
  const isMobile = useIsMobile();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState(emptyBulk);

  const update = (key: string, patch: Partial<VariantRow>) => onChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const remove = (key: string) => onChange(variants.filter((v) => v.key !== key));

  const bulkFilled = Object.values(bulk).some((v) => v !== '');
  const applyBulk = () => {
    if (!bulkFilled) return;
    onChange(
      variants.map((v) => {
        let next = { ...v };
        if (bulk.stock !== '' && !(isEditing && v.id)) next.stock_quantity = bulk.stock;
        if (bulk.cost !== '') next.cost_price_per_base_unit = bulk.cost;
        if (bulk.lowStock !== '') next.low_stock_threshold = bulk.lowStock;
        if (bulk.retail !== '') next = { ...next, packaging_tiers: setSaleTierRetail(next.packaging_tiers, bulk.retail) };
        if (bulk.wholesale !== '') {
          const i = saleTierIndex(next.packaging_tiers);
          next = { ...next, packaging_tiers: next.packaging_tiers.map((t, idx) => (idx === i ? { ...t, wholesale_price: bulk.wholesale } : t)) };
        }
        return next;
      }),
    );
    setBulk(emptyBulk);
    setBulkOpen(false);
  };

  const packCount = (v: VariantRow) => v.packaging_tiers.filter((t) => !t.is_base_unit).length;
  const stockLocked = (v: VariantRow) => isEditing && !!v.id;
  const name = (v: VariantRow) => Object.values(v.variant_attributes).join(' / ');

  // ── cells ────────────────────────────────────────────────────────────────
  const priceCell = (v: VariantRow) => {
    const tier = v.packaging_tiers[saleTierIndex(v.packaging_tiers)];
    return (
      <PriceInput
        id={`pf-variant-${v.key}-retail`}
        value={tier?.retail_price || ''}
        onChange={(val) => update(v.key, { packaging_tiers: setSaleTierRetail(v.packaging_tiers, val) })}
        cost={v.cost_price_per_base_unit}
        units={tier?.is_base_unit ? 1 : tier?.units_per_tier}
        error={errors[v.key]?.retail}
        ariaLabel={`Retail price for ${variantLabel(v)}${tier && !tier.is_base_unit ? ` per ${tier.name || 'pack'}` : ''}`}
      />
    );
  };

  const skuCell = (v: VariantRow) => (
    <>
      <input
        id={`pf-variant-${v.key}-sku`}
        className={cn(input, 'font-mono', errors[v.key]?.sku ? 'border-destructive' : 'border-border')}
        value={v.sku}
        onKeyDown={enterToNextField}
        onChange={(e) => update(v.key, { sku: e.target.value, skuEdited: true })}
        aria-label={`SKU for ${variantLabel(v)}`}
      />
      {errors[v.key]?.sku && <span className="block text-[10px] font-semibold text-destructive mt-0.5">{errors[v.key].sku}</span>}
    </>
  );

  const stockCell = (v: VariantRow) => (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      placeholder="0"
      disabled={stockLocked(v)}
      title={stockLocked(v) ? 'Change stock with Stock Adjustments or Stock In' : undefined}
      className={cn(input, 'border-border')}
      value={v.stock_quantity}
      onWheel={blurOnWheel}
      onChange={(e) => update(v.key, { stock_quantity: e.target.value })}
      aria-label={`Stock for ${variantLabel(v)}`}
    />
  );

  const costCell = (v: VariantRow) => !canSeeCosts ? (
    <span className={cn(input, 'border-border flex items-center text-muted-foreground bg-muted/40')} title="Needs the Profit & costs permission">
      Hidden
    </span>
  ) : (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      placeholder="—"
      className={cn(input, 'border-border')}
      value={v.cost_price_per_base_unit}
      onWheel={blurOnWheel}
      onChange={(e) => update(v.key, { cost_price_per_base_unit: e.target.value })}
      aria-label={`Cost for ${variantLabel(v)}`}
    />
  );

  const actions = (v: VariantRow) => (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => update(v.key, { isExpanded: !v.isExpanded })}
        aria-expanded={v.isExpanded}
        aria-label={`Packs, wholesale and more for ${variantLabel(v)}`}
        title="Packs, wholesale & more"
        className={cn(
          'relative h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
          v.isExpanded ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon icon="lucide:sliders-horizontal" className="text-[15px]" />
        {packCount(v) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-foreground text-background text-[9px] leading-[14px] text-center">
            {packCount(v)}
          </span>
        )}
      </button>
      <button
        type="button"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => remove(v.key)}
        aria-label={`Remove ${variantLabel(v)}`}
        title="Remove"
      >
        <Icon icon="lucide:trash-2" className="text-[15px]" />
      </button>
    </div>
  );

  const details = (v: VariantRow) => (
    <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-32">
          <span className={small}>Unit name</span>
          <input
            className={cn(input, 'border-border')}
            value={v.base_unit_name}
            placeholder="e.g. bottle"
            onChange={(e) => update(v.key, { base_unit_name: e.target.value })}
          />
        </label>
        {madeInHouse && (
          <label className="w-24">
            <span className={small} title="Optional: e.g. 500 (g or ml). Lets a batch's cost be split by size instead of selling price">Amount in each</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className={cn(input, 'border-border')}
              value={v.volume_ml}
              placeholder="e.g. 500"
              onWheel={blurOnWheel}
              onChange={(e) => update(v.key, { volume_ml: e.target.value })}
            />
          </label>
        )}
        <div className={cn('h-8 flex items-center', madeInHouse && 'hidden')}>
          <BulkCostHelper
            unitName={v.base_unit_name}
            packs={v.packaging_tiers.filter((pt) => !pt.is_base_unit && Number(pt.units_per_tier) > 0).map((pt) => ({ name: pt.name || 'Pack', units: Number(pt.units_per_tier) }))}
            onApply={(c) => update(v.key, { cost_price_per_base_unit: c })}
          />
        </div>
        <label className="w-28">
          <span className={small}>Low stock alert</span>
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
          <label className="h-8 inline-flex items-center gap-2 text-xs" title="Batches and expiry alerts at the till">
            <Switch checked={v.track_expiry} onCheckedChange={(val) => update(v.key, { track_expiry: val })} />
            Track expiry
          </label>
        )}
      </div>
      <TiersEditor
        tiers={v.packaging_tiers}
        onChange={(tiers) => update(v.key, { packaging_tiers: tiers })}
        unitName={v.base_unit_name}
        cost={v.cost_price_per_base_unit}
        sellMode={v.sell_mode}
        onSellModeChange={(m) => update(v.key, { sell_mode: m })}
      />
    </div>
  );

  const nameCell = (v: VariantRow) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <VariantImagePicker value={v.image} gallery={gallery} label={variantLabel(v)} onChange={(img) => update(v.key, { image: img })} />
      <div className="min-w-0">
        <div className="text-sm font-medium capitalize truncate" title={name(v)}>
          {name(v)}
        </div>
        {!v.id && isEditing && <div className="text-[10px] text-muted-foreground">New</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Title + bulk edit toggle */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Variants ({variants.length})</span>
        <button
          type="button"
          onClick={() => setBulkOpen((o) => !o)}
          aria-expanded={bulkOpen}
          className={cn('inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium', bulkOpen ? 'bg-muted' : 'hover:bg-muted')}
        >
          <Icon icon="lucide:list-checks" className="text-[13px]" /> Set for all
        </button>
      </div>

      {bulkOpen && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-end gap-2">
            {!isEditing && !madeInHouse && (
              <label className="w-24">
                <span className={small}>Opening stock</span>
                <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} value={bulk.stock} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} />
              </label>
            )}
            <label className="w-24">
              <span className={small}>Cost</span>
              <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} value={bulk.cost} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, cost: e.target.value })} disabled={!canSeeCosts} placeholder={canSeeCosts ? undefined : 'Hidden'} />
            </label>
            <label className="w-24">
              <span className={small}>Retail price</span>
              <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} value={bulk.retail} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, retail: e.target.value })} />
            </label>
            <label className="w-24">
              <span className={small}>Wholesale</span>
              <input type="number" inputMode="decimal" min={0} step="any" className={cn(input, 'border-border')} value={bulk.wholesale} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, wholesale: e.target.value })} />
            </label>
            <label className="w-24">
              <span className={small}>Low stock alert</span>
              <input type="number" inputMode="decimal" min={0} className={cn(input, 'border-border')} value={bulk.lowStock} onWheel={blurOnWheel} onChange={(e) => setBulk({ ...bulk, lowStock: e.target.value })} />
            </label>
            <button
              type="button"
              disabled={!bulkFilled}
              onClick={applyBulk}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
            >
              Apply to {variants.length}
            </button>
          </div>
        </div>
      )}

      {!isMobile ? (
        <div className="rounded-lg border border-border bg-card">
          <div className={cn(cols, 'px-3 py-2 border-b border-border bg-muted/40 text-[11px] text-muted-foreground rounded-t-lg')}>
            <span>Variant</span>
            <span>SKU</span>
            {showStock && <span>{isEditing ? 'In stock' : 'Stock'}</span>}
            <span>Cost</span>
            <span>
              Price <span className="text-destructive">*</span>
            </span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {variants.map((v) => (
              <div key={v.key} className={cn('px-3 py-2', (errors[v.key]?.retail || errors[v.key]?.sku) && 'bg-destructive/[0.03]')}>
                <div className={cols}>
                  {nameCell(v)}
                  <div>{skuCell(v)}</div>
                  {showStock && stockCell(v)}
                  {costCell(v)}
                  {priceCell(v)}
                  {actions(v)}
                </div>
                {v.isExpanded && details(v)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <div
              key={v.key}
              className={cn('rounded-lg border bg-card p-3 space-y-2', errors[v.key]?.retail || errors[v.key]?.sku ? 'border-destructive/50' : 'border-border')}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">{nameCell(v)}</div>
                {actions(v)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2">
                  <span className={small}>
                    Price <span className="text-destructive">*</span>
                  </span>
                  {priceCell(v)}
                </label>
                <label className="col-span-2">
                  <span className={small}>SKU</span>
                  {skuCell(v)}
                </label>
                {showStock && (
                  <label>
                    <span className={small}>{stockLocked(v) ? 'In stock' : 'Stock'}</span>
                    {stockCell(v)}
                  </label>
                )}
                <label>
                  <span className={small}>Cost</span>
                  {costCell(v)}
                </label>
              </div>
              {v.isExpanded && details(v)}
            </div>
          ))}
        </div>
      )}

      {isEditing && <p className="text-[11px] text-muted-foreground">Change stock levels in Stock Adjustments.</p>}
    </div>
  );
}
