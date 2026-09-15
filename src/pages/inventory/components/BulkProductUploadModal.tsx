import React, { useState, useRef } from "react";
import { Upload, AlertCircle, Package, Download, CheckCircle2, Layers, Sparkles, Wand2 } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import CustomModal from '@/components/modals/modal';

interface BulkProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedProduct {
  name: string;
  category: string;
  description: string;
  sku: string;
  variant_name: string;
  base_unit_name: string;
  quantity: string;
  cost_price: string;
  retail_price: string;
  wholesale_price: string;
  tier_2_name: string;
  tier_2_units: string;
  tier_2_retail_price: string;
  tier_2_wholesale_price: string;
  tier_3_name: string;
  tier_3_units: string;
  tier_3_retail_price: string;
  tier_3_wholesale_price: string;
  tags: string;
  _error?: string;
  _skuConflict?: boolean;
}

interface UploadResultSummary {
  created: number;
  failed: number;
  errors: { name: string; sku?: string; error: string }[];
}

const validateRows = (rows: ParsedProduct[]): ParsedProduct[] => {
  // Map SKU to product names to detect collisions across different products in the same file
  const skuToNames = new Map<string, Set<string>>();
  rows.forEach((r) => {
    const s = r.sku?.trim().toLowerCase();
    if (s) {
      if (!skuToNames.has(s)) skuToNames.set(s, new Set());
      if (r.name?.trim()) skuToNames.get(s)!.add(r.name.trim().toLowerCase());
    }
  });

  return rows.map((item) => {
    let error: string | undefined = undefined;
    let isSkuConflict = false;

    if (!item.name) {
      error = "Missing product name";
    } else if (isNaN(Number(item.retail_price)) || Number(item.retail_price) < 0) {
      error = "Invalid retail price";
    } else if (isNaN(Number(item.quantity)) || Number(item.quantity) < 0) {
      error = "Invalid quantity";
    } else if (item.sku?.trim()) {
      const s = item.sku.trim().toLowerCase();
      const namesUsingSku = skuToNames.get(s);
      if (namesUsingSku && namesUsingSku.size > 1) {
        error = `SKU '${item.sku}' is used across multiple products in this sheet`;
        isSkuConflict = true;
      }
    }

    return {
      ...item,
      _error: error || (item._error?.startsWith("SKU '") ? item._error : undefined),
      _skuConflict: isSkuConflict || Boolean(item._skuConflict),
    };
  });
};

