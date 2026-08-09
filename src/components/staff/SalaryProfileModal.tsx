import React, { useState, useEffect } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface SalaryProfileModalProps {
  initialData?: any;
  staffList: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

const COMPENSATION_TYPES = [
  { value: 'monthly_salary', label: 'Monthly Base Salary' },
  { value: 'weekly_salary', label: 'Weekly Salary' },
  { value: 'hourly_rate', label: 'Hourly Rate' },
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash / Petty Cash' },
];

export default function SalaryProfileModal({
  initialData,
  staffList,
  onSuccess,
  onCancel,
}: SalaryProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: initialData?.staff_id || (staffList[0]?.id || ''),
    compensation_type: initialData?.compensation_type || 'monthly_salary',
    base_amount: initialData?.base_amount || '',
    payment_method: initialData?.payment_method || 'bank_transfer',
    account_number: initialData?.account_number || '',
    bank_or_momo_name: initialData?.bank_or_momo_name || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        staff_id: initialData.staff_id || '',
        compensation_type: initialData.compensation_type || 'monthly_salary',
        base_amount: initialData.base_amount || '',
        payment_method: initialData.payment_method || 'bank_transfer',
        account_number: initialData.account_number || '',
        bank_or_momo_name: initialData.bank_or_momo_name || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.base_amount || Number(formData.base_amount) <= 0) {
      toast.error('Please enter a valid base salary/rate');
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await apiClient.put(`/tenant/payroll/profile/${initialData.id}`, formData);
        toast.success('Salary profile updated');
      } else {
        await apiClient.post('/tenant/payroll/profile', formData);
        toast.success('Salary profile saved');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save salary profile error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save salary profile');
    } finally {
      setLoading(false);
    }
  };

  const staffOptions = staffList.map((s) => ({
    value: s.id,
    label: `${s.name || s.full_name || s.first_name} (${s.role || 'Staff'})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 px-2">
      {!initialData && (
        <CustomSelectField
          label="Select Staff Member"
          options={staffOptions}
          value={formData.staff_id}
          inputProps={{
            name: 'staff_id',
            onChange: (e) => setFormData((prev) => ({ ...prev, staff_id: e.target.value })),
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomSelectField
          label="Compensation Structure"
          options={COMPENSATION_TYPES}
          value={formData.compensation_type}
          inputProps={{
            name: 'compensation_type',
            onChange: (e) => setFormData((prev) => ({ ...prev, compensation_type: e.target.value })),
          }}
        />

        <CustomInputTextField
          label="Base Amount"
          name="base_amount"
          type="number"
          step="0.01"
          value={formData.base_amount}
          onChange={handleChange}
          required
          placeholder="0.00"
        />
      </div>

      <CustomSelectField
        label="Disbursal Payment Method"
        options={PAYMENT_METHODS}
        value={formData.payment_method}
        inputProps={{
          name: 'payment_method',
          onChange: (e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value })),
        }}
      />

      {formData.payment_method !== 'cash' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomInputTextField
            label={formData.payment_method === 'bank_transfer' ? 'Bank Name' : 'MoMo Provider (e.g. MTN/Telecel)'}
            name="bank_or_momo_name"
            value={formData.bank_or_momo_name}
            onChange={handleChange}
            placeholder={formData.payment_method === 'bank_transfer' ? 'e.g. GCB Bank' : 'e.g. MTN Mobile Money'}
          />

          <CustomInputTextField
            label={formData.payment_method === 'bank_transfer' ? 'Account Number' : 'MoMo Phone Number'}
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            placeholder={formData.payment_method === 'bank_transfer' ? '1234567890' : '0240000000'}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Profile' : 'Save Salary Profile'}
        </Button>
      </div>
    </form>
  );
}
