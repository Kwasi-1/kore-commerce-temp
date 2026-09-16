import { useRegisterPreferencesStore } from '@/store/registerPreferencesStore';

/**
 * Converts a numeric decimal quantity (e.g. 1.25) to a clean mixed fraction string (e.g. "1 ¼" or "½").
 */
export function formatQuantityToFraction(val: number, useUnicode = true): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  if (val === 0) return '0';

  const absVal = Math.abs(val);
  const whole = Math.floor(absVal);
  const remainder = Math.round((absVal - whole) * 1000) / 1000;
  const sign = val < 0 ? '-' : '';

  // Whole number cases
  if (remainder < 0.005) {
    return `${sign}${whole}`;
  }
  if (remainder > 0.995) {
    return `${sign}${whole + 1}`;
  }

  // Common fraction map (with tolerance)
  const commonFractions: { dec: number; unicode: string; ascii: string }[] = [
    { dec: 1 / 8, unicode: '⅛', ascii: '1/8' },
    { dec: 1 / 6, unicode: '⅙', ascii: '1/6' },
    { dec: 1 / 5, unicode: '⅕', ascii: '1/5' },
    { dec: 1 / 4, unicode: '¼', ascii: '1/4' },
    { dec: 1 / 3, unicode: '⅓', ascii: '1/3' },
    { dec: 3 / 8, unicode: '⅜', ascii: '3/8' },
    { dec: 2 / 5, unicode: '⅖', ascii: '2/5' },
    { dec: 1 / 2, unicode: '½', ascii: '1/2' },
    { dec: 3 / 5, unicode: '⅗', ascii: '3/5' },
    { dec: 2 / 3, unicode: '⅔', ascii: '2/3' },
    { dec: 3 / 4, unicode: '¾', ascii: '3/4' },
    { dec: 4 / 5, unicode: '⅘', ascii: '4/5' },
    { dec: 5 / 6, unicode: '⅚', ascii: '5/6' },
    { dec: 7 / 8, unicode: '⅞', ascii: '7/8' },
  ];

  for (const f of commonFractions) {
    if (Math.abs(remainder - f.dec) < 0.015) {
      const fracStr = useUnicode ? f.unicode : f.ascii;
      return whole > 0 ? `${sign}${whole} ${fracStr}` : `${sign}${fracStr}`;
    }
  }

  // Exact GCD fallback for arbitrary decimals
  const precision = 1000;
  const num = Math.round(remainder * precision);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const commonDivisor = gcd(num, precision);

  const n = num / commonDivisor;
  const d = precision / commonDivisor;

  const fracStr = `${n}/${d}`;
  return whole > 0 ? `${sign}${whole} ${fracStr}` : `${sign}${fracStr}`;
}

