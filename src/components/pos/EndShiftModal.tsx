import React, { useState, useEffect } from 'react';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyDisplay } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useShift } from '@/hooks/useShift';
import apiClient from '@/api/client';
import { Clock, Activity, CreditCard, Smartphone, Banknote, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/spinner';

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
  const shiftStartTime = activeShift?.opened_at ? new Date(activeShift.opened_at) : new Date();

  const totalTransactions = activeShift?.total_transactions ?? 0;
  const cardAmount = activeShift?.payment_breakdown?.card?.total ?? 0;
  const momoAmount = activeShift?.payment_breakdown?.mobile_money?.total ?? 0;

  const actualCash = parseFloat(debouncedCashStr) || 0;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0 && debouncedCashStr !== '';

  const handleEndShift = async () => {
    if (actualCashStr === '') {
      toast.error('Please enter the actual cash amount in drawer.');
      return;
    }

    if (hasDiscrepancy && !notes.trim()) {
      toast.error('Please provide a note for the cash discrepancy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const closed = await closeShift(actualCash, notes.trim());
      if (closed) {
        toast.success('Shift ended successfully.');
        onClose();
        navigate('/pos/locked');
      }
    } catch (error) {
      console.error('End shift failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedStartTime = shiftStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedEndTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
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
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-md mt-1">
              <div className="flex justify-between items-center">
                 <span className="text-sm font-bold text-emerald-600 flex items-center gap-2"><Banknote className="h-4 w-4" /> Expected Cash</span>
                 <span className="text-lg font-bold text-emerald-600">
                   {isLoadingSummary ? <Spinner/> : <CurrencyDisplay amount={expectedCash} />}
                 </span>
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
                label="Actual Cash in Drawer"
                labelPlacement="outside"
                placeholder="0.00"
                value={actualCashStr}
                onChange={(e: any) => setActualCashStr(e.target.value)}
                className="h-14 text-lg font-bold"
                autoFocus
              />
              <p className="text-xs text-muted-foreground font-medium pl-1">
                Count the physical cash in your till and enter the total amount.
              </p>
            </div>

            {/* Discrepancy Display */}
            {debouncedCashStr !== '' && (
              <div className={`p-4 rounded-md border ${
                  discrepancy === 0 ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                  discrepancy > 0 ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' :
                  'bg-red-500/10 border-red-500/30 text-red-600'
                }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase">Status</span>
                  <span className="text-sm font-bold">
                    {discrepancy === 0 ? 'Balanced' : discrepancy > 0 ? 'Over' : 'Short'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Difference</span>
                  <span className="text-xl font-black">
                    {discrepancy > 0 ? '+' : ''}<CurrencyDisplay amount={discrepancy} />
                  </span>
                </div>
              </div>
            )}

            {/* Notes Field (Required if discrepancy) */}
            <div className={`transition-all duration-300 ${hasDiscrepancy && debouncedCashStr !== '' ? 'opacity-100 max-h-32' : 'opacity-50 max-h-32'}`}>
              <Textarea
                label={`Discrepancy Note ${hasDiscrepancy ? '*' : ''}`}
                labelPlacement="outside"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for overage/shortage..."
                textareaClassName="bg-background focus:ring-primary/50"
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
            disabled={isSubmitting || actualCashStr === '' || (hasDiscrepancy && !notes.trim())}
            className="rounded-full font-bold px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
          >
            {isSubmitting ? 'Ending Shift...' : 'Confirm & End Shift'}
          </Button>
        </div>
      }
    />
  );
}
