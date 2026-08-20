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

  const isActive = product.status
    ? product.status.toLowerCase() === "active"
    : product.is_active !== false;
  const targetAction = isActive ? "draft" : "active";

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
            {/* <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isActive
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Icon
                icon={
                  isActive
                    ? "solar:pause-circle-linear"
                    : "solar:play-circle-linear"
                }
                className="h-5 w-5"
              />
            </div> */}
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isActive ? "Set Product to Draft" : "Activate Product"}
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
              Are you sure you want to set <strong className="text-foreground">{product.name}</strong> to <span className="font-semibold text-foreground">Draft</span>?
              This product will be hidden from POS register sales and online catalog until reactivated.
            </p>
          ) : (
            <p>
              Activate <strong className="text-foreground">{product.name}</strong>?
              This product will immediately become available for sale on the POS register and online storefront.
            </p>
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
              <>
                {/* <Icon
                  icon={
                    isActive
                      ? "solar:pause-circle-linear"
                      : "solar:check-circle-linear"
                  }
                  className="h-4 w-4"
                /> */}
                <span>
                  {isActive ? "Set to Draft" : "Activate Product"}
                </span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
