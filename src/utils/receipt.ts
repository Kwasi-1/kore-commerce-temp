/**
 * src/utils/receipt.ts
 * Receipt and order number utilities for HeadlessPOS.
 */

/**
 * Derives a 2-4 character uppercase prefix from customPrefix or storeName.
 * - If customPrefix is provided, cleans and returns up to 4 characters.
 * - If storeName is provided:
 *     - Multi-word: initials of up to 3 words (e.g. "Mom's Shop" -> "MS", "Great Heights Store" -> "GHS")
 *     - Single word: first 3 characters (e.g. "Vysion" -> "VYS")
 * - Falls back to "POS".
 */
export function getReceiptPrefix(storeName?: string, customPrefix?: string): string {
  if (customPrefix && customPrefix.trim()) {
    const clean = customPrefix.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean) return clean.slice(0, 4);
  }
  if (storeName && storeName.trim()) {
    const words = storeName.trim().replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const prefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
      if (prefix.length >= 2) return prefix;
    } else if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
  }
  return 'POS';
}

/**
 * Generates a deterministic POS order/receipt number matching the backend format:
 * [PREFIX]-[YYYYMMDD]-[XXXXXXXX]
 */
export function generatePosOrderNumber(prefix: string = 'POS'): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${prefix}-${year}${month}${day}-${randomPart}`;
}
