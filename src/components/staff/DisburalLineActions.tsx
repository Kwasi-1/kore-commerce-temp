/**
 * DisburalLineActions
 * -------------------
 * Shared reusable component that provides "Edit Payout" and "Reverse Payment"
 * modal dialogs for a single payroll disbursal line item.
 *
 * Usage:
 *   1. Render <DisburalLineActions ... /> anywhere in the tree.
 *   2. Use `ref.current.openEdit(item)` / `ref.current.openReverse(item)` to trigger.
 *      OR pass `editingLine` / `reversingLine` props directly.
 *
 * Simpler pattern used here: expose `onEditClick` and `onReverseClick` so
 * the parent just calls those from button onClick handlers.
 */

import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
];

interface DisburalLineActionsProps {
  /** Called after a successful edit or reversal so the parent can refresh data */
  onSuccess: () => void;
  /** Externally controlled: the line item to edit (null = modal closed) */
  editingLine: any | null;
  /** Externally controlled: the line item to reverse (null = modal closed) */
  reversingLine: any | null;
  /** Clear editingLine in parent */
  onCloseEdit: () => void;
  /** Clear reversingLine in parent */
  onCloseReverse: () => void;
}

export default function DisburalLineActions({
  onSuccess,
  editingLine,
  reversingLine,
  onCloseEdit,
  onCloseReverse,
}: DisburalLineActionsProps) {
  const [actionReason, setActionReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('bank_transfer');
  const [editNote, setEditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync local state when editingLine changes
  React.useEffect(() => {
    if (editingLine) {
      setEditAmount(editingLine.amount?.toString() || '');
      setEditMethod(editingLine.payment_method || 'bank_transfer');
      setEditNote(editingLine.note || '');
      setActionReason('');
    }
  }, [editingLine]);

  React.useEffect(() => {
    if (reversingLine) {
      setActionReason('');
    }
  }, [reversingLine]);

  const handleSaveEdit = async () => {
    if (!editingLine) return;
    if (parseFloat(editAmount) !== parseFloat(editingLine.amount) && !actionReason.trim()) {
      toast.error('Reason is required when modifying payout amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/tenant/payroll/disbursal/${editingLine.id}`, {
        amount: parseFloat(editAmount),
        payment_method: editMethod,
        note: editNote,
        reason: actionReason,
      });
      toast.success('Disbursal updated successfully');
      onCloseEdit();
      onSuccess();
    } catch (error: any) {
      console.error('Update disbursal line error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update disbursal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReverse = async () => {
    if (!reversingLine) return;
    if (!actionReason.trim()) {
      toast.error('Please enter a reason for reversing this payment');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/tenant/payroll/disbursal/${reversingLine.id}/reverse`, {
        reason: actionReason,
      });
      toast.success('Payment reversed & expense voided');
      onCloseReverse();
      onSuccess();
    } catch (error: any) {
      console.error('Reverse line error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to reverse payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Edit Payout Line Modal ── */}
      <CustomModal
        isOpen={Boolean(editingLine)}
        onOpenChange={onCloseEdit}
        placement="center"
        size="md"
        header={
          <div className="pt-2">
            <h3 className="text-lg font-bold">Edit Payout — {editingLine?.staff_name || editingLine?.recipient_name}</h3>
            <p className="text-xs text-muted-foreground">Modify payout amount, payment method, or note.</p>
          </div>
        }
        body={
          <div className="space-y-4 pb-4">
            <CustomInputTextField
              label="New Amount"
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />

            <CustomSelectField
              label="Payment Method"
              options={PAYMENT_METHODS}
              value={editMethod}
              inputProps={{
                onChange: (e) => setEditMethod(e.target.value),
              }}
            />

            <CustomInputTextField
              label="Note (Optional)"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="e.g. Adjusted bonus"
            />

            <CustomInputTextField
              label="Reason for Modification *"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Overtime calculation error"
              required={parseFloat(editAmount) !== parseFloat(editingLine?.amount || 0)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onCloseEdit} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      />

      {/* ── Reverse Payment Modal ── */}
      <CustomModal
        isOpen={Boolean(reversingLine)}
        onOpenChange={onCloseReverse}
        placement="center"
        size="md"
        header={
          <div className="pt-2">
            <h3 className="text-lg font-bold text-rose-600">
              Reverse Payment — {reversingLine?.staff_name || reversingLine?.recipient_name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Void this payment and update the linked Expense Log entry.
            </p>
          </div>
        }
        body={
          <div className="space-y-4 pb-4">
            <div className="p-3 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              This will set status to <strong>Voided</strong>, deduct{' '}
              <CurrencyDisplay amount={reversingLine?.amount || 0} showStyling={false} /> from the
              linked expense entry, and keep the record visible for audit.
            </div>

            <CustomInputTextField
              label="Reversal Reason *"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. MoMo transfer failed or sent in error"
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onCloseReverse} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmReverse} disabled={isSubmitting}>
                {isSubmitting ? 'Reversing...' : 'Confirm Reversal'}
              </Button>
            </div>
          </div>
        }
      />
    </>
  );
}
