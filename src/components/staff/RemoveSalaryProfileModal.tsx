import React from "react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";

interface RemoveSalaryProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function RemoveSalaryProfileModal({
  isOpen,
  onClose,
  profile,
  onConfirm,
  isDeleting = false,
}: RemoveSalaryProfileModalProps) {
  if (!profile) return null;

  const displayName = profile.full_name || profile.name || "Staff Member";
  const roleTitle =
    profile.role_title || (profile.is_off_platform ? "Contractor / External" : "Staff");

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isDeleting) onClose();
      }}
      size="md"
      header={
        <div className="pt-1 px-1 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Remove from Payroll
              </h2>
              <p className="text-xs text-muted-foreground leading-normal">
                {displayName} • {roleTitle}
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="pb-2 text-sm text-muted-foreground">
          <p>
            Are you sure you want to remove{" "}
            <strong className="text-foreground">{displayName}</strong> from the
            payroll roster?
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="font-semibold flex items-center justify-center gap-1.5 w-full bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Removing...</span>
              </>
            ) : (
              <span>Remove from Payroll</span>
            )}
          </Button>
        </div>
      }
    />
  );
}
