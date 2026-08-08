import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface AddOffPlatformStaffModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLES = [
  { value: 'Cleaner / Janitor', label: 'Cleaner / Janitor' },
  { value: 'Security Guard', label: 'Security Guard' },
  { value: 'Driver / Logistics', label: 'Driver / Logistics' },
  { value: 'Maintenance Contractor', label: 'Maintenance Contractor' },
  { value: 'Consultant / Retainer', label: 'Consultant / Retainer' },
  { value: 'Other External Staff', label: 'Other External Staff' },
];

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash / Hand-to-Hand' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function AddOffPlatformStaffModal({
  onSuccess,
  onCancel,
}: AddOffPlatformStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role_title: 'Cleaner / Janitor',
    base_salary: '',
    payment_method: 'mobile_money',
    account_number: '',
    bank_or_momo_name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Please enter the full name');
      return;
    }
    if (!formData.base_salary || Number(formData.base_salary) <= 0) {
      toast.error('Please enter a valid base pay amount');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/tenant/payroll/off-platform-staff', formData);
      toast.success('External staff added to payroll');
      onSuccess();
    } catch (error: any) {
      console.error('Add external staff error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to add external staff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 px-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomInputTextField
          label="Full Name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          required
          placeholder="e.g. Yaw Osei"
        />

        <CustomInputTextField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g. 0241234567"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomSelectField
          label="Role / Title"
          options={ROLES}
          selectedKey={formData.role_title}
          inputProps={{
            name: 'role_title',
            onChange: (e) => setFormData((prev) => ({ ...prev, role_title: e.target.value })),
          }}
        />

        <CustomInputTextField
          label="Base Monthly / Contract Pay"
          name="base_salary"
          type="number"
          step="0.01"
          value={formData.base_salary}
          onChange={handleChange}
          required
          placeholder="0.00"
        />
      </div>

      <CustomSelectField
        label="Disbursal Payment Method"
        options={PAYMENT_METHODS}
        selectedKey={formData.payment_method}
        inputProps={{
          name: 'payment_method',
          onChange: (e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value })),
        }}
      />

      {formData.payment_method !== 'cash' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomInputTextField
            label={formData.payment_method === 'bank_transfer' ? 'Bank Name' : 'MoMo Network'}
            name="bank_or_momo_name"
            value={formData.bank_or_momo_name}
            onChange={handleChange}
            placeholder={formData.payment_method === 'bank_transfer' ? 'e.g. Ecobank' : 'e.g. MTN MoMo'}
          />

          <CustomInputTextField
            label={formData.payment_method === 'bank_transfer' ? 'Account Number' : 'MoMo Number'}
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            placeholder="0240000000"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add External Staff'}
        </Button>
      </div>
    </form>
  );
}
