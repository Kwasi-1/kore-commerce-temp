import React, { useState } from 'react';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface SupplierFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SupplierForm({ initialData, onSuccess, onCancel }: SupplierFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    contact_person: initialData?.contact_person || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    tax_id: initialData?.tax_id || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Supplier name is required');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        await apiClient.put(`/tenant/suppliers/${initialData.id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await apiClient.post('/tenant/suppliers', formData);
        toast.success('Supplier created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save supplier error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save supplier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white p-6 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-2">
        <CustomInputTextField
          label="Supplier / Company Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g. Acme Corp"
          inputProps={{ required: true }}
        />

        <CustomInputTextField
          label="Contact Person"
          name="contact_person"
          value={formData.contact_person}
          onChange={handleChange}
          placeholder="e.g. Jane Doe"
        />

        <div className="grid grid-cols-2 gap-4">
          <CustomInputTextField
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="supplier@example.com"
          />

          <CustomInputTextField
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+233 55 000 0000"
          />
        </div>

        <CustomInputTextField
          label="Tax ID / TIN"
          name="tax_id"
          value={formData.tax_id}
          onChange={handleChange}
          placeholder="Optional Tax ID"
        />

        <CustomTextareaField
          label="Physical Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Full address of the supplier..."
          rows={3}
        />
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
          {isEditing ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
}
