import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';

interface OrderStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderReference: string;
  newStatus: string;
  isUpdating: boolean;
}

export default function OrderStatusConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  orderReference,
  newStatus,
  isUpdating
}: OrderStatusConfirmModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      size="sm"
      header={<span className="text-lg font-semibold">Confirm Status Change</span>}
      body={
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to change the status of order <span className="font-semibold text-foreground">{orderReference}</span> to <span className="font-semibold text-foreground uppercase">{newStatus}</span>?
          </p>
        </div>
      }
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Confirm Change'}
          </Button>
        </div>
      }
    />
  );
}
