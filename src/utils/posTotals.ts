/**
 * Till totals, worked out the same way as the server (routes/pos/transactions.py process_sale):
 * tax, when the owner turns it on, is added on top of (subtotal - discount) and rounded to pesewas.
 * It's off by default because most prices already include tax.
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface TaxSettings {
  pos_tax_enabled?: boolean;
  pos_tax_rate?: number;
  pos_tax_label?: string;
}

export function posTotals(subtotal: number, discount: number, settings: TaxSettings) {
  const taxRate = settings.pos_tax_enabled ? Number(settings.pos_tax_rate) || 0 : 0;
  const afterDiscount = round2(Math.max(0, subtotal - (discount || 0)));
  const tax = taxRate > 0 ? round2(afterDiscount * taxRate) : 0;
  return {
    taxRate,
    taxLabel: settings.pos_tax_label || 'Tax',
    taxPercent: Math.round(taxRate * 10000) / 100,
    tax,
    total: round2(afterDiscount + tax),
  };
}
