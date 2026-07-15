import React, { useState, useRef, useEffect } from "react";
import { Upload, AlertCircle, Download, CreditCard, Calendar, Truck } from "lucide-react";
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
      apiClient.get("/tenant/suppliers?limit=100")
        .then((res) => {
          const fetchedSuppliers = res.data.success?.data?.suppliers || [];
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

  const downloadSampleTemplate = () => {
    const headers = ["product_name", "sku", "quantity", "cost_price", "packaging_tier_name"];
    const csvContent = headers.join(",") + "\n" +
      "Nike Air Max,NK-AM-01,15,500.0,Unit\n" +
      "Sony WH-1000XM4,SN-WH-04,5,3100.0,Unit\n" +
      "Adidas Yeezy Boost,AD-YB-99,10,1200.0,Unit\n" +
      "Nike Socks Multi,,50,12.0,Unit";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_receive_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const footer = (
    <div className="flex gap-3 justify-end w-full px-2 pb-2">
      <Button variant="ghost" onClick={handleClose} disabled={isPending}>
        Cancel
      </Button>
      <Button
        onClick={handleParse}
        disabled={isPending || !file}
        className="bg-primary hover:bg-primary/95 text-primary-foreground min-w-[140px] rounded-xl"
      >
        {isPending ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Parsing File...</span>
          </div>
        ) : (
          "Parse Shipment"
        )}
      </Button>
    </div>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => handleClose()}
      size="2xl"
      header={
        <div className="pt-4 px-2">
          <h2 className="text=lg md:text-xl font-bold flex items-center gap-2">
            {/* <Truck className="h-5 w-5 text-primary" /> */}
            Receive Stock from Shipment
          </h2>
          <p className="text-[12px] md:text-sm text-muted-foreground font-normal leading-[1.4]">
            Upload your supplier stock CSV or Excel sheet to receive items into inventory.
          </p>
        </div>
      }
      body={
        <div className="flex-1 w-full md:p-2 space-y-3 md:space-y-4">
          {/* File Upload Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-primary bg-primary/5 scale-[0.99]"
                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/10"
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
            
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary animate-pulse">
              <Upload className="h-6 w-6" />
            </div>

            {file ? (
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground truncate max-w-md">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB · Click to change file
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">
                  Click or drag spreadsheet here to upload
                </h3>
                <p className="text-xs text-muted-foreground">
                  Supports CSV, XLSX, and XLS formats (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Download template & credit purchase */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/30">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Need a template?</h4>
              <p className="text-xs text-muted-foreground">
                Download our template with pre-defined column headers.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="rounded-xl border hover:bg-muted text-foreground flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV Template
            </Button>
          </div>

          {/* Supplier and Credit Options */}
          <div className="border rounded-lg md:rounded-xl p-5 space-y-5 bg-card">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-bold text-foreground flex items-center gap-2 cursor-pointer" htmlFor="credit-toggle">
                  {/* <CreditCard className="h-4 w-4 text-primary" /> */}
                  Credit Purchase
                </label>
                <p className="text-xs text-muted-foreground">
                  Select if payment to the supplier will be made later.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Supplier *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={isPending}
                    className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={creditDueDate}
                    onChange={(e) => setCreditDueDate(e.target.value)}
                    disabled={isPending}
                    className="rounded-xl h-10 text-sm"
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
