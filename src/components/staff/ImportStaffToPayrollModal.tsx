import React, { useState, useMemo, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { isProfileConfigured } from '@/utils/payrollHelpers';
import {
  getMoMoNetworkOptions,
  getBankOptions,
  saveCustomMoMoNetwork,
  saveCustomBank,
} from '@/utils/paymentProviders';

interface ImportStaffToPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: any[];
  existingProfiles: any[];
  onSuccess: () => void;
  isMobileView?: boolean;
}

type Step = 1 | 2 | 3;

interface ConfigDraft {
  compensation_type: string;
  base_amount: string;
  payment_method: string;
  bank_or_momo_name: string;
  account_number: string;
  providerSelect: string;
  customProviderInput: string;
}

const COMPENSATION_TYPES = [
  { value: 'monthly_salary', label: 'Monthly Salary' },
  { value: 'weekly_salary', label: 'Weekly Salary' },
  { value: 'hourly_rate', label: 'Hourly Rate' },
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash / Petty Cash' },
];

const defaultDraft = (): ConfigDraft => ({
  compensation_type: 'monthly_salary',
  base_amount: '',
  payment_method: 'bank_transfer',
  bank_or_momo_name: 'Ecobank Ghana',
  account_number: '',
  providerSelect: 'Ecobank Ghana',
  customProviderInput: '',
});

