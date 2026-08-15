export interface PackagingTier {
  id: string;
  name: string;
  units_per_tier: number;
  is_base_unit?: boolean;
  is_default_purchase_unit?: boolean;
}

/**
 * Format quantity up to 2 decimal places without trailing .00 on whole numbers
 */
export const formatQty = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '0';
  const val = typeof num === 'number' ? num : parseFloat(String(num));
  if (isNaN(val)) return '0';
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
  return rounded % 1 === 0 ? rounded.toLocaleString() : rounded.toFixed(2);
};

/**
 * Filter and sort tiers that have units_per_tier > 1 in descending order
 */
export const getMultiTiers = (tiers?: PackagingTier[]): PackagingTier[] => {
  if (!tiers || tiers.length === 0) return [];
  return tiers
    .filter((t) => t && typeof t.units_per_tier === 'number' && t.units_per_tier > 1)
    .sort((a, b) => b.units_per_tier - a.units_per_tier);
};

/**
 * Convert base quantity into a human-readable packaging tier breakdown
 * E.g. 4800 bottles with cartons of 24 -> "200 cartons"
 * E.g. 266 bottles with cartons of 24 -> "11 cartons, 2 bottles"
 * E.g. -14 bottles -> "-14 bottles"
 */
export const getTierBreakdown = (
  quantity: number | string | null | undefined,
  baseUnitName: string = 'units',
  tiers?: PackagingTier[]
): string | null => {
  if (quantity === null || quantity === undefined) return null;
  const numQty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
  if (isNaN(numQty)) return null;

  const multiTiers = getMultiTiers(tiers);
  if (multiTiers.length === 0) return null;

  const primaryTier = multiTiers[0];
  const isNegative = numQty < 0;
  const absQty = Math.abs(numQty);

  const tierCount = Math.floor(absQty / primaryTier.units_per_tier);
  const remainder = Math.round((absQty % primaryTier.units_per_tier) * 100) / 100;

  if (tierCount === 0 && remainder === 0) {
    return null;
  }

  const parts: string[] = [];
  if (tierCount > 0) {
    const tierLabel = tierCount === 1 ? primaryTier.name : `${primaryTier.name}s`;
    parts.push(`${isNegative ? '-' : ''}${tierCount.toLocaleString()} ${tierLabel.toLowerCase()}`);
  }
  if (remainder > 0) {
    const baseLabel = remainder === 1 ? baseUnitName : `${baseUnitName}s`;
    parts.push(
      `${isNegative && tierCount === 0 ? '-' : ''}${formatQty(remainder)} ${baseLabel.toLowerCase()}`
    );
  }

  return parts.length > 0 ? parts.join(', ') : null;
};
