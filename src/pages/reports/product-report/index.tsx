import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Selection } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';
import { CustomOnlyDateFilterComponent, type DateFilterValue } from '@/components/shared/custom-only-date-filter';
import type { TopContentAction } from '@/components/shared/MainTableComponent';
import { MobileActionCapsuleBar } from '@/components/mobile-dashboard';
import { useFeaturesStore } from '@/store/featuresStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import ProductReportFilterBar from './components/ProductReportFilterBar';
import ProductReportKpis from './components/ProductReportKpis';
import ProductReportTable from './components/ProductReportTable';
import ProductCompareView from './components/ProductCompareView';
import ProductGroupDialog from './components/ProductGroupDialog';
import { useProductReport } from './hooks/useProductReport';
import { useProductGroups, type ProductGroupInput } from './hooks/useProductGroups';
import { buildHighlights } from './utils/insights';
import { rowDisplayName } from './utils/format';
import type { ProductGroup, ProductReportRow } from './types';

type GroupDialogState = {
  open: boolean;
  group: ProductGroup | null;
  initial?: { product_ids: string[]; variant_ids: string[]; labels: Record<string, string> };
};

/** Split selected rows into the variant/product IDs the API filters on. */
function selectionToIds(rows: ProductReportRow[], groupBy: string) {
  const variant_ids: string[] = [];
  const product_ids: string[] = [];
  const labels: Record<string, string> = {};
  rows.forEach((r) => {
    if (groupBy === 'variant' && r.variant_id) {
      variant_ids.push(r.variant_id);
      labels[r.variant_id] = rowDisplayName(r);
    } else if (r.product_id) {
      product_ids.push(r.product_id);
      labels[r.product_id] = r.name;
    }
  });
  return { variant_ids, product_ids, labels };
}

