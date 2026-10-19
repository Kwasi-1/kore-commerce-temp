import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import type { ProductGroup } from '../types';

export interface ProductGroupInput {
  name: string;
  description?: string | null;
  product_ids: string[];
  variant_ids: string[];
}

const errorMessage = (error: any, fallback: string) => error?.response?.data?.error?.message || fallback;

export function useProductGroups() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/product-groups');
      setGroups(response.data?.success?.data?.groups || []);
    } catch (error) {
      console.error('Failed to fetch product groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(
    async (input: ProductGroupInput): Promise<ProductGroup | null> => {
      try {
        const response = await apiClient.post('/tenant/product-groups', input);
        const group = response.data?.success?.data?.group || null;
        toast.success(`Group "${input.name}" saved`);
        await fetchGroups();
        return group;
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to save group'));
        return null;
      }
    },
    [fetchGroups],
  );

  const updateGroup = useCallback(
    async (id: string, input: ProductGroupInput): Promise<ProductGroup | null> => {
      try {
        const response = await apiClient.patch(`/tenant/product-groups/${id}`, input);
        toast.success('Group updated');
        await fetchGroups();
        return response.data?.success?.data?.group || null;
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to update group'));
        return null;
      }
    },
    [fetchGroups],
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/tenant/product-groups/${id}`);
        toast.success('Group deleted');
        await fetchGroups();
        return true;
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to delete group'));
        return false;
      }
    },
    [fetchGroups],
  );

  return { groups, isLoading, fetchGroups, createGroup, updateGroup, deleteGroup };
}
