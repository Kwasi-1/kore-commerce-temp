import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';

interface StaffFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_PASSWORD = 'Welcome@123';

export default function StaffForm({ initialData, onSuccess, onCancel }: StaffFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    password: isEditing ? '' : DEFAULT_PASSWORD,
    pos_pin: '1234',
    role: initialData?.role || 'cashier'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
        await apiClient.put(`/tenant/staff/${initialData.id}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role
        });
        toast.success('Staff details updated');
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
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-card pb-4 p-2 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
        
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
          disabled={isEditing}
          placeholder="staff@example.com"
        />

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
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Secure password"
            inputProps={{ minLength: 6 }}
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors focus:outline-none cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        )}

        {!isEditing && (
          <CustomInputTextField
            label="4-Digit POS Access PIN"
            name="pos_pin"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={formData.pos_pin}
            onChange={handleChange}
            placeholder="1234"
          />
        )}

      </div>

      <div className="pt-4 flex justify-end gap-3 mt-auto">
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="font-medium px-6"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-primary text-primary-foreground font-bold px-6"
        >
          {isEditing ? 'Save Changes' : 'Create Staff'}
        </Button>
      </div>
    </form>
  );
}
