import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import type {
  Channel,
  CompareMode,
  GroupBy,
  ProductReportFilters,
  ProductReportRow,
  ProductReportSummary,
  SortPreset,
  TrendData,
} from '../types';
import { resolveDateRange, toDateParam } from '../utils/dates';

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

const GROUP_BYS = ['variant', 'product', 'brand', 'category'] as const;
const COMPARES = ['none', 'previous_period', 'previous_year'] as const;
const SORTS = ['top_selling', 'units_sold', 'margin', 'slow_movers', 'low_stock', 'decliners'] as const;
const CHANNELS = ['all', 'pos', 'online'] as const;

function readFilters(sp: URLSearchParams): ProductReportFilters {
  const range = sp.get('range') || 'this_month';
  const { start, end } = resolveDateRange(range, sp.get('from'), sp.get('to'));
  return {
    range,
    start,
    end,
    channel: oneOf<Channel>(sp.get('channel'), CHANNELS, 'all'),
    categories: list(sp.get('category')),
    brands: list(sp.get('brand')),
    groupId: sp.get('group') || null,
    variantIds: list(sp.get('vids')),
    productIds: list(sp.get('pids')),
    groupBy: oneOf<GroupBy>(sp.get('by'), GROUP_BYS, 'variant'),
    compare: oneOf<CompareMode>(sp.get('compare'), COMPARES, 'none'),
    sort: oneOf<SortPreset>(sp.get('sort'), SORTS, 'top_selling'),
    search: sp.get('q') || '',
  };
}

function writeFilters(f: ProductReportFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.range !== 'this_month') sp.set('range', f.range);
  if (f.range === 'custom') {
    const from = toDateParam(f.start);
    const to = toDateParam(f.end);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
  }
  if (f.channel !== 'all') sp.set('channel', f.channel);
  if (f.categories.length) sp.set('category', f.categories.join(','));
  if (f.brands.length) sp.set('brand', f.brands.join(','));
  if (f.groupId) sp.set('group', f.groupId);
  if (f.variantIds.length) sp.set('vids', f.variantIds.join(','));
  if (f.productIds.length) sp.set('pids', f.productIds.join(','));
  if (f.groupBy !== 'variant') sp.set('by', f.groupBy);
  if (f.compare !== 'none') sp.set('compare', f.compare);
  if (f.sort !== 'top_selling') sp.set('sort', f.sort);
  if (f.search) sp.set('q', f.search);
  return sp;
}

/** Query params shared by /reports/products and /reports/products/trend. */
export function buildApiParams(f: ProductReportFilters, includeChannel: boolean): URLSearchParams {
  const p = new URLSearchParams();
  if (f.start) p.set('start_date', f.start.toISOString());
  if (f.end) p.set('end_date', f.end.toISOString());
  if (includeChannel && f.channel !== 'all') p.set('channel', f.channel);
  if (f.categories.length) p.set('category', f.categories.join(','));
  if (f.brands.length) p.set('brand', f.brands.join(','));
  if (f.groupId) p.set('group_id', f.groupId);
  if (f.variantIds.length) p.set('variant_ids', f.variantIds.join(','));
  if (f.productIds.length) p.set('product_ids', f.productIds.join(','));
  if (f.search) p.set('search', f.search);
  p.set('group_by', f.groupBy);
  return p;
}

export function isFocusedView(f: ProductReportFilters) {
  return Boolean(f.categories.length || f.brands.length || f.groupId || f.variantIds.length || f.productIds.length);
}

export function useProductReport(isMultiChannel: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ProductReportFilters>) => {
      setSearchParams(
        (prev) => {
          const next = { ...readFilters(prev), ...patch };
          // "Biggest decline" only makes sense while comparing
          if (next.compare === 'none' && next.sort === 'decliners') next.sort = 'top_selling';
          return writeFilters(next);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFocus = useCallback(
    () => setFilters({ categories: [], brands: [], groupId: null, variantIds: [], productIds: [], search: '' }),
    [setFilters],
  );

  const [rows, setRows] = useState<ProductReportRow[]>([]);
  const [summary, setSummary] = useState<ProductReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  const focused = isFocusedView(filters);
  const apiKey = buildApiParams(filters, isMultiChannel).toString();

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(apiKey);
      params.set('sort', filters.sort);
      if (filters.compare !== 'none') params.set('compare', filters.compare);
      const response = await apiClient.get(`/tenant/reports/products?${params.toString()}`);
      const data = response.data?.success?.data || response.data?.data || {};
      setRows(data.products || []);
      setSummary(data.summary || null);
    } catch (error: any) {
      console.error('Failed to fetch product report:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to load product report');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, filters.sort, filters.compare]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!focused) {
      setTrend(null);
      return;
    }
    let cancelled = false;
    setIsTrendLoading(true);
    apiClient
      .get(`/tenant/reports/products/trend?${apiKey}`)
      .then((response) => {
        if (!cancelled) setTrend(response.data?.success?.data || response.data?.data || null);
      })
      .catch((error) => {
        console.error('Failed to fetch product trend:', error);
        if (!cancelled) setTrend(null);
      })
      .finally(() => {
        if (!cancelled) setIsTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, focused]);

  return { filters, setFilters, clearFocus, focused, rows, summary, isLoading, trend, isTrendLoading, refetch: fetchReport };
}
