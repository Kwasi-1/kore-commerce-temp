import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';

interface PurchaseOrderCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  poToCancel: any | null;
  onConfirmCancel: () => void;
  isCancellingPO?: boolean;
}

export default function PurchaseOrderCancelModal({
  isOpen,
  onClose,
  poToCancel,
  onConfirmCancel,
  isCancellingPO = false,
}: PurchaseOrderCancelModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isCancellingPO) onClose();
      }}
      size="sm"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2 flex items-center gap-2 text-destructive">
          {/* <Icon icon="solar:danger-triangle-linear" className="h-5 w-5 shrink-0" /> */}
          <h3 className="text-lg font-bold text-foreground">Cancel Purchase Order?</h3>
        </div>
      }
      body={
        <div className="py-2 space-y-1 text-sm text-muted-foreground inline">
          <p className='inline mr-1'>
            Are you sure you want to cancel purchase order <strong className="text-foreground">{poToCancel?.referenceNumber || poToCancel?.reference_number || 'this PO'}</strong>?
          </p>
          {/* <p className="text-destructive/80 font-medium inline">
            This action cannot be undone.
          </p> */}
        </div>
      }
      footer={
        <div className="grid grid-cols-2 gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isCancellingPO}
            className="text-xs font-medium"
          >
            Keep Order
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirmCancel}
            disabled={isCancellingPO}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold flex items-center gap-1.5 min-w-[110px] justify-center"
          >
            {isCancellingPO ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                {/* <Icon icon="solar:close-circle-linear" className="h-4 w-4" /> */}
                <span>Cancel PO</span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
