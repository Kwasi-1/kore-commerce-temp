/**
 * The page buttons to show. Five at most near either end, seven in the middle so the current
 * page keeps a neighbour each side:
 *   1 2 3 … 20      (pages 1–3)
 *   1 … 10 11 12 … 20  (in the middle)
 *   1 … 18 19 20     (last three pages)
 * Every page when there are five or fewer.
 */
export type PageItem = number | 'gap-start' | 'gap-end';

export function pageWindow(current: number, total: number): PageItem[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 'gap-end', total];
  if (current >= total - 2) return [1, 'gap-start', total - 2, total - 1, total];
  return [1, 'gap-start', current - 1, current, current + 1, 'gap-end', total];
}
