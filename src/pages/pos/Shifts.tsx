import React, { useState, useEffect } from 'react';
import { useShift } from '@/hooks/useShift';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import { Clock, DollarSign, PlayCircle, StopCircle, Receipt, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Shifts() {
  const { currentShift, isLoading, openShift, closeShift, refreshShift } = useShift();
  const staffUser = useAuthStore((state) => state.staffUser);
  const navigate = useNavigate();

  const [openingFloatStr, setOpeningFloatStr] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // Close shift modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingCountStr, setClosingCountStr] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  
  // Variance modal state
  const [closedShiftResult, setClosedShiftResult] = useState<any>(null);

  // Report data state for open shift
  const [txCount, setTxCount] = useState<number>(0);

  useEffect(() => {
    if (currentShift) {
      // Fetch transaction count from report
      apiClient.get(`/pos/shifts/${currentShift.id}/report`)
        .then((res) => {
          const breakdown = res.data.success.data.payment_breakdown;
          const totalCount = Object.values(breakdown).reduce((acc: number, curr: any) => acc + curr.count, 0);
          setTxCount(Number(totalCount));
        })
        .catch((err) => console.error("Failed to load shift report", err));
    }
  }, [currentShift]);

  const handleOpenShift = async () => {
    const floatVal = parseFloat(openingFloatStr);
    if (isNaN(floatVal) || floatVal < 0) {
      toast.error('Please enter a valid opening float');
      return;
    }
    setIsOpening(true);
    const success = await openShift(floatVal);
    if (success) {
      setOpeningFloatStr('');
      navigate('/pos/register'); // Optionally navigate to register after opening
    }
    setIsOpening(false);
  };

  const handleCloseShift = async () => {
    const countVal = parseFloat(closingCountStr);
    if (isNaN(countVal) || countVal < 0) {
      toast.error('Please enter a valid closing count');
      return;
    }
    
    setIsClosing(true);
    const result = await closeShift(countVal);
    setIsClosing(false);
    
    if (result) {
      setIsCloseModalOpen(false);
      setClosedShiftResult(result);
      setClosingCountStr('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <h1 className="text-2xl font-bold text-foreground mb-8">Shift Management</h1>

        {!currentShift && !closedShiftResult ? (
          /* Open Shift Card */
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <PlayCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Start New Shift</h2>
                <p className="text-sm text-muted-foreground">Enter the starting cash in drawer</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Float (GHS)
                </label>
                <input
                  type="number"
                  value={openingFloatStr}
                  onChange={(e) => setOpeningFloatStr(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  className="w-full px-4 py-3 text-lg bg-muted border border-border rounded-lg focus:ring-primary focus:border-primary transition-colors text-foreground"
                />
              </div>

              <button
                onClick={handleOpenShift}
                disabled={isOpening}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isOpening ? 'Starting...' : 'Start Shift'}
              </button>
            </div>
          </div>
        ) : currentShift ? (
          /* Active Shift Summary */
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 bg-primary/5 border-b border-border flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <h2 className="font-semibold text-foreground">Shift in Progress</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Cashier: <span className="font-medium text-foreground">{staffUser?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="flex items-center gap-2 py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-semibold rounded-lg shadow-sm active:scale-95 transition-all border border-red-100 dark:border-red-900/30"
              >
                <StopCircle className="h-4 w-4" />
                End Shift
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Started At
                </span>
                <p className="text-lg font-medium text-foreground">
                  {new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Receipt className="h-4 w-4" /> Transactions
                </span>
                <p className="text-lg font-medium text-foreground">
                  {txCount} completed
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Opening Float</span>
                <p className="text-lg font-medium text-foreground">
                  GHS {currentShift.opening_float?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="space-y-1 p-3 bg-muted rounded-lg border border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Expected Cash in Drawer
                </span>
                <p className="text-xl font-bold text-foreground">
                  GHS {currentShift.current_expected_cash?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-border text-center">
               <button
                onClick={() => navigate('/pos/register')}
                className="text-primary hover:underline font-medium"
               >
                 Return to Register &rarr;
               </button>
            </div>
          </div>
        ) : null}

        {/* Closed Shift Summary (Variance) */}
        {closedShiftResult && !currentShift && (
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 bg-muted border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Shift Closed</h2>
              <p className="text-sm text-muted-foreground mt-1">Summary of the completed shift</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Expected Cash</span>
                <span className="font-medium text-foreground">GHS {closedShiftResult.expected_cash?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Actual Count</span>
                <span className="font-medium text-foreground">GHS {closedShiftResult.closing_count?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Variance</span>
                <span className={`font-bold ${
                  (closedShiftResult.variance || 0) < 0 ? 'text-red-500' 
                  : (closedShiftResult.variance || 0) > 0 ? 'text-yellow-500' 
                  : 'text-green-500'
                }`}>
                  {closedShiftResult.variance > 0 ? '+' : ''}{closedShiftResult.variance?.toFixed(2)}
                </span>
              </div>
              <div className="pt-4 mt-4 border-t border-border">
                <button
                  onClick={() => {
                    setClosedShiftResult(null);
                    refreshShift();
                  }}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-muted dark:hover:bg-gray-800 text-foreground font-medium rounded-lg transition-colors"
                >
                  Start New Shift
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Close Shift Modal */}
      {isCloseModalOpen && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-card text-card-foreground w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">End Shift</h2>
              <button 
                onClick={() => setIsCloseModalOpen(false)}
                disabled={isClosing}
                className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/30">
                Count the physical cash in your drawer and enter the total amount below.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Cash Count (GHS)
                </label>
                <input
                  type="number"
                  value={closingCountStr}
                  onChange={(e) => setClosingCountStr(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:ring-primary focus:border-primary text-foreground"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-3 bg-muted">
              <button 
                onClick={() => setIsCloseModalOpen(false)}
                disabled={isClosing}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-card text-card-foreground dark:text-gray-200 dark:border-border dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleCloseShift}
                disabled={isClosing || !closingCountStr}
                className="flex-1 py-2 px-4 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isClosing ? 'Closing...' : 'Close Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
