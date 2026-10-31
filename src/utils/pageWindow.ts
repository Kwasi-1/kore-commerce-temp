/**
 * The page buttons to show: the first and last page, the current page with one neighbour each
 * side, and "…" for the gaps, e.g. 1 … 4 5 6 … 20. Always the same length once there are enough
 * pages (so the bar doesn't jump around), and every page when there are 7 or fewer.
 */
export type PageItem = number | 'gap-start' | 'gap-end';

export function pageWindow(current: number, total: number, siblings = 1): PageItem[] {
  const slots = siblings * 2 + 5; // first, last, current, siblings, two gaps
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);

  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showStartGap = left > 3;
  const showEndGap = right < total - 2;

  if (!showStartGap) return [...range(1, slots - 2), 'gap-end', total];
  if (!showEndGap) return [1, 'gap-start', ...range(total - (slots - 3), total)];
  return [1, 'gap-start', ...range(left, right), 'gap-end', total];
}
