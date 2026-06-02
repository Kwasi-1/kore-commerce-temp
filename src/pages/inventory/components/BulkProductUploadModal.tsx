import React, { useState, useRef, useMemo } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Package, Download } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
// import { Modal } from "@/components/modals/Modal";
import { Icon } from "@iconify/react/dist/iconify.js";
import CustomModal from '@/components/modals/modal';

interface BulkProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedProduct {
  name: string;
  price: string;
  quantity: string;
  category: string;
  description: string;
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
    Papa.parse<ParsedProduct>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Map and validate basic fields
        const processed = results.data.map((row) => {
          const item: ParsedProduct = {
            name: row.name || "",
            price: row.price || "",
            quantity: row.quantity || "",
            category: row.category || "",
            description: row.description || "",
            tags: row.tags || "",
          };

          if (!item.name || !item.price || !item.quantity || !item.category) {
            item._error = "Missing required fields";
          } else if (isNaN(Number(item.price)) || Number(item.price) <= 0) {
            item._error = "Invalid price";
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
    if (!item.name || !item.price || !item.quantity || !item.category) {
      item._error = "Missing required fields";
    } else if (isNaN(Number(item.price)) || Number(item.price) <= 0) {
      item._error = "Invalid price";
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
      price: Number(p.price),
      stock_quantity: Number(p.quantity), // map quantity to stock_quantity for backend
      category: p.category,
      description: p.description,
      tags: p.tags ? p.tags.split("|").map(t => t.trim()).filter(Boolean) : [],
    }));

    setIsPending(true);
    try {
      await apiClient.post("/tenant/products/bulk", { products: payload });
      toast.success(`Successfully imported ${validProducts.length} products`);
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
    const sampleCsv = `name,price,quantity,category,description,tags\nWireless Mouse,45.00,100,electronics,Ergonomic wireless mouse,tech|gadget\nGraphic T-Shirt,25.00,50,fashion,100% cotton t-shirt,clothing|shirt`;
    const blob = new Blob([sampleCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campuzon_bulk_products_sample.csv";
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
          className="bg-primary min-w-[140px]"
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
      size="4xl"
      header={
        <div className="pt-4 px-2">
          <h2 className="text-xl font-bold">Bulk Import Products</h2>
          <p className="text-sm text-muted-foreground font-normal">Upload a CSV to quickly draft multiple products.</p>
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
                  isDragging ? "border-primary/70 bg-primary/5" : "border-border bg-background hover:border-muted-foreground/10 hover:bg-secondary/50"
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
                <h3 className="text-lg font-medium text-foreground">Click or drag CSV to upload</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
                  Ensure your CSV has headers: name, price, quantity, category, description, tags
                </p>
              </div>

              <Button variant="ghost" onClick={downloadSample} className="text-muted-foreground border  dark:text-primary hover:text-primary/80">
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-background py-3 md:py-4 px-4 border border-border">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{parsedData.length} Products Found</span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      {errorCount} {errorCount === 1 ? "issue" : "issues"} to fix
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="border-transparent md:border-border/80 px-3 rounded-none md:px-4" onClick={() => setStep("upload")} disabled={isPending}>
                  {/* <Icon icon="pajamas:retry" className="h-4 w-4" /> */}
                  <span className="ml-1 hidden md:inline">Re-upload CSV</span>
                </Button>
              </div>

              <div className="bg-background border border-border overflow-hidden shadowsm">
                <div className="overflow-x-auto scrollbar-hide max-h-[50vh]">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-muted-foreground bg-muted/70 uppercase sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name*</th>
                        <th className="px-4 py-3 font-medium">Price (GHS)*</th>
                        <th className="px-4 py-3 font-medium">Qty*</th>
                        <th className="px-4 py-3 font-medium">Category*</th>
                        <th className="px-4 py-3 font-medium">Tags (pipe | separated)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className={`hover:bg-muted/30 transition-colors ${row._error ? 'bg-destructive/5' : ''}`}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                              className={`w-full px-2 py-1.5 rounded border outline-none text-sm ${
                                row._error && !row.name ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/20 focus:bg-background bg-transparent"
                              }`}
                              placeholder="Product name"
                            />
                          </td>
                          <td className="p-2 w-28">
                            <input
                              type="number"
                              value={row.price}
                              onChange={(e) => handleCellChange(idx, "price", e.target.value)}
                              className={`w-full px-2 py-1.5 rounded border outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                row._error && (!row.price || isNaN(Number(row.price))) ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/20 focus:bg-background bg-transparent"
                              }`}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2 w-24">
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => handleCellChange(idx, "quantity", e.target.value)}
                              className={`w-full px-2 py-1.5 rounded border outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                row._error && (!row.quantity || isNaN(Number(row.quantity))) ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/20 focus:bg-background bg-transparent"
                              }`}
                              placeholder="0"
                            />
                          </td>
                          <td className="p-2 w-40">
                            <input
                              type="text"
                              value={row.category}
                              onChange={(e) => handleCellChange(idx, "category", e.target.value)}
                              className={`w-full px-2 py-1.5 rounded border outline-none text-sm ${
                                row._error && !row.category ? "border-destructive bg-destructive/10" : "border-transparent hover:border-border focus:border-primary/20 focus:bg-background bg-transparent"
                              }`}
                              placeholder="e.g. fashion"
                            />
                          </td>
                          <td className="p-2 w-48">
                            <input
                              type="text"
                              value={row.tags}
                              onChange={(e) => handleCellChange(idx, "tags", e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-transparent hover:border-border focus:border-primary/20 focus:bg-background outline-none text-sm bg-transparent"
                              placeholder="tag1|tag2"
                            />
                          </td>
                        </tr>
                      ))}
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
