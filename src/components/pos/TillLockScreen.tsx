import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import PinInput from './PinInput';

/**
 * "Till locked": a window over the whole app after a shift ends (and anywhere else that locks the
 * till). It can't be dismissed and the app behind it is blurred. The person stays signed in; their
 * PIN, checked by the server, unlocks it. Wrong PINs count towards the server's lockout, and once it
 * locks them out they're signed out. Someone else can take over with "Switch user". The locked state
 * is saved, so refreshing doesn't unlock it.
 */
export default function TillLockScreen() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isLocked = useAuthStore((s) => s.isLocked);
  const staffUser = useAuthStore((s) => s.staffUser);
  const { isOnline } = useNetworkStatus();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const shown = !!token && isLocked;

  useEffect(() => {
    if (!shown) {
      setPin('');
      setError(null);
    }
  }, [shown]);

  if (!shown) return null;

  const name = staffUser?.name || 'Staff';
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const switchUser = () => {
    useAuthStore.getState().endSession();
    navigate('/login', { replace: true });
  };

  const unlock = async (entered: string) => {
    setChecking(true);
    setError(null);
    try {
      await apiClient.post('/auth/staff/check-pin', { pin: entered }, { skipApproval: true });
      useAuthStore.getState().unlock();
      navigate('/pos/register', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const message: string | undefined = err?.response?.data?.error?.message;
      // Out of tries (or already locked by the server): sign them out
      if (status === 429 || (status === 400 && /locked/i.test(message || ''))) {
        toast.error(message || 'Too many wrong PINs. Signed out.');
        switchUser();
        return;
      }
      setPin('');
      setError(status === 400 ? message || 'Incorrect PIN' : 'Could not check your PIN. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <CustomModal
      isOpen
      onOpenChange={() => {}}
      isDismissable={false}
      isKeyboardDismissDisabled
      size="sm"
      classNames={{
        closeButton: 'hidden',
        backdrop: 'backdrop-blur-md bg-black/40',
      }}
      header={
        <div className="pt-3 px-1 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">{initials}</div>
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center">
              <Lock className="h-2.5 w-2.5" />
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground leading-tight">Till locked</h3>
            <p className="text-[12px] font-normal text-muted-foreground truncate">{name}, enter your PIN to carry on.</p>
          </div>
        </div>
      }
      body={
        <div className="py-3 space-y-3">
          {isOnline ? (
            <>
              <PinInput
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  if (error) setError(null);
                }}
                onComplete={unlock}
                error={!!error}
                disabled={checking}
                autoFocus
              />
              <p className={`text-xs text-center min-h-[1rem] ${error ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {checking ? 'Checking…' : error || 'Forgot it? A manager can reset it on the Staff page.'}
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium p-3 flex items-start gap-2">
              <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Your PIN is checked online. Reconnect to unlock, or switch user.</span>
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-2 border-t border-border/50 text-sm">
          <button type="button" onClick={switchUser} className="font-semibold text-foreground hover:underline">
            Not you? Switch user
          </button>
          <button
            type="button"
            onClick={() => {
              useAuthStore.getState().logout();
              navigate('/login', { replace: true });
            }}
            className="font-semibold text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      }
    />
  );
}
