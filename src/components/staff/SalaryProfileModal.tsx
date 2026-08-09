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
    bank_or_momo_name: initialData?.bank_or_momo_name || 'Ecobank Ghana',
  });

  const [providerSelect, setProviderSelect] = useState<string>(
    initialData?.bank_or_momo_name || 'Ecobank Ghana'
  );
  const [customProviderInput, setCustomProviderInput] = useState<string>('');

  const providerOptions =
    formData.payment_method === 'bank_transfer' ? getBankOptions() : getMoMoNetworkOptions();

  useEffect(() => {
    if (initialData) {
      const initialBankOrMomo = initialData.bank_or_momo_name || '';
      setFormData({
        staff_id: initialData.staff_id || '',
        compensation_type: initialData.compensation_type || 'monthly_salary',
        base_amount: initialData.base_amount || '',
        payment_method: initialData.payment_method || 'bank_transfer',
        account_number: initialData.account_number || '',
        bank_or_momo_name: initialBankOrMomo,
      });

      // Check if initial provider is in standard options list
      const options =
        (initialData.payment_method || 'bank_transfer') === 'bank_transfer'
          ? getBankOptions()
          : getMoMoNetworkOptions();
      const inOptions = options.some((o) => o.value === initialBankOrMomo && o.value !== 'other');
      if (inOptions) {
        setProviderSelect(initialBankOrMomo);
        setCustomProviderInput('');
      } else if (initialBankOrMomo) {
        setProviderSelect('other');
        setCustomProviderInput(initialBankOrMomo);
      }
    }
  }, [initialData]);

  // Sync provider selection when payment_method changes manually
  const handlePaymentMethodChange = (method: string) => {
    setFormData((prev) => ({ ...prev, payment_method: method }));
    if (method === 'bank_transfer') {
      const defaultBank = 'Ecobank Ghana';
      setProviderSelect(defaultBank);
      setFormData((prev) => ({ ...prev, bank_or_momo_name: defaultBank }));
    } else if (method === 'mobile_money') {
      const defaultMoMo = 'MTN Mobile Money';
      setProviderSelect(defaultMoMo);
      setFormData((prev) => ({ ...prev, bank_or_momo_name: defaultMoMo }));
    } else {
      setProviderSelect('');
      setFormData((prev) => ({ ...prev, bank_or_momo_name: '' }));
    }
    setCustomProviderInput('');
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

  const selectedStaffObj = staffList.find((s) => s.id === formData.staff_id);
  const targetStaffName =
    initialData?.full_name ||
    initialData?.name ||
    (selectedStaffObj ? `${selectedStaffObj.first_name || ''} ${selectedStaffObj.last_name || ''}`.trim() || selectedStaffObj.name : '');
  const targetStaffRole =
    initialData?.role_title ||
    initialData?.role ||
    selectedStaffObj?.role ||
    'Staff';

  const staffOptions = staffList.map((s) => ({
    value: s.id,
    label: `${s.name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()} (${s.role || 'Staff'})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 px-2">
      {initialData || targetStaffName ? (
        <div className="p-3.5 rounded-md bg-muted/40 flex items-center justify-between shadow-2xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Staff Member</span>
          <div className="text-right">
            <span className="font-bold text-sm text-foreground block">{targetStaffName || 'Selected Staff'}</span>
            <span className="text-[11px] font-medium text-muted-foreground capitalize">{targetStaffRole}</span>
          </div>
        </div>
      ) : (
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
          onChange: (e) => handlePaymentMethodChange(e.target.value),
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
              label={formData.payment_method === 'bank_transfer' ? 'Account Number' : 'MoMo Phone Number'}
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              placeholder={formData.payment_method === 'bank_transfer' ? '1234567890' : '0240000000'}
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
          {loading ? 'Saving...' : initialData?.id ? 'Update Profile' : 'Save Salary Profile'}
        </Button>
      </div>
    </form>
  );
}
