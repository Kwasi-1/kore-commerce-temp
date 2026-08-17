import React, { useState, useRef } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export interface POImportedItem {
  variant_id: string;
  packaging_tier_id: string;
  product_name: string;
  variant_label: string;
  tier_name: string;
  tier_units_per_tier: number;
  quantity: number;
  cost_price: number;
}

interface POImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportItems: (items: POImportedItem[]) => void;
}

export function POImportCSVModal({ isOpen, onClose, onImportItems }: POImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isExportingTemplate, setIsExportingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
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
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      setFile(selectedFile);
    } else {
      toast.error('Invalid file format. Please upload a .csv, .xlsx, or .xls file.');
    }
  };

  const downloadCatalogueTemplate = async () => {
    setIsExportingTemplate(true);
    try {
      const response = await apiClient.get('/tenant/stock/export-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock_receive_catalogue_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Catalogue template downloaded!');
    } catch (err) {
      console.error('Failed to download catalogue template:', err);
      toast.error('Failed to generate catalogue template.');
    } finally {
      setIsExportingTemplate(false);
    }
  };

  const downloadBlankTemplate = () => {
    const headers = [
      'sku',
      'product_name',
      'variant_attributes',
      'packaging_tier_name',
      'current_stock',
      'quantity_to_receive',
      'cost_price',
      'expiry_date'
    ];
    const csvContent = headers.join(',') + '\n' +
      'NK-AM-01,Nike Air Max,Size: 10,Box,14,20,450.00,2027-12-31\n' +
      'SN-WH-04,Sony WH-1000XM4,Color: Black,Unit,5,10,3100.00,';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase_order_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleParseAndImport = async () => {
    if (!file) {
      toast.error('Please select a file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsPending(true);
    try {
      const response = await apiClient.post('/tenant/stock/parse-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data.success?.data;
      if (data && data.matched) {
        const matchedItems: POImportedItem[] = (data.matched || []).map((m: any) => {
          return {
            variant_id: m.variant_id,
            packaging_tier_id: m.packaging_tier_id || '',
            product_name: m.variant_name || m.row_data?.product_name || 'Product',
            variant_label: m.sku ? `SKU: ${m.sku}` : '',
            tier_name: m.packaging_tier_name || 'Unit',
            tier_units_per_tier: 1,
            quantity: Number(m.quantity_to_add || m.row_data?.quantity || 1),
            cost_price: Number(m.cost_price ?? m.row_data?.cost_price ?? 0)
          };
        });

        if (matchedItems.length === 0) {
          toast.error('No matching items with quantities found in the uploaded file.');
          return;
        }

        onImportItems(matchedItems);
        toast.success(`Successfully imported ${matchedItems.length} items into order!`);
        handleClose();
      } else {
        toast.error('Failed to parse file. Please verify column headers.');
      }
    } catch (error: any) {
      console.error('File parse error:', error);
      const errMsg = error.response?.data?.error?.message || 'Failed to parse spreadsheet file';
      toast.error(errMsg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size="xl"
      header={
        <div className="pt-2 px-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Import Line Items from Spreadsheet</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload your supplier CSV or Excel file to populate order line items automatically.
          </p>
        </div>
      }
      body={
        <div className="space-y-4 py-2">
          {/* Drag and drop area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/10'
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

            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <Upload className="h-6 w-6" />
            </div>

            {file ? (
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground truncate max-w-xs">
                  {file.name}
                </p>
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

          {/* Download Template Bar */}
          <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground">Need a template?</h4>
              <p className="text-[11px] text-muted-foreground">
                Download a pre-filled catalogue or blank template with the required headers.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={downloadBlankTemplate}
                className="rounded-lg border text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Blank
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={downloadCatalogueTemplate}
                disabled={isExportingTemplate}
                className="rounded-lg text-xs h-8 font-semibold flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
              >
                {isExportingTemplate ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Catalogue Template</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 w-full pt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleParseAndImport}
            disabled={isPending || !file}
            className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 min-w-[130px]"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Import Items</span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
