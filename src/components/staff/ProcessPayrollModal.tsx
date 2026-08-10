import React, { useState, useEffect } from 'react';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import {
  Check,
  Calendar,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Users,
  ShieldCheck,
  Building,
  Lock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface ProcessPayrollModalProps {
  profiles: any[];
  initialSelectedId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ItemState {
  profile_id: string;
  staff_name: string;
  role_title: string;
  is_off_platform: boolean;
  base_amount: number;
  adjustment: number;
  payment_method: string;
  note: string;
  selected: boolean;
}

export default function ProcessPayrollModal({
  profiles,
  initialSelectedId,
  onSuccess,
  onCancel,
}: ProcessPayrollModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [disbursalDate, setDisbursalDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Initialize line items state array from salary profiles
  const [itemStates, setItemStates] = useState<ItemState[]>(() => {
    return profiles.map((p) => ({
      profile_id: p.id,
      staff_name: p.full_name || p.name || 'Staff Member',
      role_title: p.role_title || p.role || 'Staff',
      is_off_platform: Boolean(p.is_off_platform),
      base_amount: Number(p.base_amount || 0),
      adjustment: 0,
      payment_method: p.payment_method || 'bank_transfer',
      note: '',
      selected: initialSelectedId ? p.id === initialSelectedId : true,
    }));
  });

  // Re-sync if initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setItemStates((prev) =>
        prev.map((item) => ({
          ...item,
          selected: item.profile_id === initialSelectedId,
        }))
      );
    }
  }, [initialSelectedId]);

  // Handlers for modifying row inputs
  const handleToggleSelect = (profile_id: string) => {
    setItemStates((prev) =>
      prev.map((item) =>
        item.profile_id === profile_id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = itemStates.every((item) => item.selected);
    setItemStates((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleUpdateItem = (profile_id: string, field: keyof ItemState, value: any) => {
    setItemStates((prev) =>
      prev.map((item) =>
        item.profile_id === profile_id ? { ...item, [field]: value } : item
      )
    );
  };

  // Filter selected items and calculate dynamic totals
  const selectedItems = itemStates.filter((item) => item.selected);
  const totalRecipients = selectedItems.length;

  const totalBaseAmount = selectedItems.reduce((acc, curr) => acc + curr.base_amount, 0);
  const totalAdjustments = selectedItems.reduce((acc, curr) => acc + Number(curr.adjustment || 0), 0);
  const totalGrossPayout = totalBaseAmount + totalAdjustments;

  const platformTotal = selectedItems
    .filter((item) => !item.is_off_platform)
    .reduce((acc, curr) => acc + curr.base_amount + Number(curr.adjustment || 0), 0);

  const externalTotal = selectedItems
    .filter((item) => item.is_off_platform)
    .reduce((acc, curr) => acc + curr.base_amount + Number(curr.adjustment || 0), 0);

  // Grouping payment methods for step 2 preview summary
  const methodSummaries = selectedItems.reduce((acc: any, curr) => {
    const m = curr.payment_method || 'bank_transfer';
    if (!acc[m]) acc[m] = { count: 0, amount: 0 };
    acc[m].count += 1;
    acc[m].amount += curr.base_amount + Number(curr.adjustment || 0);
    return acc;
  }, {});

  const handleProceedToPreview = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one recipient for the payroll run.');
      return;
    }
    if (!payPeriod.trim()) {
      toast.error('Please specify a valid pay period.');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/tenant/payroll/disburse', {
        pay_period: payPeriod,
        disbursal_date: disbursalDate,
        items: selectedItems.map((item) => ({
          profile_id: item.profile_id,
          staff_name: item.staff_name,
          amount: Number(item.base_amount) + Number(item.adjustment || 0),
          payment_method: item.payment_method,
          is_off_platform: item.is_off_platform,
          note: item.note ? item.note : undefined,
        })),
      });

      toast.success(`Payroll run executed! ${selectedItems.length} disbursements recorded.`);
      onSuccess();
    } catch (error: any) {
      console.error('Disburse payroll error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to disburse payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-1 pb-2 px-1">
      {/* Step Navigation Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={step === 1 ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStep(1)}
            className="gap-2 font-bold text-xs"
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[11px]">
              1
            </span>
            Step 1: Gross Pay &amp; Adjustments
          </Button>

          <ArrowRight className="h-4 w-4 text-muted-foreground/40" />

          <Button
            type="button"
            variant={step === 2 ? 'default' : 'ghost'}
            size="sm"
            onClick={handleProceedToPreview}
            className="gap-2 font-bold text-xs"
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[11px]">
              2
            </span>
            Step 2: Preview &amp; Submit
          </Button>
        </div>

        <span className="text-xs font-semibold text-muted-foreground">
          {step === 1 ? 'Editing Payroll Details' : 'Final Review'}
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          STEP 1: GROSS PAY & ADJUSTMENTS SPREADSHEET WORKSPACE
          ───────────────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Header Controls & Summary KPI Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-3">
              <CustomInputTextField
                label="Pay Period *"
                name="payPeriod"
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                required
                placeholder="e.g. August 2026"
              />
            </div>

            <div className="lg:col-span-3">
              <CustomInputTextField
                label="Disbursal Date *"
                name="disbursalDate"
                type="date"
                value={disbursalDate}
                onChange={(e) => setDisbursalDate(e.target.value)}
                required
              />
            </div>

            {/* KPI Summary Cards */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-md bg-card border border-border/80 text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Total Gross Payout
                </span>
                <div className="text-lg font-extrabold text-foreground mt-0.5">
                  <CurrencyDisplay amount={totalGrossPayout} />
                </div>
              </div>

              <div className="p-3 rounded-md bg-card border border-border/80 text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Recipients
                </span>
                <div className="text-lg font-extrabold text-foreground mt-0.5">
                  {totalRecipients} <span className="text-xs font-normal text-muted-foreground">/ {profiles.length}</span>
                </div>
              </div>

              <div className="p-3 rounded-md bg-card border border-border/80 text-left hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Platform vs External
                </span>
                <div className="text-xs font-bold text-foreground mt-1 truncate">
                  Platform: <CurrencyDisplay amount={platformTotal} showStyling={false} />
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Selection Header & Spreadsheet Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Staff Recipient Line Items ({itemStates.length})
              </span>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {selectedItems.length === itemStates.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Spreadsheet Table Container */}
            <div className="rounded-md border border-border overflow-hidden bg-card shadow-xs">
              <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="p-3 font-bold text-muted-foreground w-10 text-center">
                        <input
                          type="checkbox"
                          checked={itemStates.length > 0 && selectedItems.length === itemStates.length}
                          onChange={handleToggleSelectAll}
                          className="rounded border-border cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-bold text-muted-foreground min-w-[180px]">Employee / Staff</th>
                      <th className="p-3 font-bold text-muted-foreground min-w-[110px]">Base Salary</th>
                      <th className="p-3 font-bold text-muted-foreground min-w-[130px]">Bonus / Adjustment</th>
                      <th className="p-3 font-bold text-muted-foreground min-w-[150px]">Payment Method</th>
                      <th className="p-3 font-bold text-muted-foreground min-w-[160px]">Note / Memo</th>
                      <th className="p-3 font-bold text-muted-foreground text-right min-w-[120px]">Gross Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {itemStates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                          No staff salary profiles available. Configure salary profiles first.
                        </td>
                      </tr>
                    ) : (
                      itemStates.map((item) => {
                        const lineTotal = item.base_amount + Number(item.adjustment || 0);

                        return (
                          <tr
                            key={item.profile_id}
                            className={`transition-colors ${
                              item.selected ? 'bg-background hover:bg-muted/30' : 'bg-muted/20 opacity-60'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleSelect(item.profile_id)}
                                className="rounded border-border cursor-pointer"
                              />
                            </td>

                            {/* Staff Name & Classification */}
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{item.staff_name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-medium text-muted-foreground capitalize">
                                    {item.role_title}
                                  </span>
                                  {item.is_off_platform && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                                      External
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Base Salary */}
                            <td className="p-3 font-semibold text-muted-foreground">
                              <CurrencyDisplay amount={item.base_amount} showStyling={false} />
                            </td>

                            {/* Bonus / Adjustment Input */}
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground font-mono">+GHS</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.adjustment || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(item.profile_id, 'adjustment', parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="0.00"
                                  disabled={!item.selected}
                                  className="w-24 px-2 py-1 rounded border border-border bg-background text-xs font-mono font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                            </td>

                            {/* Payment Method Select */}
                            <td className="p-3">
                              <select
                                value={item.payment_method}
                                onChange={(e) => handleUpdateItem(item.profile_id, 'payment_method', e.target.value)}
                                disabled={!item.selected}
                                className="w-full px-2 py-1 rounded border border-border bg-background text-xs font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none capitalize"
                              >
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="mobile_money">Mobile Money</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                              </select>
                            </td>

                            {/* Note / Memo Input */}
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.note}
                                onChange={(e) => handleUpdateItem(item.profile_id, 'note', e.target.value)}
                                placeholder="Optional note..."
                                disabled={!item.selected}
                                className="w-full px-2 py-1 rounded border border-border bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </td>

                            {/* Calculated Gross Payout */}
                            <td className="p-3 text-right font-extrabold text-foreground text-sm">
                              <CurrencyDisplay amount={lineTotal} showStyling={false} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleProceedToPreview}
              disabled={selectedItems.length === 0}
              className="gap-2 cursor-pointer"
            >
              Next: Preview &amp; Submit <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          STEP 2: PREVIEW & SUBMIT CONFIRMATION WORKSPACE
          ───────────────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Main Execution Banner */}
          <div className="p-5 rounded-md bg-card border border-border shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Payroll Execution Summary
                </span>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  <CurrencyDisplay amount={totalGrossPayout} />
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Pay Period: <strong className="text-foreground">{payPeriod}</strong> • Disbursal Date:{' '}
                  <strong className="text-foreground">{disbursalDate}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
                  {totalRecipients} Selected Recipients
                </span>
              </div>
            </div>

            {/* Payment Methods Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
              <span className="text-xs font-semibold text-muted-foreground">Methods Breakdown:</span>
              {Object.entries(methodSummaries).map(([method, info]: any) => (
                <span key={method} className="text-xs px-2.5 py-1 rounded bg-muted/60 text-foreground font-medium capitalize">
                  {method.replace(/_/g, ' ')}: <strong>{info.count} staff</strong> (<CurrencyDisplay amount={info.amount} showStyling={false} />)
                </span>
              ))}
            </div>
          </div>

          {/* Read-Only Confirmation Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Disbursal Line Items Confirmation ({selectedItems.length})
            </h4>

            <div className="rounded-md border border-border overflow-hidden bg-card">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/50 border-b border-border sticky top-0">
                    <tr>
                      <th className="p-3 font-bold text-muted-foreground">Recipient</th>
                      <th className="p-3 font-bold text-muted-foreground">Classification</th>
                      <th className="p-3 font-bold text-muted-foreground">Payment Method</th>
                      <th className="p-3 font-bold text-muted-foreground">Note</th>
                      <th className="p-3 font-bold text-muted-foreground text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedItems.map((item) => {
                      const netAmount = item.base_amount + Number(item.adjustment || 0);

                      return (
                        <tr key={item.profile_id} className="hover:bg-muted/20">
                          <td className="p-3 font-bold text-foreground">{item.staff_name}</td>
                          <td className="p-3 text-muted-foreground">
                            {item.is_off_platform ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                                External Staff
                              </span>
                            ) : (
                              'Platform POS Staff'
                            )}
                          </td>
                          <td className="p-3 font-medium text-foreground capitalize">
                            {item.payment_method?.replace(/_/g, ' ')}
                          </td>
                          <td className="p-3 text-muted-foreground italic">{item.note || '—'}</td>
                          <td className="p-3 text-right font-extrabold text-foreground text-sm">
                            <CurrencyDisplay amount={netAmount} showStyling={false} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={loading}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Edit Details
            </Button>

            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading || selectedItems.length === 0}
              className="gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {loading ? (
                'Executing Disbursals...'
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Confirm &amp; Disburse Payroll ({totalRecipients})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
