import React, { useState, useEffect } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import {
  getMoMoNetworkOptions,
  getBankOptions,
  saveCustomMoMoNetwork,
  saveCustomBank,
} from '@/utils/paymentProviders';

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

const COMPENSATION_TYPES = [
  { value: 'monthly_salary', label: 'Monthly Base Salary' },
  { value: 'weekly_salary', label: 'Weekly Salary' },
  { value: 'hourly_rate', label: 'Hourly / Day Rate' },
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
    compensation_type: 'monthly_salary',
    base_salary: '',
    payment_method: 'mobile_money',
    account_number: '',
    bank_or_momo_name: 'MTN Mobile Money',
  });

  const [providerSelect, setProviderSelect] = useState<string>('MTN Mobile Money');
  const [customProviderInput, setCustomProviderInput] = useState<string>('');

  const providerOptions =
    formData.payment_method === 'bank_transfer' ? getBankOptions() : getMoMoNetworkOptions();

  // Reset default provider when payment method changes
  useEffect(() => {
    if (formData.payment_method === 'bank_transfer') {
      setProviderSelect('Ecobank Ghana');
      setFormData((prev) => ({ ...prev, bank_or_momo_name: 'Ecobank Ghana' }));
    } else if (formData.payment_method === 'mobile_money') {
      setProviderSelect('MTN Mobile Money');
      setFormData((prev) => ({ ...prev, bank_or_momo_name: 'MTN Mobile Money' }));
    } else {
      setProviderSelect('');
      setFormData((prev) => ({ ...prev, bank_or_momo_name: '' }));
    }
    setCustomProviderInput('');
  }, [formData.payment_method]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProviderSelectChange = (val: string) => {
    setProviderSelect(val);
    if (val === 'other') {
      setFormData((prev) => ({ ...prev, bank_or_momo_name: customProviderInput }));
    } else {
      setFormData((prev) => ({ ...prev, bank_or_momo_name: val }));
    }
  };

  const handleCustomProviderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomProviderInput(val);
    setFormData((prev) => ({ ...prev, bank_or_momo_name: val }));
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

    // Save custom provider to local persistence if added via 'other'
    if (providerSelect === 'other' && customProviderInput.trim()) {
      if (formData.payment_method === 'bank_transfer') {
        saveCustomBank(customProviderInput.trim());
      } else if (formData.payment_method === 'mobile_money') {
        saveCustomMoMoNetwork(customProviderInput.trim());
      }
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
          value={formData.role_title}
          inputProps={{
            name: 'role_title',
            onChange: (e) => setFormData((prev) => ({ ...prev, role_title: e.target.value })),
          }}
        />

        <CustomSelectField
          label="Compensation Structure"
          options={COMPENSATION_TYPES}
          value={formData.compensation_type}
          inputProps={{
            name: 'compensation_type',
            onChange: (e) => setFormData((prev) => ({ ...prev, compensation_type: e.target.value })),
          }}
        />
      </div>

      <CustomInputTextField
        label="Base Compensation Pay"
        name="base_salary"
        type="number"
        step="0.01"
        value={formData.base_salary}
        onChange={handleChange}
        required
        placeholder="0.00"
      />

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelectField
              label={formData.payment_method === 'bank_transfer' ? 'Bank Name' : 'MoMo Network'}
              options={providerOptions}
              value={providerSelect}
              inputProps={{
                onChange: (e) => handleProviderSelectChange(e.target.value),
              }}
            />

            <CustomInputTextField
              label={formData.payment_method === 'bank_transfer' ? 'Account Number' : 'MoMo Number'}
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              placeholder="0240000000"
            />
          </div>

          {providerSelect === 'other' && (
            <CustomInputTextField
              label={formData.payment_method === 'bank_transfer' ? 'Custom Bank Name' : 'Custom MoMo Network Name'}
              name="custom_provider"
              value={customProviderInput}
              onChange={handleCustomProviderInputChange}
              required
              placeholder={formData.payment_method === 'bank_transfer' ? 'e.g. Zenith Bank' : 'e.g. ExpressPay'}
            />
          )}
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
