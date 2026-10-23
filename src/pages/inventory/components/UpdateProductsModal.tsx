import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import Papa from "papaparse";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import apiClient from "@/api/client";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";

type Row = Record<string, string>;

interface Change {
  field: string;
  label: string;
  before: string;
  after: string;
  detail?: string;
}

interface Preview {
  products: { product_id: string; name: string; rows: number[]; new_variants?: number; changes: Change[]; summary: string }[];
  errors: { index: number | null; sku: string | null; name?: string; message: string }[];
  not_found: { index: number; sku: string; name?: string }[];
  unchanged: number;
  applied: boolean;
  ignored_columns: string[];
}

interface UpdateProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Download the current products as a CSV to edit (the Products page export) */
  onDownload: () => void;
  isDownloading?: boolean;
  /** Rows handed over from Bulk Import (products that already exist): skips the upload step */
  initialRows?: Row[] | null;
}

const IGNORED_LABEL: Record<string, string> = {
  cost_price: "cost price (needs Profit & costs)",
};

/** Change existing products from a spreadsheet: matched by SKU, previewed first. Existing stock is
 *  never changed; a new variant's quantity becomes its opening stock. */
export function UpdateProductsModal({ isOpen, onClose, onSuccess, onDownload, isDownloading, initialRows }: UpdateProductsModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setPreview(null);
  };

  const check = async (data: Row[]) => {
    setRows(data);
    setIsChecking(true);
    setStep("preview");
    try {
      const res = await apiClient.post("/tenant/products/bulk-edit", { rows: data, apply: false });
      setPreview(res.data?.success?.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Could not check the file");
      setStep("upload");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialRows?.length) check(initialRows);
    if (!isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialRows]);

  const readFile = (file: File) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim().toLowerCase(),
      complete: (results) => {
        const data = results.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim()));
        if (data.length === 0) {
          toast.error("The file has no rows");
          return;
        }
        if (!("sku" in data[0])) {
          toast.error("The file needs a “sku” column. Start from Download your products.");
          return;
        }
        check(data);
      },
      error: () => toast.error("Could not read the file"),
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  const apply = async () => {
    setIsApplying(true);
    try {
      const res = await apiClient.post("/tenant/products/bulk-edit", { rows, apply: true });
      const data: Preview = res.data?.success?.data;
      setPreview(data);
      setStep("done");
      const n = data.products.length;
      toast.success(n ? `Updated ${n} product${n === 1 ? "" : "s"}` : "Nothing needed changing");
      if (n) onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Could not update products");
    } finally {
      setIsApplying(false);
    }
  };

  const rowLabel = (index: number | null) => (index === null ? "" : `Row ${index + 2}`); // +1 header, +1 one-based
  const changeCount = preview?.products.length || 0;
  const problemCount = (preview?.errors.length || 0) + (preview?.not_found.length || 0);

  const changesList = (
    <div className="space-y-2">
      {preview?.products.map((p) => (
        <div key={p.product_id} className="border border-border/70 rounded-lg p-2.5 space-y-1.5 bg-card/60">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400 bg-sky-500/10">
              <Icon icon="solar:pen-2-linear" className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-semibold break-words min-w-0">{p.name}</p>
            {!!p.new_variants && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                +{p.new_variants} new variant{p.new_variants === 1 ? "" : "s"}
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
              {p.changes.length} change{p.changes.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="space-y-0.5 pl-8">
            {p.changes.map((c, i) => (
              <li key={`${c.field}-${i}`} className="text-[11px] flex flex-wrap gap-x-1.5">
                <span className="text-muted-foreground">{c.label}:</span>
                {c.detail ? (
                  <span>{c.detail}</span>
                ) : (
                  <span className="tabular-nums break-all">
                    <span className="line-through text-muted-foreground/80">{c.before}</span> → <b>{c.after}</b>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  const problemsList = problemCount > 0 && (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        {problemCount} row{problemCount === 1 ? "" : "s"} won't be updated
      </p>
      <div className="border border-destructive/20 rounded-lg divide-y divide-border/60 max-h-56 overflow-y-auto">
        {preview?.errors.map((e, i) => (
          <div key={`e-${i}`} className="px-2.5 py-1.5 text-[11px] flex flex-wrap gap-x-2">
            <span className="text-muted-foreground tabular-nums">{rowLabel(e.index)}</span>
            {(e.sku || e.name) && <span className="font-semibold">{e.sku || e.name}</span>}
            <span className="text-destructive">{e.message}</span>
          </div>
        ))}
        {preview?.not_found.map((n) => (
          <div key={`n-${n.index}`} className="px-2.5 py-1.5 text-[11px] flex flex-wrap gap-x-2">
            <span className="text-muted-foreground tabular-nums">{rowLabel(n.index)}</span>
            <span className="font-semibold">{n.sku}</span>
            <span className="text-destructive">No product with this SKU or name. Use Bulk Import to add new products.</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isApplying) onClose();
      }}
      size="3xl"
      placement="right"
      scrollBehavior="inside"
      isDismissable={!isApplying}
      classNames={{ base: "min-w-[calc(100%-0.75rem)] sm:w-[640px] md:w-[720px] scrollbar-hide" }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-3">
          <h2 className="text-lg font-bold text-foreground">Update Products</h2>
          <p className="text-[12px] text-muted-foreground font-normal mt-0.5 leading-normal">
            {step === "done"
              ? "Changes saved. They're in Product History."
              : "Change prices, pack sizes, variant names and details of products you already have, or add variants. Existing stock is never changed here."}
          </p>
        </div>
      }
      body={
        <div className="py-3 space-y-4">
          {step === "upload" && (
            <>
              <ol className="space-y-2.5">
                {[
                  ["1", "Download your products", "A CSV of your products with their SKUs, prices and pack sizes. Filters on the Products page apply."],
                  ["2", "Edit it in Excel or Google Sheets", "Change only what you need; an empty cell keeps the current value. Don't change SKUs: they're how rows are matched. To add a variant, add a row with the product's exact name, a new variant name and a retail price (SKU can be left empty). Its quantity becomes opening stock."],
                  ["3", "Upload it and check the changes", "You'll see every change (before → after) before anything is saved."],
                ].map(([n, title, text]) => (
                  <li key={n} className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-muted/60 text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Button variant="outline" onClick={onDownload} disabled={isDownloading} className="w-full sm:w-auto text-xs font-semibold">
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Preparing..." : "Download your products (CSV)"}
              </Button>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) readFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary/70 bg-primary/5" : "border-border bg-background hover:border-muted-foreground/20 hover:bg-secondary/50"
                }`}
              >
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFile} />
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-center">Click or drag your edited CSV here</p>
                <p className="text-[11px] text-muted-foreground mt-1 text-center">Rows are matched by SKU. New products are added with Bulk Import.</p>
              </div>
            </>
          )}

          {step === "preview" &&
            (isChecking || !preview ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                <p className="text-xs">Checking {rows.length} row{rows.length === 1 ? "" : "s"}...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    {changeCount} product{changeCount === 1 ? "" : "s"} will change
                  </span>
                  {preview.unchanged > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                      {preview.unchanged} already up to date
                    </span>
                  )}
                  {problemCount > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      {problemCount} problem{problemCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <Icon icon="solar:info-circle-linear" className="h-3.5 w-3.5 mt-px shrink-0" />
                  <span>
                    Quantity is only used as opening stock for new variants; to change existing stock use a stock count or Stock In.
                    {preview.ignored_columns.length > 0 &&
                      ` Not used from the file: ${preview.ignored_columns.map((c) => IGNORED_LABEL[c] || c).join(", ")}.`}
                  </span>
                </p>
                {problemsList}
                {changeCount > 0 ? (
                  changesList
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border/70 rounded-xl">
                    Nothing to change{problemCount ? " in the rows that could be read" : ": the file matches your products"}.
                  </div>
                )}
              </>
            ))}

          {step === "done" && preview && (
            <>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold">
                  {changeCount ? `Updated ${changeCount} product${changeCount === 1 ? "" : "s"}` : "Nothing needed changing"}
                </p>
              </div>
              {problemsList}
              {changesList}
            </>
          )}
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset} disabled={isApplying || isChecking}>
                Upload another file
              </Button>
              <Button onClick={apply} disabled={isApplying || isChecking || changeCount === 0}>
                {isApplying ? "Saving..." : `Save changes to ${changeCount} product${changeCount === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
          {step !== "preview" && (
            <Button variant={step === "done" ? "default" : "outline"} onClick={onClose}>
              {step === "done" ? "Done" : "Cancel"}
            </Button>
          )}
        </div>
      }
    />
  );
}
