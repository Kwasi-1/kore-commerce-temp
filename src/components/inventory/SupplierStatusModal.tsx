import React from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";

interface SupplierStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any | null;
  onConfirm: () => void;
  isUpdating?: boolean;
}

export function SupplierStatusModal({
  isOpen,
  onClose,
  supplier,
  onConfirm,
  isUpdating = false,
}: SupplierStatusModalProps) {
  if (!supplier) return null;

  const isActive = supplier.is_active !== undefined 
    ? supplier.is_active 
    : (supplier.isActive !== undefined ? supplier.isActive : true);

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isUpdating) onClose();
      }}
      size="md"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">
            {isActive ? "Deactivate Supplier" : "Activate Supplier"}
          </h2>
        </div>
      }
      body={
        <div className="pb-2 text-sm text-muted-foreground">
          {isActive ? (
            <p>
              Are you sure you want to deactivate <strong className="text-foreground">{supplier.name}</strong>? They will be archived and will no longer appear when creating new purchase orders.
            </p>
          ) : (
            <p>
              Reactivate <strong className="text-foreground">{supplier.name}</strong>? They will become available again for restocking and purchase orders.
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isUpdating}
            className={`font-semibold flex items-center justify-center gap-1.5 w-full ${
              isActive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isUpdating && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isActive ? "Deactivate Supplier" : "Activate Supplier"}
          </Button>
        </div>
      }
    />
  );
}

export default SupplierStatusModal;
