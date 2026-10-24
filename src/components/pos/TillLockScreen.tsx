import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import PinPad from './PinPad';

/**
 * "Till locked": shown over the whole app after a shift ends (and anywhere else that locks the
 * till). The person stays signed in; their PIN, checked by the server, unlocks it. Wrong PINs
 * count towards the server's lockout, and once it locks them out they're signed out. Someone else
 * can take over with "Switch user". The locked state is saved, so refreshing doesn't unlock it.
 */
export default function TillLockScreen() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isLocked = useAuthStore((s) => s.isLocked);
  const staffUser = useAuthStore((s) => s.staffUser);
  const { isOnline } = useNetworkStatus();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const shown = !!token && isLocked;

  // Typed PIN digits must not land in a field left focused behind the lock screen (e.g. search)
  useEffect(() => {
    if (shown) (document.activeElement as HTMLElement | null)?.blur?.();
    if (!shown) setError(null);
  }, [shown]);

  if (!shown) return null;

  const name = staffUser?.name || 'Staff';
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const switchUser = () => {
    useAuthStore.getState().endSession();
    navigate('/login', { replace: true });
  };

  const unlock = async (pin: string) => {
    setChecking(true);
    setError(null);
    try {
      await apiClient.post('/auth/staff/check-pin', { pin }, { skipApproval: true });
      useAuthStore.getState().unlock();
      navigate('/pos/register', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error?.message;
      if (status === 429) {
        // Too many wrong PINs: the server has locked this PIN, so sign them out
        toast.error(message || 'Too many wrong PINs. Signed out.');
        switchUser();
        return;
      }
      if (status === 400 && /locked/i.test(message || '')) {
        // That was the last try: the PIN is now locked, so sign them out
        toast.error(message);
        switchUser();
        return;
      }
      setError(status === 400 ? message || 'Incorrect PIN' : 'Could not check your PIN. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Till locked">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-foreground">{initials}</div>
          <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center">
            <Lock className="h-3 w-3" />
          </span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Till locked</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {name}, enter your PIN to carry on.
          </p>
        </div>

        {isOnline ? (
          <PinPad onComplete={unlock} error={error} disabled={checking} />
        ) : (
          <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium p-3 flex items-start gap-2 text-left">
            <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Your PIN is checked online. Reconnect to unlock, or switch user.</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          <button type="button" onClick={switchUser} className="font-semibold text-foreground hover:underline">
            Not you? Switch user
          </button>
          <span className="text-border">|</span>
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
      </div>
    </div>
  );
}
