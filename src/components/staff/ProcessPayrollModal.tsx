import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import {
  Check,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldCheck,
  Building,
  Lock,
  FileText,
  X,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { PillSidebar, PillSidebarOption } from '@/components/shared/pill-sidebar';

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  initialSelectedId?: string;
  onSuccess: () => void;
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
  isOpen,
  onClose,
  profiles,
  initialSelectedId,
  onSuccess,
}: ProcessPayrollModalProps) {
  const [activeStepKey, setActiveStepKey] = useState<string>('1');
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

  // Re-sync if initialSelectedId or profiles change when opening
  useEffect(() => {
    if (isOpen) {
      setActiveStepKey('1');
      setItemStates(
        profiles.map((p) => ({
          profile_id: p.id,
          staff_name: p.full_name || p.name || 'Staff Member',
          role_title: p.role_title || p.role || 'Staff',
          is_off_platform: Boolean(p.is_off_platform),
          base_amount: Number(p.base_amount || 0),
          adjustment: 0,
          payment_method: p.payment_method || 'bank_transfer',
          note: '',
          selected: initialSelectedId ? p.id === initialSelectedId : true,
        }))
      );
    }
  }, [isOpen, initialSelectedId, profiles]);

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

  const sidebarOptions: PillSidebarOption[] = [
    {
      key: '1',
      label: '1. Gross Pay & Line Items',
      count: totalRecipients,
    },
    {
      key: '2',
      label: '2. Preview & Final Submit',
    },
  ];

  const handleStepChange = (key: string) => {
    if (key === '2' && selectedItems.length === 0) {
      toast.error('Please select at least one recipient for the payroll run.');
      return;
    }
    setActiveStepKey(key);
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
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="full"
      placement="center"
      classNames={{
        base: 'w-screen h-screen max-w-full m-0 mx-0 my-0 sm:mx-0 sm:my-0 p-0 rounded-none bg-background flex flex-col overflow-hidden',
        body: 'p-0 flex-1 flex flex-col overflow-hidden',
        header:'pb-2'
        // closeButton: 'hidden',
      }}
      header={
        <div className="pt-2 px-2 border-b border-border pb-4">
          <h2 className="text-xl font-bold">Run Regular Payroll</h2>
          <p className="text-sm text-muted-foreground font-normal">Review gross pay, custom adjustments, and disburse staff salaries.</p>
        </div>
      }
      body={
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* ─────────────────────────────────────────────────────────────────────────────
              FULL-SCREEN TOP NAVIGATION HEADER
              ───────────────────────────────────────────────────────────────────────────── */}
          {/* <div className="h-16 px-6 border-b border-border/80 bg-card flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg text-primary flex items-center justify-center font-bold">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground trackingtight">Run Regular Payroll Workspace</h1>
                <p className="text-xs text-muted-foreground">
                  Review gross pay, custom adjustments, payment methods, and disburse staff salaries.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" /> Cancel Workspace
              </Button>
            </div>
          </div> */}

          {/* ─────────────────────────────────────────────────────────────────────────────
              MAIN WORKSPACE (LEFT PILL SIDEBAR + RIGHT CONTENT AREA)
              ───────────────────────────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT COLUMN: PILL SIDEBAR + LIVE SUMMARY CARDS */}
            <div className="lg:w-[20rem] 2xl:w-[22rem] border-r border-border/80 p-5 flex flex-col justify-between shrink-0 overflow-y-auto space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase !tracking-wider text-muted-foreground block">
                    Execution Steps
                  </span>
                  <PillSidebar
                    options={sidebarOptions}
                    activeKey={activeStepKey}
                    onChange={handleStepChange}
                    className="w-full"
                    variant="primary"
                  />
                </div>

                {/* Live KPI Summary Card */}
                 {activeStepKey === '1' && (
                <div className="p-4 space-y-3.5 shadow-xs">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground !tracking-wider block border-b border-border/60 pb-2">
                    Live Payroll Summary
                  </span>

                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">Total Gross Payout</span>
                    <div className="text-2xl font-black text-foreground mt-0.5">
                      <CurrencyDisplay amount={totalGrossPayout} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Recipients Selected:</span>
                      <strong className="text-foreground">
                        {totalRecipients} / {profiles.length}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Platform Staff:</span>
                      <span className="font-semibold text-foreground">
                        <CurrencyDisplay amount={platformTotal} showStyling={false} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">External Staff:</span>
                      <span className="font-semibold text-foreground">
                        <CurrencyDisplay amount={externalTotal} showStyling={false} />
                      </span>
                    </div>
                  </div>
                </div>
                 )}
              </div>
                 

              {/* Quick Info Callout */}
              {/* <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Execution Protection
                </span>
                <p className="text-[11px]">
                  Disbursing creates expense ledger entries and records line items. You can review recipient details in Step 2 before submitting.
                </p>
              </div> */}
            </div>

            {/* RIGHT COLUMN: STEP CONTENT AREA */}
            <div className="flex-1 p-6 overflow-y-auto bg-background flex flex-col justify-between">
              {/* STEP 1: GROSS PAY & LINE ITEMS */}
              {activeStepKey === '1' && (
                <div className="space-y-6">
                  {/* Pay Period & Date Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl bg-card p-4 rounded-lg border border-border/80 shadow-xs">
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

                  {/* Recipients Table */}
                  <div className="space-y-3">
                    {/* <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase !tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" /> Staff Recipient Line Items ({itemStates.length})
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {selectedItems.length === itemStates.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div> */}

                    <div className="rounded border border-border/80 overflow-hidden bg-card shadow-xs">
                      <div className="max-h-[calc(100vh-360px)] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-background border-b border-border sticky top-0 z-10">
                            <tr>
                              <th className="p-3.5 font-bold text-muted-foreground w-10 text-center">
                                <Checkbox
                                  checked={itemStates.length > 0 && selectedItems.length === itemStates.length}
                                  onCheckedChange={handleToggleSelectAll}
                                />
                              </th>
                              <th className="p-3.5 font-bold text-muted-foreground min-w-[200px]">Employee / Staff</th>
                              <th className="p-3.5 font-bold text-muted-foreground min-w-[120px]">Base Salary</th>
                              <th className="p-3.5 font-bold text-muted-foreground min-w-[140px]">Bonus / Adjustment</th>
                              <th className="p-3.5 font-bold text-muted-foreground min-w-[160px]">Payment Method</th>
                              <th className="p-3.5 font-bold text-muted-foreground min-w-[180px]">Note / Memo</th>
                              <th className="p-3.5 font-bold text-muted-foreground text-right min-w-[130px]">Gross Payout</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {itemStates.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
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
                                      item.selected ? 'bg-background hover:bg-muted/30' : 'bg-muted/20 opacity-50'
                                    }`}
                                  >
                                    <td className="p-3.5 text-center">
                                      <Checkbox
                                        checked={item.selected}
                                        onCheckedChange={() => handleToggleSelect(item.profile_id)}
                                      />
                                    </td>

                                    <td className="p-3.5">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-foreground text-sm">{item.staff_name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[11px] font-medium text-muted-foreground capitalize">
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

                                    <td className="p-3.5 font-semibold text-muted-foreground">
                                      <CurrencyDisplay amount={item.base_amount} showStyling={false} />
                                    </td>

                                    <td className="p-3.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground font-mono text-[11px]">+GHS</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={item.adjustment || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(item.profile_id, 'adjustment', parseFloat(e.target.value) || 0)
                                          }
                                          placeholder="0.00"
                                          disabled={!item.selected}
                                          className="w-28 px-2.5 py-1.5 rounded border border-border focus:border-foreground/30 bg-background text-xs font-mono font-medium focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </td>

                                    <td className="p-3.5">
                                      <select
                                        value={item.payment_method}
                                        onChange={(e) => handleUpdateItem(item.profile_id, 'payment_method', e.target.value)}
                                        disabled={!item.selected}
                                        className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-xs font-medium cursor-pointer focus:border-foreground/30 focus:outline-none capitalize"
                                      >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="mobile_money">Mobile Money</option>
                                        <option value="cash">Cash</option>
                                        <option value="cheque">Cheque</option>
                                      </select>
                                    </td>

                                    <td className="p-3.5">
                                      <input
                                        type="text"
                                        value={item.note}
                                        onChange={(e) => handleUpdateItem(item.profile_id, 'note', e.target.value)}
                                        placeholder="Optional note..."
                                        disabled={!item.selected}
                                        className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-xs focus:border-foreground/30 focus:outline-none"
                                      />
                                    </td>

                                    <td className="p-3.5 text-right font-black text-foreground text-sm">
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
                </div>
              )}

              {/* STEP 2: PREVIEW & SUBMIT */}
              {activeStepKey === '2' && (
                <div className="space-y-5 -mt-3">
                  {/* Execution Summary Card */}
                  <div className="p-6 rounded-xl bg-card border border-border/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase !tracking-wider text-muted-foreground font-semibold">
                          Payroll Execution Summary
                        </span>
                        <h2 className="text-3xl font-black text-foreground mt-0.5">
                          <CurrencyDisplay amount={totalGrossPayout} />
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          Pay Period: <strong className="text-foreground">{payPeriod}</strong> • Disbursal Date:{' '}
                          <strong className="text-foreground">{disbursalDate}</strong>
                        </p>
                      </div>

                      <span className="px-3.5 py-2 bg-muted/40 text-muted-foreground font-bold text-xs self-start">
                        {totalRecipients} Selected Recipients
                      </span>
                    </div>

                    {/* Payment Methods Distribution */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
                      <span className="text-xs font-semibold text-muted-foreground">Methods Breakdown:</span>
                      {Object.entries(methodSummaries).map(([method, info]: any) => (
                        <span key={method} className="text-xs px-3 py-1 rounded-md bg-muted/60 text-foreground font-medium capitalize">
                          {method.replace(/_/g, ' ')}: <strong>{info.count} staff</strong> (<CurrencyDisplay amount={info.amount} showStyling={false} />)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Confirmation Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Disbursal Line Items Confirmation ({selectedItems.length})
                    </h4>

                    <div className="rounded border border-border/80 overflow-hidden bg-card shadow-xs">
                      <div className="max-h-[calc(100vh-465px)] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-background border-b border-border sticky top-0">
                            <tr>
                              <th className="p-3.5 font-bold text-muted-foreground">Recipient</th>
                              <th className="p-3.5 font-bold text-muted-foreground">Classification</th>
                              <th className="p-3.5 font-bold text-muted-foreground">Payment Method</th>
                              <th className="p-3.5 font-bold text-muted-foreground">Note / Memo</th>
                              <th className="p-3.5 font-bold text-muted-foreground text-right">Net Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {selectedItems.map((item) => {
                              const netAmount = item.base_amount + Number(item.adjustment || 0);

                              return (
                                <tr key={item.profile_id} className="hover:bg-muted/20">
                                  <td className="p-3.5 font-bold text-foreground text-sm">{item.staff_name}</td>
                                  <td className="p-3.5 text-muted-foreground">
                                    {item.is_off_platform ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                                        External Staff
                                      </span>
                                    ) : (
                                      'Platform POS Staff'
                                    )}
                                  </td>
                                  <td className="p-3.5 font-semibold text-foreground capitalize">
                                    {item.payment_method?.replace(/_/g, ' ')}
                                  </td>
                                  <td className="p-3.5 text-muted-foreground italic">{item.note || '—'}</td>
                                  <td className="p-3.5 text-right font-black text-foreground text-sm">
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
                </div>
              )}

              {/* BOTTOM STEP NAVIGATION FOOTER */}
              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                {activeStepKey === '1' ? (
                  <>
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleStepChange('2')}
                      disabled={selectedItems.length === 0}
                      className="gap-2 cursor-pointer"
                    >
                      Next: Preview &amp; Submit <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveStepKey('1')}
                      disabled={loading}
                      className="gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Edit Details
                    </Button>

                    <Button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={loading || selectedItems.length === 0}
                      className="gap-2 cursor-pointer px-6"
                    >
                      {loading ? (
                        'Executing Disbursals...'
                      ) : (
                        <>
                          <Lock className="h-4 w-4" /> Confirm &amp; Disburse Payroll ({totalRecipients})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