export function BulkProductUploadModal({ isOpen, onClose, onSuccess }: BulkProductUploadModalProps) {
  const [step, setStep] = useState<"upload" | "review" | "summary">("upload");
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResultSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [totalImportedCount, setTotalImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = (force = false) => {
    if (isPending) return;
    if (!force && step === "review" && parsedData.length > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    setShowDiscardConfirm(false);
    setStep("upload");
    setParsedData([]);
    setTotalImportedCount(0);
    setUploadResult(null);
    onClose();
  };

  const processCSV = (file: File) => {
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processed: ParsedProduct[] = results.data.map((row) => ({
          name: (row.name || row.product_name || "").trim(),
          category: (row.category || "").trim(),
          description: (row.description || "").trim(),
          sku: (row.sku || row.variant_sku || "").trim(),
          variant_name: (row.variant_name || row.attributes || "").trim(),
          base_unit_name: (row.base_unit_name || row.unit_name || "unit").trim(),
          quantity: (row.quantity || row.stock_quantity || "0").toString().trim(),
          cost_price: (row.cost_price || "").toString().trim(),
          retail_price: (row.retail_price || row.price || "0").toString().trim(),
          wholesale_price: (row.wholesale_price || "").toString().trim(),
          tier_2_name: (row.tier_2_name || "").trim(),
          tier_2_units: (row.tier_2_units || row.tier_2_count || "").toString().trim(),
          tier_2_retail_price: (row.tier_2_retail_price || "").toString().trim(),
          tier_2_wholesale_price: (row.tier_2_wholesale_price || "").toString().trim(),
          tier_3_name: (row.tier_3_name || "").trim(),
          tier_3_units: (row.tier_3_units || row.tier_3_count || "").toString().trim(),
          tier_3_retail_price: (row.tier_3_retail_price || "").toString().trim(),
          tier_3_wholesale_price: (row.tier_3_wholesale_price || "").toString().trim(),
          tags: (row.tags || "").trim(),
        }));

        setParsedData(validateRows(processed));
        setStep("review");
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSV(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSV(e.target.files[0]);
    }
  };

  const handleCellChange = (index: number, field: keyof ParsedProduct, value: string) => {
    const newData = [...parsedData];
    newData[index] = { 
      ...newData[index], 
      [field]: value,
      // If user edits SKU, clear previous server conflict flag so it can re-validate
      ...(field === "sku" ? { _skuConflict: false, _error: undefined } : {})
    };
    setParsedData(validateRows(newData));
  };

  // In-App Remediation: Filter table to only conflicting items and switch to review mode
  const handleFixConflicts = () => {
    if (!uploadResult || uploadResult.errors.length === 0) return;

    const errorSkuMap = new Map<string, string>();
    uploadResult.errors.forEach((e) => {
      if (e.sku) {
        errorSkuMap.set(e.sku.trim().toLowerCase(), e.error);
      }
    });

    const errorNameMap = new Map<string, string>();
    uploadResult.errors.forEach((e) => {
      if (e.name) {
        errorNameMap.set(e.name.trim().toLowerCase(), e.error);
      }
    });

    const conflictingRows: ParsedProduct[] = parsedData
      .filter((p) => {
        const pSku = (p.sku || "").trim().toLowerCase();
        const pName = (p.name || "").trim().toLowerCase();
        return (pSku && errorSkuMap.has(pSku)) || errorNameMap.has(pName);
      })
      .map((p) => {
        const pSku = (p.sku || "").trim().toLowerCase();
        const pName = (p.name || "").trim().toLowerCase();
        const errorReason =
          (pSku && errorSkuMap.get(pSku)) ||
          errorNameMap.get(pName) ||
          "SKU conflict with existing product";
        return {
          ...p,
          _error: errorReason,
          _skuConflict: true,
        };
      });

    if (conflictingRows.length > 0) {
      setParsedData(conflictingRows);
      setStep("review");
      toast("Reviewing conflicting items. Update the SKUs or use Auto-Generate to fix.", {
        icon: "✏️",
      });
    } else {
      toast.error("No matching conflicting rows found to edit.");
    }
  };

  // Generate a unique SKU for an individual row
  const generateSkuForRow = (index: number) => {
    const item = parsedData[index];
    if (!item) return;
    const words = (item.name || "PRD")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    const prefix = words.slice(0, 2).map((w) => w.slice(0, 4)).join("-") || "SKU";
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSku = `${prefix}-${randomHex}`;

    handleCellChange(index, "sku", newSku);
    toast.success(`Generated SKU ${newSku} for ${item.name || "item"}`);
  };

  // 1-Click Auto-Generate unique SKUs for all rows with conflicts or errors
  const handleAutoGenerateSkus = () => {
    const updated = parsedData.map((item) => {
      if (item._skuConflict || item._error) {
        const words = (item.name || "PRD")
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, "")
          .split(/\s+/)
          .filter(Boolean);
        const prefix = words.slice(0, 2).map((w) => w.slice(0, 4)).join("-") || "SKU";
        const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newSku = `${prefix}-${randomHex}`;
        return {
          ...item,
          sku: newSku,
          _error: undefined,
          _skuConflict: false,
        };
      }
      return item;
    });

    setParsedData(validateRows(updated));
    toast.success("Generated fresh unique SKUs for conflicting items!");
  };

  const handleSubmit = async () => {
    const validProducts = parsedData.filter((p) => !p._error);
    if (validProducts.length === 0) {
      toast.error("No valid products to import. Please resolve the SKU conflicts first.");
      return;
    }

    const payload = validProducts.map((p) => ({
      name: p.name,
      category: p.category || "General",
      description: p.description,
      sku: p.sku || undefined,
      variant_name: p.variant_name || undefined,
      base_unit_name: p.base_unit_name || "unit",
      quantity: Number(p.quantity) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : undefined,
      retail_price: Number(p.retail_price) || 0,
      wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : undefined,
      tier_2_name: p.tier_2_name || undefined,
      tier_2_units: p.tier_2_units ? Number(p.tier_2_units) : undefined,
      tier_2_retail_price: p.tier_2_retail_price ? Number(p.tier_2_retail_price) : undefined,
      tier_2_wholesale_price: p.tier_2_wholesale_price ? Number(p.tier_2_wholesale_price) : undefined,
      tier_3_name: p.tier_3_name || undefined,
      tier_3_units: p.tier_3_units ? Number(p.tier_3_units) : undefined,
      tier_3_retail_price: p.tier_3_retail_price ? Number(p.tier_3_retail_price) : undefined,
      tier_3_wholesale_price: p.tier_3_wholesale_price ? Number(p.tier_3_wholesale_price) : undefined,
      tags: p.tags ? p.tags.split(/[|,]/).map((t) => t.trim()).filter(Boolean) : [],
    }));

    setIsPending(true);
    try {
      const res = await apiClient.post("/tenant/products/bulk", { products: payload });
      const resultData = res.data.success?.data || {};
      const serverErrors: { name: string; sku?: string; error: string }[] = resultData.errors || [];
      const createdCount = resultData.created ?? (validProducts.length - serverErrors.length);

      // Build error map from server response
      const serverErrorSkuMap = new Map<string, string>();
      const serverErrorNameMap = new Map<string, string>();
      serverErrors.forEach((e) => {
        if (e.sku) serverErrorSkuMap.set(e.sku.trim().toLowerCase(), e.error);
        if (e.name) serverErrorNameMap.set(e.name.trim().toLowerCase(), e.error);
      });

      const isFailedOnServer = (p: ParsedProduct) => {
        const s = (p.sku || "").trim().toLowerCase();
        const n = (p.name || "").trim().toLowerCase();
        return (s && serverErrorSkuMap.has(s)) || serverErrorNameMap.has(n);
      };

      // Notify parent to refresh products list in background immediately
      if (createdCount > 0 && onSuccess) {
        onSuccess();
      }

      const updatedTotalCreated = totalImportedCount + createdCount;

      // Determine remaining rows that could not be imported
      const remainingRows: ParsedProduct[] = [];
      parsedData.forEach((row) => {
        if (row._error) {
          // Previously skipped on client
          remainingRows.push(row);
        } else if (isFailedOnServer(row)) {
          // Failed on server during this request
          const s = (row.sku || "").trim().toLowerCase();
          const n = (row.name || "").trim().toLowerCase();
          const errMsg = (s && serverErrorSkuMap.get(s)) || serverErrorNameMap.get(n) || "Import failed on server";
          remainingRows.push({
            ...row,
            _error: errMsg,
            _skuConflict: true,
          });
        }
        // Successfully created rows are dropped from remainingRows
      });

      if (remainingRows.length === 0) {
        // All products across all rows are now successfully imported!
        setUploadResult({
          created: updatedTotalCreated,
          failed: 0,
          errors: [],
        });
        setParsedData([]);
        setStep("summary");
      } else {
        // Partial import: Keep user in review mode with remaining items
        setTotalImportedCount(updatedTotalCreated);
        setParsedData(validateRows(remainingRows));

        if (createdCount > 0) {
          toast.success(
            `Imported ${createdCount} product${createdCount > 1 ? "s" : ""}! ${remainingRows.length} remaining item${
              remainingRows.length > 1 ? "s have" : " has"
            } conflicts to resolve.`
          );
        } else {
          toast.error("Could not import items due to server conflicts. Please resolve them below.");
        }
      }
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast.error(error.response?.data?.error?.message || "Failed to import products");
    } finally {
      setIsPending(false);
    }
  };

  const downloadSample = () => {
    const headers = [
      "name",
      "category",
      "description",
      "sku",
      "variant_name",
      "base_unit_name",
      "quantity",
      "cost_price",
      "retail_price",
      "wholesale_price",
      "tier_2_name",
      "tier_2_units",
      "tier_2_retail_price",
      "tier_2_wholesale_price",
      "tier_3_name",
      "tier_3_units",
      "tier_3_retail_price",
      "tier_3_wholesale_price",
      "tags",
    ].join(",");

    const rows = [
      `"Sugar Bread","Bakery","Freshly baked bread","BRD-001","","piece","50","8.00","12.00","10.00","","","","","","","","","fresh|bakery"`,
      `"Voltic Mineral Water","Beverages","500ml natural spring water","VOL-500","500ml Bottle","bottle","240","1.20","2.50","2.00","Carton","24","55.00","48.00","","","","","drinks|water"`,
      `"Graphic Cotton T-Shirt","Fashion","100% Premium Cotton","TSHIRT-RED-L","Red / Large","piece","30","15.00","35.00","28.00","","","","","","","","","clothing|tshirt"`,
      `"Graphic Cotton T-Shirt","Fashion","100% Premium Cotton","TSHIRT-BLU-M","Blue / Medium","piece","25","15.00","35.00","28.00","","","","","","","","","clothing|tshirt"`,
    ].join("\n");

    const sampleCsv = `${headers}\n${rows}`;
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "headlesspos_bulk_products_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!uploadResult || uploadResult.errors.length === 0) return;
    const headers = "product_name,sku,error_reason\n";
    const rows = uploadResult.errors
      .map(
        (e) =>
          `"${(e.name || '').replace(/"/g, '""')}","${(e.sku || '').replace(/"/g, '""')}","${(e.error || '').replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_import_conflicts_report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorCount = parsedData.filter((p) => p._error).length;
  const validProductsCount = parsedData.length - errorCount;

  const footer = (
    <>
      {step === "summary" ? (
        <div className="flex flex-col-reverse sm:flex-row gap-3 items-center justify-between w-full">
          {uploadResult && uploadResult.errors.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorReport}
                className="w-full sm:w-auto border-border text-xs font-bold uppercase font-header !tracking-wider"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download Conflict Report
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFixConflicts}
                className="w-full sm:w-auto text-xs font-bold uppercase font-header !tracking-wider shadow-sm"
              >
                <Wand2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/80" />
                Fix Conflicting Items ({uploadResult.failed})
              </Button>
            </div>
          ) : (
            <div />
          )}
          <Button
            onClick={() => handleClose(true)}
            className="w-full sm:w-auto bg-primary text-primary-foreground min-w-[100px] font-bold text-xs"
          >
            Done
          </Button>
        </div>
      ) : (
        <>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isPending}>
            {totalImportedCount > 0 ? "Finish & Close" : "Cancel"}
          </Button>
          {step === "review" && (
            <Button
              onClick={handleSubmit}
              disabled={isPending || validProductsCount === 0}
              className="bg-primary text-primary-foreground min-w-[150px] font-bold px-5"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Importing...</span>
                </div>
              ) : (
                <>Import {validProductsCount} Product{validProductsCount === 1 ? '' : 's'} {errorCount > 0 ? `(${errorCount} skipped)` : ''}</>
              )}
            </Button>
          )}
        </>
      )}
    </>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => handleClose(false)}
      size={step === "review" ? "5xl" : "4xl"}
      isDismissable={step !== "review"}
      isKeyboardDismissDisabled={step === "review"}
      classNames={{
        base: "scrollbar-hide pb-1",
      }}
      header={
        <div className="pt-3.5 px-2">
          <h2 className="text-lg md:text-xl font-bold font-header !tracking-[-0.04em]">
            {step === "summary"
              ? uploadResult?.failed === 0
                ? "Import Complete"
                : "Import Results & Conflicts"
              : "Bulk Import Products"}
          </h2>
          <p className={`hidden text-sm text-muted-foreground font-normal ${step !== "upload" && "md:block"}`}>
            {step === "summary"
              ? uploadResult?.failed === 0
                ? "All products were successfully added to your catalog."
                : "Review imported items and any skipped rows to protect catalog consistency."
              : "Upload CSV with support for Variants, Packaging Tiers (Cartons/Packs), and Wholesale Prices."}
          </p>
        </div>
      }
      body={
        <div className="flex-1 w-full md:p-2">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary/70 bg-primary/5"
                    : "border-border bg-background hover:border-muted-foreground/20 hover:bg-secondary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Click or drag CSV file to upload</h3>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-sm leading-relaxed">
                  Supports single items, multi-variant products, wholesale pricing, and bulk packaging tiers (Cartons/Packs).
                </p>
              </div>

              <Button
                variant="outline"
                onClick={downloadSample}
                className="text-foreground border border-border hover:bg-secondary font-bold text-xs uppercase font-header !tracking-wider"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV Template
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              {showDiscardConfirm && (
                <div className="p-3 border border-destructive/10 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {totalImportedCount > 0
                        ? `${totalImportedCount} product${totalImportedCount > 1 ? "s were" : " was"} already imported. Discard remaining ${parsedData.length} conflicting row${parsedData.length > 1 ? "s" : ""}?`
                        : `Discard unsaved import? All changes to these ${parsedData.length} rows will be lost.`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-3.5 font-bold hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDiscardConfirm(false)}
                    >
                      Keep Editing
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs px-3.5 font-bold"
                      onClick={() => handleClose(true)}
                    >
                      {totalImportedCount > 0 ? "Done & Exit" : "Discard & Close"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 bg-card py-2.5 md:py-3 px-3 md:px-4 border border-border rounded-md">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      {parsedData.length} Rows {totalImportedCount > 0 ? "Remaining" : "Found"}
                    </span>
                  </div>
                  {totalImportedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {totalImportedCount} imported
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 text-xs font-semibold rounded-full border border-destructive/20">
                      <AlertCircle className="h-4 w-4" />
                      {errorCount} {errorCount === 1 ? "issue" : "issues"} detected
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-bold uppercase font-header tracking-wider px-3 h-8 shadow-sm rounded"
                      onClick={handleAutoGenerateSkus}
                      title="Automatically generate fresh unique SKUs for all rows with conflicts"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />
                      Auto-Generate All SKUs
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border px-3 rounded text-xs font-header uppercase tracking-wider h-8"
                    onClick={() => {
                      setStep("upload");
                      setParsedData([]);
                      setTotalImportedCount(0);
                    }}
                    disabled={isPending}
                  >
                    <span className="ml-1">Re-upload CSV</span>
                  </Button>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between px-1 md:hidden">
                <span>Swipe table horizontally to review stock & pricing →</span>
              </div>

              <div className="bg-card border border-border rounded overflow-x-auto shadow-sm">
                <div className="overflow-x-auto scrollbar-hide max-h-[50vh]">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="text-[11px] text-muted-foreground bg-muted uppercase sticky top-0 z-10 shadow-sm font-header !tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Product Name*</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Variant / SKU</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Unit / Stock*</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Retail Price*</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Wholesale</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Packaging Tiers</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Category</th>
                        <th className="px-3 py-2.5 font-bold !tracking-wide">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedData.map((row, idx) => {
                        const hasWholesale = Boolean(row.wholesale_price && Number(row.wholesale_price) > 0);
                        const hasTier2 = Boolean(row.tier_2_name && row.tier_2_units);
                        const hasTier3 = Boolean(row.tier_3_name && row.tier_3_units);

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-muted/30 transition-colors ${
                              row._error ? "bg-destructive/5" : ""
                            }`}
                          >
                            <td className="p-2 min-w-[160px]">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                                className={`w-full px-2 py-1 rounded border outline-none text-xs font-semibold ${
                                  row._error && !row.name
                                    ? "border-destructive bg-destructive/10"
                                    : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
                                }`}
                                placeholder="Product name"
                              />
                            </td>
                            <td className="p-2 min-w-[250px]">
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={row.variant_name}
                                  onChange={(e) => handleCellChange(idx, "variant_name", e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-transparent hover:border-border focus:border-primary/30 outline-none text-xs bg-transparent"
                                  placeholder="Variant (e.g. Red/Large)"
                                />
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    value={row.sku}
                                    onChange={(e) => handleCellChange(idx, "sku", e.target.value)}
                                    className={`w-full ${row._skuConflict || row._error ? "pr-7" : "pr-2"} px-2 py-0.5 rounded border text-[11px] font-mono outline-none transition-colors ${
                                      row._skuConflict || row._error
                                        ? "border-destructive/10 bg-destructive/5 text-destructive font-semibold"
                                        : "border-transparent text-muted-foreground bg-transparent"
                                    }`}
                                    placeholder="SKU"
                                    title={row._error || undefined}
                                  />
                                  {(row._skuConflict || row._error) && (
                                    <button
                                      type="button"
                                      onClick={() => generateSkuForRow(idx)}
                                      className="absolute right-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                      title="Generate fresh unique SKU for this item"
                                    >
                                      <Wand2 className="w-3.5 h-3.5 text-muted-foreground/60" />
                                    </button>
                                  )}
                                </div>
                                {(row._skuConflict || row._error) && (
                                  <div
                                    className="text-[10.5px] text-destructive flex items-start gap-1 font-medium px-1.5 py-1 pb-1.5 rounded bg-destructive/5 leading-tight whitespace-normal"
                                    title={row._error}
                                  >
                                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span className="break-words">
                                      {row._error || "SKU Conflict"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 min-w-[110px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={row.quantity}
                                  onChange={(e) => handleCellChange(idx, "quantity", e.target.value)}
                                  className={`w-16 px-1.5 py-1 rounded border outline-none text-xs font-semibold ${
                                    row._error && (!row.quantity || isNaN(Number(row.quantity)))
                                      ? "border-destructive bg-destructive/10"
                                      : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
                                  }`}
                                  placeholder="0"
                                />
                                <input
                                  type="text"
                                  value={row.base_unit_name}
                                  onChange={(e) => handleCellChange(idx, "base_unit_name", e.target.value)}
                                  className="w-12 px-1 py-0.5 rounded border border-transparent text-[11px] text-muted-foreground bg-transparent"
                                  placeholder="unit"
                                />
                              </div>
                            </td>
                            <td className="p-2 w-24">
                              <input
                                type="number"
                                step="0.01"
                                value={row.retail_price}
                                onChange={(e) => handleCellChange(idx, "retail_price", e.target.value)}
                                className={`w-full px-2 py-1 rounded border outline-none text-xs font-bold ${
                                  row._error && (!row.retail_price || isNaN(Number(row.retail_price)))
                                    ? "border-destructive bg-destructive/10"
                                    : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
                                }`}
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2 w-24">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.wholesale_price}
                                  onChange={(e) => handleCellChange(idx, "wholesale_price", e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-transparent hover:border-border focus:border-primary/30 text-xs bg-transparent"
                                  placeholder="Optional"
                                />
                                {hasWholesale && (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded shrink-0">
                                    WS
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 min-w-[150px]">
                              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                {hasTier2 ? (
                                  <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-muted-foreground" />
                                    {row.tier_2_name} ({row.tier_2_units})
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                                {hasTier3 && (
                                  <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
                                    {row.tier_3_name} ({row.tier_3_units})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 w-32">
                              <input
                                type="text"
                                value={row.category}
                                onChange={(e) => handleCellChange(idx, "category", e.target.value)}
                                className="w-full px-2 py-1 rounded border border-transparent hover:border-border focus:border-primary/30 outline-none text-xs bg-transparent"
                                placeholder="Category"
                              />
                            </td>
                            <td className="p-2 min-w-[130px]">
                              <input
                                type="text"
                                value={row.tags}
                                onChange={(e) => handleCellChange(idx, "tags", e.target.value)}
                                className="w-full px-2 py-1 rounded border border-transparent hover:border-border focus:border-primary/30 outline-none text-xs bg-transparent"
                                placeholder="tag1|tag2"
                                title="Tags separated by pipe (|) or comma (,)"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === "summary" && uploadResult && (
            <div className="space-y-5 py-2">
              {uploadResult.failed === 0 ? (
                /* 100% Success View */
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold font-header !tracking-tight text-foreground">
                    All {uploadResult.created} Products Imported Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your catalog and inventory stock levels have been updated. You can view your new items in the products table.
                  </p>
                </div>
              ) : (
                /* Partial or Conflict View */
                <>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="p-4 rounded-lg flex items-center gap-3 border border-border/80">
                      <div className="hidden w-10 h-10 rounded-lg bg-emerald-500/5 text-emerald-600 md:flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-emerald-600 font-header">{uploadResult.created}</div>
                        <div className="text-xs text-muted-foreground font-medium">Successfully Imported</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-amber-600 font-header">{uploadResult.failed}</div>
                        <div className="text-xs text-muted-foreground font-medium">Skipped (Conflicts / Issues)</div>
                      </div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="md:flex items-center justify-between hidden">
                        <h4 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground font-header">
                          Skipped Items & Conflict Explanations
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          Existing products were protected and remained untouched.
                        </span>
                      </div>
                      <div className="border border-border rounded overflow-hidden max-h-[45vh] overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted text-[11px] uppercase !tracking-wider text-muted-foreground font-header sticky top-0">
                            <tr>
                              <th className="px-3 py-2.5 font-bold !tracking-wider">Product in CSV</th>
                              <th className="px-3 py-2.5 font-bold !tracking-wider">SKU</th>
                              <th className="px-3 py-2.5 font-bold !tracking-wider">Reason / Conflict</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 bg-card">
                            {uploadResult.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-semibold text-foreground">{err.name}</td>
                                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{err.sku || "—"}</td>
                                <td className="px-3 py-2.5 text-destructive text-xs flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{err.error}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      }
      footer={footer}
    />
  );
}
