import React, { useState } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody,
  ModalFooter
} from '@nextui-org/react';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Lock, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export default function ForcePasswordChangeModal() {
  const isFirstLogin = useAuthStore((state) => state.isFirstLogin);
  const completeFirstLogin = useAuthStore((state) => state.completeFirstLogin);
  const logout = useAuthStore((state) => state.logout);

  const [currentPassword, setCurrentPassword] = useState('Welcome@123'); // pre-filled default
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple rules checker
  const validateRules = (pwd: string) => {
    return {
      length: pwd.length >= 8,
      upperLower: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':",.<>?]/.test(pwd),
    };
  };

  const rules = validateRules(newPassword);
  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      toast.error('Please satisfy all password safety rules.');
      return;
    }
    if (newPassword === 'Welcome@123') {
      toast.error('Please choose a password different from the default one.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Updating security credentials...');

    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Security password updated successfully!', { id: toastId });
      completeFirstLogin();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error?.message || 'Failed to update password. Verify current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isFirstLogin} 
      onOpenChange={() => {}} // prevent close
      isDismissable={false}
      hideCloseButton={true}
      placement="center"
      backdrop="blur"
      className=" font-header max-w-md w-full"
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col items-center text-center space-y-3 p-6 pb-2 border-b border-border/40">
            <div className="h-12 w-12 rounded-[0.7rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">
                Update Your Password
              </h2>
              <p className="text-xs text-muted-foreground">
                You are logging in with a default password. Please update it for security.
              </p>
            </div>
          </ModalHeader>

          <ModalBody className="p-6 space-y-1">
            {/* Warning block */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-500 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold">Immediate action required</span>
                <p className="text-muted-foreground leading-normal">
                  Your administrator provisioned your account with a temporary key. You must set a new personal password before you can view your dashboard.
                </p>
              </div>
            </div>

            {/* Current Password */}
            <CustomInputTextField
              id="current_password"
              label="Current Password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* New Password */}
            <CustomInputTextField
              id="new_password"
              label="New Password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new strong password"
              required
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Confirm Password */}
            <CustomInputTextField
              id="confirm_password"
              label="Confirm New Password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Password Safety Helper Indicators */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-xs">
              <span className="font-semibold text-muted-foreground">Password Safety Rules:</span>
              <div className="grid grid-cols-2 gap-2 mt-2 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.length ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/30'}`} />
                  <span className={rules.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>At least 8 chars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.upperLower ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/30'}`} />
                  <span className={rules.upperLower ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>Upper & Lowercase</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.number ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/30'}`} />
                  <span className={rules.number ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>At least 1 digit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.special ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/30'}`} />
                  <span className={rules.special ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>1 special character</span>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="px-6 py-4 flex flex-col sm:flex-row gap-3 pb-6">
            <Button
              type="button"
              variant="outline"
              // size="lg"
              onClick={logout}
              className="w-full sm:w-auto font-bold h-11 px-6"
            >
              Sign Out
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isPasswordValid}
              variant="default"
              // size="lg"
              className="flex1 font-bold h-11"
            >
              {isSubmitting ? 'Updating password...' : 'Save & Continue'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
