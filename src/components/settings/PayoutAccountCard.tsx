import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { CustomInputTextField, SearchableSelectField } from '@/components/shared/text-field';
import { cn } from '@/lib/utils';

interface PayoutAccount {
  account_type: 'mobile_money' | 'bank';
  bank_code: string;
  bank_name: string | null;
  account_number_masked: string;
  account_name: string | null;
  status: string;
  ready: boolean;
  last_error: string | null;
}

interface Bank {
  code: string;
  name: string;
  type: 'mobile_money' | 'bank';
}

/**
 * Owner: where the shop's online payments are paid out (MoMo prompts at the till, storefront
 * checkout). Saving it sets up the shop's Paystack sub-account so payments are split to it.
 */
export default function PayoutAccountCard() {
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'mobile_money' | 'bank'>('mobile_money');
  const [bankCode, setBankCode] = useState('');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    apiClient.get('/tenant/payout-account').then((r) => {
      const acc = r.data?.success?.data?.account || null;
      setAccount(acc);
      setEditing(!acc);
      if (acc) setType(acc.account_type);
    }).catch(() => setEditing(true));
    apiClient.get('/tenant/payout-account/banks').then((r) => setBanks(r.data?.success?.data?.banks || [])).catch(() => {
      toast.error("Couldn't load the list of banks");
    });
  }, []);

  const choices = banks.filter((b) => b.type === type);

  const save = async () => {
    const bank = choices.find((b) => b.code === bankCode);
    if (!bank) {
      toast.error(type === 'mobile_money' ? 'Choose the MoMo network' : 'Choose the bank');
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.put('/tenant/payout-account', {
        account_type: type, bank_code: bank.code, bank_name: bank.name, account_number: number, account_name: name,
      });
      setAccount(r.data?.success?.data?.account || null);
      setEditing(false);
      setNumber('');
      toast.success('Payout account saved');
    } catch (err: any) {
      const e = err?.response?.data?.error;
      if (e?.account) setAccount(e.account);
      toast.error(e?.message || "Couldn't save the payout account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
      <h2 className="text-xl font-bold mb-1 text-foreground">Payouts</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Where money from online payments is paid out: MoMo prompts at the till and your online store. Paystack sends your
        share here automatically. Cash and payments you confirm yourself aren&apos;t affected.
      </p>

      {account && !editing && (
        <div className="max-w-2xl space-y-3">
          <div className="rounded-xl border border-border/70 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{account.account_name}</p>
              <p className="text-xs text-muted-foreground">
                {account.bank_name || account.bank_code} · {account.account_number_masked}
              </p>
            </div>
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                account.ready ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive',
              )}
            >
              {account.ready ? 'Ready' : 'Not set up'}
            </span>
          </div>
          {!account.ready && account.last_error && <p className="text-xs text-destructive">{account.last_error}</p>}
          <Button variant="outline" onClick={() => setEditing(true)}>Change payout account</Button>
        </div>
      )}

      {editing && (
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
            {(['mobile_money', 'bank'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setBankCode('');
                }}
                className={cn(
                  'h-8 px-4 rounded-full text-xs font-semibold transition-colors',
                  type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'mobile_money' ? 'Mobile money' : 'Bank account'}
              </button>
            ))}
          </div>
          <SearchableSelectField
            label={type === 'mobile_money' ? 'MoMo network' : 'Bank'}
            labelPlacement="outside"
            placeholder={type === 'mobile_money' ? 'Choose a network' : 'Search for your bank'}
            options={choices.map((b) => ({ label: b.name, value: b.code }))}
            value={bankCode}
            onValueChange={(v) => setBankCode(v ? String(v) : '')}
          />
          <CustomInputTextField
            label={type === 'mobile_money' ? 'MoMo number' : 'Account number'}
            labelPlacement="outside"
            inputMode="numeric"
            placeholder={type === 'mobile_money' ? 'e.g. 0241234567' : ''}
            value={number}
            onChange={(e: any) => setNumber(e.target.value.replace(/[^\d+\s]/g, ''))}
          />
          <CustomInputTextField
            label="Name on the account"
            labelPlacement="outside"
            placeholder="Checked with Paystack where possible"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving || !bankCode || !number}>
              {saving ? 'Saving…' : 'Save payout account'}
            </Button>
            {account && (
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
