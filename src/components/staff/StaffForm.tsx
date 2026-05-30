import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface StaffFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StaffForm({ initialData, onSuccess, onCancel }: StaffFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'cashier'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData(prev => ({ ...prev, role: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing) {
        // Backend only supports role update
        await apiClient.put(`/tenant/staff/${initialData.id}/role`, { role: formData.role });
        toast.success('Staff role updated');
      } else {
        if (!formData.email || !formData.password || !formData.first_name) {
          toast.error('First name, Email, and Password are required for new staff');
          setIsLoading(false);
          return;
        }
        await apiClient.post('/tenant/staff', formData);
        toast.success('Staff member created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save staff error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save staff member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-[#161616] p-6 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-2">
        
        {!isEditing && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <CustomInputTextField
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="Jane"
              />
              <CustomInputTextField
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
              />
            </div>

            <CustomInputTextField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="staff@example.com"
            />
          </>
        )}

        <CustomSelectField
          label="Role"
          options={[
            { label: 'Cashier', value: 'cashier' },
            { label: 'Manager', value: 'manager' },
            { label: 'Owner', value: 'owner' }
          ]}
          value={formData.role}
          inputProps={{
            onSelectionChange: handleRoleSelect
          }}
          required
        />

        {!isEditing && (
          <CustomInputTextField
            label="Initial Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Secure password"
            inputProps={{ minLength: 6 }}
          />
        )}

        {isEditing && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/30">
            <strong>Note:</strong> You can only update the role of existing staff members. To deactivate this user, use the deactivate button on the main table.
          </div>
        )}

      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-auto">
        <Button 
          variant="flat" 
          onPress={onCancel}
          className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-6"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          isLoading={isLoading}
          className="bg-pos-accent text-pos-accent-text font-bold px-6"
        >
          {isEditing ? 'Update Role' : 'Create Staff'}
        </Button>
      </div>
    </form>
  );
}
