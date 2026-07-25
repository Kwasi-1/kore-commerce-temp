import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

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

export function useShift() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentShift = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pos/shifts/current');
      const data = response.data.success?.data;
      setCurrentShift(data?.shift || null);

      // Server auto-closed a stale previous-day shift — notify the cashier
      if (data?.stale_shift_closed) {
        toast('Your previous shift was auto-closed. Please open a new shift to continue.', {
          icon: '⚠️',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch current shift:', error);
      setCurrentShift(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const openShift = async (openingFloat: number) => {
    try {
      const response = await apiClient.post('/pos/shifts/open', {
        opening_float: openingFloat,
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

  const closeShift = async (closingCount: number, notes?: string) => {
    try {
      const response = await apiClient.post('/pos/shifts/close', {
        closing_count: closingCount,
        notes: notes,
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
