import {
  endOfDay,
  endOfMonth,
  endOfToday,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
  subDays,
  subYears,
} from 'date-fns';

/** Mirrors the shortcut ranges in CustomOnlyDateFilterComponent so a range can be rebuilt from the URL. */
export function resolveDateRange(range: string, from?: string | null, to?: string | null): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range) {
    case 'all_time':
      return { start: null, end: null };
    case 'today':
      return { start: startOfToday(), end: endOfToday() };
    case 'yesterday':
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    case 'this_week':
      return { start: startOfWeek(now), end: endOfToday() };
    case 'last_week':
      return { start: startOfWeek(subDays(now, 7)), end: endOfDay(subDays(startOfWeek(now), 1)) };
    case 'last_month':
      return { start: startOfMonth(subDays(startOfMonth(now), 1)), end: endOfMonth(subDays(startOfMonth(now), 1)) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'last_year':
      return { start: startOfYear(subDays(startOfYear(now), 1)), end: endOfYear(subYears(now, 1)) };
    case 'custom': {
      const s = from ? parseISO(from) : null;
      const e = to ? parseISO(to) : s;
      if (s && isValid(s)) return { start: startOfDay(s), end: endOfDay(e && isValid(e) ? e : s) };
      break;
    }
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function formatRangeLabel(range: string, start: Date | null, end: Date | null): string {
  if (range === 'all_time' || !start) return 'All time';
  const s = format(start, 'd MMM yyyy');
  const e = end ? format(end, 'd MMM yyyy') : s;
  return s === e ? s : `${s} – ${e}`;
}

export function toDateParam(d: Date | null): string | null {
  return d ? format(d, 'yyyy-MM-dd') : null;
}
