import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import { useAuthStore } from '@/store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NO_AUTOFILL = { autoComplete: 'new-password', autoCorrect: 'off', spellCheck: false } as const;

/** Change your own sign-in password (used on phones and laptops). */
export default function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setShow(false);
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/auth/staff/change-password', { current_password: current, new_password: next });
      toast.success('Password changed');
      useAuthStore.setState((st) => ({ staffUser: st.staffUser ? { ...st.staffUser, must_change_password: false } : st.staffUser }));
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const eye = (
    <button type="button" onClick={() => setShow((v) => !v)} className="text-muted-foreground hover:text-foreground focus:outline-none">
      <Icon icon={show ? 'solar:eye-closed-linear' : 'solar:eye-linear'} className="text-base" />
    </button>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={() => !saving && onClose()}
      size="md"
      header={
        <div className="pt-2 px-1">
          <h2 className="text-lg font-bold text-foreground">Change password</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Used to sign in on phones and laptops</p>
        </div>
      }
      body={
        <form id="change-password-form" onSubmit={submit} autoComplete="off" className="py-2 space-y-3">
          <CustomInputTextField
            label="Current password"
            name="current-password-field"
            type={show ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            inputProps={NO_AUTOFILL}
            endContent={eye}
          />
          <CustomInputTextField
            label="New password"
            name="new-password-field"
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            placeholder="At least 8 characters"
            inputProps={NO_AUTOFILL}
          />
          <CustomInputTextField
            label="Confirm new password"
            name="confirm-password-field"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            inputProps={NO_AUTOFILL}
          />
        </form>
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full">
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            disabled={saving || !current || !next || !confirm}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {saving ? 'Saving…' : 'Change password'}
          </Button>
        </div>
      }
    />
  );
}