export default function ImportStaffToPayrollModal({
  isOpen,
  onClose,
  staffList,
  existingProfiles,
  onSuccess,
  isMobileView = false,
}: ImportStaffToPayrollModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [configMap, setConfigMap] = useState<Record<string, ConfigDraft>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff not already on any payroll profile
  const availableStaff = useMemo(() => {
    const onPayrollIds = new Set(
      existingProfiles
        .filter((p) => !p.is_off_platform && p.staff_id)
        .map((p) => p.staff_id)
    );
    return staffList.filter((s) => !onPayrollIds.has(s.id));
  }, [staffList, existingProfiles]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return availableStaff;
    const q = searchQuery.toLowerCase();
    return availableStaff.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q)
    );
  }, [availableStaff, searchQuery]);

  const selectedStaff = useMemo(
    () => availableStaff.filter((s) => selectedStaffIds.includes(s.id)),
    [availableStaff, selectedStaffIds]
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchQuery('');
      setSelectedStaffIds([]);
      setConfigMap({});
    }
  }, [isOpen]);

  // Seed configMap when moving to step 2
  const initConfigMap = () => {
    const map: Record<string, ConfigDraft> = {};
    selectedStaff.forEach((s) => {
      map[s.id] = configMap[s.id] || defaultDraft();
    });
    setConfigMap(map);
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getInitials = (staff: any) => {
    const name = staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
    if (!name) return 'ST';
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (staff: any) =>
    staff.name ||
    `${staff.first_name || ''} ${staff.last_name || ''}`.trim() ||
    'Staff Member';

  const isDraftConfigured = (draft: ConfigDraft) =>
    isProfileConfigured({
      base_amount: draft.base_amount,
      payment_method: draft.payment_method,
      bank_or_momo_name: draft.bank_or_momo_name,
      account_number: draft.account_number,
    });

  const configuredCount = selectedStaff.filter(
    (s) => configMap[s.id] && isDraftConfigured(configMap[s.id])
  ).length;

  const unconfiguredCount = selectedStaff.length - configuredCount;

  // ─── Submission ───────────────────────────────────────────────────────────────
  const submitImport = async (asUnconfigured = false) => {
    if (selectedStaffIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const promises = selectedStaff.map((staff) => {
        const draft = configMap[staff.id];
        const configured = !asUnconfigured && draft && isDraftConfigured(draft);
        const fullName = getDisplayName(staff);
        const roleTitle = staff.role ? String(staff.role).toUpperCase() : 'Staff';

        return apiClient.post('/tenant/payroll/profile', {
          staff_id: staff.id,
          full_name: fullName,
          role_title: roleTitle,
          is_off_platform: false,
          // Always persist compensation_type and payment_method — even for unconfigured
          // drafts — so the profile pre-fills correctly when the manager opens it later.
          compensation_type: draft?.compensation_type || 'monthly_salary',
          payment_method: draft?.payment_method || 'bank_transfer',
          // Only fully-configured profiles get a real base_amount and bank details.
          base_amount: configured ? parseFloat(draft.base_amount) : null,
          bank_or_momo_name: configured ? draft.bank_or_momo_name : null,
          account_number: configured ? draft.account_number : null,
        });
      });

      await Promise.allSettled(promises);

      if (asUnconfigured) {
        toast.success(
          `${selectedStaffIds.length} staff member${selectedStaffIds.length > 1 ? 's' : ''} added to payroll roster as unconfigured.`
        );
      } else {
        toast.success(
          configuredCount > 0 && unconfiguredCount > 0
            ? `${configuredCount} configured, ${unconfiguredCount} added as unconfigured.`
            : configuredCount > 0
            ? `${configuredCount} staff member${configuredCount > 1 ? 's' : ''} configured and ready for payroll.`
            : `${unconfiguredCount} staff member${unconfiguredCount > 1 ? 's' : ''} added as unconfigured.`
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Import staff error:', err);
      toast.error('Failed to import some staff members');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Config draft helpers ────────────────────────────────────────────────────
  const updateDraft = (staffId: string, updates: Partial<ConfigDraft>) => {
    setConfigMap((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || defaultDraft()), ...updates },
    }));
  };

  const handlePaymentMethodChange = (staffId: string, method: string) => {
    const defaultProvider =
      method === 'bank_transfer'
        ? 'Ecobank Ghana'
        : method === 'mobile_money'
        ? 'MTN Mobile Money'
        : '';
    updateDraft(staffId, {
      payment_method: method,
      bank_or_momo_name: defaultProvider,
      account_number: '',
      providerSelect: defaultProvider,
      customProviderInput: '',
    });
  };

  const handleProviderChange = (staffId: string, val: string) => {
    const draft = configMap[staffId] || defaultDraft();
    updateDraft(staffId, {
      providerSelect: val,
      bank_or_momo_name: val === 'other' ? draft.customProviderInput : val,
    });
  };

  const handleCustomProviderChange = (staffId: string, val: string) => {
    updateDraft(staffId, { customProviderInput: val, bank_or_momo_name: val });
  };

  // ─── Toggle selection helpers ─────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map((s) => s.id));
    }
  };

  const toggleStaff = (id: string) =>
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ─── Step Progress Bar ────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center justify-center gap-2 py-3">
      {([1, 2, 3] as Step[]).map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-1.5">
            <div
              className={clsx(
                'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all border',
                step === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : step > s
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-muted/50 text-muted-foreground border-border/60'
              )}
            >
              {step > s ? <Icon icon="solar:check-linear" className="h-3.5 w-3.5" /> : s}
            </div>
            <span
              className={clsx(
                'text-[11px] font-semibold hidden sm:inline',
                step === s ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s === 1 ? 'Select Staff' : s === 2 ? 'Configure' : 'Confirm'}
            </span>
          </div>
          {i < 2 && (
            <div
              className={clsx(
                'flex-1 h-px max-w-[48px] transition-colors',
                step > s ? 'bg-primary/50' : 'bg-border/60'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Step 1: Select Staff ─────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-3 text-xs">
      {availableStaff.length === 0 ? (
        <div className="py-12 text-center space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20">
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
            <Icon icon="solar:check-circle-linear" className="h-5 w-5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-foreground">All Staff Are on Payroll</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Every registered platform staff member is already on the payroll roster.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Icon
                icon="solar:magnifer-linear"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-primary hover:underline shrink-0 flex items-center gap-1"
            >
              <Icon icon="solar:check-square-linear" className="h-3.5 w-3.5" />
              {selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0
                ? 'Deselect All'
                : `Select All (${filteredStaff.length})`}
            </button>
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {filteredStaff.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No staff matching "{searchQuery}"
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaffIds.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-primary/5 border-primary/40 shadow-xs'
                        : 'bg-card border-border/80 hover:bg-muted/40'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-border text-primary shrink-0"
                    />
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] text-foreground shrink-0 border border-border/70">
                      {getInitials(staff)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs truncate">
                          {getDisplayName(staff)}
                        </span>
                        <span className="capitalize text-[10px] font-semibold px-1.5 rounded bg-muted/60 text-muted-foreground border border-border/50 shrink-0">
                          {staff.role || 'Staff'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {staff.email || 'No email registered'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );

  // ─── Step 2: Configure (Desktop only) ────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-3 text-xs">
      {/* Progress chip */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Configure each staff member's salary and payment details. You may skip any card — they'll be added as <span className="font-bold text-amber-600 dark:text-amber-400">Unconfigured</span>.
        </p>
        <span className="shrink-0 ml-3 text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/60 whitespace-nowrap">
          {configuredCount} / {selectedStaff.length} Complete
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {selectedStaff.map((staff) => {
          const draft = configMap[staff.id] || defaultDraft();
          const configured = isDraftConfigured(draft);
          const providerOptions =
            draft.payment_method === 'bank_transfer' ? getBankOptions() : getMoMoNetworkOptions();

          return (
            <div
              key={staff.id}
              className={clsx(
                'rounded-xl border p-3.5 space-y-3 transition-colors',
                configured
                  ? 'border-emerald-400/30 bg-emerald-400/5'
                  : 'border-border/80 bg-card'
              )}
            >
              {/* Staff header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-foreground shrink-0 border border-border/70">
                    {getInitials(staff)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-foreground text-xs block truncate">
                      {getDisplayName(staff)}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{staff.role || 'Staff'}</span>
                  </div>
                </div>
                {configured ? (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Icon icon="solar:check-circle-linear" className="h-3 w-3" /> Ready
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-600 dark:text-amber-400">
                    Unconfigured
                  </span>
                )}
              </div>

              {/* Compensation row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Structure
                  </label>
                  <select
                    value={draft.compensation_type}
                    onChange={(e) => updateDraft(staff.id, { compensation_type: e.target.value })}
                    className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {COMPENSATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Base Amount *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={draft.base_amount}
                    onChange={(e) => updateDraft(staff.id, { base_amount: e.target.value })}
                    className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Payment Method
                </label>
                <select
                  value={draft.payment_method}
                  onChange={(e) => handlePaymentMethodChange(staff.id, e.target.value)}
                  className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Account details */}
              {draft.payment_method !== 'cash' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {draft.payment_method === 'bank_transfer' ? 'Bank Name' : 'MoMo Network'}
                    </label>
                    <select
                      value={draft.providerSelect}
                      onChange={(e) => handleProviderChange(staff.id, e.target.value)}
                      className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {providerOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {draft.providerSelect === 'other' && (
                      <input
                        type="text"
                        placeholder={draft.payment_method === 'bank_transfer' ? 'Custom bank name' : 'Custom network'}
                        value={draft.customProviderInput}
                        onChange={(e) => handleCustomProviderChange(staff.id, e.target.value)}
                        className="mt-1 w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {draft.payment_method === 'bank_transfer' ? 'Account No.' : 'Phone No.'}
                    </label>
                    <input
                      type="text"
                      placeholder={draft.payment_method === 'bank_transfer' ? '1234567890' : '0240000000'}
                      value={draft.account_number}
                      onChange={(e) => updateDraft(staff.id, { account_number: e.target.value })}
                      className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Step 3: Review ───────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-4 text-xs">
      <p className="text-xs text-muted-foreground">
        Review your import summary before completing.
      </p>

      <div className="space-y-2">
        {configuredCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5">
            <div className="h-8 w-8 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
              <Icon icon="solar:check-circle-linear" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                {configuredCount} staff member{configuredCount > 1 ? 's' : ''} configured
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ready to be included in payroll runs immediately.
              </p>
            </div>
          </div>
        )}

        {unconfiguredCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-400/30 bg-amber-400/5">
            <div className="h-8 w-8 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
              <Icon icon="solar:danger-triangle-linear" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                {unconfiguredCount} staff member{unconfiguredCount > 1 ? 's' : ''} unconfigured
              </p>
              <p className="text-[11px] text-muted-foreground">
                Added to roster as drafts. Click their row in the Salary Profiles table to complete setup before including them in payroll runs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Staff summary list */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
        {selectedStaff.map((staff) => {
          const draft = configMap[staff.id];
          const configured = draft && isDraftConfigured(draft);
          return (
            <div key={staff.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-[9px] text-foreground shrink-0 border border-border/70">
                  {getInitials(staff)}
                </div>
                <span className="font-semibold text-foreground text-xs truncate">
                  {getDisplayName(staff)}
                </span>
              </div>
              <span
                className={clsx(
                  'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded',
                  configured
                    ? 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-400/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {configured ? 'Configured' : 'Unconfigured'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Footer actions ───────────────────────────────────────────────────────────
  const renderFooter = () => {
    // Mobile: single step
    if (isMobileView) {
      return (
        <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-border/70">
          <div className="text-xs text-muted-foreground font-medium">
            {selectedStaffIds.length > 0 && (
              <span>{selectedStaffIds.length} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedStaffIds.length === 0 || isSubmitting}
              onClick={() => submitImport(true)}
              className="text-xs font-semibold gap-1.5"
            >
              {isSubmitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
              )}
              <Icon icon="solar:user-check-linear" className="h-4 w-4" />
              Add to Payroll Roster
            </Button>
          </div>
        </div>
      );
    }

    // Desktop step footers
    if (step === 1) {
      return (
        <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-border/70">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {selectedStaffIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => submitImport(true)}
                className="text-xs font-semibold"
              >
                {isSubmitting && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent mr-1" />
                )}
                Skip & Import Unconfigured
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={selectedStaffIds.length === 0}
              onClick={() => {
                initConfigMap();
                setStep(2);
              }}
              className="text-xs font-semibold gap-1.5"
            >
              Next: Configure
              <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-border/70">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(1)}
            className="text-xs font-semibold gap-1"
          >
            <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => submitImport(false)}
              className="text-xs font-semibold"
            >
              {isSubmitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent mr-1" />
              )}
              Skip Remaining & Finish
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setStep(3)}
              className="text-xs font-semibold gap-1.5"
            >
              Next: Review
              <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 3
    return (
      <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-border/70">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(2)}
          className="text-xs font-semibold gap-1"
        >
          <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting}
          onClick={() => submitImport(false)}
          className="text-xs font-semibold gap-1.5"
        >
          {isSubmitting ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
            <Icon icon="solar:user-check-linear" className="h-4 w-4" />
          )}
          Complete Import
        </Button>
      </div>
    );
  };

  // ─── Header ───────────────────────────────────────────────────────────────────
  const headerTitle = isMobileView
    ? 'Add Staff to Payroll Roster'
    : step === 1
    ? 'Import Platform Staff'
    : step === 2
    ? 'Configure Salaries'
    : 'Review & Confirm';

  const headerSubtitle = isMobileView
    ? 'Selected staff will be added as unconfigured. Tap their row in the roster to set up their salary later.'
    : step === 1
    ? 'Select registered platform staff members to add to the payroll roster.'
    : step === 2
    ? 'Optionally configure salary and payment details. Incomplete cards will be saved as unconfigured.'
    : 'Review your import before confirming.';

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      placement="center"
      classNames={{ base: 'max-w-xl' }}
      header={
        <div className="pt-2 px-1 border-b border-border/70 pb-0">
          <div className="flex items-center gap-2 pb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon icon="solar:user-plus-linear" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{headerTitle}</h2>
              <p className="text-xs text-muted-foreground font-normal">{headerSubtitle}</p>
            </div>
          </div>
          {!isMobileView && <StepBar />}
        </div>
      }
      body={
        <div className="py-2">
          {isMobileView || step === 1
            ? renderStep1()
            : step === 2
            ? renderStep2()
            : renderStep3()}
        </div>
      }
      footer={renderFooter()}
    />
  );
}
