import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { COMPARE_OPTIONS, GROUP_BY_OPTIONS, INSIGHT_META, SORT_PRESETS } from '../constants';
import type { ProductReportFilters, ProductReportRow, ProductReportSummary } from '../types';
import type { Highlight } from './insights';
import { formatRangeLabel } from './dates';
import { formatChange, formatCover, formatMoney, formatPct, formatQty } from './format';

export interface ExportProductReportOptions {
  rows: ProductReportRow[];
  summary: ProductReportSummary;
  filters: ProductReportFilters;
  highlights: Highlight[];
  storeName: string;
  generatedBy: string;
  scopeLabel: string | null;
  /** Compare-view charts container, rasterised into the PDF when present. */
  chartElement?: HTMLElement | null;
}

const INK: [number, number, number] = [17, 17, 17];
const MUTED: [number, number, number] = [110, 110, 105];
const RULE: [number, number, number] = [225, 225, 220];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

async function captureChart(el: HTMLElement): Promise<HTMLCanvasElement | null> {
  try {
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      // Always render the light theme into the (white) PDF
      onclone: (doc) => {
        doc.documentElement.classList.remove('dark');
        doc.documentElement.setAttribute('data-theme', 'light');
      },
    });
  } catch (e) {
    console.warn('Chart capture failed, exporting without chart', e);
    return null;
  }
}

export interface BuiltReportPdf {
  filename: string;
  blob: Blob;
  save: () => void;
}

