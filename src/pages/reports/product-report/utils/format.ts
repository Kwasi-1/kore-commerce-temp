import type { ProductReportRow } from '../types';

export const formatMoney = (amount: number) =>
  `GHS ${new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;

/** Quantities can be fractional (sub-pack sales) — show up to 3 decimals, no trailing zeros. */
export const formatQty = (n: number) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 3 }).format(n || 0);

export const formatPct = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? '—' : `${n.toFixed(digits)}%`);

export const formatChange = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '0%';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

export const formatCover = (days: number | null) => {
  if (days === null || days === undefined) return '—';
  if (days < 1) return '< 1 day';
  if (days > 365) return '> 1 year';
  return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
};

export const rowDisplayName = (r: Pick<ProductReportRow, 'name' | 'variant_label'>) =>
  r.variant_label ? `${r.name} · ${r.variant_label}` : r.name;
