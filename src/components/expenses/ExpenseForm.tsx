import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface ExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { label: 'Rent', value: 'rent' },
  { label: 'Utilities', value: 'utilities' },
  { label: 'Salaries', value: 'salaries' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Software', value: 'software' },
  { label: 'Taxes', value: 'taxes' },
  { label: 'Other', value: 'other' }
];

export default function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date_incurred: new Date().toISOString().split('T')[0],
    receipt_url: '' // Will hook up to Cloudinary later
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData(prev => ({ ...prev, category: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Please select an expense category');
      return;
    }
    if (!formData.description) {
      toast.error('Description is required');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date_incurred: new Date(formData.date_incurred).toISOString(),
        receipt_url: formData.receipt_url || null
      };

      await apiClient.post('/tenant/expenses', payload);
      toast.success('Expense logged successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Log expense error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to log expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white p-6 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-2">
        
        <CustomSelectField
          label="Expense Category"
          options={CATEGORIES}
          value={formData.category}
          inputProps={{
            onSelectionChange: handleCategorySelect
          }}
          required
          placeholder="Select category"
        />

        <CustomInputTextField
          label="Amount (GHS)"
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          required
          placeholder="0.00"
          inputProps={{ min: "0", step: "0.01" }}
        />

        <CustomInputTextField
          label="Date Incurred"
          name="date_incurred"
          type="date"
          value={formData.date_incurred}
          onChange={handleChange}
          required
        />

        <CustomTextareaField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          placeholder="Brief description of the expense..."
          rows={3}
        />

        {/* Placeholder for receipt upload */}
        <div className="border-2 border-dashed border-border dark:border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <div className="text-muted-foreground mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground">Upload Receipt (Optional)</span>
          <span className="text-xs text-muted-foreground mt-1">Cloudinary integration pending</span>
        </div>

      </div>

      <div className="pt-4 border-t border-border dark:border-gray-800 flex justify-end gap-3 mt-auto">
        <Button 
          variant="flat" 
          onPress={onCancel}
          className="bg-gray-100 dark:bg-gray-800 text-gray-700 font-medium px-6"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          isLoading={isLoading}
          className="bg-primary text-primary-foreground font-bold px-6"
        >
          Log Expense
        </Button>
      </div>
    </form>
  );
}
