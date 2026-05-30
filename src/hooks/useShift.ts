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
      setCurrentShift(response.data.success?.data?.shift || null);
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

  const closeShift = async (closingCount: number) => {
    try {
      const response = await apiClient.post('/pos/shifts/close', {
        closing_count: closingCount,
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