export default function ProductReport() {
  const { hasModule } = useFeaturesStore();
  const isMultiChannel = hasModule('pos') && hasModule('ecommerce');
  const { tenant, staffUser } = useAuthStore();
  const storeSettings = useSettingsStore((s: any) => s.storeSettings);

  const { filters, setFilters, clearFocus, focused, rows, summary, isLoading, trend, isTrendLoading } = useProductReport(isMultiChannel);
  const { groups, createGroup, updateGroup, deleteGroup } = useProductGroups();

  // Debounced search → URL → server
  const [searchInput, setSearchInput] = useState(filters.search);
  useEffect(() => {
    if (searchInput === filters.search) return;
    const t = setTimeout(() => setFilters({ search: searchInput.trim() }), 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.search, setFilters]);

  // Row selection (desktop table)
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  useEffect(() => setSelectedKeys(new Set([])), [rows]);
  const selectedRows = useMemo(
    () => (selectedKeys === 'all' ? rows : rows.filter((r) => (selectedKeys as Set<React.Key>).has(r.id))),
    [selectedKeys, rows],
  );

  const [groupDialog, setGroupDialog] = useState<GroupDialogState>({ open: false, group: null });
  const [isExporting, setIsExporting] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find((g) => g.id === filters.groupId) || null;
  const selectionCount = filters.variantIds.length + filters.productIds.length;
  const scopeLabel = activeGroup
    ? activeGroup.name
    : filters.brands.length
      ? filters.brands.join(', ')
      : filters.categories.length
        ? filters.categories.join(', ')
        : selectionCount
          ? `${selectionCount} selected items`
          : null;

  const itemNoun = filters.groupBy === 'brand' ? 'brands' : filters.groupBy === 'category' ? 'categories' : 'items';
  const highlights = useMemo(() => buildHighlights(rows, summary, itemNoun), [rows, summary, itemNoun]);

  const handleCompareSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    if (filters.groupBy === 'brand') {
      setFilters({ brands: selectedRows.map((r) => r.name).filter((n) => n !== 'No brand') });
    } else if (filters.groupBy === 'category') {
      setFilters({ categories: selectedRows.map((r) => r.name).filter((n) => n !== 'Uncategorized') });
    } else {
      const { variant_ids, product_ids } = selectionToIds(selectedRows, filters.groupBy);
      setFilters({ variantIds: variant_ids, productIds: product_ids, groupId: null, categories: [], brands: [], search: '' });
      setSearchInput('');
    }
    setSelectedKeys(new Set([]));
  }, [selectedRows, filters.groupBy, setFilters]);

  const handleSaveSelectionAsGroup = useCallback(() => {
    const { variant_ids, product_ids, labels } = selectionToIds(selectedRows, filters.groupBy);
    setGroupDialog({ open: true, group: null, initial: { variant_ids, product_ids, labels } });
  }, [selectedRows, filters.groupBy]);

  const selectionActions: TopContentAction[] = [
    { title: 'Compare', icon: 'lucide:git-compare', onPress: handleCompareSelected },
    ...(filters.groupBy === 'variant' || filters.groupBy === 'product'
      ? [{ title: 'Save as group', icon: 'lucide:boxes', onPress: handleSaveSelectionAsGroup } as TopContentAction]
      : []),
  ];

  const handleSaveGroup = async (input: ProductGroupInput) => {
    if (groupDialog.group) return !!(await updateGroup(groupDialog.group.id, input));
    const created = await createGroup(input);
    if (created) {
      // Jump straight to the new group's comparison
      setFilters({ groupId: created.id, variantIds: [], productIds: [], categories: [], brands: [] });
      setSelectedKeys(new Set([]));
    }
    return !!created;
  };

  const handleDeleteGroup = async (group: ProductGroup) => {
    const ok = await deleteGroup(group.id);
    if (ok && filters.groupId === group.id) setFilters({ groupId: null });
    return ok;
  };

  const handleExport = async () => {
    if (!summary || isLoading) return;
    if (rows.length === 0) {
      toast.error('Nothing to export for this view');
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading('Preparing PDF…');
    try {
      const { exportProductReportPdf } = await import('./utils/exportProductReportPdf');
      const filename = await exportProductReportPdf({
        rows,
        summary,
        filters,
        highlights,
        scopeLabel,
        storeName: storeSettings?.name || tenant?.name || tenant?.business_name || 'My Store',
        generatedBy: staffUser?.name || 'Staff',
        chartElement: focused ? chartsRef.current : null,
      });
      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err) {
      console.error('Product report PDF export failed:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const dateValue: DateFilterValue = { active: filters.range, start_date: filters.start, end_date: filters.end };
  const onDateChange = (v: DateFilterValue) => setFilters({ range: v.active, start: v.start_date, end: v.end_date });

  const exportButton = (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || isLoading || !summary}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      <Icon icon={isExporting ? 'lucide:loader-2' : 'lucide:file-down'} className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
      Export PDF
    </button>
  );

  return (
    <PageLayout
      title="Product Performance"
      actions={
        <div className="flex items-center gap-2">
          {exportButton}
          <CustomOnlyDateFilterComponent value={dateValue} onChange={onDateChange} />
        </div>
      }
    >
      <div className="space-y-5">
        {/* Mobile: date, search and export live in the capsule bar */}
        <div className="md:hidden">
          <MobileActionCapsuleBar
            searchConfig={{ value: searchInput, onChange: setSearchInput, placeholder: 'Search products…' }}
            dateFilterConfig={{ value: dateValue, onChange: onDateChange }}
            actions={[
              {
                label: 'Export',
                icon: <Icon icon="lucide:file-down" className="h-3.5 w-3.5" />,
                onClick: handleExport,
                disabled: isExporting || isLoading,
              },
            ]}
          />
        </div>

        <ProductReportKpis summary={summary} isLoading={isLoading} focused={focused} />

        <ProductReportFilterBar
          filters={filters}
          setFilters={setFilters}
          clearFocus={() => {
            clearFocus();
            setSearchInput('');
          }}
          groups={groups}
          isMultiChannel={isMultiChannel}
          onNewGroup={() => setGroupDialog({ open: true, group: null })}
          onEditGroup={(group) => setGroupDialog({ open: true, group })}
        />

        {focused && (
          <ProductCompareView
            ref={chartsRef}
            title={scopeLabel || 'Selected products'}
            rows={rows}
            summary={summary}
            trend={trend}
            isTrendLoading={isTrendLoading}
            highlights={highlights}
          />
        )}

        {!focused && !isLoading && rows.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Icon icon="lucide:lightbulb" className="w-3.5 h-3.5" />
            Tip: filter by brand, category or a product group, or tick rows and press Compare, to see a side-by-side comparison.
          </p>
        )}

        <ProductReportTable
          rows={rows}
          summary={summary}
          isLoading={isLoading}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          selectedKeys={selectedKeys}
          onSelectionChange={(keys) => setSelectedKeys(keys as Selection)}
          selectionActions={selectionActions}
        />
      </div>

      <ProductGroupDialog
        open={groupDialog.open}
        onOpenChange={(open) => setGroupDialog((s) => ({ ...s, open }))}
        group={groupDialog.group}
        initial={groupDialog.initial}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
      />
    </PageLayout>
  );
}
