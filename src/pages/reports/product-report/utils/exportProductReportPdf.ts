import jsPDF from 'jspdf';
import autoTable, { type Styles } from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { COMPARE_OPTIONS, GROUP_BY_OPTIONS, INSIGHT_META, SORT_PRESETS } from '../constants';
import type { ProductReportFilters, ProductReportRow, ProductReportSummary } from '../types';
import type { Highlight } from './insights';
import { formatRangeLabel } from './dates';
import { formatChange, formatCover, formatMoney, formatPct, formatQty } from './format';
import regularFontUrl from '@/assets/fonts/GoogleSansFlex-Regular.ttf?url';
import boldFontUrl from '@/assets/fonts/GoogleSansFlex-Medium.ttf?url';
import headerFontUrl from '@/assets/fonts/AtypDisplay-Regular.ttf?url';

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

const fetchBase64 = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`font ${r.status}`))))
    .then((buf) => {
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    });

/**
 * Report fonts as base64, fetched once: Google Sans Flex (regular, and medium for "bold") for the
 * body, and the app's header font (Atyp Display, Latin subset) for the store name. null falls
 * back to Helvetica.
 */
let fontData: Promise<{ regular: string; bold: string; header: string } | null> | null = null;
function loadReportFont() {
  fontData ??= Promise.all([fetchBase64(regularFontUrl), fetchBase64(boldFontUrl), fetchBase64(headerFontUrl)])
    .then(([regular, bold, header]) => ({ regular, bold, header }))
    .catch((e) => {
      console.warn('PDF font failed to load, using Helvetica', e);
      fontData = null;
      return null;
    });
  return fontData;
}

