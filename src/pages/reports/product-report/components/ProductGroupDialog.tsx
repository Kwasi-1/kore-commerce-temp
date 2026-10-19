import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/api/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { ProductGroup } from '../types';
import type { ProductGroupInput } from '../hooks/useProductGroups';

interface PickerVariant {
  id: string;
  sku: string;
  variant_attributes: Record<string, any> | null;
}
interface PickerProduct {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  has_variants: boolean;
  variants: PickerVariant[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing group, or null to create one. */
  group: ProductGroup | null;
  /** Pre-filled members (e.g. from the table selection) with display names. */
  initial?: { product_ids: string[]; variant_ids: string[]; labels: Record<string, string> };
  onSave: (input: ProductGroupInput) => Promise<boolean>;
  onDelete?: (group: ProductGroup) => Promise<boolean>;
}

const variantLabel = (v: PickerVariant) => {
  const attrs = v.variant_attributes && typeof v.variant_attributes === 'object' ? Object.values(v.variant_attributes).filter(Boolean) : [];
  return attrs.length ? attrs.join(' / ') : v.sku;
};

export default function ProductGroupDialog({ open, onOpenChange, group, initial, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setName(group?.name || '');
    setDescription(group?.description || '');
    setProductIds(group?.product_ids || initial?.product_ids || []);
    setVariantIds(group?.variant_ids || initial?.variant_ids || []);
    setLabels(initial?.labels || {});
    setQuery('');
    setExpanded({});
  }, [open, group, initial]);

  // Debounced catalog search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ per_page: '20' });
        if (query.trim()) params.set('search', query.trim());
        const r = await apiClient.get(`/tenant/products?${params.toString()}`);
        const products: PickerProduct[] = r.data?.success?.data?.products || [];
        setResults(products);
        setLabels((prev) => {
          const next = { ...prev };
          products.forEach((p) => {
            next[p.id] = p.name;
            (p.variants || []).forEach((v) => {
              next[v.id] = `${p.name} · ${variantLabel(v)}`;
            });
          });
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const selected = useMemo(
    () => [
      ...productIds.map((id) => ({ id, kind: 'product' as const, label: labels[id] || 'Product' })),
      ...variantIds.map((id) => ({ id, kind: 'variant' as const, label: labels[id] || 'Variant' })),
    ],
    [productIds, variantIds, labels],
  );

  const canSave = name.trim().length > 0 && selected.length > 0 && !isSaving;

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await onSave({ name: name.trim(), description: description.trim() || null, product_ids: productIds, variant_ids: variantIds });
    setIsSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card text-card-foreground border-border max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit product group' : 'New product group'}</DialogTitle>
          <DialogDescription>
            Save a set of products to compare them side by side, e.g. all Kalypo flavours. Ticking a product includes all its variants.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Kalypo flavours"
              className="h-9 px-3 rounded-md bg-background border border-border outline-none focus:border-foreground/30"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Juice drinks restocked weekly"
              className="h-9 px-3 rounded-md bg-background border border-border outline-none focus:border-foreground/30"
            />
          </label>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selected.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-muted text-xs font-medium">
                <Icon icon={s.kind === 'product' ? 'lucide:package' : 'lucide:box'} className="w-3 h-3 text-muted-foreground" />
                <span className="max-w-[220px] truncate">{s.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${s.label}`}
                  onClick={() => (s.kind === 'product' ? toggle(productIds, setProductIds, s.id) : toggle(variantIds, setVariantIds, s.id))}
                  className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-foreground/10"
                >
                  <Icon icon="lucide:x" className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col min-h-0 flex-1 rounded-lg border border-border">
          <div className="p-2 border-b border-border relative">
            <Icon icon="lucide:search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products to add…"
              className="w-full h-9 pl-8 pr-3 text-sm rounded-md bg-muted/50 border border-transparent outline-none focus:border-foreground/20"
            />
          </div>
          <div className="overflow-y-auto max-h-[38vh] p-1">
            {isSearching && results.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Searching…</p>}
            {!isSearching && results.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No products found</p>}
            {results.map((p) => {
              const multi = p.has_variants && (p.variants || []).length > 1;
              const productChecked = productIds.includes(p.id);
              const variantsPicked = (p.variants || []).filter((v) => variantIds.includes(v.id)).length;
              return (
                <div key={p.id} className="rounded-md">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-muted/50 rounded-md">
                    <Checkbox checked={productChecked} onCheckedChange={() => toggle(productIds, setProductIds, p.id)} />
                    <button type="button" className="flex-1 min-w-0 text-left" onClick={() => toggle(productIds, setProductIds, p.id)}>
                      <span className="block text-sm font-medium truncate">{p.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {[p.brand, p.category, multi ? `${p.variants.length} variants` : null].filter(Boolean).join(' • ')}
                        {variantsPicked > 0 && !productChecked && ` • ${variantsPicked} picked`}
                      </span>
                    </button>
                    {multi && (
                      <button
                        type="button"
                        aria-label="Pick individual variants"
                        onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Icon icon={expanded[p.id] ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {multi && expanded[p.id] && (
                    <div className="pl-9 pb-1">
                      {p.variants.map((v) => (
                        <label key={v.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                          <Checkbox
                            disabled={productChecked}
                            checked={productChecked || variantIds.includes(v.id)}
                            onCheckedChange={() => toggle(variantIds, setVariantIds, v.id)}
                          />
                          <span className="truncate">{variantLabel(v)}</span>
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{v.sku}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-row items-center sm:justify-between gap-2">
          {group && onDelete ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:text-rose-700"
              onClick={async () => {
                if (window.confirm(`Delete the group "${group.name}"? Products are not affected.`)) {
                  if (await onDelete(group)) onOpenChange(false);
                }
              }}
            >
              Delete group
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={handleSave}>
              {isSaving ? 'Saving…' : group ? 'Save changes' : 'Create group'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
