import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/api/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { COMPARE_OPTIONS, GROUP_BY_OPTIONS, SORT_PRESETS } from '../constants';
import type { Channel, ProductGroup, ProductReportFilters } from '../types';

interface Props {
  filters: ProductReportFilters;
  setFilters: (patch: Partial<ProductReportFilters>) => void;
  clearFocus: () => void;
  groups: ProductGroup[];
  isMultiChannel: boolean;
  onNewGroup: () => void;
  onEditGroup: (group: ProductGroup) => void;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const triggerClass = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap',
    active
      ? 'bg-foreground/[0.06] border-foreground/20 text-foreground'
      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/60',
  );

function MultiFilter({
  label,
  icon,
  options,
  value,
  onChange,
  emptyText,
}: {
  label: string;
  icon: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  emptyText: string;
}) {
  const [query, setQuery] = useState('');
  const visible = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass(value.length > 0)}>
          <Icon icon={icon} className="w-3.5 h-3.5" />
          <span>{label}</span>
          {value.length > 0 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] leading-[18px] text-center">
              {value.length}
            </span>
          )}
          <Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0 bg-card text-card-foreground border-border">
        <div className="p-2 border-b border-border">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full h-8 px-2.5 text-sm rounded-md bg-muted/50 border border-border outline-none focus:border-foreground/30"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {visible.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>}
          {visible.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm cursor-pointer hover:bg-muted/60">
              <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <div className="p-2 border-t border-border">
            <button type="button" onClick={() => onChange([])} className="w-full h-8 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SingleSelect<T extends string>({
  icon,
  prefix,
  options,
  value,
  onChange,
  isDefault,
}: {
  icon: string;
  prefix: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  isDefault: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass(!isDefault)}>
          <Icon icon={icon} className="w-3.5 h-3.5" />
          <span className="font-normal">{prefix}</span>
          <span>{current?.label}</span>
          <Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1 bg-card text-card-foreground border-border">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => {
              onChange(o.key);
              setOpen(false);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm hover:bg-muted/60"
          >
            <span>{o.label}</span>
            {o.key === value && <Icon icon="lucide:check" className="w-4 h-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-muted text-xs font-medium text-foreground whitespace-nowrap">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-foreground/10">
        <Icon icon="lucide:x" className="w-3 h-3" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */

export default function ProductReportFilterBar({ filters, setFilters, clearFocus, groups, isMultiChannel, onNewGroup, onEditGroup }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);

  useEffect(() => {
    apiClient
      .get('/tenant/products/categories')
      .then((r) => setCategories(r.data?.success?.data?.categories || []))
      .catch(() => setCategories([]));
    apiClient
      .get('/tenant/products/brands')
      .then((r) => setBrands(r.data?.success?.data?.brands || []))
      .catch(() => setBrands([]));
  }, []);

  const activeGroup = useMemo(() => groups.find((g) => g.id === filters.groupId) || null, [groups, filters.groupId]);
  const selectionCount = filters.variantIds.length + filters.productIds.length;
  const hasChips = filters.categories.length > 0 || filters.brands.length > 0 || !!filters.groupId || selectionCount > 0;

  const channels: { key: Channel; label: string }[] = [
    { key: 'all', label: 'All Channels' },
    { key: 'pos', label: 'POS' },
    { key: 'online', label: 'Online' },
  ];

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border divide-y divide-border">
      {/* Row 1: ranking presets + channel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-3.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:flex-wrap">
          {SORT_PRESETS.filter((t) => !t.requiresCompare || filters.compare !== 'none').map((tab) => {
            const isActive = filters.sort === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilters({ sort: tab.key })}
                className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'dark:bg-foreground bg-sidebar text-background shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon icon={tab.icon} className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {isMultiChannel && (
          <div className="inline-flex p-1 rounded-lg bg-muted/50 border border-border/60 self-start sm:self-auto">
            {channels.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilters({ channel: c.key })}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filters.channel === c.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: scope filters + view options */}
      <div className="flex items-center gap-2 p-3 md:p-3.5 overflow-x-auto scrollbar-hide md:flex-wrap">
        <MultiFilter
          label="Category"
          icon="lucide:folder"
          options={categories}
          value={filters.categories}
          onChange={(v) => setFilters({ categories: v })}
          emptyText="No categories"
        />
        <MultiFilter
          label="Brand"
          icon="lucide:tag"
          options={brands}
          value={filters.brands}
          onChange={(v) => setFilters({ brands: v })}
          emptyText="No brands yet — add a brand to your products in Inventory"
        />

        <Popover open={groupOpen} onOpenChange={setGroupOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass(!!filters.groupId)}>
              <Icon icon="lucide:boxes" className="w-3.5 h-3.5" />
              <span>{activeGroup ? activeGroup.name : 'Product group'}</span>
              <Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1 bg-card text-card-foreground border-border">
            {groups.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                Save sets of products you compare often, e.g. "Kalypo flavours".
              </p>
            )}
            <div className="max-h-64 overflow-y-auto">
              {groups.map((g) => (
                <div key={g.id} className="group flex items-center rounded-md hover:bg-muted/60">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ groupId: g.id === filters.groupId ? null : g.id });
                      setGroupOpen(false);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-sm text-left"
                  >
                    <Icon icon={g.id === filters.groupId ? 'lucide:check' : 'lucide:boxes'} className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{g.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{g.item_count}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${g.name}`}
                    onClick={() => {
                      setGroupOpen(false);
                      onEditGroup(g);
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setGroupOpen(false);
                  onNewGroup();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-semibold hover:bg-muted/60"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                New product group
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <span className="hidden md:block w-px h-5 bg-border mx-1" />

        <SingleSelect
          icon="lucide:rows-3"
          prefix="Group by:"
          options={GROUP_BY_OPTIONS}
          value={filters.groupBy}
          onChange={(v) => setFilters({ groupBy: v })}
          isDefault={filters.groupBy === 'variant'}
        />
        <SingleSelect
          icon="lucide:git-compare"
          prefix="Compare:"
          options={COMPARE_OPTIONS}
          value={filters.compare}
          onChange={(v) => setFilters({ compare: v })}
          isDefault={filters.compare === 'none'}
        />
      </div>

      {/* Row 3: active scope chips */}
      {hasChips && (
        <div className="flex items-center gap-2 px-3 md:px-3.5 py-2.5 overflow-x-auto scrollbar-hide">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">Showing</span>
          {filters.categories.map((c) => (
            <Chip key={`c-${c}`} label={`Category: ${c}`} onRemove={() => setFilters({ categories: filters.categories.filter((x) => x !== c) })} />
          ))}
          {filters.brands.map((b) => (
            <Chip key={`b-${b}`} label={`Brand: ${b}`} onRemove={() => setFilters({ brands: filters.brands.filter((x) => x !== b) })} />
          ))}
          {filters.groupId && <Chip label={`Group: ${activeGroup?.name || '…'}`} onRemove={() => setFilters({ groupId: null })} />}
          {selectionCount > 0 && (
            <Chip label={`${selectionCount} selected item${selectionCount === 1 ? '' : 's'}`} onRemove={() => setFilters({ variantIds: [], productIds: [] })} />
          )}
          <button type="button" onClick={clearFocus} className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
