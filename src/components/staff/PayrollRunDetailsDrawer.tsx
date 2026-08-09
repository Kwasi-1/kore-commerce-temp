import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { format } from 'date-fns';
import {
  Calendar,
  User,
  Pencil,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  XCircle,
} from 'lucide-react';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface PayrollRunDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  run: any;
  onRefresh: () => void;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
];

export default function PayrollRunDetailsDrawer({
  isOpen,
  onClose,
  run,
  onRefresh,
}: PayrollRunDetailsDrawerProps) {
  const [editingLine, setEditingLine] = useState<any>(null);
  const [reversingLine, setReversingLine] = useState<any>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<string>('bank_transfer');
  const [editNote, setEditNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!run) return null;

  const items = run.items || [];

  const handleOpenEdit = (item: any) => {
    setEditingLine(item);
    setEditAmount(item.amount?.toString() || '');
    setEditMethod(item.payment_method || 'bank_transfer');
    setEditNote(item.note || '');
    setActionReason('');
  };

  const handleOpenReverse = (item: any) => {
    setReversingLine(item);
    setActionReason('');
  };

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
      toast.success('Disbursal line updated');
      setEditingLine(null);
      onRefresh();
    } catch (error: any) {
      console.error('Update disbursal line error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update line item');
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
      toast.success('Payment line reversed & expense voided');
      setReversingLine(null);
      onRefresh();
    } catch (error: any) {
      console.error('Reverse line error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to reverse line item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'recipient', label: 'Recipient' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Payment Method' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  const rows = items.map((item: any) => {
    const isVoided = item.status === 'voided';

    return {
      id: item.id,
      recipient: (
        <div className="flex flex-col min-w-[100px]">
          <span className={`font-semibold ${isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.staff_name || item.recipient_name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.is_off_platform ? (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                External Staff
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground hidden">
                Platform Staff
              </span>
            )}
            {item.note && <span className="text-[10px] text-muted-foreground italic">({item.note})</span>}
          </div>
        </div>
      ),
      amount: (
        <span className={`font-bold ${isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          <CurrencyDisplay amount={item.amount} showStyling={false} />
        </span>
      ),
      method: (
        <span className="capitalize text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
          {item.payment_method?.replace(/_/g, ' ') || 'Cash'}
        </span>
      ),
      status: isVoided ? (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-400/10 text-rose-600 dark:text-rose-400">
            <XCircle className="h-3 w-3" /> Voided
          </span>
          {item.reversal_reason && (
            <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]" title={item.reversal_reason}>
              {item.reversal_reason}
            </span>
          )}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-green-400/10 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" /> Logged
        </span>
      ),
      actions: !isVoided ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEdit(item)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Edit Line"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenReverse(item)}
            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            title="Reverse Line"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">—</span>
      ),
    };
  });

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[560px]" }}
        header={
          <div className="pt-3 px-2 border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{run.pay_period} Payroll Run</h2>
              <p className="text-xs text-muted-foreground font-normal">
                Disbursed on {run.disbursal_date ? format(new Date(run.disbursal_date), 'MMM dd, yyyy') : '—'} by {run.created_by_name || 'System'}
              </p>
            </div>
            {run.status === 'logged' ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-green-400/10 text-green-600 dark:text-green-400">
                Logged
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-600 dark:text-amber-400">
                {run.recipients_count} Logged • {run.total_recipients_count - run.recipients_count} Voided
              </span>
            )}
          </div>
        }
        body={
          <div className="space-y-4 pb-4">
            {/* Aggregate Active Total Banner */}
            <div className="p-4 rounded-md bg-card border border-border flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net Active Payout</span>
                <div className="text-2xl font-extrabold text-foreground mt-0.5">
                  <CurrencyDisplay amount={run.total_amount || 0} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {run.recipients_count} Active Recipients ({run.platform_count} Platform • {run.external_count} External)
                </span>
              </div>
            </div>

            {/* Recipients Line-Item Table */}
            <div>
              <h3 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Line Items Breakdown ({items.length})
              </h3>

              <EnhancedTableComponent
                columns={columns}
                rows={rows}
                isLoading={false}
                showTopContent={false}
                title=""
                showSearch={false}
                showFilter={false}
                showAddButton={false}
                containerStyles="min-h-[220px] max-h-[340px] overflow-y-auto px-2 py-0"
                emptyStateTitle="No line items found"
                emptyStateDescription="No recipients recorded for this payroll run."
                mobileFriendly={true}
              />
            </div>
          </div>
        }
      />

      {/* Modal: Edit Line Item */}
      <CustomModal
        isOpen={Boolean(editingLine)}
        onOpenChange={() => setEditingLine(null)}
        placement="center"
        size="md"
        header={
          <div className="pt-2">
            <h3 className="text-lg font-bold">Edit Payout Line — {editingLine?.staff_name}</h3>
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
              <Button variant="outline" onClick={() => setEditingLine(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      />

      {/* Modal: Reverse Line Item */}
      <CustomModal
        isOpen={Boolean(reversingLine)}
        onOpenChange={() => setReversingLine(null)}
        placement="center"
        size="md"
        header={
          <div className="pt-2">
            <h3 className="text-lg font-bold text-rose-600">Reverse Payment — {reversingLine?.staff_name}</h3>
            <p className="text-xs text-muted-foreground">Void this payment line and deduct amount from payroll run total.</p>
          </div>
        }
        body={
          <div className="space-y-4 pb-4">
            <div className="p-3 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              This will set status to <strong>Voided</strong>, deduct <CurrencyDisplay amount={reversingLine?.amount || 0} showStyling={false} /> from this run, and void the linked Expense Log entry.
            </div>

            <CustomInputTextField
              label="Reversal Reason *"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. MoMo transfer failed or sent in error"
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setReversingLine(null)} disabled={isSubmitting}>
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
