import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useTillStore, TillStaff } from '@/store/tillStore';
import { ROLE_LABELS } from '@/utils/roles';
import PinInput from './PinInput';
import SetPinModal from './SetPinModal';

const initials = (p: TillStaff) => `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || '?';
const COLORS = ['bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500'];

/**
 * Register header, registered tills only: people who signed in on this till today. Tapping one
 * asks for their PIN and switches the till to them in place (no trip to the login screen).
 */
export default function TillRecentUsers() {
  const isTill = !!useTillStore((s) => s.tillKey);
  const recent = useTillStore((s) => s.recent);
  const recentDate = useTillStore((s) => s.recentDate);
  const myId = useAuthStore((s) => s.staffUser?.id);
  const cartCount = useCartStore((s) => s.items.length);

  const [target, setTarget] = useState<TillStaff | null>(null);
  const [step, setStep] = useState<'confirm' | 'pin'>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [setPinFor, setSetPinFor] = useState<TillStaff | null>(null);

  const others = recentDate === new Date().toDateString() ? recent.filter((p) => p.id !== myId) : [];
  if (!isTill || others.length === 0) return null;

  const open = (person: TillStaff) => {
    setTarget(person);
    setPin('');
    setError(null);
    setStep(cartCount > 0 ? 'confirm' : 'pin');
  };

  const switchTo = (data: any) => {
    useCartStore.getState().clearCart();
    useAuthStore.getState().login(data.access_token, data.refresh_token, data.staff, data.tenant, false, data.grace_info ?? null);
    toast.success(`Signed in as ${data.staff?.first_name || 'staff'}`);
  };

  const verify = async (value: string) => {
    if (!target || checking) return;
    setChecking(true);
    setError(null);
    try {
      // The till's key goes with the request (api/client.ts)
      const r = await apiClient.post('/pos/auth/verify-pin', { staff_id: target.id, pin: value });
      const data = r.data?.success?.data || {};
      const person = target;
      setTarget(null);
      if (data.is_default_pin) setSetPinFor(person);
      else switchTo(data);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Incorrect PIN');
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  const shown = others.slice(0, 3);
  const extra = others.slice(3);

  return (
    <>
      <div className="flex items-center -space-x-2">
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => open(p)}
            title={`Switch to ${p.first_name}`}
            className={`h-9 w-9 rounded-full border-2 border-background text-white text-[11px] font-bold flex items-center justify-center hover:z-10 hover:scale-105 transition-transform ${COLORS[i % COLORS.length]}`}
          >
            {initials(p)}
          </button>
        ))}
        {extra.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="h-9 w-9 rounded-full border-2 border-background bg-muted text-foreground text-[11px] font-bold">
                +{extra.length}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              {extra.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => open(p)} className="cursor-pointer">
                  {p.first_name} {p.last_name}
                  <span className="ml-auto text-[11px] text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CustomModal
        isOpen={!!target}
        onOpenChange={() => !checking && setTarget(null)}
        size="sm"
        header={
          <div className="pt-2 px-1">
            <h2 className="text-lg font-bold text-foreground">
              {step === 'confirm' ? 'Clear the current sale?' : `Switch to ${target?.first_name}`}
            </h2>
            {step === 'pin' && <p className="text-[12px] text-muted-foreground mt-0.5">Enter {target?.first_name}'s PIN</p>}
          </div>
        }
        body={
          step === 'confirm' ? (
            <p className="py-2 text-sm text-muted-foreground">
              There {cartCount === 1 ? 'is 1 item' : `are ${cartCount} items`} in the cart. They'll be cleared when you switch. Hold the
              sale first if you want to keep it.
            </p>
          ) : (
            <div className="py-3 space-y-3">
              <PinInput value={pin} onChange={setPin} onComplete={verify} error={!!error} disabled={checking} autoFocus />
              {error && <p className="text-[12px] text-center text-destructive">{error}</p>}
            </div>
          )
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
            <Button variant="outline" onClick={() => setTarget(null)} disabled={checking} className="w-full">
              Cancel
            </Button>
            {step === 'confirm' ? (
              <Button onClick={() => setStep('pin')} className="w-full bg-primary text-primary-foreground font-semibold">
                Clear and switch
              </Button>
            ) : (
              <Button
                onClick={() => verify(pin)}
                disabled={checking || pin.length !== 4}
                className="w-full bg-primary text-primary-foreground font-semibold"
              >
                {checking ? 'Checking…' : 'Switch'}
              </Button>
            )}
          </div>
        }
      />

      <SetPinModal
        isOpen={!!setPinFor}
        staff={setPinFor ? { id: setPinFor.id, name: setPinFor.first_name, role: setPinFor.role } : null}
        onSuccess={(resData: any) => {
          setSetPinFor(null);
          if (resData?.access_token) switchTo(resData);
        }}
        onCancel={() => setSetPinFor(null)}
      />
    </>
  );
}
