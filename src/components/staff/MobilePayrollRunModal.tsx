import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';

import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Check, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  initialSelectedId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MobilePayrollRunModal({
  isOpen,
  onClose,
  profiles,
  initialSelectedId,
  onSuccess,
  onCancel,
}: ProcessPayrollModalProps) {
  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [disbursalDate, setDisbursalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() => {
    if (initialSelectedId) {
      return [initialSelectedId];
    }
    return profiles.map((p) => p.id);
  });

  const toggleSelectStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(selectedStaffIds.filter((item) => item !== id));
    } else {
      setSelectedStaffIds([...selectedStaffIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === profiles.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(profiles.map((p) => p.id));
    }
  };

  const selectedProfiles = profiles.filter((p) => selectedStaffIds.includes(p.id));
  const totalPayout = selectedProfiles.reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) {
      toast.error('Please select at least one staff member for payroll run');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/tenant/payroll/disburse', {
        pay_period: payPeriod,
        disbursal_date: disbursalDate,
        items: selectedProfiles.map((p) => ({
          profile_id: p.id,
          staff_name: p.full_name || p.name,
          amount: Number(p.base_amount),
          payment_method: p.payment_method || 'bank_transfer',
          is_off_platform: p.is_off_platform || false,
        })),
      });

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
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="lg"
      classNames={{ base: "sm:w-[520px]" }}
      header={
        <div className="pt-3 px-2 border-b border-border pb-3">
          <h2 className="text-xl font-bold">Process Payroll Run</h2>
          <p className="text-sm text-muted-foreground font-normal">Disburse salaries for selected staff and log expenses.</p>
        </div>
      }
      body={
        <div className="space-y-4 pt-2 px-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Staff Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase !tracking-wider text-muted-foreground">
                Select Recipients ({selectedStaffIds.length} of {profiles.length})
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground/50 font-semibold hover:underline cursor-pointer"
              >
                {selectedStaffIds.length === profiles.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded divide-y divide-border/60 bg-muted/30">
              {profiles.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No staff salary profiles found. Please configure salary profiles first.
                </div>
              ) : (
                profiles.map((p) => {
                  const isSelected = selectedStaffIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectStaff(p.id)}
                      className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'text-primary-foreground border-primary'
                              : 'border-border bg-background'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {p.full_name || p.name}
                            {p.is_off_platform && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400 font-semibold">
                                External
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {p.role_title || p.role || 'Staff'} • {p.payment_method?.replace(/_/g, ' ') || 'Cash'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-semibold text-sm">
                        <CurrencyDisplay amount={Number(p.base_amount || 0)} showStyling={false} />
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
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStaffIds.length === 0}>
              {loading ? 'Processing...' : `Disburse Payroll (${selectedStaffIds.length})`}
            </Button>
          </div>
        </div>
      }
    />
  );
}
