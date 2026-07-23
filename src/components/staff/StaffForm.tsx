import React, { useState } from 'react';
import { CustomInputTextField, CustomSelectField } from '@/components/shared/text-field';
import { Button, Tooltip } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, RefreshCw, Info, HelpCircle } from 'lucide-react';

interface StaffFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const generateDefaultPassword = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `Staff#${randomNum}`;
};

export default function StaffForm({ initialData, onSuccess, onCancel }: StaffFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    password: isEditing ? '' : generateDefaultPassword(),
    role: initialData?.role || 'cashier'
  });

  const handleRegeneratePassword = () => {
    const newPass = generateDefaultPassword();
    setFormData(prev => ({ ...prev, password: newPass }));
    toast.success('Generated new initial password');
  };

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
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-card p-6 space-y-6">
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
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-end px-0.5">
              {/* <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">Initial Password</span>
                <Tooltip
                  content={
                    <div className="px-2 py-1.5 max-w-[230px] text-xs space-y-1">
                      <p className="font-bold text-foreground">Password Hints:</p>
                      <ul className="list-disc pl-3 text-muted-foreground text-[11px] space-y-0.5">
                        <li>Minimum 6 characters required.</li>
                        <li>Prefilled with a secure default.</li>
                        <li>Staff can change it anytime after login.</li>
                      </ul>
                    </div>
                  }
                  placement="top"
                >
                  <span className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </Tooltip>
              </div> */}
              <button
                type="button"
                onClick={handleRegeneratePassword}
                className="text-[11px] font-semibold text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
                title="Generate new random password"
              >
                <RefreshCw className="h-3 w-3" />
                Randomize
              </button>
            </div>

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
                    <EyeOff className="h-4 w-4 text-primary" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 font-medium">
              <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Share this initial password with the staff member for their first login.</span>
            </p>
          </div>
        )}

        {isEditing && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/30">
            <strong>Note:</strong> You can only update the role of existing staff members. To deactivate this user, use the deactivate button on the main table.
          </div>
        )}

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
          {isEditing ? 'Update Role' : 'Create Staff'}
        </Button>
      </div>
    </form>
  );
}
