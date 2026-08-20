import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

interface ResetStaffPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  onSuccess?: () => void;
}

const DEFAULT_PASSWORD = 'Welcome@123';

export function ResetStaffPasswordModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: ResetStaffPasswordModalProps) {
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword(DEFAULT_PASSWORD);
      setShowPassword(false);
    }
  }, [isOpen, staff]);

  if (!staff) return null;

  const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(`/tenant/staff/${staff.id}/reset-password`, { password });
      toast.success(`Password reset for ${staffName}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to reset password');
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
          <h2 className="text-lg font-bold text-foreground">Reset Staff Password</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {staffName} ({staff.email})
          </p>
        </div>
      }
      body={
        <form id="reset-password-form" onSubmit={handleSubmit} className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Set a new temporary password for this staff member's login.
          </p>

          <CustomInputTextField
            label="New Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Secure password"
            inputProps={{ minLength: 6 }}
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="font-medium w-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="reset-password-form"
            disabled={isLoading || password.length < 6}
            className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 w-full hover:bg-primary/90"
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            Reset Password
          </Button>
        </div>
      }
    />
  );
}

export default ResetStaffPasswordModal;
