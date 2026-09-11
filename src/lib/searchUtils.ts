/**
 * src/lib/searchUtils.ts
 * Global Search Engine — Phase 3: Frontend Client-Side Engine
 *
 * Mirrors the backend search_engine.py logic for client-side (in-memory) filtering.
 * Architecture documented in: vysion-tech-commerce-server/docs/GLOBAL_SEARCH.md
 *
 * Two public functions:
 *  - smartSearch()   → stemming + punctuation stripping + multi-token AND  (products, SKUs, people)
 *  - simpleSearch()  → fast literal substring match  (categories, codes, notification titles)
 */

// ---------------------------------------------------------------------------
// 1. Text Normalization Helpers  (mirrors helpers/custom/search_engine.py)
// ---------------------------------------------------------------------------

/**
 * Strip punctuation, hyphens, periods, slashes, underscores, and whitespace
 * for symbol-agnostic comparisons.
 *
 * Examples:
 *   cleanString("V.I.P")   → "VIP"
 *   cleanString("T-Shirt") → "TShirt"
 *   cleanString("T5-003")  → "T5003"
 */
export function cleanString(text: string): string {
  return text.replace(/[.\-_/\s]+/g, '');
}

/**
 * Generate morphological stem variants (English plural/singular) for a search token.
 * Used for product names and SKUs — NOT for proper names (staff, customers).
 *
 * Examples:
 *   getTokenStems("soaps")        → ["soaps", "soap"]
 *   getTokenStems("batteries")    → ["batteries", "battery"]
 *   getTokenStems("toothbrushes") → ["toothbrushes", "toothbrush", "toothbrushe"]
 *   getTokenStems("boxes")        → ["boxes", "box", "boxe"]
 */
export function getTokenStems(token: string): string[] {
  const stems = new Set<string>([token]);
  const lower = token.toLowerCase();

  if (lower.endsWith('ies') && lower.length > 4) {
    // batteries → battery
    stems.add(lower.slice(0, -3) + 'y');
  } else if (lower.endsWith('es') && lower.length > 3) {
    // boxes → box, toothbrushes → toothbrush
    stems.add(lower.slice(0, -2));
    stems.add(lower.slice(0, -1));
  } else if (lower.endsWith('s') && lower.length > 2) {
    // soaps → soap
    stems.add(lower.slice(0, -1));
  }

  return Array.from(stems);
}

// ---------------------------------------------------------------------------
// 2. Core Field Matcher
// ---------------------------------------------------------------------------

type FieldGetter<T> = (item: T) => string | undefined | null;

/**
 * Check whether a single search token matches ANY of the provided fields on an item.
 * Used internally by smartSearch and simpleSearch.
 */
function tokenMatchesAnyField<T>(
  item: T,
  token: string,
  fields: FieldGetter<T>[],
  useStems: boolean
): boolean {
  const tokensToCheck = useStems ? getTokenStems(token) : [token.toLowerCase()];
  const cleanTok = useStems ? cleanString(token) : '';

  for (const getField of fields) {
    const raw = getField(item);
    if (!raw) continue;

    const fieldLower = raw.toLowerCase();
    const fieldClean = useStems ? cleanString(raw) : '';

    for (const stem of tokensToCheck) {
      if (fieldLower.includes(stem.toLowerCase())) return true;
    }

    // Punctuation-agnostic match (e.g. "coke500" finds "Coke-500ml")
    if (useStems && cleanTok && fieldClean.toLowerCase().includes(cleanTok.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 3. smartSearch — Full Intelligence
//    Stemming ON, punctuation stripping ON, multi-token AND logic
//    Use for: products, SKUs, variant names, people names in modals
// ---------------------------------------------------------------------------

/**
 * Filter an array of items using smart search with:
 *  - Multi-token AND logic: "coke 500ml" → token "coke" AND token "500ml" must each match
 *  - Stemming: "soaps" matches items containing "soap"
 *  - Punctuation stripping: "coke500" matches "Coke-500ml"
 *  - Case-insensitive
 *
 * @param items   - The array to filter
 * @param query   - Raw user search string
 * @param fields  - Array of field-getter functions: (item) => item.fieldName
 * @returns Filtered subset of items
 *
 * @example
 * smartSearch(adjustments, query, [
 *   (a) => a.variant_name,
 *   (a) => a.sku,
 *   (a) => a.notes,
 * ])
 */
export function smartSearch<T>(
  items: T[],
  query: string,
  fields: FieldGetter<T>[]
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  return items.filter((item) =>
    tokens.every((tok) => tokenMatchesAnyField(item, tok, fields, true))
  );
}

// ---------------------------------------------------------------------------
// 4. simpleSearch — Lightweight Literal Matching
//    No stemming, no punctuation stripping. Fast OR across fields.
//    Use for: categories, discount codes, notification titles, payroll log
// ---------------------------------------------------------------------------

/**
 * Filter an array of items using fast, literal substring matching.
 *  - Case-insensitive
 *  - OR across all provided fields (any field match = item included)
 *  - NO stemming or punctuation stripping
 *
 * @param items   - The array to filter
 * @param query   - Raw user search string
 * @param fields  - Array of field-getter functions: (item) => item.fieldName
 * @returns Filtered subset of items
 *
 * @example
 * simpleSearch(notifications, query, [
 *   (n) => n.title,
 *   (n) => n.message,
 * ])
 */
export function simpleSearch<T>(
  items: T[],
  query: string,
  fields: FieldGetter<T>[]
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;

  return items.filter((item) =>
    fields.some((getField) => {
      const val = getField(item);
      return val != null && val.toLowerCase().includes(trimmed);
    })
  );
}
