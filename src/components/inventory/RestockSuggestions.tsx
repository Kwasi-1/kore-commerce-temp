import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import type { TransferLine } from '@/components/inventory/TransferFormModal';

interface Suggestion {
  toLocationId: string;
  toLocationName: string;
  fromLocationId: string;
  fromLocationName: string;
  items: {
    variantId: string;
    productName: string;
    sku: string;
    baseUnitName: string;
    baseTierId: string | null;
    baseTierName: string;
    stock: number;
    dailySales: number;
    daysOfCover: number;
    suggested: number;
  }[];
}

interface Props {
  /** Open a transfer prefilled from a suggestion */
  onCreate: (prefill: { from: string; to: string; lines: TransferLine[] }) => void;
  /** Bumped by the parent after a transfer is created, to refresh */
  refreshKey?: number;
}

/** Stores short of cover at their recent sales rate, and what the warehouse can send them. */
export default function RestockSuggestions({ onCreate, refreshKey }: Props) {
  const [coverDays, setCoverDays] = useState(7);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/tenant/locations/restock-suggestions')
      .then((r) => {
        const d = r.data?.success?.data || {};
        setCoverDays(d.coverDays || 7);
        setSuggestions(d.suggestions || []);
      })
      .catch(() => setSuggestions([]));
  }, [refreshKey]);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border divide-y divide-border">
      <div className="p-4 flex items-center gap-2">
        <Icon icon="solar:lightbulb-bolt-linear" className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Restock suggestions</p>
        <p className="text-xs text-muted-foreground">Stores with less than {coverDays} days of stock at their recent sales</p>
      </div>
      {suggestions.map((s) => {
        const key = `${s.fromLocationId}-${s.toLocationId}`;
        const lines: TransferLine[] = s.items
          .filter((i) => i.baseTierId)
          .map((i) => ({
            variant_id: i.variantId,
            product_name: i.productName,
            sku: i.sku,
            tier_id: i.baseTierId as string,
            tier_name: i.baseTierName,
            units_per_tier: 1,
            quantity: i.suggested,
          }));
        return (
          <div key={key} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button type="button" onClick={() => setOpen(open === key ? null : key)} className="text-left min-w-0">
                <p className="text-sm text-foreground">
                  {s.toLocationName} needs {s.items.length} item{s.items.length === 1 ? '' : 's'} from {s.fromLocationName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {open === key ? 'Hide items' : 'Show items'}
                </p>
              </button>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => onCreate({ from: s.fromLocationId, to: s.toLocationId, lines })}>
                Create transfer
              </Button>
            </div>
            {open === key && (
              <ul className="mt-3 space-y-1.5">
                {s.items.map((i) => (
                  <li key={i.variantId} className="flex justify-between gap-3 text-xs">
                    <span className="text-foreground min-w-0 truncate">{i.productName} <span className="text-muted-foreground">{i.sku}</span></span>
                    <span className="text-muted-foreground shrink-0">
                      {i.daysOfCover} days left · send {i.suggested} {i.baseUnitName}{i.suggested === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
