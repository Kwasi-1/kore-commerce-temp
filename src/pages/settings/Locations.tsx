import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Switch } from '@nextui-org/react';
import toast from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import { useFeaturesStore } from '@/store/featuresStore';
import type { LocationLimit, StoreLocation } from '@/store/locationStore';
import { useAuthStore } from '@/store/authStore';

type Row = StoreLocation & { tills: number; staff: number; openShifts: number };

interface Form {
  id?: string;
  name: string;
  type: 'store' | 'warehouse';
  address: string;
  phone: string;
  receiptPrefix: string;
  fulfilsOnline: boolean;
  isMain: boolean;
}

const EMPTY: Form = { name: '', type: 'store', address: '', phone: '', receiptPrefix: '', fulfilsOnline: false, isMain: false };

const errorText = (err: any, fallback: string) => {
  const e = err?.response?.data?.error;
  if (Array.isArray(e?.reasons) && e.reasons.length) return e.reasons.join(' ');
  return e?.message || fallback;
};

/** Settings → Locations: the shops and warehouses, the plan's limit, and their tills and staff. */
export default function Locations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [limit, setLimit] = useState<LocationLimit | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ row: Row; action: 'archive' | 'pause' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const posSettings = useFeaturesStore((s) => s.posSettings);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const isOwnerOrAdmin = ['owner', 'admin'].includes(useAuthStore((st) => st.staffUser?.role) || '');

  // Store prices: switching off can first make one store's prices the main prices; switching on
  // again asks whether to restore the store prices kept from before
  const [storePriceCount, setStorePriceCount] = useState(0);
  const [storePriceDialog, setStorePriceDialog] = useState<'off' | 'on' | null>(null);
  const [adoptFrom, setAdoptFrom] = useState('');
  useEffect(() => {
    apiClient.get('/tenant/store-prices').then((r) => setStorePriceCount(r.data?.success?.data?.storePriceCount || 0)).catch(() => {});
  }, [posSettings?.store_prices_enabled]);

  const saveStorePrices = async (enabled: boolean, extra: Record<string, unknown> = {}) => {
    setSavingSetting('store_prices');
    try {
      const r = await apiClient.put('/tenant/store-prices/settings', { enabled, ...extra });
      useFeaturesStore.getState().updatePOSSettings({ store_prices_enabled: enabled });
      setStorePriceCount(r.data?.success?.data?.storePriceCount || 0);
      toast.success(r.data?.success?.message || 'Saved');
      setStorePriceDialog(null);
    } catch (err) {
      toast.error(errorText(err, "Couldn't change store prices"));
    } finally {
      setSavingSetting(null);
    }
  };

  const toggleStorePrices = (on: boolean) => {
    if (!on) {
      setAdoptFrom('');
      setStorePriceDialog(storePriceCount > 0 ? 'off' : null);
      if (storePriceCount === 0) saveStorePrices(false);
    } else if (storePriceCount > 0) {
      setStorePriceDialog('on');
    } else {
      saveStorePrices(true);
    }
  };

  // Transfer settings (several locations): saved straight away, then features reload for everyone
  const saveSetting = async (key: 'transfers_require_approval' | 'transfers_instant', value: boolean) => {
    setSavingSetting(key);
    try {
      await apiClient.put('/tenant/locations/settings', { [key]: value });
      useFeaturesStore.getState().updatePOSSettings({ [key]: value });
      toast.success('Saved');
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the setting"));
    } finally {
      setSavingSetting(null);
    }
  };

  const apply = (data: any) => {
    setRows(data?.locations || []);
    setLimit(data?.limit || null);
    setCanManage(!!data?.canManage);
  };

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/tenant/locations${showClosed ? '?include_archived=1' : ''}`);
      apply(res.data?.success?.data);
    } catch (err) {
      toast.error(errorText(err, "Couldn't load locations"));
    } finally {
      setIsLoading(false);
    }
  }, [showClosed]);

  useEffect(() => {
    load();
  }, [load]);

  // The header's switcher and the till read locations from features
  const refreshEverywhere = async () => {
    await load();
    useFeaturesStore.getState().loadFeatures();
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error('Give the location a name');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        address: form.address,
        phone: form.phone,
        receiptPrefix: form.receiptPrefix,
        fulfilsOnline: form.fulfilsOnline,
        ...(form.id ? { isMain: form.isMain } : {}),
      };
      if (form.id) await apiClient.patch(`/tenant/locations/${form.id}`, body);
      else await apiClient.post('/tenant/locations', body);
      toast.success(form.id ? `${body.name} saved` : `${body.name} added`);
      setForm(null);
      await refreshEverywhere();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the location"));
    } finally {
      setSaving(false);
    }
  };

  const act = async (row: Row, action: 'archive' | 'pause' | 'activate') => {
    setBusyId(row.id);
    try {
      await apiClient.post(`/tenant/locations/${row.id}/${action}`);
      toast.success(
        action === 'archive' ? `${row.name} closed` : action === 'pause' ? `${row.name} paused` : `${row.name} is active`,
      );
      setConfirm(null);
      await refreshEverywhere();
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong'));
    } finally {
      setBusyId(null);
    }
  };

  const edit = (row: Row) =>
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      address: row.address || '',
      phone: row.phone || '',
      receiptPrefix: row.receiptPrefix || '',
      fulfilsOnline: row.fulfilsOnline,
      isMain: row.isMain,
    });

  const atLimit = !!limit && limit.used >= limit.limit;

  return (
    <PageLayout title="Locations">
      <div className="max-w-4xl space-y-4 mb-4">
        {/* Plan limit */}
        {limit && (
          <div className="bg-card rounded-xl border border-border p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {limit.used} of {limit.limit} location{limit.limit === 1 ? '' : 's'} used
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!limit.enabled
                  ? 'More than one location needs the Business plan.'
                  : limit.extra > 0
                    ? `${limit.included} with your plan, plus ${limit.extra} extra.`
                    : `${limit.included} come with your plan. Closed locations don't count.`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(atLimit || !limit.enabled) && (
                <Link to="/settings/plan" className="text-sm font-medium text-foreground underline underline-offset-4">
                  {limit.enabled ? 'Add a location to your plan' : 'See plans'}
                </Link>
              )}
              {canManage && (
                <Button onClick={() => setForm({ ...EMPTY })} disabled={atLimit} className="gap-2">
                  <Icon icon="mdi:plus" className="h-4 w-4" />
                  Add location
                </Button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            ))
          ) : (
            rows.map((row) => (
              <div key={row.id} className={cn('p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3', row.status === 'archived' && 'opacity-60')}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon icon={row.type === 'warehouse' ? 'solar:box-linear' : 'solar:shop-2-linear'} className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{row.name}</span>
                      {row.isMain && <Badge>Main store</Badge>}
                      {row.type === 'warehouse' && <Badge>Warehouse</Badge>}
                      {row.fulfilsOnline && <Badge>Online orders</Badge>}
                      {row.status === 'paused' && <Badge tone="amber">Paused</Badge>}
                      {row.status === 'archived' && <Badge>Closed</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {[row.address, row.phone, row.receiptPrefix && `Receipts ${row.receiptPrefix}-…`].filter(Boolean).join(' · ') || 'No address yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.type === 'store' ? `${row.tills} till${row.tills === 1 ? '' : 's'} · ` : ''}
                      {row.staff} staff assigned
                      {row.openShifts > 0 ? ` · ${row.openShifts} open shift${row.openShifts === 1 ? '' : 's'}` : ''}
                    </p>
                    {row.status === 'paused' && (
                      <p className="text-xs text-amber-600 mt-1">
                        Over your plan's limit: it can't sell or move stock until it's active again.
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">
                    {row.status === 'archived' ? (
                      <Button variant="outline" size="sm" disabled={busyId === row.id} onClick={() => act(row, 'activate')}>
                        Reopen
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => edit(row)}>
                          Edit
                        </Button>
                        {row.status === 'paused' && (
                          <Button variant="outline" size="sm" disabled={busyId === row.id} onClick={() => act(row, 'activate')}>
                            Activate
                          </Button>
                        )}
                        {/* Pausing lets another (paused) location take this one's place within the limit */}
                        {!row.isMain && row.status === 'active' && rows.some((r) => r.status === 'paused') && (
                          <Button variant="ghost" size="sm" onClick={() => setConfirm({ row, action: 'pause' })}>
                            Pause
                          </Button>
                        )}
                        {!row.isMain && (
                          <Button variant="ghost" size="sm" onClick={() => setConfirm({ row, action: 'archive' })}>
                            Close
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground w-fit cursor-pointer">
          <Switch size="sm" isSelected={showClosed} onValueChange={setShowClosed} color="primary" />
          Show closed locations
        </label>

        {/* Transfers between locations */}
        {canManage && rows.filter((r) => r.status !== 'archived').length > 1 && (
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            <div className="p-4 md:p-5">
              <h2 className="text-sm font-semibold text-foreground">Transfers</h2>
            </div>
            <label className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm text-foreground">Approve transfers before they're sent</span>
                <span className="block text-xs text-muted-foreground mt-0.5">An owner or a manager at the sending location approves each one.</span>
              </span>
              <Switch
                isSelected={Boolean(posSettings?.transfers_require_approval)}
                isDisabled={savingSetting !== null}
                onValueChange={(v) => saveSetting('transfers_require_approval', v)}
                color="primary"
              />
            </label>
            <label className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm text-foreground">Instant transfers</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Send and receive in one step, for locations close together.</span>
              </span>
              <Switch
                isSelected={Boolean(posSettings?.transfers_instant)}
                isDisabled={savingSetting !== null}
                onValueChange={(v) => saveSetting('transfers_instant', v)}
                color="primary"
              />
            </label>
          </div>
        )}

        {/* Store prices (owners and admins) */}
        {isOwnerOrAdmin && limit?.enabled && rows.filter((r) => r.status !== 'archived' && r.type === 'store').length > 1 && (
          <div className="bg-card rounded-xl border border-border">
            <label className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm text-foreground">Store prices</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Let stores set their own prices. The main price stays for every store without one.
                </span>
              </span>
              <Switch
                isSelected={Boolean(posSettings?.store_prices_enabled)}
                isDisabled={savingSetting !== null}
                onValueChange={toggleStorePrices}
                color="primary"
              />
            </label>
          </div>
        )}
      </div>

      {/* Add / edit */}
      <CustomModal
        isOpen={!!form}
        onOpenChange={() => !saving && setForm(null)}
        size="md"
        header={<h3 className="text-base font-bold text-foreground pt-2">{form?.id ? 'Edit location' : 'Add a location'}</h3>}
        body={
          form && (
            <div className="space-y-4 py-2">
              <CustomInputTextField
                label="Name"
                value={form.name}
                onChange={(e: any) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Osu branch"
              />
              <div>
                <p className="text-sm text-foreground mb-1.5">Type</p>
                <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
                  {(['store', 'warehouse'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={form.isMain && t === 'warehouse'}
                      onClick={() => setForm({ ...form, type: t })}
                      className={cn(
                        'h-8 px-4 rounded-full text-xs font-semibold transition-colors disabled:opacity-40',
                        form.type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t === 'store' ? 'Store' : 'Warehouse'}
                    </button>
                  ))}
                </div>
                {form.type === 'warehouse' && (
                  <p className="text-xs text-muted-foreground mt-1.5">Warehouses hold and receive stock. They have no tills.</p>
                )}
              </div>
              <CustomInputTextField
                label="Address"
                value={form.address}
                onChange={(e: any) => setForm({ ...form, address: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInputTextField
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
                />
                <CustomInputTextField
                  label="Receipt prefix"
                  value={form.receiptPrefix}
                  onChange={(e: any) => setForm({ ...form, receiptPrefix: e.target.value.toUpperCase().slice(0, 6) })}
                  placeholder="e.g. OSU"
                />
              </div>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-foreground">Fulfils online orders</span>
                <Switch
                  size="sm"
                  isSelected={form.fulfilsOnline}
                  onValueChange={(v) => setForm({ ...form, fulfilsOnline: v })}
                  color="primary"
                />
              </label>
              {form.id && form.type === 'store' && (
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm text-foreground">Main store</span>
                  <Switch
                    size="sm"
                    isSelected={form.isMain}
                    isDisabled={rows.find((r) => r.id === form.id)?.isMain}
                    onValueChange={(v) => setForm({ ...form, isMain: v })}
                    color="primary"
                  />
                </label>
              )}
            </div>
          )
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" disabled={saving} onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button variant="neutral" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : form?.id ? 'Save' : 'Add location'}
            </Button>
          </div>
        }
      />

      {/* Store prices off / on */}
      <CustomModal
        isOpen={!!storePriceDialog}
        onOpenChange={() => savingSetting === null && setStorePriceDialog(null)}
        size="sm"
        classNames={{ base: 'w-[380px] rounded-3xl' }}
        header={
          <h3 className="text-base font-bold text-foreground pt-2">
            {storePriceDialog === 'off' ? 'Switch off store prices?' : 'Switch store prices back on?'}
          </h3>
        }
        body={
          storePriceDialog === 'off' ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {storePriceCount} store price{storePriceCount === 1 ? '' : 's'} will stop applying. Every location will use the main price.
              </p>
              <label className="block">
                <span className="block text-sm text-foreground mb-1.5">Make a store's prices the main prices first (optional)</span>
                <select
                  value={adoptFrom}
                  onChange={(e) => setAdoptFrom(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Keep the main prices as they are</option>
                  {rows.filter((r) => r.type === 'store' && r.status !== 'archived').map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              {storePriceCount} store price{storePriceCount === 1 ? '' : 's'} from before {storePriceCount === 1 ? 'is' : 'are'} saved.
              They may be out of date.
            </p>
          )
        }
        footer={
          storePriceDialog === 'off' ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" disabled={savingSetting !== null} onClick={() => setStorePriceDialog(null)}>Cancel</Button>
              <Button variant="neutral" disabled={savingSetting !== null}
                onClick={() => saveStorePrices(false, adoptFrom ? { adopt_location_id: adoptFrom } : {})}>
                Switch off
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" disabled={savingSetting !== null} onClick={() => saveStorePrices(true, { restore: false })}>
                Start fresh
              </Button>
              <Button variant="neutral" disabled={savingSetting !== null} onClick={() => saveStorePrices(true, { restore: true })}>
                Restore them
              </Button>
            </div>
          )
        }
      />

      {/* Close / pause confirmation */}
      <CustomModal
        isOpen={!!confirm}
        onOpenChange={() => !busyId && setConfirm(null)}
        size="sm"
        classNames={{ base: 'w-[360px] rounded-3xl' }}
        header={
          <h3 className="text-base font-bold text-foreground pt-2">
            {confirm?.action === 'archive' ? `Close ${confirm?.row.name}?` : `Pause ${confirm?.row.name}?`}
          </h3>
        }
        body={
          <p className="text-sm text-muted-foreground py-2">
            {confirm?.action === 'archive'
              ? 'Its history stays, and it stops counting toward your plan. It needs to be empty of stock, tills and open shifts.'
              : "It can't sell, receive or move stock until you activate it again."}
          </p>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" disabled={!!busyId} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="neutral" disabled={!!busyId} onClick={() => confirm && act(confirm.row, confirm.action)}>
              {busyId ? 'Working…' : confirm?.action === 'archive' ? 'Close it' : 'Pause it'}
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'amber' }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
        tone === 'amber' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}