/** Builds the report PDF without saving it, so it can be downloaded or emailed. */
export async function buildProductReportPdf(opts: ExportProductReportOptions): Promise<BuiltReportPdf> {
  const { rows, summary, filters, highlights, storeName, generatedBy, scopeLabel, chartElement } = opts;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;

  const comparing = !!summary.comparison;
  const rangeLabel = formatRangeLabel(filters.range, filters.start, filters.end);
  const groupByLabel = GROUP_BY_OPTIONS.find((g) => g.key === filters.groupBy)?.label || 'Variant';
  const sortLabel = SORT_PRESETS.find((s) => s.key === filters.sort)?.label || 'Top Revenue';

  /* ---------- Header ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(storeName.toUpperCase(), margin, y + 3);

  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(scopeLabel ? `Product Performance — ${scopeLabel}` : 'Product Performance Report', margin, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const meta = [
    rangeLabel,
    filters.channel === 'all' ? 'All channels' : filters.channel === 'pos' ? 'POS only' : 'Online only',
    `Grouped by ${groupByLabel.toLowerCase()}`,
    `Ranked by ${sortLabel.toLowerCase()}`,
  ];
  doc.text(meta.join('   •   '), margin, y + 17);

  const scopeBits: string[] = [];
  if (filters.categories.length) scopeBits.push(`Category: ${filters.categories.join(', ')}`);
  if (filters.brands.length) scopeBits.push(`Brand: ${filters.brands.join(', ')}`);
  if (summary.filters_applied?.group?.name) scopeBits.push(`Group: ${summary.filters_applied.group.name}`);
  if (filters.variantIds.length + filters.productIds.length) scopeBits.push(`${filters.variantIds.length + filters.productIds.length} hand-picked items`);
  if (filters.search) scopeBits.push(`Search: "${filters.search}"`);
  if (summary.comparison) {
    const label = COMPARE_OPTIONS.find((c) => c.key === summary.comparison!.mode)?.label || 'Previous period';
    scopeBits.push(
      `Compared with ${label.toLowerCase()} (${format(new Date(summary.comparison.start_date), 'd MMM yyyy')} – ${format(
        new Date(summary.comparison.end_date),
        'd MMM yyyy',
      )})`,
    );
  }
  if (scopeBits.length) {
    const lines = doc.splitTextToSize(scopeBits.join('   •   '), contentW);
    doc.text(lines, margin, y + 22);
    y += 22 + lines.length * 4;
  } else {
    y += 21;
  }

  doc.setDrawColor(...RULE);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  /* ---------- KPI strip ---------- */
  const kpis: { label: string; value: string; sub: string }[] = [
    {
      label: 'NET REVENUE',
      value: formatMoney(summary.total_net_revenue ?? summary.total_revenue),
      sub: comparing
        ? `${formatChange(summary.net_revenue_change_pct ?? summary.revenue_change_pct)} vs ${formatMoney(summary.prev_total_net_revenue ?? summary.prev_total_revenue ?? 0)}`
        : (summary.total_discounts || 0) + (summary.total_refunds || 0) > 0
          ? `${formatMoney(summary.total_revenue)} gross − ${formatMoney((summary.total_discounts || 0) + (summary.total_refunds || 0))} disc./refunds`
          : `${summary.unique_products_sold} items sold`,
    },
    {
      label: 'UNITS SOLD',
      value: formatQty(summary.total_units_sold),
      sub: comparing ? `${formatChange(summary.units_change_pct)} vs ${formatQty(summary.prev_total_units_sold || 0)}` : `${summary.filtered_item_count} items in view`,
    },
    {
      label: 'GROSS PROFIT',
      value: formatMoney(summary.total_gross_profit),
      sub: `${formatPct(summary.overall_gross_margin_pct)} margin · ${formatPct(summary.cost_coverage_pct)} costed`,
    },
    {
      label: 'STOCK ACTIONS',
      value: `${summary.restock_count} to restock`,
      sub: `${summary.dead_stock_count} with stock but no sales`,
    },
  ];
  const gap = 4;
  const boxW = (contentW - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => {
    const x = margin + i * (boxW + gap);
    doc.setDrawColor(...RULE);
    doc.roundedRect(x, y, boxW, 19, 2, 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(k.label, x + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(k.value, x + 4, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(k.sub, boxW - 8)[0], x + 4, y + 16);
  });
  y += 19 + 6;

  /* ---------- Highlights ---------- */
  if (highlights.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text('Key takeaways', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    highlights.forEach((h) => {
      const lines = doc.splitTextToSize(h.text, contentW - 5);
      doc.text('•', margin, y);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.2 + 0.8;
    });
    y += 3;
  }

  /* ---------- Charts ---------- */
  if (chartElement) {
    const canvas = await captureChart(chartElement);
    if (canvas) {
      const imgW = contentW;
      let imgH = (canvas.height * imgW) / canvas.width;
      const maxH = 85;
      let drawW = imgW;
      if (imgH > maxH) {
        drawW = (imgW * maxH) / imgH;
        imgH = maxH;
      }
      if (y + imgH > pageH - 20) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, drawW, imgH);
      y += imgH + 6;
    }
  }

  /* ---------- Table ---------- */
  const head = [
    '#',
    filters.groupBy === 'brand' ? 'Brand' : filters.groupBy === 'category' ? 'Category' : 'Product',
    'SKU',
    'Units',
    comparing ? 'vs prev' : 'Share',
    'Net revenue',
    'Returns',
    'Gross profit',
    'Margin',
    'Stock',
    'Cover',
    'Insight',
  ];
  const body = rows.map((r, i) => [
    String(i + 1),
    r.variant_label ? `${r.name} · ${r.variant_label}` : r.name,
    r.sku || '—',
    formatQty(r.units_sold),
    comparing ? formatChange(r.units_change_pct) : `${(r.units_share_pct || 0).toFixed(1)}%`,
    formatMoney(r.net_revenue ?? r.revenue),
    r.returned_units > 0 ? formatPct(r.return_rate_pct) : '—',
    formatMoney(r.gross_profit),
    r.has_cost ? formatPct(r.gross_margin) : 'Uncosted',
    formatQty(r.stock_quantity),
    r.stock_status === 'out_of_stock' ? 'Out' : formatCover(r.days_of_cover),
    INSIGHT_META[r.insight]?.label || '',
  ]);

  autoTable(doc, {
    head: [head],
    body,
    startY: y,
    margin: { left: margin, right: margin, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: INK, lineColor: RULE, lineWidth: 0.1 },
    headStyles: { fillColor: [245, 245, 242], textColor: MUTED, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [252, 252, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right', textColor: MUTED },
      1: { cellWidth: 62 },
      2: { cellWidth: 26, textColor: MUTED },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      if (!row) return;
      if (data.column.index === 11) {
        data.cell.styles.textColor = INSIGHT_META[row.insight]?.pdf || INK;
        data.cell.styles.fontStyle = 'bold';
      }
      if (comparing && data.column.index === 4 && row.units_change_pct !== null && row.units_change_pct !== undefined) {
        data.cell.styles.textColor = row.units_change_pct >= 0 ? [12, 130, 12] : [208, 59, 59];
      }
    },
  });

  /* ---------- Footer on every page ---------- */
  const pages = doc.getNumberOfPages();
  const stamp = `Generated by ${generatedBy} on ${format(new Date(), "d MMM yyyy 'at' HH:mm")}`;
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${storeName} · ${stamp}`, margin, pageH - 7);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  const rangePart = filters.range === 'all_time' || !filters.start ? 'all-time' : `${format(filters.start, 'yyyy-MM-dd')}_${format(filters.end || filters.start, 'yyyy-MM-dd')}`;
  const filename = ['product-report', scopeLabel ? slug(scopeLabel) : null, rangePart].filter(Boolean).join('_') + '.pdf';
  return { filename, blob: doc.output('blob'), save: () => doc.save(filename) };
}

export async function exportProductReportPdf(opts: ExportProductReportOptions): Promise<string> {
  const pdf = await buildProductReportPdf(opts);
  pdf.save();
  return pdf.filename;
}
