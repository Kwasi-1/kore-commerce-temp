import React from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface ProductChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onConfirm: () => void;
  isUpdating?: boolean;
}

export function ProductChannelModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  isUpdating = false,
}: ProductChannelModalProps) {
  if (!product) return null;

  const currentOnline = product.is_available_online !== false && product.isAvailableOnline !== false;
  const targetAction = currentOnline ? "in_store" : "online";

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
                {currentOnline ? "Set to In-Store Only?" : "Publish to Online Storefront?"}
              </h2>
              <p className="text-xs text-muted-foreground leading-normal truncate max-w-[280px]">
                {product.name}
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="pb-3 text-sm space-y-3 text-muted-foreground">
          {currentOnline ? (
            <p>
              Remove <strong className="text-foreground">{product.name}</strong> from your online storefront?
              This product will only be available on the in-store POS register and hidden from online shoppers.
            </p>
          ) : (
            <p>
              Publish <strong className="text-foreground">{product.name}</strong> to your online storefront?
              It will immediately appear on your storefront and be purchasable by online customers. Stock will continue to sync across all channels.
            </p>
          )}

          <div className="bg-muted/40 rounded-lg p-3 text-xs flex items-center justify-between">
            <span className="text-muted-foreground font-medium">New Sales Channel:</span>
            <span className="font-semibold inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-muted text-foreground border border-border">
              {targetAction === "online" ? (
                <>
                  <Icon icon="solar:global-linear" className="h-3 w-3" /> Online & POS
                </>
              ) : (
                <>
                  <Icon icon="solar:shop-2-linear" className="h-3 w-3" /> In-Store Only
                </>
              )}
            </span>
          </div>
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
              currentOnline
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
                {currentOnline ? "Confirm In-Store Only" : "Publish to Storefront"}
              </span>
            )}
          </Button>
        </div>
      }
    />
  );
}
