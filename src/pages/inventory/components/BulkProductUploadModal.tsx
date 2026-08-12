import React, { useState, useRef } from "react";
import { Upload, AlertCircle, Package, Download, CheckCircle2, Layers } from "lucide-react";
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
}

export function BulkProductUploadModal({ isOpen, onClose, onSuccess }: BulkProductUploadModalProps) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isPending) return;
    setStep("upload");
    setParsedData([]);
    onClose();
  };

  const processCSV = (file: File) => {
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processed: ParsedProduct[] = results.data.map((row) => {
          const item: ParsedProduct = {
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
          };

          // Validation
          if (!item.name) {
            item._error = "Missing product name";
          } else if (isNaN(Number(item.retail_price)) || Number(item.retail_price) < 0) {
            item._error = "Invalid retail price";
          } else if (isNaN(Number(item.quantity)) || Number(item.quantity) < 0) {
            item._error = "Invalid quantity";
          }

          return item;
        });

        setParsedData(processed);
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
    newData[index] = { ...newData[index], [field]: value };
    
    // Re-validate row
    const item = newData[index];
    item._error = undefined;
    if (!item.name) {
      item._error = "Missing product name";
    } else if (isNaN(Number(item.retail_price)) || Number(item.retail_price) < 0) {
      item._error = "Invalid retail price";
    } else if (isNaN(Number(item.quantity)) || Number(item.quantity) < 0) {
      item._error = "Invalid quantity";
    }
    
    setParsedData(newData);
  };

  const handleSubmit = async () => {
    const validProducts = parsedData.filter((p) => !p._error);
    if (validProducts.length === 0) return;

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
      tags: p.tags ? p.tags.split("|").map(t => t.trim()).filter(Boolean) : [],
    }));

    setIsPending(true);
    try {
      const res = await apiClient.post("/tenant/products/bulk", { products: payload });
      const createdCount = res.data.success?.data?.created ?? validProducts.length;
      toast.success(`Successfully imported ${createdCount} items!`);
      if (onSuccess) onSuccess();
      handleClose();
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
      "tags"
    ].join(",");

    const rows = [
      // Example 1: Simple item with wholesale pricing
      `"Sugar Bread","Bakery","Freshly baked bread","BRD-001","","piece","50","8.00","12.00","10.00","","","","","","","","","fresh|bakery"`,
      // Example 2: Multi-tier product (Bottle + Carton of 24)
      `"Voltic Mineral Water","Beverages","500ml natural spring water","VOL-500","500ml Bottle","bottle","240","1.20","2.50","2.00","Carton","24","55.00","48.00","","","","","drinks|water"`,
      // Example 3: Multi-variant item (Red/Large and Blue/Medium under 1 Product Name)
      `"Graphic Cotton T-Shirt","Fashion","100% Premium Cotton","TSHIRT-RED-L","Red / Large","piece","30","15.00","35.00","28.00","","","","","","","","","clothing|tshirt"`,
      `"Graphic Cotton T-Shirt","Fashion","100% Premium Cotton","TSHIRT-BLU-M","Blue / Medium","piece","25","15.00","35.00","28.00","","","","","","","","","clothing|tshirt"`
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

  const errorCount = parsedData.filter((p) => p._error).length;

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose} disabled={isPending}>
        Cancel
      </Button>
      {step === "review" && (
        <Button
          onClick={handleSubmit}
          disabled={isPending || errorCount > 0 || parsedData.length === 0}
          className="bg-primary text-primary-foreground min-w-[150px] font-bold"
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Importing...</span>
            </div>
          ) : (
            <>Import {parsedData.length - errorCount} Products</>
          )}
        </Button>
      )}
    </>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => handleClose()}
      size="5xl"
      header={
        <div className="pt-4 px-2">
          <h2 className="text-xl font-bold font-header tracking-tight">Bulk Import Products</h2>
          <p className="text-sm text-muted-foreground font-normal">
            Upload CSV with support for Variants, Packaging Tiers (Cartons/Packs), and Wholesale Prices.
          </p>
        </div>
      }
      body={
        <div className="flex-1 w-full md:p-2">
          {step === "upload" ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary/70 bg-primary/5" : "border-border bg-background hover:border-muted-foreground/20 hover:bg-secondary/50"
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
                className="text-foreground border border-border hover:bg-secondary font-bold text-xs uppercase font-header tracking-wider"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-card py-3 px-4 border border-border">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-sm">{parsedData.length} Rows Found</span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 text-xs font-semibold rounded-full border border-destructive/20">
                      <AlertCircle className="h-4 w-4" />
                      {errorCount} {errorCount === 1 ? "issue" : "issues"} to fix
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="border-border px-3 rounded-md text-xs" onClick={() => setStep("upload")} disabled={isPending}>
                  <span className="ml-1">Re-upload CSV</span>
                </Button>
              </div>

              <div className="bg-card border border-border rounded-sm overflow-x-auto shadow-sm">
                <div className="overflow-x-auto scrollbar-hide max-h-[50vh]">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="text-[11px] text-muted-foreground bg-muted uppercase sticky top-0 z-10 shadow-sm font-header tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">Product Name*</th>
                        <th className="px-3 py-2.5 font-bold">Variant / SKU</th>
                        <th className="px-3 py-2.5 font-bold">Unit / Stock*</th>
                        <th className="px-3 py-2.5 font-bold">Retail Price*</th>
                        <th className="px-3 py-2.5 font-bold">Wholesale</th>
                        <th className="px-3 py-2.5 font-bold">Packaging Tiers</th>
                        <th className="px-3 py-2.5 font-bold">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedData.map((row, idx) => {
                        const hasWholesale = Boolean(row.wholesale_price && Number(row.wholesale_price) > 0);
                        const hasTier2 = Boolean(row.tier_2_name && row.tier_2_units);
                        const hasTier3 = Boolean(row.tier_3_name && row.tier_3_units);

                        return (
                          <tr key={idx} className={`hover:bg-muted/30 transition-colors ${row._error ? 'bg-destructive/5' : ''}`}>
                            <td className="p-2 min-w-[160px]">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                                className={`w-full px-2 py-1 rounded border outline-none text-xs font-semibold ${
                                  row._error && !row.name ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
                                }`}
                                placeholder="Product name"
                              />
                            </td>
                            <td className="p-2 min-w-[140px]">
                              <div className="flex flex-col gap-0.5">
                                <input
                                  type="text"
                                  value={row.variant_name}
                                  onChange={(e) => handleCellChange(idx, "variant_name", e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-transparent hover:border-border focus:border-primary/30 outline-none text-xs bg-transparent"
                                  placeholder="Variant (e.g. Red/Large)"
                                />
                                <input
                                  type="text"
                                  value={row.sku}
                                  onChange={(e) => handleCellChange(idx, "sku", e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-transparent text-[11px] text-muted-foreground bg-transparent font-mono"
                                  placeholder="SKU"
                                />
                              </div>
                            </td>
                            <td className="p-2 min-w-[110px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={row.quantity}
                                  onChange={(e) => handleCellChange(idx, "quantity", e.target.value)}
                                  className={`w-16 px-1.5 py-1 rounded border outline-none text-xs font-semibold ${
                                    row._error && (!row.quantity || isNaN(Number(row.quantity))) ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
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
                                  row._error && (!row.retail_price || isNaN(Number(row.retail_price))) ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/30 bg-transparent"
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      }
      footer={footer}
    />
  );
}
