import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';

interface PurchaseOrderCloseEarlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  poToCloseEarly: any | null;
  onConfirmCloseEarly: () => void;
  isClosingPO?: boolean;
}

export default function PurchaseOrderCloseEarlyModal({
  isOpen,
  onClose,
  poToCloseEarly,
  onConfirmCloseEarly,
  isClosingPO = false,
}: PurchaseOrderCloseEarlyModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isClosingPO) onClose();
      }}
      size="sm"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2 flex items-center gap-2">
          <Icon icon="solar:check-read-linear" className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-bold text-foreground">Close Purchase Order Short?</h3>
        </div>
      }
      body={
        <div className="py-2 space-y-2 text-xs text-muted-foreground">
          <p>
            Close <strong className="text-foreground">{poToCloseEarly?.referenceNumber || poToCloseEarly?.reference_number || 'this PO'}</strong> now and mark it as completed?
          </p>
          <div className="bg-muted/30 p-2.5 rounded-md border border-border/60 text-[11px] text-muted-foreground">
            Use this if your supplier cannot deliver the remaining items. The stock you already received will remain in inventory, and this PO will no longer appear as pending delivery.
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 w-full pt-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isClosingPO}
            className="text-xs font-medium"
          >
            Keep Pending
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirmCloseEarly}
            disabled={isClosingPO}
            className="bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 min-w-[120px] justify-center"
          >
            {isClosingPO ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Closing...</span>
              </>
            ) : (
              <>
                <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                <span>Close PO Early</span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