async function captureChart(el: HTMLElement): Promise<HTMLCanvasElement | null> {
  // html2canvas copies the live computed colours into SVG charts while it clones the page, which
  // happens synchronously inside this call. Switch to the light theme just for that moment (no
  // paint happens in between) so dark-mode colours don't end up white on the white page.
  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  try {
    if (wasDark) root.classList.remove('dark');
    const capture = html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      // Always render the light theme into the (white) PDF
      onclone: (doc) => {
        doc.documentElement.classList.remove('dark');
        doc.documentElement.setAttribute('data-theme', 'light');
      },
    });
    if (wasDark) root.classList.add('dark');
    return await capture;
  } catch (e) {
    console.warn('Chart capture failed, exporting without chart', e);
    return null;
  } finally {
    if (wasDark) root.classList.add('dark');
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
  const reportFont = await loadReportFont();
  let font = 'helvetica';
  let headerFont: [string, string] = ['helvetica', 'bold'];
  if (reportFont) {
    doc.addFileToVFS('GoogleSansFlex-Regular.ttf', reportFont.regular);
    doc.addFileToVFS('GoogleSansFlex-Medium.ttf', reportFont.bold);
    doc.addFileToVFS('AtypDisplay-Regular.ttf', reportFont.header);
    doc.addFont('GoogleSansFlex-Regular.ttf', 'GoogleSansFlex', 'normal');
    doc.addFont('GoogleSansFlex-Medium.ttf', 'GoogleSansFlex', 'bold');
    doc.addFont('AtypDisplay-Regular.ttf', 'AtypDisplay', 'normal');
    font = 'GoogleSansFlex';
    headerFont = ['AtypDisplay', 'normal'];
  }
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
  doc.setFont(...headerFont);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(storeName.toUpperCase(), margin, y + 3);

  doc.setFont(...headerFont);
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(scopeLabel ? `Product Performance — ${scopeLabel}` : 'Product Performance Report', margin, y + 11);

  doc.setFont(font, 'normal');
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
    doc.setFont(font, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(k.label, x + 4, y + 5);
    doc.setFont(font, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(k.value, x + 4, y + 11.5);
    doc.setFont(font, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(k.sub, boxW - 8)[0], x + 4, y + 16);
  });
  y += 19 + 6;

  /* ---------- Highlights ---------- */
  if (highlights.length) {
    doc.setFont(font, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text('Key takeaways', margin, y);
    y += 5;
    doc.setFont(font, 'normal');
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
  type Column = {
    key: string;
    head: string;
    cell: (r: ProductReportRow, i: number) => string;
    style?: Partial<Styles>;
    /** Left out of the PDF, e.g. a column that is empty for the whole period */
    hidden?: boolean;
  };
  const right: Partial<Styles> = { halign: 'right' };
  const columns: Column[] = [
    { key: 'rank', head: '#', cell: (_r, i) => String(i + 1), style: { cellWidth: 8, halign: 'right', textColor: MUTED } },
    {
      key: 'name',
      head: filters.groupBy === 'brand' ? 'Brand' : filters.groupBy === 'category' ? 'Category' : 'Product',
      cell: (r) => (r.variant_label ? `${r.name} · ${r.variant_label}` : r.name),
      style: { cellWidth: 62 },
    },
    // Sized to the longest SKU so codes never break across lines
    { key: 'sku', head: 'SKU', cell: (r) => r.sku || '—', style: { cellWidth: 'wrap', textColor: MUTED } },
    { key: 'units', head: 'Units', cell: (r) => formatQty(r.units_sold), style: right },
    {
      key: 'share',
      head: comparing ? 'vs prev' : 'Share',
      cell: (r) => (comparing ? formatChange(r.units_change_pct) : `${(r.units_share_pct || 0).toFixed(1)}%`),
      style: right,
    },
    { key: 'revenue', head: 'Net revenue', cell: (r) => formatMoney(r.net_revenue ?? r.revenue), style: right },
    {
      key: 'returns',
      head: 'Returns',
      cell: (r) => (r.returned_units > 0 ? formatPct(r.return_rate_pct) : '—'),
      style: right,
      hidden: !rows.some((r) => r.returned_units > 0),
    },
    { key: 'profit', head: 'Gross profit', cell: (r) => formatMoney(r.gross_profit), style: right },
    { key: 'margin', head: 'Margin', cell: (r) => (r.has_cost ? formatPct(r.gross_margin) : 'Uncosted'), style: right },
    { key: 'stock', head: 'Stock', cell: (r) => formatQty(r.stock_quantity), style: right },
    {
      key: 'cover',
      head: 'Cover',
      cell: (r) => (r.stock_status === 'out_of_stock' ? 'Out' : formatCover(r.days_of_cover)),
      style: right,
    },
    { key: 'insight', head: 'Insight', cell: (r) => INSIGHT_META[r.insight]?.label || '' },
  ];
  const shown = columns.filter((c) => !c.hidden);
  const head = shown.map((c) => c.head);
  const body = rows.map((r, i) => shown.map((c) => c.cell(r, i)));

  autoTable(doc, {
    head: [head],
    body,
    startY: y,
    margin: { left: margin, right: margin, bottom: 16 },
    // Horizontal rules only; the striped rows keep each line easy to follow
    styles: { font, fontSize: 8, cellPadding: 1.8, textColor: INK, lineColor: RULE, lineWidth: { bottom: 0.1 } },
    headStyles: { fillColor: [245, 245, 242], textColor: MUTED, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [252, 252, 251] },
    columnStyles: Object.fromEntries(shown.map((c, i) => [i, c.style || {}])),
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      const key = shown[data.column.index]?.key;
      if (!row) return;
      if (key === 'insight') {
        data.cell.styles.textColor = INSIGHT_META[row.insight]?.pdf || INK;
        data.cell.styles.fontStyle = 'bold';
      }
      if (comparing && key === 'share' && row.units_change_pct !== null && row.units_change_pct !== undefined) {
        data.cell.styles.textColor = row.units_change_pct >= 0 ? [12, 130, 12] : [208, 59, 59];
      }
    },
  });

  /* ---------- Footer on every page ---------- */
  const pages = doc.getNumberOfPages();
  const stamp = `Generated by ${generatedBy} on ${format(new Date(), "d MMM yyyy 'at' HH:mm")}`;
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(font, 'normal');
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
