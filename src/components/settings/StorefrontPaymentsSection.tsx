import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import SettingsSection from '@/components/settings/SettingsSection';
import UnsavedChanges from '@/components/shared/UnsavedChanges';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { cn } from '@/lib/utils';

export interface StorefrontPayments {
  payment_options: 'both' | 'online' | 'on_delivery';
  fee_bearer: 'shop' | 'shopper';
  online_ready: boolean;
  online_unavailable_reason: string | null;
  fee_percent: number;
}

type Options = StorefrontPayments['payment_options'];
type Bearer = StorefrontPayments['fee_bearer'];

const OPTION_CHOICES: { value: Options; label: string; note: string }[] = [
  { value: 'both', label: 'Pay now or on delivery', note: 'Shoppers choose at checkout' },
  { value: 'online', label: 'Pay now only', note: 'Card or MoMo through Paystack' },
  { value: 'on_delivery', label: 'Pay on delivery only', note: 'Cash or MoMo when the order arrives' },
];

function Choice<T extends string>({ value, current, onPick, label, note }: { value: T; current: T; onPick: (v: T) => void; label: string; note: string }) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-3 transition-colors',
        selected ? 'border-foreground/60 bg-muted/40' : 'border-border hover:border-foreground/30',
      )}
      aria-pressed={selected}
    >
      <span className="flex items-center gap-2.5">
        <span className={cn('h-4 w-4 rounded-full border shrink-0 flex items-center justify-center', selected ? 'border-foreground' : 'border-muted-foreground/40')}>
          {selected && <span className="h-2 w-2 rounded-full bg-foreground" />}
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </span>
      <span className="block pl-[26px] text-xs text-muted-foreground mt-0.5">{note}</span>
    </button>
  );
}

/** How shoppers pay on the online store, and who pays Paystack's fee (owners and managers) */
export default function StorefrontPaymentsSection({ initial }: { initial: StorefrontPayments }) {
  const [saved, setSaved] = useState(initial);
  const [options, setOptions] = useState<Options>(initial.payment_options);
  const [bearer, setBearer] = useState<Bearer>(initial.fee_bearer);
  const [saving, setSaving] = useState(false);

  const changeCount = (options !== saved.payment_options ? 1 : 0) + (bearer !== saved.fee_bearer ? 1 : 0);
  const guard = useUnsavedChanges(changeCount > 0);
  const takesOnline = options !== 'on_delivery';

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiClient.put('/tenant/my-store/storefront/payments', { payment_options: options, fee_bearer: bearer });
      setSaved(r.data?.success?.data?.payments ?? { ...saved, payment_options: options, fee_bearer: bearer });
      toast.success('Payment settings saved');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Couldn't save the payment settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsSection title="Payments" description="How shoppers can pay on your online store.">
        {!saved.online_ready && takesOnline && (
          <p className="text-sm rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-foreground">
            {saved.online_unavailable_reason || 'Online payment is not available yet'}.{' '}
            {saved.online_unavailable_reason?.toLowerCase().includes('payout') && (
              <Link to="/settings/profile" className="font-medium underline underline-offset-2">Set it up</Link>
            )}{' '}
            Until then, shoppers pay on delivery.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Payment options</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {OPTION_CHOICES.map((c) => (
              <Choice<Options> key={c.value} value={c.value} current={options} onPick={setOptions} label={c.label} note={c.note} />
            ))}
          </div>
        </div>

        {takesOnline && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Paystack fee ({saved.fee_percent}% of online payments)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice<Bearer> value="shop" current={bearer} onPick={setBearer} label="My shop pays it" note="Shoppers pay the listed price; the fee comes out of your payout" />
              <Choice<Bearer> value="shopper" current={bearer} onPick={setBearer} label="The shopper pays it" note="Added to the total at checkout, shown as its own line" />
            </div>
          </div>
        )}
      </SettingsSection>

      <UnsavedChanges
        guard={guard}
        count={changeCount}
        saving={saving}
        onDiscard={() => {
          setOptions(saved.payment_options);
          setBearer(saved.fee_bearer);
        }}
        onSave={save}
        subject="your payment settings"
      />
    </>
  );
}
