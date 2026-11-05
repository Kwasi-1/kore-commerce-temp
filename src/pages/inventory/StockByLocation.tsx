import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Switch } from '@nextui-org/react';
import toast from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';
import CustomModal from '@/components/modals/modal';
import Pagination from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import TransferFormModal, { TransferLine } from '@/components/inventory/TransferFormModal';
import RestockSuggestions from '@/components/inventory/RestockSuggestions';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import { useCan } from '@/hooks/usePermissions';
import type { StoreLocation } from '@/store/locationStore';

interface GridRow {
  variantId: string;
  productName: string;
  variantLabel: string | null;
  sku: string;
  baseUnitName: string;
  baseTierId: string | null;
  baseTierName: string;
  stock: Record<string, number>;
  reorder: Record<string, number>;
  below: string[];
  inTransit: number;
  total: number;
}

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

/** Each product's stock at each location, what's in transit, and what's below its alert level. */
export default function StockByLocation() {
  const can = useCan();
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [search, setSearch] = useState('');
  const [belowOnly, setBelowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [transferPrefill, setTransferPrefill] = useState<{ from?: string; to?: string; lines?: TransferLine[] } | null>(null);
  const [levelsFor, setLevelsFor] = useState<GridRow | null>(null);
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [savingLevels, setSavingLevels] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (belowOnly) params.set('below', '1');
      const res = await apiClient.get(`/tenant/locations/stock-grid?${params.toString()}`);
      const d = res.data?.success?.data || {};
      setLocations(d.locations || []);
      setRows(d.rows || []);
      setPages(d.pagination?.pages || 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Couldn't load stock");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, belowOnly]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const picked = rows.filter((r) => selected[r.variantId]);

  /** Prefill a transfer: to the location most below its alert levels, from the one with the most stock */
  const startTransfer = () => {
    if (picked.length === 0) return;
    const belowCount: Record<string, number> = {};
    picked.forEach((r) => r.below.forEach((l) => (belowCount[l] = (belowCount[l] || 0) + 1)));
    const to = Object.entries(belowCount).sort((a, b) => b[1] - a[1])[0]?.[0] || locations[1]?.id;
    const held: Record<string, number> = {};
    picked.forEach((r) => Object.entries(r.stock).forEach(([l, q]) => l !== to && (held[l] = (held[l] || 0) + q)));
    const from = Object.entries(held).sort((a, b) => b[1] - a[1])[0]?.[0];
    const lines: TransferLine[] = picked
      .filter((r) => r.baseTierId)
      .map((r) => {
        const level = to ? r.reorder[to] || 0 : 0;
        const have = to ? r.stock[to] || 0 : 0;
        // Fill up to twice the alert level, at least 1
        const want = Math.max(1, Math.ceil(level * 2 - have));
        return {
          variant_id: r.variantId,
          product_name: r.variantLabel ? `${r.productName} · ${r.variantLabel}` : r.productName,
          sku: r.sku,
          tier_id: r.baseTierId as string,
          tier_name: r.baseTierName,
          units_per_tier: 1,
          quantity: from ? Math.min(want, Math.max(0, Math.floor(r.stock[from] || 0))) || want : want,
        };
      });
    setTransferPrefill({ from, to, lines });
  };

  const openLevels = (r: GridRow) => {
    setLevelsFor(r);
    setLevels(Object.fromEntries(locations.map((l) => [l.id, String(r.reorder[l.id] ?? '')])));
  };

  const saveLevels = async () => {
    if (!levelsFor) return;
    setSavingLevels(true);
    try {
      for (const l of locations) {
        const now = levels[l.id];
        if (String(levelsFor.reorder[l.id] ?? '') === now) continue;
        await apiClient.put(`/tenant/locations/${l.id}/reorder-points`, {
          points: { [levelsFor.variantId]: now === '' ? null : Number(now) },
        });
      }
      toast.success('Alert levels saved');
      setLevelsFor(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Couldn't save alert levels");
    } finally {
      setSavingLevels(false);
    }
  };

  const cell = (r: GridRow, l: StoreLocation) => {
    const q = r.stock[l.id] ?? 0;
    const low = r.below.includes(l.id);
    return (
      <span className={cn('font-medium', q <= 0 ? 'text-destructive' : low ? 'text-amber-600' : 'text-foreground')}>
        {fmt(q)}
      </span>
    );
  };

  return (
    <PageLayout title="Stock by location">
      <div className="space-y-4 mb-4">
        {can('stock.transfer') && <RestockSuggestions onCreate={setTransferPrefill} refreshKey={refreshKey} />}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products or SKU"
              className="w-full h-10 rounded-lg border border-border bg-card pl-9 pr-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer shrink-0">
            <Switch size="sm" isSelected={belowOnly} onValueChange={(v) => { setBelowOnly(v); setPage(1); }} color="primary" />
            Below alert level only
          </label>
          {can('stock.transfer') && (
            <Button onClick={startTransfer} disabled={picked.length === 0} className="gap-2 shrink-0">
              <Icon icon="solar:transfer-horizontal-linear" className="h-4 w-4" />
              Transfer {picked.length > 0 ? picked.length : ''} selected
            </Button>
          )}
        </div>

        {/* Desktop: a grid with a column per location */}
        <div className="hidden md:block bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-10 px-3 py-3" />
                <th className="text-left font-medium px-3 py-3 sticky left-0 bg-card">Product</th>
                {locations.map((l) => (
                  <th key={l.id} className="text-right font-medium px-3 py-3 whitespace-nowrap">{l.name}</th>
                ))}
                <th className="text-right font-medium px-3 py-3 whitespace-nowrap">In transit</th>
                <th className="text-right font-medium px-3 py-3">Total</th>
                <th className="w-24 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={locations.length + 5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={locations.length + 5} className="p-6 text-center text-muted-foreground">Nothing to show here</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.variantId} className={cn(selected[r.variantId] && 'bg-muted/40')}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={!!selected[r.variantId]}
                        onChange={(e) => setSelected((s) => ({ ...s, [r.variantId]: e.target.checked }))}
                        aria-label={`Select ${r.productName}`}
                      />
                    </td>
                    <td className="px-3 py-3 sticky left-0 bg-card">
                      <p className="font-medium text-foreground">{r.productName}{r.variantLabel ? ` · ${r.variantLabel}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{r.sku}</p>
                    </td>
                    {locations.map((l) => (
                      <td key={l.id} className="px-3 py-3 text-right whitespace-nowrap">{cell(r, l)}</td>
                    ))}
                    <td className="px-3 py-3 text-right text-muted-foreground">{r.inTransit ? fmt(r.inTransit) : '—'}</td>
                    <td className="px-3 py-3 text-right font-medium">{fmt(r.total)}</td>
                    <td className="px-3 py-3 text-right">
                      {can('stock.adjust') && (
                        <button type="button" onClick={() => openLevels(r)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                          Alert levels
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phones and tablets: one row per product, locations as a line underneath */}
        <div className="md:hidden bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {rows.map((r) => (
            <div key={r.variantId} className="p-4 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!selected[r.variantId]}
                onChange={(e) => setSelected((s) => ({ ...s, [r.variantId]: e.target.checked }))}
                aria-label={`Select ${r.productName}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{r.productName}{r.variantLabel ? ` · ${r.variantLabel}` : ''}</p>
                  <p className="text-sm font-semibold shrink-0">{fmt(r.total)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{r.sku}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                  {locations.map((l) => (
                    <span key={l.id}><span className="text-muted-foreground">{l.name}</span> {cell(r, l)}</span>
                  ))}
                  {r.inTransit > 0 && <span><span className="text-muted-foreground">In transit</span> {fmt(r.inTransit)}</span>}
                </div>
              </div>
              {can('stock.adjust') && (
                <button type="button" onClick={() => openLevels(r)} className="text-xs text-muted-foreground underline underline-offset-4 shrink-0">
                  Alerts
                </button>
              )}
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex justify-end">
            <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <TransferFormModal
        isOpen={!!transferPrefill}
        initial={transferPrefill}
        onClose={() => setTransferPrefill(null)}
        onCreated={() => {
          setSelected({});
          setRefreshKey((k) => k + 1);
          load();
        }}
      />

      <CustomModal
        isOpen={!!levelsFor}
        onOpenChange={() => !savingLevels && setLevelsFor(null)}
        size="sm"
        classNames={{ base: 'w-[380px] rounded-3xl' }}
        header={<h3 className="text-base font-bold text-foreground pt-2">Alert levels</h3>}
        body={
          levelsFor && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-foreground">{levelsFor.productName}{levelsFor.variantLabel ? ` · ${levelsFor.variantLabel}` : ''}</p>
              {locations.map((l) => (
                <label key={l.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{l.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={levels[l.id] ?? ''}
                    onChange={(e) => setLevels((x) => ({ ...x, [l.id]: e.target.value }))}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-24 h-9 rounded-lg border border-border bg-background px-2 text-sm text-right"
                  />
                </label>
              ))}
            </div>
          )
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" disabled={savingLevels} onClick={() => setLevelsFor(null)}>Cancel</Button>
            <Button variant="neutral" disabled={savingLevels} onClick={saveLevels}>{savingLevels ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      />
    </PageLayout>
  );
}
