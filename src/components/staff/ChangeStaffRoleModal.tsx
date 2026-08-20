import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomSelectField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react/dist/iconify.js';

interface ChangeStaffRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  onSuccess: () => void;
}

export function ChangeStaffRoleModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: ChangeStaffRoleModalProps) {
  const [role, setRole] = useState('cashier');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (staff) {
      setRole(staff.role || 'cashier');
    }
  }, [staff, isOpen]);

  if (!staff) return null;

  const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;

  const handleRoleSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    if (val) setRole(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.put(`/tenant/staff/${staff.id}/role`, { role });
      toast.success(`Role updated to ${role}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Update role error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => {
        if (!isLoading) onClose();
      }}
      size="md"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">Change Staff Role</h2>
          <p className="text-[12px] text-muted-foreground mt0.5">
            {staffName} ({staff.email})
          </p>
        </div>
      }
      body={
        <form id="change-role-form" onSubmit={handleSubmit} className="py-2 space-y-4">
          <CustomSelectField
            label="Assign Role"
            options={[
              { label: 'Cashier', value: 'cashier' },
              { label: 'Manager', value: 'manager' },
              { label: 'Owner', value: 'owner' }
            ]}
            value={role}
            inputProps={{
              onSelectionChange: handleRoleSelect
            }}
            required
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            // size="sm"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            // size="sm"
            type="submit"
            form="change-role-form"
            disabled={isLoading}
            className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full hover:bg-primary/90"
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            Update Role
          </Button>
        </div>
      }
    />
  );
}

export default ChangeStaffRoleModal;
