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
import ReorderDialog from './components/ReorderDialog';
import EmailReportDialog from './components/EmailReportDialog';
import ProductDetailDrawer, { type DrillTarget } from './components/ProductDetailDrawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatRangeLabel } from './utils/dates';
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
  const canReorder = hasModule('purchase_orders');
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
  const [reorderOpen, setReorderOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
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

  // Row click → drill-down drawer (brand/category roll-ups have no single item to drill into)
  const handleRowClick = useCallback(
    (rowId: string) => {
      if (filters.groupBy === 'brand' || filters.groupBy === 'category') return;
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      setDrillTarget({
        variantId: filters.groupBy === 'variant' ? row.variant_id : null,
        productId: row.product_id,
        title: rowDisplayName(row),
      });
    },
    [rows, filters.groupBy],
  );

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

  const canExport = !!summary && !isLoading && rows.length > 0;

  const buildPdf = useCallback(async () => {
    const { buildProductReportPdf } = await import('./utils/exportProductReportPdf');
    return buildProductReportPdf({
      rows: rows,
      summary: summary!,
      filters,
      highlights,
      scopeLabel,
      storeName: storeSettings?.name || tenant?.name || tenant?.business_name || 'My Store',
      generatedBy: staffUser?.name || 'Staff',
      chartElement: focused ? chartsRef.current : null,
    });
  }, [rows, summary, filters, highlights, scopeLabel, storeSettings, tenant, staffUser, focused]);

  const handleDownloadPdf = async () => {
    if (!canExport) {
      toast.error('Nothing to export for this view');
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading('Preparing PDF…');
    try {
      const pdf = await buildPdf();
      pdf.save();
      toast.success(`Downloaded ${pdf.filename}`, { id: toastId });
    } catch (err) {
      console.error('Product report PDF export failed:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!canExport) {
      toast.error('Nothing to export for this view');
      return;
    }
    const { exportProductReportCsv } = await import('./utils/exportProductReportCsv');
    const filename = exportProductReportCsv(rows, summary!, filters, scopeLabel);
    toast.success(`Downloaded ${filename}`);
  };

  const emailSubject = `Product performance${scopeLabel ? ` — ${scopeLabel}` : ''} (${formatRangeLabel(filters.range, filters.start, filters.end)})`;

  const dateValue: DateFilterValue = { active: filters.range, start_date: filters.start, end_date: filters.end };
  const onDateChange = (v: DateFilterValue) => setFilters({ range: v.active, start: v.start_date, end: v.end_date });

  const exportMenu = (trigger: React.ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isExporting}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem disabled={!canExport} onSelect={handleDownloadPdf}>
          <Icon icon="lucide:file-text" className="w-4 h-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canExport} onSelect={handleDownloadCsv}>
          <Icon icon="lucide:sheet" className="w-4 h-4 mr-2" />
          Download CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canExport} onSelect={() => setEmailOpen(true)}>
          <Icon icon="lucide:mail" className="w-4 h-4 mr-2" />
          Email PDF…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const exportButton = exportMenu(
    <button
      type="button"
      disabled={isExporting || isLoading || !summary}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      <Icon icon={isExporting ? 'lucide:loader-2' : 'lucide:share'} className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
      <span className="hidden sm:block md:hidden xl:block">Export</span>
      <span className="hidden sm:block md:hidden xl:block"><Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 opacity-60" /></span>
    </button>,
  );

  return (
    <PageLayout
      title="Product Performance"
      actions={
        <div className="flex items-center gap-2">
          {canReorder && (
            <button
              type="button"
              onClick={() => setReorderOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Icon icon="lucide:package-plus" className="w-4 h-4" />
              <span className="hidden sm:block md:hidden xl:block">Plan restock</span>
            </button>
          )}
          {exportButton}
          <CustomOnlyDateFilterComponent value={dateValue} onChange={onDateChange} showLabelOnMobile={true}/>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Mobile: date, search and export live in the capsule bar */}
        <div className="hidden">
          <MobileActionCapsuleBar
            searchConfig={{ value: searchInput, onChange: setSearchInput, placeholder: 'Search products…' }}
            dateFilterConfig={{ value: dateValue, onChange: onDateChange }}
            actions={[
              ...(canReorder
                ? [{ label: 'Restock', icon: <Icon icon="lucide:package-plus" className="h-3.5 w-3.5" />, onClick: () => setReorderOpen(true) }]
                : []),
              {
                customRender: exportMenu(
                  <button
                    type="button"
                    disabled={isExporting || isLoading}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <Icon icon="lucide:share" className="h-3.5 w-3.5" />
                    Export
                  </button>,
                ),
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
            onPlanRestock={canReorder ? () => setReorderOpen(true) : undefined}
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
          onRowClick={handleRowClick}
        />
      </div>

      {canReorder && (
        <ReorderDialog open={reorderOpen} onOpenChange={setReorderOpen} filters={filters} isMultiChannel={isMultiChannel} scopeLabel={scopeLabel} />
      )}

      <ProductDetailDrawer target={drillTarget} onClose={() => setDrillTarget(null)} filters={filters} isMultiChannel={isMultiChannel} />

      <EmailReportDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultTo={storeSettings?.email || ''}
        defaultSubject={emailSubject}
        buildPdf={buildPdf}
      />

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
