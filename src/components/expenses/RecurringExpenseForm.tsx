import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button, Switch } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Repeat, Calendar, DollarSign, Info } from 'lucide-react';

interface RecurringExpenseFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'utilities', label: 'Utilities (Electricity/Water)' },
  { value: 'rent', label: 'Rent & Lease' },
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'supplies', label: 'Office & Store Supplies' },
  { value: 'marketing', label: 'Marketing & Ads' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'other', label: 'Other Expenses' },
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'yearly', label: 'Yearly' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card / POS' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function RecurringExpenseForm({
  initialData,
  onSuccess,
  onCancel,
}: RecurringExpenseFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    category: initialData?.category || 'utilities',
    amount: initialData?.amount !== undefined ? String(initialData.amount) : '',
    frequency: initialData?.frequency || 'monthly',
    payment_method: initialData?.paymentMethod || initialData?.payment_method || 'cash',
    startDate: initialData?.startDate ? initialData.startDate.split('T')[0] : todayStr,
    auto_post: initialData?.autoPost !== undefined ? initialData.autoPost : true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCategorySelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData((prev) => ({ ...prev, category: val }));
  };

  const handleFrequencySelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData((prev) => ({ ...prev, frequency: val }));
  };

  const handlePaymentMethodSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData((prev) => ({ ...prev, payment_method: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        description: formData.description.trim(),
        category: formData.category,
        amount: numAmount,
        frequency: formData.frequency,
        payment_method: formData.payment_method,
        startDate: formData.startDate,
        auto_post: formData.auto_post,
      };

      if (isEditing) {
        await apiClient.put(`/tenant/expenses/recurring/${initialData.id}`, payload);
        toast.success('Recurring expense schedule updated');
      } else {
        await apiClient.post('/tenant/expenses/recurring', payload);
        toast.success('Recurring expense schedule created');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save recurring expense error:', error);
      toast.error(
        error.response?.data?.error?.message || 'Failed to save recurring expense'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-card pb-4 p-2 space-y-5">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-1">
        <CustomInputTextField
          label="Expense Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          placeholder="e.g. Monthly Shop Rent, Electricity Bill, Internet"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomSelectField
            label="Category"
            options={EXPENSE_CATEGORIES}
            selectedKey={formData.category}
            inputProps={{
              name: 'category',
              onChange: (e) => setFormData((prev) => ({ ...prev, category: e.target.value })),
            }}
          />

          <CustomInputTextField
            label="Estimated Amount"
            name="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={handleChange}
            required
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomSelectField
            label="Frequency"
            options={FREQUENCIES}
            selectedKey={formData.frequency}
            inputProps={{
              name: 'frequency',
              onChange: (e) => setFormData((prev) => ({ ...prev, frequency: e.target.value })),
            }}
          />

          <CustomSelectField
            label="Default Payment Method"
            options={PAYMENT_METHODS}
            selectedKey={formData.payment_method}
            inputProps={{
              name: 'payment_method',
              onChange: (e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value })),
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <CustomInputTextField
            label="First Billing / Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* Auto-Post Mode Settings Card */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Repeat className="h-4 w-4 text-primary" />
                Automatic Posting
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[340px]">
                {formData.auto_post
                  ? 'Automatically log this expense entry on its due date without manual action.'
                  : 'Receive a prompt on the due date to confirm or adjust the variable bill amount.'}
              </p>
            </div>
            <Switch
              isSelected={formData.auto_post}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, auto_post: val }))}
              color="primary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
        <Button
          type="button"
          variant="flat"
          onClick={onCancel}
          isDisabled={isLoading}
          className="font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          color="primary"
          isLoading={isLoading}
          className="font-bold px-6"
        >
          {isEditing ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  );
}
