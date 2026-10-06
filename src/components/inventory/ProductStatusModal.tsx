import React from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react/dist/iconify.js";

interface ProductStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onConfirm: () => void;
  isUpdating?: boolean;
}

export function ProductStatusModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  isUpdating = false,
}: ProductStatusModalProps) {
  if (!product) return null;

  const isVariant = Boolean(product.isVariant);
  const isActive = isVariant
    ? (product.isActive !== false && product.is_active !== false)
    : (product.status
        ? product.status.toLowerCase() === "active"
        : product.is_active !== false);

  const isParentDraft = isVariant && product.parentStatus?.toLowerCase() === "draft";

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isUpdating) onClose();
      }}
      size="md"
      header={
        <div className="pt-1 px-1 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isActive
                  ? isVariant
                    ? "Deactivate Variant"
                    : "Set Product to Draft"
                  : isVariant
                    ? "Activate Variant"
                    : "Activate Product"}
              </h2>
              <p className="text-xs text-muted-foreground leading-normal">
                {product.name}
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="pb-3 text-sm space-y-2 text-muted-foreground">
          {isActive ? (
            <p>
              Are you sure you want to {isVariant ? "deactivate" : "set"} <strong className="text-foreground">{product.name}</strong> to {isVariant ? <span className="font-semibold text-foreground">Inactive</span> : <span className="font-semibold text-foreground">Draft</span>}?
              This {isVariant ? "variant" : "product"} will be hidden from POS register sales and online catalog until reactivated.
            </p>
          ) : (
            <div className="space-y-2">
              <p>
                Activate <strong className="text-foreground">{product.name}</strong>?
                This {isVariant ? "variant" : "product"} will immediately become available for sale on the POS register and online storefront.
              </p>
              {isParentDraft && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20 leading-relaxed">
                  <strong>Note:</strong> The parent product is currently in <strong>Draft</strong> status. To make this variant sellable, the product must also be published/activated.
                </div>
              )}
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirm}
            disabled={isUpdating}
            className={`font-semibold flex items-center gap-1.5 w-full ${
              isActive
                ? "bg-foreground text-background hover:bg-foreground/90"
                : ""
            }`}
          >
            {isUpdating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Updating...</span>
              </>
            ) : (
              <span>
                {isActive
                  ? isVariant
                    ? "Deactivate Variant"
                    : "Set to Draft"
                  : isVariant
                    ? "Activate Variant"
                    : "Activate Product"}
              </span>
            )}
          </Button>
        </div>
      }
    />
  );
}
