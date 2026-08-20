import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Check, Edit3, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
];

interface MobilePayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  excludedCount?: number;
  initialSelectedId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface RecipientItem {
  profile_id: string;
  staff_name: string;
  role_title: string;
  is_off_platform: boolean;
  base_amount: number;
  amount: number;
  payment_method: string;
  note: string;
  selected: boolean;
}

export default function MobilePayrollRunModal({
  isOpen,
  onClose,
  profiles,
  excludedCount = 0,
  initialSelectedId,
  onSuccess,
  onCancel,
}: MobilePayrollRunModalProps) {
  // Tenant-scoped draft key prevents cross-account draft pollution
  const tenantId = useAuthStore((s) => s.tenant?.id ?? 'unknown');
  const DRAFT_KEY = `vysion_payroll_draft_${tenantId}`;

  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [disbursalDate, setDisbursalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingRecipient, setEditingRecipient] = useState<RecipientItem | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const validProfileIds = new Set(profiles.map((p) => p.id));

  // Initialize state from localStorage draft or props
  const [items, setItems] = useState<RecipientItem[]>(() => {
    try {
      const key = `vysion_payroll_draft_${tenantId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items)) {
          // Only restore if ALL draft profile_ids belong to this tenant's profiles
          const draftIds: string[] = parsed.items.map((i: any) => i.profile_id);
          const allMatch = draftIds.every((id) => validProfileIds.has(id));
          if (allMatch && draftIds.length > 0) {
            return parsed.items;
          }
          // Draft is stale (different tenant) — discard it silently
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Failed to parse draft from storage', e);
    }

    return profiles.map((p) => ({
      profile_id: p.id,
      staff_name: p.full_name || p.name || 'Staff Member',
      role_title: p.role_title || p.role || 'Staff',
      is_off_platform: Boolean(p.is_off_platform),
      base_amount: Number(p.base_amount || 0),
      amount: Number(p.base_amount || 0),
      payment_method: p.payment_method || 'bank_transfer',
      note: '',
      selected: initialSelectedId ? p.id === initialSelectedId : true,
    }));
  });

  // Re-sync profiles when modal opens if items empty
  useEffect(() => {
    if (isOpen && profiles.length > 0 && items.length === 0) {
      setItems(
        profiles.map((p) => ({
          profile_id: p.id,
          staff_name: p.full_name || p.name || 'Staff Member',
          role_title: p.role_title || p.role || 'Staff',
          is_off_platform: Boolean(p.is_off_platform),
          base_amount: Number(p.base_amount || 0),
          amount: Number(p.base_amount || 0),
          payment_method: p.payment_method || 'bank_transfer',
          note: '',
          selected: initialSelectedId ? p.id === initialSelectedId : true,
        }))
      );
    }
  }, [isOpen, profiles, initialSelectedId]);

  // Auto-save draft to localStorage whenever form state changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ payPeriod, disbursalDate, items })
      );
    }
  }, [payPeriod, disbursalDate, items, DRAFT_KEY]);

  // Check if form has dirty modifications compared to defaults
  const isFormDirty = items.some(
    (item) => item.amount !== item.base_amount || item.note || !item.selected
  );

  const toggleSelectStaff = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.profile_id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleSaveRecipientEdit = () => {
    if (!editingRecipient) return;
    setItems((prev) =>
      prev.map((item) =>
        item.profile_id === editingRecipient.profile_id ? editingRecipient : item
      )
    );
    setEditingRecipient(null);
  };

  const handleCloseAttempt = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmDiscard = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDiscardConfirm(false);
    onCancel();
  };

  const selectedItems = items.filter((i) => i.selected);
  const totalPayout = selectedItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Please select at least one staff member for payroll run');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/tenant/payroll/disburse', {
        pay_period: payPeriod,
        disbursal_date: disbursalDate,
        items: selectedItems.map((p) => ({
          profile_id: p.profile_id,
          staff_name: p.staff_name,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          is_off_platform: p.is_off_platform,
          note: p.note || undefined,
        })),
      });

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Payroll run executed successfully & expenses logged');
      onSuccess();
    } catch (error: any) {
      console.error('Payroll disbursal error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={handleCloseAttempt}
        placement="right"
        size="lg"
        classNames={{ base: 'sm:w-[520px]' }}
        header={
          <div className="pt-3 px-2 border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Process Payroll Run</h2>
              <p className="text-sm text-muted-foreground font-normal">
                Disburse salaries for selected staff and log expenses.
              </p>
            </div>
          </div>
        }
        body={
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 pb-4 px-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomInputTextField
                label="Pay Period"
                name="payPeriod"
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                required
                placeholder="e.g. August 2026"
              />

              <CustomInputTextField
                label="Disbursal Date"
                name="disbursalDate"
                type="date"
                value={disbursalDate}
                onChange={(e) => setDisbursalDate(e.target.value)}
                required
              />
            </div>

            {/* Excluded unconfigured staff callout */}
            {excludedCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-400/30 bg-amber-400/5 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-amber-700 dark:text-amber-300">
                  <strong>{excludedCount} staff member{excludedCount > 1 ? 's' : ''}</strong> with incomplete profiles {excludedCount > 1 ? 'are' : 'is'} excluded. Complete their profiles in the <strong>Salary Profiles</strong> tab.
                </p>
              </div>
            )}

            {/* Staff Selection & Edit List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase !tracking-wider text-muted-foreground">
                  Select Recipients ({selectedItems.length} of {items.length})
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/80 divide-y divide-border/60 bg-card">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No staff salary profiles found. Please configure salary profiles first.
                  </div>
                ) : (
                  items.map((p) => {
                    return (
                      <div
                        key={p.profile_id}
                        className={`flex items-center justify-between p-3 transition-colors ${
                          p.selected ? 'bg-background hover:bg-muted/30' : 'bg-muted/20 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={p.selected}
                            onCheckedChange={() => toggleSelectStaff(p.profile_id)}
                          />
                          <div>
                            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              {p.staff_name}
                              {p.is_off_platform && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400 font-semibold">
                                  External
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {p.role_title} • {p.payment_method?.replace(/_/g, ' ')}
                              {p.note && <span className="italic ml-1">({p.note})</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right font-bold text-sm text-foreground">
                            <CurrencyDisplay amount={Number(p.amount || 0)} showStyling={false} />
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRecipient({ ...p })}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Amount / Method / Note"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary Total Banner */}
            <div className="p-3.5 rounded-md bg-card border border-border/80 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total Payroll Payout:</span>
              <span className="text-lg font-bold text-foreground">
                <CurrencyDisplay amount={totalPayout} />
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || selectedItems.length === 0}>
                {loading ? 'Processing...' : `Disburse Payroll (${selectedItems.length})`}
              </Button>
            </div>
          </form>
        }
      />

      {/* Popover / Sheet Modal for Editing Recipient Details on Mobile */}
      {editingRecipient && (
        <CustomModal
          isOpen={Boolean(editingRecipient)}
          onOpenChange={() => setEditingRecipient(null)}
          placement="center"
          size="md"
          classNames={{ base: 'sm:w-[420px]' }}
          header={
            <div className="pt-2 px-2 borderb border-border pb2">
              <h3 className="text-lg font-bold">Edit Payout — {editingRecipient.staff_name}</h3>
              <p className="text-xs text-muted-foreground">Modify payable amount, method, or note.</p>
            </div>
          }
          body={
            <div className="space-y-3 pb-4">
              <CustomInputTextField
                label="Payable Amount (GHS)"
                name="amount"
                type="number"
                step="0.01"
                value={String(editingRecipient.amount || 0)}
                onChange={(e) =>
                  setEditingRecipient({ ...editingRecipient, amount: parseFloat(e.target.value) || 0 })
                }
                required
              />

              <CustomSelectField
                label="Payment Method"
                options={PAYMENT_METHODS}
                value={editingRecipient.payment_method}
                inputProps={{
                  onChange: (e) =>
                    setEditingRecipient({ ...editingRecipient, payment_method: e.target.value })
                }}
              />

              <CustomInputTextField
                label="Note / Memo (Optional)"
                name="note"
                value={editingRecipient.note || ''}
                onChange={(e) => setEditingRecipient({ ...editingRecipient, note: e.target.value })}
                placeholder="e.g. August performance bonus"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingRecipient(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveRecipientEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          }
        />
      )}

      {/* Unsaved Changes Confirmation Guard Dialog */}
      {showDiscardConfirm && (
        <CustomModal
          isOpen={showDiscardConfirm}
          onOpenChange={() => setShowDiscardConfirm(false)}
          placement="center"
          size="sm"
          classNames={{ base: 'sm:w-[400px]' }}
          header={
            <div className="pt-3 px-2 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg">
              Discard Unsaved Payroll Draft?
            </div>
          }
          body={
            <div className="space-y-4 pt-1 px-2 pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                You have modified custom amounts or selections in this payroll draft. Are you sure you want to discard your draft and exit?
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-border -mx-2">
                <Button type="button" variant="outline" onClick={() => setShowDiscardConfirm(false)}>
                  Keep Editing
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirmDiscard}>
                  Discard &amp; Exit
                </Button>
              </div>
            </div>
          }
        />
      )}
    </>
  );
}
