import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';

interface StaffStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function StaffStatusModal({
  isOpen,
  onClose,
  staff,
  onConfirm,
  isLoading = false,
}: StaffStatusModalProps) {
  if (!staff) return null;

  const isActive = staff.is_active !== false;
  const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isLoading) onClose();
      }}
      size="md"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">
            {isActive ? 'Deactivate Staff Member' : 'Activate Staff Member'}
          </h2>
          {/* <p className="text-xs text-muted-foreground mt-0.5">
            {staffName} ({staff.email})
          </p> */}
        </div>
      }
      body={
        <div className="pb-2 text-sm text-muted-foreground">
          {isActive ? (
            <p>
              Are you sure you want to deactivate <strong className="text-foreground">{staffName}</strong>? They will immediately lose access to terminal unlock, POS sales, and the admin dashboard.
            </p>
          ) : (
            <p>
              Reactivate <strong className="text-foreground">{staffName}</strong>? They will regain access to log in and use their assigned permissions.
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-semibold flex items-center justify-center gap-1.5 w-full ${
              isActive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isActive ? 'Deactivate Staff' : 'Activate Staff'}
          </Button>
        </div>
      }
    />
  );
}

export default StaffStatusModal;
