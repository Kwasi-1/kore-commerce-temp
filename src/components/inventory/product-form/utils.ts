import apiClient from '@/api/client';
import type { ImageRef, TierRow, VariantRow, FormErrors, RowErrors } from './types';

export const newKey = () => Math.random().toString(36).slice(2, 10);

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomCode = (len = 3) => Array.from({ length: len }, () => ALNUM[Math.floor(Math.random() * ALNUM.length)]).join('');

/** First two words of the name, 5 chars each, e.g. "Kalypo Juice Drink" → "KALYP-JUICE". */
export const namePrefix = (name: string) =>
  (name || '')
    .trim()
    .split(/[\s\-_/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase())
    .filter(Boolean)
    .join('-') || 'PRD';

export const skuToken = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Simple-product SKU with a random suffix so similar names don't collide. */
export const generateSimpleSku = (name: string) => `${namePrefix(name)}-${randomCode(4)}`;

/** Variant SKU: per-product prefix (name + random code) + option tokens, e.g. KALYP-7QF-MANGO. */
export const generateVariantSku = (prefix: string, values: string[]) => [prefix, ...values.map(skuToken).filter(Boolean)].join('-');

/** Comma-separated options → trimmed, de-duplicated (case-insensitive) list. */
export const parseOptions = (values: string) => {
  const seen = new Set<string>();
  return values
    .split(',')
    .map((v) => v.trim())
    .filter((v) => {
      const k = v.toLowerCase();
      if (!v || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
};

/** Identity of a combination: its option values in attribute order (so renaming an attribute keeps rows). */
export const comboKey = (values: string[]) => values.map((v) => v.trim().toLowerCase()).join('␟');

export const cartesian = (arrays: string[][]): string[][] =>
  arrays.reduce<string[][]>((acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])), [[]]);

// ── numbers ──────────────────────────────────────────────────────────────────

export const toNum = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Prevents the scroll wheel from silently changing a focused number input. */
export const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

// ── tiers ────────────────────────────────────────────────────────────────────

export const makeBaseTier = (unitName: string, retail = ''): TierRow => ({
  key: newKey(),
  name: unitName || 'Unit',
  units_per_tier: '1',
  is_base_unit: true,
  is_default_sale_unit: true,
  is_default_purchase_unit: true,
  retail_price: retail,
  wholesale_price: '',
});

export const makePackTier = (): TierRow => ({
  key: newKey(),
  name: '',
  units_per_tier: '',
  is_base_unit: false,
  is_default_sale_unit: false,
  is_default_purchase_unit: false,
  retail_price: '',
  wholesale_price: '',
});

export const tiersFromServer = (tiers: any[] | undefined, unitName: string): TierRow[] => {
  if (!tiers || tiers.length === 0) return [makeBaseTier(unitName)];
  return [...tiers]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || (a.units_per_tier ?? 1) - (b.units_per_tier ?? 1))
    .map((t) => {
      const retail = t.prices?.find((p: any) => p.price_type === 'retail')?.price;
      const wholesale = t.prices?.find((p: any) => p.price_type === 'wholesale')?.price;
      return {
        key: newKey(),
        id: t.id,
        name: t.name || '',
        units_per_tier: String(t.units_per_tier ?? 1),
        is_base_unit: !!t.is_base_unit,
        is_default_sale_unit: !!t.is_default_sale_unit,
        is_default_purchase_unit: !!t.is_default_purchase_unit,
        retail_price: retail !== undefined && retail !== null ? String(retail) : '',
        wholesale_price: wholesale !== undefined && wholesale !== null ? String(wholesale) : '',
      };
    });
};

export const tiersToPayload = (tiers: TierRow[], unitName: string) =>
  tiers
    // Blank pack rows the user added but never filled in are dropped
    .filter((t) => t.is_base_unit || t.name.trim())
    .map((t, idx) => ({
    ...(t.id ? { id: t.id } : {}),
    name: (t.is_base_unit ? unitName : t.name).trim() || 'Unit',
    units_per_tier: t.is_base_unit ? 1 : Math.max(1, Math.round(toNum(t.units_per_tier) ?? 1)),
    is_base_unit: t.is_base_unit,
    is_default_sale_unit: t.is_default_sale_unit,
    is_default_purchase_unit: t.is_default_purchase_unit,
    display_order: idx,
    prices: [
      ...(toNum(t.retail_price) !== null ? [{ price_type: 'retail', price: toNum(t.retail_price) }] : []),
      ...(toNum(t.wholesale_price) !== null ? [{ price_type: 'wholesale', price: toNum(t.wholesale_price) }] : []),
    ],
  }));

/** The tier the item is sold in by default; its retail price is "the" price shown inline. */
export const saleTierIndex = (tiers: TierRow[]) => {
  const i = tiers.findIndex((t) => t.is_default_sale_unit);
  if (i >= 0) return i;
  const b = tiers.findIndex((t) => t.is_base_unit);
  return b >= 0 ? b : 0;
};

export const setSaleTierRetail = (tiers: TierRow[], value: string): TierRow[] => {
  const i = saleTierIndex(tiers);
  return tiers.map((t, idx) => (idx === i ? { ...t, retail_price: value } : t));
};

/** Margin of a tier's retail price over its cost (cost per base unit × units in the tier). */
export const marginInfo = (retail: string, costPerBase: string, units: string | number = 1) => {
  const r = toNum(retail);
  const c = toNum(costPerBase);
  const u = toNum(units) ?? 1;
  if (r === null || r <= 0 || c === null || c <= 0) return null;
  const cost = c * Math.max(u, 1);
  return { pct: ((r - cost) / r) * 100, below: r < cost };
};

// ── validation ───────────────────────────────────────────────────────────────

const retailError = (tiers: TierRow[]) => {
  const v = toNum(tiers[saleTierIndex(tiers)]?.retail_price);
  if (v === null) return 'Enter a retail price';
  if (v <= 0) return 'Price must be more than 0';
  return undefined;
};

export function validateForm(args: {
  name: string;
  category: string;
  hasVariants: boolean;
  simpleTiers: TierRow[];
  variants: VariantRow[];
}): { errors: FormErrors; summary: string[]; firstErrorId: string | null } {
  const errors: FormErrors = { variants: {} };
  const summary: string[] = [];
  let firstErrorId: string | null = null;
  const mark = (id: string) => {
    if (!firstErrorId) firstErrorId = id;
  };

  if (!args.name.trim()) {
    errors.name = 'Product name is required';
    summary.push('Add a product name');
    mark('pf-name');
  }
  if (!args.category.trim()) {
    errors.category = 'Choose a category';
    summary.push('Choose a category');
    mark('pf-category');
  }

  if (!args.hasVariants) {
    const r = retailError(args.simpleTiers);
    if (r) {
      errors.simple = { retail: r };
      summary.push('Set a retail price');
      mark('pf-simple-retail');
    }
  } else if (args.variants.length === 0) {
    errors.general = 'Generate at least one variant';
    summary.push('Generate at least one variant');
    mark('pf-variants');
  } else {
    const skuCounts = new Map<string, number>();
    args.variants.forEach((v) => {
      const k = v.sku.trim().toUpperCase();
      if (k) skuCounts.set(k, (skuCounts.get(k) || 0) + 1);
    });
    let missingPrice = 0;
    let skuProblems = 0;
    args.variants.forEach((v) => {
      const row: RowErrors = {};
      const r = retailError(v.packaging_tiers);
      if (r) {
        row.retail = r;
        missingPrice += 1;
        mark(`pf-variant-${v.key}-retail`);
      }
      const sku = v.sku.trim().toUpperCase();
      if (!sku) row.sku = 'Required';
      else if ((skuCounts.get(sku) || 0) > 1) row.sku = 'Duplicate SKU';
      if (row.sku) {
        skuProblems += 1;
        mark(`pf-variant-${v.key}-sku`);
      }
      if (row.retail || row.sku) errors.variants[v.key] = row;
    });
    if (missingPrice) summary.push(`${missingPrice} variant${missingPrice === 1 ? ' is' : 's are'} missing a retail price`);
    if (skuProblems) summary.push(`${skuProblems} variant${skuProblems === 1 ? ' has' : 's have'} a missing or duplicate SKU`);
  }

  return { errors, summary, firstErrorId };
}

export const hasErrors = (e: FormErrors) =>
  !!(e.name || e.category || e.general || e.simple?.retail || e.simple?.sku || Object.keys(e.variants).length);

export const variantLabel = (v: Pick<VariantRow, 'variant_attributes' | 'sku'>) =>
  Object.values(v.variant_attributes).join(' / ') || v.sku;

export const imageSrc = (ref: ImageRef, gallery: { url: string }[]) => (ref && gallery.some((g) => g.url === ref) ? ref : null);

/**
 * Barcode scanners type the code then press Enter. In a form that would submit the whole
 * product, so Enter moves focus to the next field instead.
 */
export const enterToNextField = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const form = e.currentTarget.form;
  if (!form) return;
  const fields = Array.from(form.querySelectorAll<HTMLElement>('input, select, textarea')).filter(
    (el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null && (el as HTMLInputElement).type !== 'hidden',
  );
  const next = fields[fields.indexOf(e.currentTarget) + 1];
  next?.focus();
};

/** Deletes an upload that was never saved to a product (the nightly cleanup is the safety net). */
export const discardUpload = (url: string) => apiClient.delete('/tenant/uploads/images', { data: { url } }).catch(() => {});
