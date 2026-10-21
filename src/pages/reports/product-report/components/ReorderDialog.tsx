import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { ProductReportFilters, ReorderSuggestion } from '../types';
import { buildApiParams } from '../hooks/useProductReport';
import { formatRangeLabel } from '../utils/dates';
import { formatCover, formatMoney, formatQty, rowDisplayName } from '../utils/format';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProductReportFilters;
  isMultiChannel: boolean;
  scopeLabel: string | null;
}

/** One editable line of the restock plan. */
interface Line {
  s: ReorderSuggestion;
  include: boolean;
  tierId: string;
  qty: string;
  costPerTier: string;
  supplierId: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

const inputClass =
  'h-8 px-2 text-sm rounded-md bg-background border border-border outline-none focus:border-foreground/30 tabular-nums';

function toLine(s: ReorderSuggestion): Line {
  return {
    s,
    include: true,
    tierId: s.tier.id,
    qty: String(s.suggested_tier_qty),
    costPerTier: s.cost_per_tier !== null ? String(Math.round(s.cost_per_tier * 100) / 100) : '',
    supplierId: s.last_supplier?.id || '',
  };
}

export default function ReorderDialog({ open, onOpenChange, filters, isMultiChannel, scopeLabel }: Props) {
  const navigate = useNavigate();
  const [leadDays, setLeadDays] = useState('3');
  const [coverDays, setCoverDays] = useState('14');
  const [lines, setLines] = useState<Line[]>([]);
  // Made in-house items are produced, not ordered from a supplier
  const [toMake, setToMake] = useState<ReorderSuggestion[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildApiParams(filters, isMultiChannel);
      params.set('lead_time_days', leadDays || '0');
      params.set('cover_days', coverDays || '14');
      const r = await apiClient.get(`/tenant/reports/products/reorder?${params.toString()}`);
      const data = r.data?.success?.data || {};
      const all: ReorderSuggestion[] = data.suggestions || [];
      setLines(all.filter((s) => !s.is_made_in_house).map(toLine));
      setToMake(all.filter((s) => s.is_made_in_house));
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to load restock suggestions');
      setLines([]);
      setToMake([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isMultiChannel, leadDays, coverDays]);

  // Reload when opened and (debounced) when the planning horizon changes
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get('/tenant/suppliers?status=active&limit=100')
      .then((r) => setSuppliers((r.data?.success?.data?.suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => setSuppliers([]));
  }, [open]);

  const update = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.s.variant_id === variantId ? { ...l, ...patch } : l)));

  /** Switching pack size keeps the base-unit need and per-unit cost, rescaled to the new tier. */
  const changeTier = (line: Line, tierId: string) => {
    const from = line.s.tiers.find((t) => t.id === line.tierId) || line.s.tier;
    const to = line.s.tiers.find((t) => t.id === tierId);
    if (!to) return;
    const cost = parseFloat(line.costPerTier);
    update(line.s.variant_id, {
      tierId,
      qty: String(Math.max(1, Math.ceil(line.s.needed_base_units / to.units_per_tier))),
      costPerTier: Number.isFinite(cost) ? String(Math.round((cost / from.units_per_tier) * to.units_per_tier * 100) / 100) : line.costPerTier,
    });
  };

  const included = lines.filter((l) => l.include);
  const lineTotal = (l: Line) => (parseFloat(l.qty) || 0) * (parseFloat(l.costPerTier) || 0);
  const total = included.reduce((sum, l) => sum + lineTotal(l), 0);

  const problems = useMemo(() => {
    const out: string[] = [];
    if (included.some((l) => !l.supplierId)) out.push('choose a supplier');
    if (included.some((l) => !(parseFloat(l.costPerTier) > 0))) out.push('enter a cost price');
    if (included.some((l) => !(parseInt(l.qty, 10) > 0))) out.push('enter a quantity');
    return out;
  }, [included]);

  const bySupplier = useMemo(() => {
    const groups: Record<string, Line[]> = {};
    included.forEach((l) => {
      if (l.supplierId) (groups[l.supplierId] ||= []).push(l);
    });
    return groups;
  }, [included]);

  const handleCreate = async () => {
    if (problems.length || included.length === 0) return;
    setIsCreating(true);
    const stamp = format(new Date(), 'yyyyMMdd');
    let created = 0;
    try {
      for (const [supplierId, supplierLines] of Object.entries(bySupplier)) {
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        await apiClient.post('/tenant/purchase-orders', {
          supplier_id: supplierId,
          reference_number: `RST-${stamp}-${suffix}`,
          notes: `Draft from Product Performance restock plan${scopeLabel ? ` (${scopeLabel})` : ''}: ${coverDays} days of cover + ${leadDays} days lead time, based on sales ${formatRangeLabel(
            filters.range,
            filters.start,
            filters.end,
          ).toLowerCase()}.`,
          items: supplierLines.map((l) => ({
            variant_id: l.s.variant_id,
            packaging_tier_id: l.tierId,
            quantity: parseInt(l.qty, 10),
            cost_price: parseFloat(l.costPerTier),
          })),
        });
        created += 1;
      }
      toast.success(`Created ${created} draft purchase order${created === 1 ? '' : 's'}`);
      onOpenChange(false);
      navigate('/inventory/purchase-orders');
    } catch (error: any) {
      toast.error(
        `${created > 0 ? `Created ${created}, then failed: ` : ''}${error?.response?.data?.error?.message || 'Failed to create purchase order'}`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <CustomModal
      isOpen={open}
      onOpenChange={() => onOpenChange(false)}
      size="5xl"
      header={
        <div className="pt-2 px-2 border-b border-border/60 pb-3">
          <h2 className="text-lg font-bold !tracking-tight">Plan restock{scopeLabel ? ` — ${scopeLabel}` : ''}</h2>
          <p className="text-xs md:text-[13px] text-muted-foreground !tracking-tight">
            Quantities cover your sales rate ({formatRangeLabel(filters.range, filters.start, filters.end).toLowerCase()}) for the lead time plus
            the target days of stock, minus what's on hand and already on open purchase orders.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Supplier lead time (days)
              <input type="number" min={0} max={90} value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className={`${inputClass} w-28`} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Target stock (days of sales)
              <input type="number" min={1} max={180} value={coverDays} onChange={(e) => setCoverDays(e.target.value)} className={`${inputClass} w-28`} />
            </label>
            <p className="text-xs text-muted-foreground pb-2">
              {isLoading ? 'Calculating…' : `${lines.length} item${lines.length === 1 ? '' : 's'} need restocking`}
            </p>
          </div>

          {toMake.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold mb-2">Make in-house</p>
              <ul className="space-y-1">
                {toMake.map((s) => (
                  <li key={s.variant_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{rowDisplayName(s)}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      make about <b className="text-foreground">{formatQty(Math.ceil(s.needed_base_units))}</b> · {formatCover(s.days_of_cover)} left
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">Record them with “Record Batch” on the Products page once made.</p>
            </div>
          )}

          <div className="max-h-[55vh] overflow-auto rounded-lg border border-border !font-sans">
            {!isLoading && lines.length === 0 ? (
              <div className="py-16 text-center">
                <Icon icon="lucide:check-circle-2" className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 text-sm font-medium">{toMake.length ? 'Nothing to order from suppliers' : 'Nothing needs restocking for this horizon'}</p>
                <p className="text-xs text-muted-foreground">Try a longer target, or a date range with more sales.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">On hand · On order</th>
                    <th className="px-3 py-2 text-right font-medium">Sales/day · Cover</th>
                    <th className="px-3 py-2 text-left font-medium">Order</th>
                    <th className="px-3 py-2 text-left font-medium">Cost / pack</th>
                    <th className="px-3 py-2 text-left font-medium">Supplier</th>
                    <th className="px-3 py-2 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && lines.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={8} className="px-3 py-3">
                            <div className="h-5 rounded bg-muted/60 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : lines.map((l) => (
                        <tr key={l.s.variant_id} className={l.include ? '' : 'opacity-50'}>
                          <td className="px-3 py-2.5">
                            <Checkbox checked={l.include} onCheckedChange={(v) => update(l.s.variant_id, { include: v === true })} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium leading-tight">{rowDisplayName(l.s)}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{l.s.sku}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {formatQty(l.s.stock_quantity)}
                            <span className="text-muted-foreground"> · {formatQty(l.s.on_order_base_units)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {formatQty(l.s.velocity_per_day)}
                            <span className={l.s.days_of_cover < 7 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}>
                              {' '}· {formatCover(l.s.days_of_cover)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={l.qty}
                                onChange={(e) => update(l.s.variant_id, { qty: e.target.value })}
                                className={`${inputClass} w-16`}
                                aria-label="Quantity"
                              />
                              <select value={l.tierId} onChange={(e) => changeTier(l, e.target.value)} className={`${inputClass} max-w-[130px]`} aria-label="Pack size">
                                {l.s.tiers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                    {t.units_per_tier > 1 ? ` (${t.units_per_tier})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              value={l.costPerTier}
                              onChange={(e) => update(l.s.variant_id, { costPerTier: e.target.value })}
                              className={`${inputClass} w-24 ${l.include && !(parseFloat(l.costPerTier) > 0) ? 'border-rose-500/60' : ''}`}
                              aria-label="Cost per pack"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={l.supplierId}
                              onChange={(e) => update(l.s.variant_id, { supplierId: e.target.value })}
                              className={`${inputClass} w-40 ${l.include && !l.supplierId ? 'border-rose-500/60' : ''}`}
                              aria-label="Supplier"
                            >
                              <option value="">Choose…</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatMoney(lineTotal(l))}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full pt-2">
          <div className="text-sm">
            <span className="font-semibold">{formatMoney(total)}</span>
            <span className="text-muted-foreground">
              {' '}· {included.length} item{included.length === 1 ? '' : 's'} · {Object.keys(bySupplier).length} supplier
              {Object.keys(bySupplier).length === 1 ? '' : 's'}
            </span>
            {problems.length > 0 && included.length > 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-400">To continue, {problems.join(', ')} for every ticked item.</p>
            )}
            {suppliers.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">No active suppliers yet — add one under Inventory › Suppliers.</p>
            )}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="hidden md:flex">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isCreating || isLoading || included.length === 0 || problems.length > 0}
              onClick={handleCreate}
              className="bg-primary text-xs md:text-sm text-primary-foreground font-semibold flex items-center gap-1.5 px-5"
            >
              {isCreating ? 'Creating…' : `Create draft PO${Object.keys(bySupplier).length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      }
    />
  );
}