export const TIER_ABBREVIATIONS: Record<string, { singular: string; plural: string }> = {
  piece: { singular: 'pc', plural: 'pcs' },
  pieces: { singular: 'pc', plural: 'pcs' },
  pair: { singular: 'pr', plural: 'prs' },
  pairs: { singular: 'pr', plural: 'prs' },
  set: { singular: 'set', plural: 'sets' },
  sets: { singular: 'set', plural: 'sets' },
  pack: { singular: 'pk', plural: 'pks' },
  packs: { singular: 'pk', plural: 'pks' },
  packet: { singular: 'pk', plural: 'pks' },
  packets: { singular: 'pk', plural: 'pks' },
  pkg: { singular: 'pk', plural: 'pks' },
  bundle: { singular: 'bdl', plural: 'bdls' },
  bundles: { singular: 'bdl', plural: 'bdls' },
  dozen: { singular: 'dz', plural: 'dz' },
  dozens: { singular: 'dz', plural: 'dz' },
  'half dozen': { singular: '½ dz', plural: '½ dz' },
  'half-dozen': { singular: '½ dz', plural: '½ dz' },
  box: { singular: 'bx', plural: 'bxs' },
  boxes: { singular: 'bx', plural: 'bxs' },
  carton: { singular: 'ctn', plural: 'ctns' },
  cartons: { singular: 'ctn', plural: 'ctns' },
  case: { singular: 'cs', plural: 'cs' },
  cases: { singular: 'cs', plural: 'cs' },
  bag: { singular: 'bag', plural: 'bags' },
  bags: { singular: 'bag', plural: 'bags' },
  sack: { singular: 'sck', plural: 'scks' },
  sacks: { singular: 'sck', plural: 'scks' },
  bottle: { singular: 'btl', plural: 'btls' },
  bottles: { singular: 'btl', plural: 'btls' },
  can: { singular: 'can', plural: 'cans' },
  cans: { singular: 'can', plural: 'cans' },
  jar: { singular: 'jar', plural: 'jars' },
  jars: { singular: 'jar', plural: 'jars' },
  tray: { singular: 'tray', plural: 'trays' },
  trays: { singular: 'tray', plural: 'trays' },
  crate: { singular: 'crt', plural: 'crts' },
  crates: { singular: 'crt', plural: 'crts' },
  roll: { singular: 'rl', plural: 'rls' },
  rolls: { singular: 'rl', plural: 'rls' },
  pallet: { singular: 'plt', plural: 'plts' },
  pallets: { singular: 'plt', plural: 'plts' },
  container: { singular: 'cntr', plural: 'cntrs' },
  containers: { singular: 'cntr', plural: 'cntrs' },
  sachet: { singular: 'sct', plural: 'scts' },
  sachets: { singular: 'sct', plural: 'scts' },
  tub: { singular: 'tub', plural: 'tubs' },
  tubs: { singular: 'tub', plural: 'tubs' },
  cup: { singular: 'cup', plural: 'cups' },
  cups: { singular: 'cup', plural: 'cups' },
  loaf: { singular: 'loaf', plural: 'loaves' },
  loaves: { singular: 'loaf', plural: 'loaves' },
  bucket: { singular: 'bkt', plural: 'bkts' },
  buckets: { singular: 'bkt', plural: 'bkts' },
  tin: { singular: 'tin', plural: 'tins' },
  tins: { singular: 'tin', plural: 'tins' },
  bar: { singular: 'bar', plural: 'bars' },
  bars: { singular: 'bar', plural: 'bars' },
  unit: { singular: 'unit', plural: 'units' },
  units: { singular: 'unit', plural: 'units' },
  kilogram: { singular: 'kg', plural: 'kg' },
  kilograms: { singular: 'kg', plural: 'kg' },
  kg: { singular: 'kg', plural: 'kg' },
  gram: { singular: 'g', plural: 'g' },
  grams: { singular: 'g', plural: 'g' },
  g: { singular: 'g', plural: 'g' },
  milligram: { singular: 'mg', plural: 'mg' },
  milligrams: { singular: 'mg', plural: 'mg' },
  mg: { singular: 'mg', plural: 'mg' },
  liter: { singular: 'L', plural: 'L' },
  liters: { singular: 'L', plural: 'L' },
  litre: { singular: 'L', plural: 'L' },
  litres: { singular: 'L', plural: 'L' },
  l: { singular: 'L', plural: 'L' },
  milliliter: { singular: 'mL', plural: 'mL' },
  milliliters: { singular: 'mL', plural: 'mL' },
  ml: { singular: 'mL', plural: 'mL' },
  meter: { singular: 'm', plural: 'm' },
  meters: { singular: 'm', plural: 'm' },
  m: { singular: 'm', plural: 'm' },
  yard: { singular: 'yd', plural: 'yds' },
  yards: { singular: 'yd', plural: 'yds' },
  yd: { singular: 'yd', plural: 'yds' },
};

export function formatTierUnit(tierName: string | undefined | null, quantity: number = 1): string {
  if (!tierName || typeof tierName !== 'string') return '';
  const trimmed = tierName.trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();
  const isPlural = Math.abs(quantity) !== 1;

  if (TIER_ABBREVIATIONS[key]) {
    return isPlural ? TIER_ABBREVIATIONS[key].plural : TIER_ABBREVIATIONS[key].singular;
  }

  // Fallback for custom short tiers (<= 4 letters)
  if (trimmed.length <= 4) {
    return isPlural && !trimmed.toLowerCase().endsWith('s') ? `${trimmed}s` : trimmed;
  }
  return trimmed;
}

export function useQuantityFormatter() {
  const { quantityFormat } = useRegisterPreferencesStore();

  const formatQuantity = (val: number): string => {
    if (quantityFormat === 'decimal') {
      return String(val);
    }
    return formatQuantityToFraction(val, true);
  };

  const formatQuantityWithUnit = (val: number, tierName?: string | null): string => {
    const qtyStr = formatQuantity(val);
    const unitStr = formatTierUnit(tierName, val);
    return unitStr ? `${qtyStr} ${unitStr}` : qtyStr;
  };

  return { formatQuantity, formatQuantityToFraction, formatQuantityWithUnit, formatTierUnit };
}
