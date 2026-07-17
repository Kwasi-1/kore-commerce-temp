import React, { useState } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody,
  ModalFooter
} from '@nextui-org/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className="border border-border/80 bg-zinc-900 text-white rounded-2xl shadow-2xl p-0 overflow-hidden font-header max-w-md w-full"
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col items-center text-center space-y-3 p-6 pb-2 border-b border-border/40">
            <div className="h-12 w-12 rounded-[0.8rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Update Your Password
              </h2>
              <p className="text-xs text-muted-foreground">
                You are logging in with a default password. Please update it for security.
              </p>
            </div>
          </ModalHeader>

          <ModalBody className="p-6 space-y-4">
            {/* Warning block */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-500 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold">Immediate action required</span>
                <p className="text-muted-foreground text-amber-400/90 leading-normal">
                  Your administrator provisioned your account with a temporary key. You must set a new personal password before you can view your dashboard.
                </p>
              </div>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <Input
                  id="current_password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10 pr-10 border-border/80 bg-zinc-800 text-white focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/60 transition-all text-sm rounded-lg"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <Input
                  id="new_password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 border-border/80 bg-zinc-800 text-white focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/60 transition-all text-sm rounded-lg"
                  placeholder="Enter a new strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <Input
                  id="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 border-border/80 bg-zinc-800 text-white focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/60 transition-all text-sm rounded-lg"
                  placeholder="Re-enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Safety Helper Indicators */}
            <div className="bg-zinc-800/40 border border-border/40 rounded-xl p-4.5 space-y-2 text-xs">
              <span className="font-semibold text-zinc-400">Password Safety Rules:</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.length ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <span className={rules.length ? 'text-green-400' : 'text-muted-foreground'}>At least 8 chars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.upperLower ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <span className={rules.upperLower ? 'text-green-400' : 'text-muted-foreground'}>Upper & Lowercase</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.number ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <span className={rules.number ? 'text-green-400' : 'text-muted-foreground'}>At least 1 digit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rules.special ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <span className={rules.special ? 'text-green-400' : 'text-muted-foreground'}>1 special character</span>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="bg-zinc-950/40 border-t border-border/40 px-6 py-4 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="w-full sm:w-auto h-11 px-6 rounded-lg text-zinc-400 hover:text-white border-zinc-700 hover:bg-zinc-800 flex items-center justify-center font-bold"
            >
              Sign Out
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isPasswordValid}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 h-11 font-bold rounded-lg transition-all"
            >
              {isSubmitting ? 'Updating password...' : 'Save & Continue'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
