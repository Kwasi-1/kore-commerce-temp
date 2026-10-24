/** Counting the cash drawer by notes and coins (shift open/close, Z report). */

// Ghana cedi notes and coins (GHS). Keys match the server's count format.
export const DENOMINATIONS: { key: string; label: string; value: number }[] = [
  { key: '200', label: '200', value: 200 },
  { key: '100', label: '100', value: 100 },
  { key: '50', label: '50', value: 50 },
  { key: '20', label: '20', value: 20 },
  { key: '10', label: '10', value: 10 },
  { key: '5', label: '5', value: 5 },
  { key: '2', label: '2', value: 2 },
  { key: '1', label: '1', value: 1 },
  { key: '0.5', label: '50p', value: 0.5 },
  { key: '0.2', label: '20p', value: 0.2 },
  { key: '0.1', label: '10p', value: 0.1 },
];

export type CashCount = Record<string, string>;

/** At most 9999 of any one note or coin, and an "other" amount under GHS 1,000,000 (matches the server). */
export const MAX_COUNT_DIGITS = 4;

/** Keep an "other" amount typed as money: digits, one point, two decimals, under the cap. */
export const cleanOtherAmount = (raw: string): string => {
  let text = raw.replace(/[^\d.]/g, '');
  const dot = text.indexOf('.');
  if (dot !== -1) text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const [whole, frac] = text.split('.');
  text = whole.slice(0, 6) + (frac !== undefined ? `.${frac}` : '');
  return text;
};

/** Total of a count, rounded to pesewas. */
export const cashCountTotal = (count: CashCount): number => {
  const sum = DENOMINATIONS.reduce((acc, d) => acc + (parseInt(count[d.key] || '0', 10) || 0) * d.value, 0) +
    (parseFloat(count.other || '0') || 0);
  return Math.round((sum + Number.EPSILON) * 100) / 100;
};

/** The count in the server's format: whole numbers per note/coin, plus "other" as an amount. */
export const cashCountPayload = (count: CashCount): Record<string, number> => {
  const out: Record<string, number> = {};
  DENOMINATIONS.forEach((d) => {
    const n = parseInt(count[d.key] || '0', 10);
    if (n > 0) out[d.key] = n;
  });
  const other = parseFloat(count.other || '0');
  if (other > 0) out.other = Math.round(other * 100) / 100;
  return out;
};

export const cashCountIsEmpty = (count: CashCount) => Object.values(count).every((v) => !v || v === '0');
