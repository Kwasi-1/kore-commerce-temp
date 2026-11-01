import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Switch } from '@nextui-org/react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { getPlanLabel } from '@/utils/permissions';
import { getReceiptPrefix } from '@/utils/receipt';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { isOwnerOrAdmin } from '@/utils/roles';
import TillsSection from '@/components/settings/TillsSection';
import CustomModal from '@/components/modals/modal';
import { setNavigationGuard } from '@/utils/navigationGuard';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useIsMobile } from '@/hooks/useScreenSize';
import { useTillStore } from '@/store/tillStore';

const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

// Phones show these as a list; tapping one opens just that section (?section=<id>)
const SECTIONS = [
  { id: 'shifts', title: 'Shifts & Cash' },
  { id: 'payments', title: 'Payments' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'receipts', title: 'Receipts' },
  { id: 'products', title: 'Products' },
  { id: 'tills', title: 'Tills' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

// Which section each saved field lives in, to mark sections with unsaved changes
const FIELD_SECTION: Record<string, SectionId> = {
  pos_shift_management_enabled: 'shifts',
  pos_cash_count_by_denomination: 'shifts',
  pos_idle_lock_minutes: 'shifts',
  pos_payment_methods: 'payments',
  pos_paystack_enabled: 'payments',
  pos_require_momo_txn_id: 'payments',
  pos_split_payment_enabled: 'payments',
  pos_credit_enabled: 'payments',
  pos_credit_ledger_enabled: 'payments',
  require_customer_for_credit: 'payments',
  pos_tax_enabled: 'pricing',
  pos_tax_rate: 'pricing',
  pos_tax_label: 'pricing',
  pos_discounts_enabled: 'pricing',
  pos_price_override_enabled: 'pricing',
  pos_wholesale_enabled: 'pricing',
  auto_print: 'receipts',
  receipt_prefix: 'receipts',
  receipt_footer: 'receipts',
  made_in_house_enabled: 'products',
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-4 md:p-6 border border-border dark:border-border/60 animate-in fade-in slide-in-from-right-4 md:animate-none duration-200">
      <h2 className="hidden md:block text-xl font-bold font-header tracking-tighter -mt-1 mb-1 text-foreground">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="border-t border-border/60 mt-4 pt-5 space-y-5">{children}</div>
    </section>
  );
}

interface RowProps {
  title: string;
  description: React.ReactNode;
  /** Plan note shown when locked, e.g. "Requires Business plan." */
  lockedNote?: string | false;
  /** Indented under the setting it depends on */
  nested?: boolean;
  control?: React.ReactNode;
  children?: React.ReactNode;
}

function Row({ title, description, lockedNote, nested, control, children }: RowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${nested ? 'pl-4 border-l-2 border-border/60' : ''} ${lockedNote ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-foreground text-[15px]">{title}</h4>
          {lockedNote && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
          {description}
          {lockedNote && <span className="block text-amber-500 mt-1">{lockedNote}</span>}
        </p>
        {children}
      </div>
      {control}
    </div>
  );
}

const Divider = () => <div className="border-t border-border/50" />;

export default function POSSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tillName = useTillStore((s) => s.tillName);
  const { posSettings, storeSettings, fetchSettings, updatePOSSettings, isLoading } = useSettingsStore();
  const { staffUser, tenant, setTenant } = useAuthStore();
  const { posSettings: featureSettings, plan, platform_paystack_enabled, updatePOSSettings: updateFeaturePOSSettings, loadFeatures, hasModule } = useFeaturesStore();
  const isPaystackPlatformAllowed = platform_paystack_enabled ?? true;
  const momoPromptsReady = useFeaturesStore((st) => st.momo_prompts_ready);
  const momoPromptsReason = useFeaturesStore((st) => st.momo_prompts_reason);
  const [isSaving, setIsSaving] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);

  const [localSettings, setLocalSettings] = useState(posSettings);
  const [localFeatures, setLocalFeatures] = useState(featureSettings);
  const [localExpiry, setLocalExpiry] = useState(false);
  // Where the person tried to go with unsaved changes; the save bar asks first
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);

  const effectiveStoreName = storeSettings?.name || tenant?.business_name || tenant?.name || '';
  const autoPrefix = getReceiptPrefix(effectiveStoreName);
  const currentPrefix = getReceiptPrefix(effectiveStoreName, localSettings.receipt_prefix);
  const canSeeExpiry = isOwnerOrAdmin(staffUser?.role);

  useEffect(() => {
    fetchSettings();
    loadFeatures();
    // Fetch track_expiry_enabled from settings
    apiClient.get('/tenant/settings').then(res => {
      const isEnabled = res.data.success?.data?.store?.track_expiry_enabled || false;
      setExpiryEnabled(isEnabled);
      setLocalExpiry(isEnabled);
      if (tenant && tenant.track_expiry_enabled !== isEnabled) {
        setTenant({ ...tenant, track_expiry_enabled: isEnabled });
      }
    }).catch(console.error);
  }, [fetchSettings]);

  useEffect(() => {
    setLocalSettings(posSettings);
  }, [posSettings]);

  useEffect(() => {
    setLocalFeatures(featureSettings);
  }, [featureSettings]);

  // Everything unsaved, across the page: one save bar covers it all
  const featureChanges = Object.keys(localFeatures).filter((k) => differs(localFeatures[k as keyof typeof localFeatures], featureSettings[k as keyof typeof featureSettings]));
  const settingChanges = Object.keys(localSettings).filter((k) => differs(localSettings[k as keyof typeof localSettings], posSettings[k as keyof typeof posSettings]));
  const expiryChanged = canSeeExpiry && localExpiry !== expiryEnabled;
  const changeCount = featureChanges.length + settingChanges.length + (expiryChanged ? 1 : 0);
  const isDirty = changeCount > 0;

  // Closing or reloading the tab
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers only warn when this is set to a non-empty value (they show their own text)
      e.returnValue = 'You have unsaved changes';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Sidebar, header, bottom nav and notifications navigate in code: they ask the guard first
  useEffect(() => {
    if (!isDirty) return;
    return setNavigationGuard((to) => {
      setPendingLeave(to);
      return true;
    });
  }, [isDirty]);

  // Links (<a>) in the page: caught before the router sees the click
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingLeave(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isDirty]);

  const discard = () => {
    setLocalFeatures(featureSettings);
    setLocalSettings(posSettings);
    setLocalExpiry(expiryEnabled);
  };

  const saveFeatures = async () => {
    // Only send fields that actually changed (avoids false "blocked" counts for locked-plan settings)
    const changedFields = Object.fromEntries(featureChanges.map((k) => [k, localFeatures[k as keyof typeof localFeatures]]));
    const res = await apiClient.put('/tenant/features/pos', changedFields);
    updateFeaturePOSSettings(res.data.success?.data?.pos_settings || {});
    // Paystack on/off changes whether MoMo prompts are ready: re-check
    loadFeatures();
    return {
      saved: (res.data.success?.data?.updated || []) as string[],
      blocked: (res.data.success?.data?.blocked || []) as string[],
    };
  };

  const saveExpiry = async () => {
    await apiClient.post(localExpiry ? '/tenant/settings/expiry/enable' : '/tenant/settings/expiry/disable');
    setExpiryEnabled(localExpiry);
    if (tenant) setTenant({ ...tenant, track_expiry_enabled: localExpiry });
  };

  /** Saves every changed part; true when all of it went through */
  const saveAll = async () => {
    setIsSaving(true);
    try {
      const [features, , expiry] = await Promise.allSettled([
        featureChanges.length ? saveFeatures() : Promise.resolve(null),
        settingChanges.length ? updatePOSSettings(localSettings) : Promise.resolve(),
        expiryChanged ? saveExpiry() : Promise.resolve(),
      ]);
      if (features.status === 'rejected' || expiry.status === 'rejected') {
        toast.error("Some settings couldn't be saved. Try again.");
        return false;
      }
      const result = features.value;
      if (result && result.blocked.length > 0) {
        toast.error(result.saved.length ? 'Saved. Some settings need a plan upgrade.' : 'These settings need a higher plan.');
      } else {
        toast.success('Settings saved');
      }
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const leaveTo = (path: string) => {
    setPendingLeave(null);
    navigate(path);
  };

  // Phones: one section at a time. Changes stay when going back to the list; one save covers all
  const openId = SECTIONS.find((x) => x.id === searchParams.get('section'))?.id ?? null;
  const open = isMobile ? openId : null;
  const show = (id: SectionId) => !isMobile || open === id;
  const openSection = (id: SectionId) => {
    setSearchParams({ section: id }, { state: { fromList: true } });
    document.getElementById('pos-settings-top')?.scrollIntoView();
  };
  // Back to the list: browser history when we came from it (keeps phone back gestures in step)
  const closeSection = () => ((location.state as any)?.fromList ? navigate(-1) : setSearchParams({}, { replace: true }));
  const unsavedSections = new Set<SectionId>([
    ...[...featureChanges, ...settingChanges].map((k) => FIELD_SECTION[k]).filter(Boolean),
    ...(expiryChanged ? (['products'] as SectionId[]) : []),
  ]);

  if (isLoading && !localSettings.receipt_footer) {
    return (
      <PageLayout title="POS Settings">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  const standardLocked = !['standard', 'business'].includes(plan) && 'Requires Standard plan or higher.';
  const paymentMethods = localFeatures.pos_payment_methods ?? ['cash', 'mobile_money'];
  const onOff = (label: string, on: unknown) => `${label} ${on ? 'on' : 'off'}`;
  const idle = localFeatures.pos_idle_lock_minutes || 0;
  const summaries: Record<SectionId, string> = {
    shifts: [localFeatures.pos_shift_management_enabled ? 'Shift required' : 'No shift needed', idle ? `Locks after ${idle} min` : 'No idle lock'].join(' · '),
    payments: [
      ['cash', ...paymentMethods.filter((m) => m !== 'cash')].map((m) => ({ cash: 'Cash', mobile_money: 'MoMo', card: 'Card' }[m] || m)).join(', '),
      onOff('Credit', !standardLocked && localFeatures.pos_credit_enabled),
    ].join(' · '),
    pricing: [onOff('Tax', !standardLocked && localFeatures.pos_tax_enabled), onOff('Discounts', !standardLocked && localFeatures.pos_discounts_enabled)].join(' · '),
    receipts: [{ always: 'Always print', ask: 'Ask to print', never: 'Never print' }[localSettings.auto_print] || 'Ask to print', `Prefix ${currentPrefix}`].join(' · '),
    products: [onOff('Made in-house', localFeatures.made_in_house_enabled), ...(canSeeExpiry ? [onOff('Expiry', localExpiry)] : [])].join(' · '),
    tills: tillName ? `This device: ${tillName}` : 'Shared devices with staff PIN sign-in',
  };

  return (
    <PageLayout
      title={
        open ? (
          <span className="flex items-center gap-1.5 -ml-1 tracking-tighter">
            <button
              type="button"
              onClick={closeSection}
              aria-label="Back to POS settings"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon icon="solar:alt-arrow-left-linear" className="h-5 w-5" />
            </button>
            {SECTIONS.find((x) => x.id === open)?.title}
          </span>
        ) : (
          'POS Settings'
        )
      }
    >
      <div id="pos-settings-top" className="max-w-4xl space-y-4 md:space-y-8 mb-4">
        {!open && (
          <p className="text-sm text-muted-foreground md:-mt-2">
            Some settings need a higher plan. You are on the <span className="font-semibold text-foreground capitalize">{getPlanLabel(plan)}</span> plan.
          </p>
        )}

        {/* Phones: the sections as a list, each with what it's set to now */}
        {isMobile && !open && (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {SECTIONS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => openSection(x.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left first:rounded-t-xl last:rounded-b-xl active:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-foreground font-header tracking-tight">{x.title}</span>
                    {unsavedSections.has(x.id) && <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unsaved changes" />}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">{summaries[x.id]}</span>
                </span>
                <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* ── Shifts & cash ─────────────────────────────────────────────── */}
        {show('shifts') && (
        <Section title="Shifts & Cash" description="How staff open and close the till.">
          <Row
            title="Enforce Shift Opening & Cash Float"
            description="Cashiers open a shift and count the starting cash before selling. When off, the register opens straight away."
            control={
              <Switch
                isSelected={Boolean(localFeatures.pos_shift_management_enabled)}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_shift_management_enabled: val }))}
                color="primary"
              />
            }
          />

          {Boolean(localFeatures.pos_shift_management_enabled) && (
            <Row
              nested
              title="Count Cash by Notes & Coins"
              description={<>Cashiers count each note and coin (e.g. 3 &times; &#8373;50) and the app adds them up, instead of typing one total.</>}
              control={
                <Switch
                  isSelected={Boolean(localFeatures.pos_cash_count_by_denomination)}
                  onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_cash_count_by_denomination: val }))}
                  color="primary"
                />
              }
            />
          )}

          <Divider />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-foreground text-[15px]">Lock the Till When Idle</h4>
              <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                Locks after this long with no activity; staff unlock with their PIN and the cart is kept. Never locks during a payment or offline.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5 shrink-0 self-start">
              {[0, 2, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLocalFeatures(p => ({ ...p, pos_idle_lock_minutes: m }))}
                  className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                    (localFeatures.pos_idle_lock_minutes || 0) === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 0 ? 'Off' : `${m} min`}
                </button>
              ))}
            </div>
          </div>
        </Section>
        )}

        {/* ── Payments ──────────────────────────────────────────────────── */}
        {show('payments') && (
        <Section title="Payments" description="How customers can pay at the till, including credit.">
          {!isPaystackPlatformAllowed && (
            <div className="bg-amber-400/10 rounded-md p-4 flex items-start gap-3 text-amber-700 dark:text-amber-300">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h5 className="font-bold text-sm">Paystack Online Gateway Disabled by Platform Administrator</h5>
                <p className="leading-relaxed hidden md:block">
                  Online payment processing has been disabled platform-wide by the administrator.
                  Cash, card (on your card machine) and MoMo (confirmed by the cashier) still work.
                </p>
              </div>
            </div>
          )}

          <Row
            title="Accepted Payment Methods"
            description="Which payment options show in the register. Cash is always on."
          >
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { id: 'cash', label: 'Cash', icon: '💵' },
                { id: 'mobile_money', label: 'Mobile Money (MoMo)', icon: '📱' },
                { id: 'card', label: 'Card / POS Terminal', icon: '💳' },
              ].map(method => {
                const isCash = method.id === 'cash';
                // Card is taken on the shop's own card machine, so it doesn't need Paystack
                const enabled = isCash || paymentMethods.includes(method.id);
                const toggle = () => {
                  if (isCash) return;
                  if (enabled) {
                    const next = paymentMethods.filter(m => m !== method.id);
                    setLocalFeatures(p => ({ ...p, pos_payment_methods: next.length ? next : ['cash'] }));
                  } else {
                    setLocalFeatures(p => ({ ...p, pos_payment_methods: [...paymentMethods, method.id] }));
                  }
                };
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={toggle}
                    disabled={isCash}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                      enabled
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                    } ${isCash ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                  >
                    <span>{method.icon}</span>
                    {method.label}
                    {isCash && <span className="text-[10px] opacity-70 ml-1">(default)</span>}
                  </button>
                );
              })}
            </div>
          </Row>

          <Divider />

          <div className={`flex items-start justify-between gap-4 ${!isPaystackPlatformAllowed ? 'opacity-60' : ''}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground text-[15px]">Paystack Online Payment Gateway</h4>
                {!isPaystackPlatformAllowed && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                    Disabled by Platform Admin
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                Sends MoMo prompts to customers&apos; phones and completes the sale when Paystack confirms. When off, the cashier confirms MoMo. Card always uses your own machine.
                {!isPaystackPlatformAllowed && (
                  <span className="block text-amber-500 font-semibold mt-1">Overridden platform-wide by Platform Admin.</span>
                )}
              </p>
              {/* Whether prompts actually work yet (from the saved settings) */}
              {isPaystackPlatformAllowed && featureSettings.pos_paystack_enabled && (
                momoPromptsReady ? (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5">MoMo prompts: ready</p>
                ) : (
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
                    MoMo prompts: not ready. {momoPromptsReason}
                    {/payout/i.test(momoPromptsReason || '') && (
                      <Link to="/settings/profile" className="ml-1 underline">Set up payouts</Link>
                    )}
                  </p>
                )
              )}
            </div>
            <Switch
              isSelected={isPaystackPlatformAllowed ? (localFeatures.pos_paystack_enabled ?? true) : false}
              isDisabled={!isPaystackPlatformAllowed}
              onValueChange={(val) => setLocalFeatures(p => {
                const currentMethods = p.pos_payment_methods ?? ['cash', 'mobile_money'];
                const nextMethods = val ? currentMethods : currentMethods.filter(m => m !== 'card');
                return { ...p, pos_paystack_enabled: val, pos_payment_methods: nextMethods };
              })}
              color="primary"
            />
          </div>

          <Divider />

          <Row
            title="Require MoMo Transaction ID"
            description="When the cashier confirms MoMo, they type the transaction ID from the MoMo alert, so you can match sales to your statement."
            control={
              <Switch
                isSelected={Boolean(localFeatures.pos_require_momo_txn_id)}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_require_momo_txn_id: val }))}
                color="primary"
              />
            }
          />

          <Divider />

          <Row
            title="Split Payment"
            description="Pay with more than one method, e.g. part cash, part MoMo."
            lockedNote={standardLocked}
            control={
              <Switch
                isSelected={standardLocked ? false : localFeatures.pos_split_payment_enabled}
                isDisabled={!!standardLocked}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_split_payment_enabled: val }))}
                color="primary"
              />
            }
          />

          <Divider />

          <Row
            title="Credit Sales (Sell on Credit)"
            description="Let customers pay later. Balances are tracked in the Credit Ledger."
            lockedNote={standardLocked}
            control={
              <Switch
                isSelected={standardLocked ? false : localFeatures.pos_credit_enabled}
                isDisabled={!!standardLocked}
                onValueChange={(val) => setLocalFeatures(p => ({
                  ...p,
                  pos_credit_enabled: val,
                  // Auto-enable Credit Ledger in navigation if credit sales is turned ON
                  ...(val ? { pos_credit_ledger_enabled: true } : {})
                }))}
                color="primary"
              />
            }
          />

          {!standardLocked && localFeatures.pos_credit_enabled && (
            <Row
              nested
              title="Require Customer Info for Credit"
              description="Cashiers must enter the customer's name and phone number for a credit sale."
              control={
                <Switch
                  isSelected={localSettings.require_customer_for_credit}
                  onValueChange={(val) => setLocalSettings(p => ({ ...p, require_customer_for_credit: val }))}
                  color="primary"
                />
              }
            />
          )}

          {!standardLocked && localFeatures.pos_credit_enabled === false && (
            <Row
              nested
              title="Show Credit Ledger in Navigation"
              description="Keep the Credit Ledger in the sidebar to collect balances customers still owe."
              control={
                <Switch
                  isSelected={localFeatures.pos_credit_ledger_enabled ?? true}
                  onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_credit_ledger_enabled: val }))}
                  color="primary"
                />
              }
            />
          )}
        </Section>
        )}

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        {show('pricing') && (
        <Section title="Pricing" description="Tax, discounts and price changes at the till.">
          <Row
            title="VAT / Tax on Transactions"
            description="Add a tax line to every sale. Enter the rate as a decimal, e.g. 0.15 for 15%."
            lockedNote={standardLocked}
            control={
              <Switch
                isSelected={standardLocked ? false : localFeatures.pos_tax_enabled}
                isDisabled={!!standardLocked}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_tax_enabled: val }))}
                color="primary"
              />
            }
          >
            {!standardLocked && localFeatures.pos_tax_enabled && (
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <div className="flex-1">
                  <CustomInputTextField
                    label="Tax Rate (e.g. 0.15 for 15%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={String(localFeatures.pos_tax_rate)}
                    onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_tax_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex-1">
                  <CustomInputTextField
                    label="Tax Label (e.g. VAT, NHIL+GETFund)"
                    value={localFeatures.pos_tax_label}
                    onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_tax_label: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </Row>

          <Divider />

          <Row
            title="Discounts"
            description={<>Take a % or an amount off one item or the whole sale. Needs the &ldquo;Give discounts&rdquo; permission or a manager&apos;s PIN.</>}
            lockedNote={standardLocked}
            control={
              <Switch
                isSelected={standardLocked ? false : localFeatures.pos_discounts_enabled}
                isDisabled={!!standardLocked}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_discounts_enabled: val }))}
                color="primary"
              />
            }
          />

          <Divider />

          {/* Change prices at the till: Business plan or the add-on */}
          {(() => {
            const locked = !hasModule('price_override') && 'Requires the Business plan or the Price Changes add-on.';
            return (
              <Row
                title="Change Prices at the Till"
                description={<>Raise an item&apos;s price by tapping its total in the cart; lower prices use a discount. Needs the &ldquo;Change prices at the till&rdquo; permission or a manager&apos;s PIN.</>}
                lockedNote={locked}
                control={
                  <Switch
                    isSelected={locked ? false : Boolean(localFeatures.pos_price_override_enabled)}
                    isDisabled={!!locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_price_override_enabled: val }))}
                    color="primary"
                  />
                }
              />
            );
          })()}

          <Divider />

          {(() => {
            const locked = plan !== 'business' && 'Requires Business plan.';
            return (
              <Row
                title="Wholesale Pricing Mode"
                description="A switch in the register to sell at retail or wholesale prices."
                lockedNote={locked}
                control={
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_wholesale_enabled}
                    isDisabled={!!locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_wholesale_enabled: val }))}
                    color="primary"
                  />
                }
              />
            );
          })()}

          {/* Service charge: hidden until the restaurant module (the register never applied it) */}
        </Section>
        )}

        {/* ── Receipts ──────────────────────────────────────────────────── */}
        {show('receipts') && (
        <Section title="Receipts" description="What happens after a sale and what the receipt says.">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">Auto-Print Receipts</label>
            <p className="text-xs text-muted-foreground mb-3">What happens after a sale.</p>
            <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/50 max-w-md">
              {[
                { value: 'always', label: 'Always Print' },
                { value: 'ask', label: 'Ask Every Time' },
                { value: 'never', label: 'Never Print' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLocalSettings(p => ({ ...p, auto_print: option.value as any }))}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    localSettings.auto_print === option.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">Receipt Prefix (Store Code)</label>
            <p className="text-xs text-muted-foreground mb-3">
              2–4 characters at the start of receipt and order numbers. Defaults to your initials ({autoPrefix}).
            </p>
            <div className="max-w-xs">
              <CustomInputTextField
                value={localSettings.receipt_prefix || ''}
                onChange={(e: any) => {
                  const clean = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
                  setLocalSettings(p => ({ ...p, receipt_prefix: clean }));
                }}
                placeholder={autoPrefix}
                maxLength={4}
                labelPlacement='outside'
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-1.5">
              Receipt preview: <span className="font-bold text-foreground">{currentPrefix}-20260919-A3F1B89C</span>
            </p>
          </div>

          <Divider />

          <div className="space-y-2 max-w-2xl">
            <label className="block text-sm font-bold text-foreground">Receipt Footer Message</label>
            <p className="text-xs text-muted-foreground mb-3">Printed at the bottom of every receipt.</p>
            <CustomTextareaField
              value={localSettings.receipt_footer}
              onChange={(e) => setLocalSettings(p => ({ ...p, receipt_footer: e.target.value }))}
              rows={3}
              placeholder="e.g. Thank you for shopping with us! Return within 30 days."
              labelPlacement='outside'
            />
          </div>
        </Section>
        )}

        {/* ── Products ──────────────────────────────────────────────────── */}
        {show('products') && (
        <Section title="Products" description="Extra product options for how you stock and sell.">
          <Row
            title="Made In-House Products"
            description={<>For things you make, e.g. sobolo or bread: record batches that add stock and work out cost. Turn off if you only resell.</>}
            control={
              <Switch
                isSelected={Boolean(localFeatures.made_in_house_enabled)}
                onValueChange={(val) => setLocalFeatures(p => ({ ...p, made_in_house_enabled: val }))}
                color="primary"
              />
            }
          >
            {featureSettings.made_in_house_enabled && !localFeatures.made_in_house_enabled && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1.5 max-w-[400px]">
                Products already marked made-in-house keep selling. Their batch screens are hidden until you turn this back on.
              </p>
            )}
          </Row>

          {canSeeExpiry && (
            <>
              <Divider />
              <Row
                title="Enable Expiry Date Tracking"
                description="Ask for expiry dates when receiving stock for products that track expiry."
                control={<Switch isSelected={localExpiry} onValueChange={setLocalExpiry} color="primary" />}
              />
            </>
          )}
        </Section>
        )}

        {show('tills') && <TillsSection />}

        {/* Only while something is unsaved: one save for the whole page */}
        {isDirty && (
          <div className="sticky bottom-4 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 mx-2 sm:mx-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-full border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
              <p className="text-sm text-foreground min-w-0 pl-3 sm:pl-4">
                {changeCount} unsaved change{changeCount > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="ghost" disabled={isSaving} onClick={discard}>
                  Discard
                </Button>
                <Button type="button" disabled={isSaving} onClick={saveAll} className="font-semibold px-5">
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaving with unsaved changes */}
      <CustomModal
        isOpen={!!pendingLeave}
        onOpenChange={() => !isSaving && setPendingLeave(null)}
        size="sm"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2">
            <h3 className="text-base font-bold text-foreground">Save your changes?</h3>
          </div>
        }
        body={
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              You have {changeCount} unsaved change{changeCount > 1 ? 's' : ''} to your POS settings.
            </p>
          </div>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSaving}
              onClick={() => {
                discard();
                if (pendingLeave) leaveTo(pendingLeave);
              }}
              className="font-medium"
            >
              Discard
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if ((await saveAll()) && pendingLeave) leaveTo(pendingLeave);
              }}
              className="font-semibold"
            >
              {isSaving ? 'Saving…' : 'Save and leave'}
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}
