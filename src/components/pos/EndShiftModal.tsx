import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyDisplay } from '@/hooks';
import { useShift } from '@/hooks/useShift';
import apiClient from '@/api/client';
import { EyeOff } from 'lucide-react';
import { Icon } from '@iconify/react';
import PaymentMethodVisual, { PaymentMethodType } from './PaymentMethodVisual';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/spinner';
import ZReportModal from './ZReportModal';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import CashCountInput from './CashCountInput';
import { CashCount, cashCountPayload, cashCountTotal } from '@/utils/cashCount';

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EndShiftModal({ isOpen, onClose }: EndShiftModalProps) {
  const { currentShift, closeShift } = useShift();
  const navigate = useNavigate();

  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [actualCashStr, setActualCashStr] = useState('');
  const byDenomination = useFeaturesStore((st) => !!st.posSettings?.pos_cash_count_by_denomination);
  const getEffectivePaymentMethods = useFeaturesStore((st) => st.getEffectivePaymentMethods);
  const [count, setCount] = useState<CashCount>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live summary whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActualCashStr('');
      setCount({});
      setNotes('');
      const loadSummary = async () => {
        setIsLoadingSummary(true);
        try {
          const res = await apiClient.get('/pos/shifts/current');
          setShiftSummary(res.data.success?.data?.shift || null);
        } catch (err) {
          console.error('Failed to load shift summary:', err);
        } finally {
          setIsLoadingSummary(false);
        }
      };
      loadSummary();
    }
  }, [isOpen]);

  const activeShift = shiftSummary || currentShift;

  const totalTransactions = activeShift?.total_transactions ?? 0;

  const actualCash = byDenomination ? cashCountTotal(count) : parseFloat(actualCashStr) || 0;

  const [closedShiftId, setClosedShiftId] = useState<string | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  const handleEndShift = async () => {
    if (!byDenomination && actualCashStr === '') {
      toast.error('Please enter the actual cash amount in drawer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const closed = byDenomination
        ? await closeShift(actualCash, notes.trim(), cashCountPayload(count))
        : await closeShift(actualCash, notes.trim());
      if (closed) {
        toast.success('Shift ended successfully.');
        setClosedShiftId(closed.id || activeShift?.id);
        onClose();
        setIsZReportOpen(true);
      }
    } catch (error) {
      console.error('End shift failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatShiftTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedStartTime = formatShiftTime(activeShift?.opened_at);
  const formattedEndTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const duration = (() => {
    if (!activeShift?.opened_at) return '';
    const mins = Math.max(0, Math.round((Date.now() - new Date(activeShift.opened_at).getTime()) / 60000));
    const h = Math.floor(mins / 60);
    return h ? `${h}h ${mins % 60}m` : `${mins}m`;
  })();

  // Payment breakdown: only the methods this store takes (plus any that had sales this shift).
  // Cash is counted blind, so its amount stays hidden.
  const breakdown = activeShift?.payment_breakdown || {};
  const line = (...keys: string[]) => keys.reduce(
    (acc, k) => ({ count: acc.count + (breakdown[k]?.count || 0), total: acc.total + (breakdown[k]?.total || 0) }),
    { count: 0, total: 0 },
  );
  const enabledMethods = getEffectivePaymentMethods();
  const methodRows = [
    { key: 'cash', label: 'Cash', on: enabledMethods.includes('cash'), ...line('cash') },
    { key: 'mobile_money', label: 'Mobile Money', on: enabledMethods.includes('mobile_money'), ...line('mobile_money', 'mobile_money_manual') },
    { key: 'card', label: 'Card', on: enabledMethods.includes('card'), ...line('card') },
    // Credit only when there were credit sales
    { key: 'credit', label: 'Credit', on: false, ...line('credit') },
  ].filter((m) => m.on || m.count > 0);

  const canSubmit = byDenomination || actualCashStr !== '';

  const notesField = (
    <Textarea
      label="Notes (optional)"
      labelPlacement="outside"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Anything the manager should know about this shift"
      textareaClassName="bg-background focus:ring-primary/50"
      rows={2}
    />
  );

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="3xl"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-3">
            <h3 className="text-lg font-bold text-foreground">End Shift</h3>
            <p className="text-[12px] font-normal text-muted-foreground mt-0.5">Count the cash in the drawer to close your shift.</p>
          </div>
        }
        body={
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 md:gap-6 pt-3 pb-1">

            {/* Shift summary */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border/70 divide-y divide-border/60 text-sm">
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-muted-foreground">Shift</span>
                  <span className="font-semibold tabular-nums text-right">
                    {formattedStartTime} – {formattedEndTime}
                    {duration && <span className="block text-[11px] font-normal text-muted-foreground">{duration}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-muted-foreground">Sales</span>
                  <span className="font-semibold tabular-nums">{isLoadingSummary ? <Spinner /> : totalTransactions}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 divide-y divide-border/60 text-sm">
                {methodRows.map((m) => (
                  <div key={m.key} className="flex items-center gap-3 px-3.5 py-2.5">
                    {m.key === 'credit' ? (
                      <span className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                        <Icon icon="solar:notebook-linear" className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <PaymentMethodVisual method={m.key as PaymentMethodType} size="md" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.count} sale{m.count === 1 ? '' : 's'}</p>
                    </div>
                    {m.key === 'cash' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground" title="Expected cash is hidden until you've counted">
                        <EyeOff className="h-3.5 w-3.5" /> Hidden
                      </span>
                    ) : (
                      <span className="font-semibold tabular-nums"><CurrencyDisplay amount={m.total} /></span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                Blind count: the cash you should have is shown on the Z report after you close.
              </p>

              {/* With the note-and-coin count the right side is full, so notes sit here (desktop) */}
              {byDenomination && <div className="hidden md:block">{notesField}</div>}
            </div>

            {/* Cash count */}
            <div className="flex flex-col gap-4 md:border-l md:border-border/50 md:pl-6">
              <div className="flex flex-col gap-1.5">
                {byDenomination ? (
                  <>
                    <span className="text-sm font-semibold text-foreground">Cash in drawer</span>
                    <CashCountInput value={count} onChange={setCount} />
                  </>
                ) : (
                  <CustomInputTextField
                    type="number"
                    label="Cash in drawer"
                    labelPlacement="outside"
                    placeholder="0.00"
                    value={actualCashStr}
                    onChange={(e: any) => setActualCashStr(e.target.value)}
                    className="h-14 text-lg font-bold"
                    autoFocus
                  />
                )}
                <p className="text-[11px] text-muted-foreground px-1">
                  {byDenomination ? 'Enter how many of each note and coin are in the till.' : 'Count all the cash in the till and enter the total.'}
                </p>
              </div>

              {/* On a phone the columns stack: notes come after the count */}
              <div className={byDenomination ? 'md:hidden' : ''}>{notesField}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full pt-3 border-t border-border/50">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-full font-semibold px-5">
              Cancel
            </Button>
            <Button
              onClick={handleEndShift}
              disabled={isSubmitting || !canSubmit}
              className="rounded-full font-semibold px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? 'Closing…' : 'End Shift'}
            </Button>
          </div>
        }
      />

      <ZReportModal
        isOpen={isZReportOpen}
        onClose={() => {
          setIsZReportOpen(false);
          // Lock the till instead of signing out: their PIN unlocks it, or someone else switches in
          useAuthStore.getState().lock();
          navigate('/pos/register');
        }}
        shiftId={closedShiftId}
      />
    </>
  );
}
