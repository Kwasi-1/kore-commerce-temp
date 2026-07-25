import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyDisplay } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useShift } from '@/hooks/useShift';
import apiClient from '@/api/client';
import { Clock, Activity, CreditCard, Smartphone, Banknote, ShieldAlert, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/spinner';
import ZReportModal from './ZReportModal';

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EndShiftModal({ isOpen, onClose }: EndShiftModalProps) {
  const { staffUser } = useAuthStore();
  const { currentShift, closeShift, refreshShift } = useShift();
  const navigate = useNavigate();
  
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [actualCashStr, setActualCashStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedCashStr, setDebouncedCashStr] = useState('');

  // Fetch live summary whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActualCashStr('');
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCashStr(actualCashStr);
    }, 400);
    return () => clearTimeout(handler);
  }, [actualCashStr]);

  const activeShift = shiftSummary || currentShift;
  const expectedCash = activeShift?.current_expected_cash ?? activeShift?.expected_cash ?? activeShift?.opening_float ?? 0;

  const totalTransactions = activeShift?.total_transactions ?? 0;
  const cardAmount = activeShift?.payment_breakdown?.card?.total ?? 0;
  const momoAmount = activeShift?.payment_breakdown?.mobile_money?.total ?? 0;

  const actualCash = parseFloat(debouncedCashStr) || 0;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0 && debouncedCashStr !== '';

  const [closedShiftId, setClosedShiftId] = useState<string | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  const handleEndShift = async () => {
    if (actualCashStr === '') {
      toast.error('Please enter the actual cash amount in drawer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const closed = await closeShift(actualCash, notes.trim());
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

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="4xl"
        header={
          <div className="flex items-center gap-3 pb-2 border-b border-border/50">
            <div>
              <h3 className="text-xl font-bold">End Shift & Recon</h3>
              <p className="text-xs font-semibold text-muted-foreground">Verify totals and close your current session.</p>
            </div>
          </div>
        }
        body={
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            
            {/* Left Column: Shift Summary */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Shift Summary
              </h4>
              
              <div className="p-4 rounded-md flex flex-col gap-3 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Shift Time</span>
                  <span className="text-sm font-bold">{formattedStartTime} - {formattedEndTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">Total Transactions</span>
                  <span className="text-sm font-bold">{isLoadingSummary ? <Spinner/> : totalTransactions}</span>
                </div>
              </div>

              <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mt-2">Payment Breakdown</h4>
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-card p-3 rounded-md flex flex-col gap-1 border border-border/60">
                   <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-blue-500" /> Card</span>
                   <span className="text-sm font-bold"><CurrencyDisplay amount={cardAmount} /></span>
                 </div>
                 <div className="bg-card p-3 rounded-md flex flex-col gap-1 border border-border/60">
                   <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-yellow-500" /> Mobile Money</span>
                   <span className="text-sm font-bold"><CurrencyDisplay amount={momoAmount} /></span>
                 </div>
              </div>
              
              <div className="bg-muted/40 border border-border/60 p-4 rounded-xl mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                   <Banknote className="h-4 w-4 text-primary" />
                   <span>Expected Cash</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/60 shadow-xs">
                  <EyeOff className="h-3.5 w-3.5" /> Blind Recon
                </div>
              </div>
            </div>

            {/* Right Column: Input & Discrepancy */}
            <div className="flex flex-col gap-5 border-t md:border-t-0 md:border-l border-border/50 pt-6 md:pt-0 md:pl-6">
              <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Cash Reconciliation
              </h4>

              <div className="flex flex-col gap-1 mt-1">
                <CustomInputTextField
                  type="number"
                  label="Actual Cash in Drawer *"
                  labelPlacement="outside"
                  placeholder="0.00"
                  value={actualCashStr}
                  onChange={(e: any) => setActualCashStr(e.target.value)}
                  className="h-14 text-lg font-bold"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground font-medium pl-1">
                  Count physical cash in till and enter total. Expected cash is hidden for blind audit.
                </p>
              </div>

              {/* Notes Field */}
              <div className="flex flex-col gap-1.5">
                <Textarea
                  label="Closing Notes (Optional)"
                  labelPlacement="outside"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific context or remarks for this shift..."
                  textareaClassName="bg-background focus:ring-primary/50"
                  rows={3}
                />
              </div>
            </div>
            
          </div>
        }
        footer={
          <div className="flex justify-between w-full pt-4 border-t border-border/50">
            <Button variant="ghost" onClick={onClose} className="rounded-full font-bold px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleEndShift} 
              disabled={isSubmitting || actualCashStr === ''}
              className="rounded-full font-bold px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
            >
              {isSubmitting ? 'Ending Shift...' : 'Confirm & End Shift'}
            </Button>
          </div>
        }
      />

      <ZReportModal
        isOpen={isZReportOpen}
        onClose={() => {
          setIsZReportOpen(false);
          navigate('/pos/locked');
        }}
        shiftId={closedShiftId}
      />
    </>
  );
}
