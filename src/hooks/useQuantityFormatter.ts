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

export function useQuantityFormatter() {
  const { quantityFormat } = useRegisterPreferencesStore();

  const formatQuantity = (val: number): string => {
    if (quantityFormat === 'decimal') {
      return String(val);
    }
    return formatQuantityToFraction(val, true);
  };

  return { formatQuantity, formatQuantityToFraction };
}
