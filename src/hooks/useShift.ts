import { useEffect } from 'react';
import { create } from 'zustand';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export interface Shift {
  id: string;
  cashier_id: string;
  tenant_id: string;
  status: string;
  opening_float: number;
  expected_cash: number | null;
  closing_count: number | null;
  variance: number | null;
  opened_at: string;
  closed_at: string | null;
  current_expected_cash?: number; // Provided by /current
}

/**
 * The signed-in person's current shift, shared by every part of the register (page, header,
 * search, End Shift). Each used to keep its own copy, so starting a shift only updated the one
 * that opened it and the rest needed a page reload.
 */
interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;
  setCurrentShift: (shift: Shift | null) => void;
  fetchCurrentShift: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

const useShiftStore = create<ShiftState>((set) => ({
  currentShift: null,
  isLoading: true,
  setCurrentShift: (currentShift) => set({ currentShift }),
  // Components mounting together share one request
  fetchCurrentShift: () => {
    if (inFlight) return inFlight;
    set({ isLoading: true });
    inFlight = (async () => {
      try {
        const response = await apiClient.get('/pos/shifts/current');
        const data = response.data.success?.data;
        set({ currentShift: data?.shift || null });

        // Server auto-closed a stale previous-day shift — notify the cashier
        if (data?.stale_shift_closed) {
          toast('Your previous shift was auto-closed. Please open a new shift to continue.', {
            icon: '⚠️',
            duration: 6000,
          });
        }
      } catch (error) {
        console.error('Failed to fetch current shift:', error);
        set({ currentShift: null });
      } finally {
        set({ isLoading: false });
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

// A different person signed in on this till: their shift isn't the last person's
useAuthStore.subscribe((state, prev) => {
  if (state.staffUser?.id !== prev.staffUser?.id) {
    useShiftStore.setState({ currentShift: null, isLoading: true });
  }
});

export function useShift() {
  const currentShift = useShiftStore((s) => s.currentShift);
  const isLoading = useShiftStore((s) => s.isLoading);
  const fetchCurrentShift = useShiftStore((s) => s.fetchCurrentShift);
  const setCurrentShift = useShiftStore((s) => s.setCurrentShift);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  // breakdown: the count by notes and coins, when that setting is on (the server totals it)
  const openShift = async (openingFloat: number, breakdown?: Record<string, number>) => {
    try {
      const response = await apiClient.post('/pos/shifts/open', {
        opening_float: openingFloat,
        ...(breakdown ? { opening_breakdown: breakdown } : {}),
      });
      setCurrentShift(response.data.success.data.shift);
      toast.success('Shift opened successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to open shift:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to open shift');
      return false;
    }
  };

  const closeShift = async (closingCount: number, notes?: string, breakdown?: Record<string, number>) => {
    try {
      const response = await apiClient.post('/pos/shifts/close', {
        closing_count: closingCount,
        notes: notes,
        ...(breakdown ? { closing_breakdown: breakdown } : {}),
      });
      const closedShift = response.data.success.data.shift;
      setCurrentShift(null);

      // We could return the closed shift so the caller can show the variance
      return closedShift;
    } catch (error: any) {
      console.error('Failed to close shift:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to close shift');
      return null;
    }
  };

  return {
    currentShift,
    isLoading,
    openShift,
    closeShift,
    refreshShift: fetchCurrentShift,
  };
}
