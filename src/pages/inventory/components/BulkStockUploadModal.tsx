import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import CustomModal from '@/components/modals/modal';
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface BulkStockUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SupplierOption {
  id: string;
  name: string;
}

export function BulkStockUploadModal({ isOpen, onClose }: BulkStockUploadModalProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // Credit & Supplier states
  const [isCreditPurchase, setIsCreditPurchase] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load suppliers when modal is open
  useEffect(() => {
    if (isOpen) {
      apiClient.get("/tenant/suppliers?limit=100&status=active")
        .then((res) => {
          const list = res.data.success?.data?.suppliers || res.data.data?.suppliers || [];
          const fetchedSuppliers = list.filter((s: any) => (s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true)));
          setSuppliers(fetchedSuppliers);
          if (fetchedSuppliers.length > 0) {
            setSupplierId(fetchedSuppliers[0].id);
          }
        })
        .catch((err) => {
          console.error("Failed to load suppliers:", err);
          toast.error("Failed to load suppliers list");
        });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
    setIsCreditPurchase(false);
    setSupplierId("");
    setCreditDueDate("");
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "xlsx" || ext === "xls") {
      setFile(selectedFile);
    } else {
      toast.error("Invalid file format. Please upload a .csv, .xlsx or .xls file.");
    }
  };

  const handleParse = async () => {
    if (!file) {
      toast.error("Please select a file to parse.");
      return;
    }

    if (isCreditPurchase && !supplierId) {
      toast.error("Please select a supplier for this credit purchase.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsPending(true);
    try {
      const response = await apiClient.post("/tenant/stock/parse-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = response.data.success?.data;
      if (data) {
        toast.success("File parsed successfully! Redirecting to Audit Screen...");
        handleClose();
        navigate("/inventory/stock-upload/audit", {
          state: {
            parsedData: data,
            creditDetails: {
              isCreditPurchase,
              supplierId,
              creditDueDate,
              supplierName: suppliers.find(s => s.id === supplierId)?.name || ""
            }
          }
        });
      } else {
        toast.error("Failed to parse file. Invalid response format.");
      }
    } catch (error: any) {
      console.error("File parse error:", error);
      const errMsg = error.response?.data?.error?.message || "Failed to parse shipment file";
      toast.error(errMsg);
    } finally {
      setIsPending(false);
    }
  };

  const [isExportingTemplate, setIsExportingTemplate] = useState(false);

  const downloadCatalogueTemplate = async () => {
    setIsExportingTemplate(true);
    try {
      const response = await apiClient.get("/tenant/stock/export-template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stock_receive_catalogue_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Catalogue template downloaded!");
    } catch (err) {
      console.error("Failed to download catalogue template:", err);
      toast.error("Failed to generate catalogue template.");
    } finally {
      setIsExportingTemplate(false);
    }
  };

  const downloadBlankTemplate = () => {
    const headers = [
      "sku",
      "product_name",
      "variant_attributes",
      "packaging_tier_name",
      "current_stock",
      "quantity_to_receive",
      "cost_price",
      "expiry_date"
    ];
    const csvContent = headers.join(",") + "\n" +
      "NK-AM-01,Nike Air Max,Size: 10,Box,14,20,450.00,2027-12-31\n" +
      "SN-WH-04,Sony WH-1000XM4,Color: Black,Unit,5,10,3100.00,";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_receive_blank_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const footer = (
    <div className="flex gap-2 justify-end w-full pt-2">
      <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={handleParse}
        disabled={isPending || !file}
        className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 min-w-[140px]"
      >
        {isPending ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Parsing File...</span>
          </>
        ) : (
          <>
            <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
            <span>Parse Shipment</span>
          </>
        )}
      </Button>
    </div>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => handleClose()}
      size="xl"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            {/* <Icon icon="solar:box-minimalistic-linear" className="h-5 w-5 text-foreground/80" /> */}
            <h2 className="text-base sm:text-lg font-bold text-foreground">Receive Stock from Shipment</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your supplier stock CSV or Excel sheet to receive items into inventory.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2">
          {/* File Upload Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? "border-foreground/40 bg-muted/30"
                : "border-border/80 bg-muted/10 hover:border-foreground/30 hover:bg-muted/20"
            }`}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isPending}
            />
            
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <Icon icon="solar:cloud-upload-linear" className="h-6 w-6 text-foreground/70" />
            </div>

            {file ? (
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon icon="solar:document-text-bold" className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-foreground truncate max-w-xs">
                    {file.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB · Click to change file
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Click or drag spreadsheet here to upload
                </h3>
                <p className="text-xs text-muted-foreground">
                  Supports CSV, XLSX, and XLS formats (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Download template */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground">Download Stock Intake Template</h4>
              <p className="text-[11px] text-muted-foreground">
                Pre-filled with your active inventory catalogue. Simply enter received quantities and leave untouched items blank.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={downloadBlankTemplate}
                disabled={isExportingTemplate}
                className="rounded-lg border text-xs h-8 text-muted-foreground hover:text-foreground font-medium"
                title="Download blank CSV with headers"
              >
                Blank
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={downloadCatalogueTemplate}
                disabled={isExportingTemplate}
                className="rounded-lg text-xs h-8 font-medium flex items-center gap-1.5 text-foreground hover:bg-muted"
              >
                {isExportingTemplate ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:download-linear" className="h-3.5 w-3.5" />
                    <span>Catalogue Template</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Supplier and Credit Options */}
          <div className="bg-muted/30 rounded-md p-3.5 space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:card-linear" className="h-4 w-4 text-foreground/70" />
                  <label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="credit-toggle">
                    Credit Purchase
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select if payment to the supplier will be deferred.
                </p>
              </div>
              <Switch
                id="credit-toggle"
                checked={isCreditPurchase}
                onCheckedChange={setIsCreditPurchase}
                disabled={isPending}
              />
            </div>

            {/* Hidden fields expanded on Credit Purchase Toggle */}
            {isCreditPurchase && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Supplier *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={isPending}
                    className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15 disabled:opacity-50"
                  >
                    {suppliers.length === 0 ? (
                      <option value="">No suppliers available</option>
                    ) : (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={creditDueDate}
                    onChange={(e) => setCreditDueDate(e.target.value)}
                    disabled={isPending}
                    className="w-full h-8 px-2.5 border border-input rounded-md bg-background text-xs text-foreground focus:outline-none focus:border-foreground/15"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      }
      footer={footer}
    />
  );
}
