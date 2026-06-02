import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wand2, Loader2 } from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface DiscountFormProps {
  discount?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DiscountForm({ discount, onSuccess, onCancel }: DiscountFormProps) {
  const isEditing = !!discount;

  const formik = useFormik({
    initialValues: {
      code: discount?.code || '',
      type: discount?.type || 'percentage',
      value: discount?.value || '',
      min_order_amount: discount?.min_order_amount || '',
      max_uses: discount?.max_uses || '',
      is_active: discount?.is_active ?? true,
      expires_at: discount?.expires_at ? new Date(discount.expires_at).toISOString().split('T')[0] : ''
    },
    validationSchema: Yup.object({
      code: Yup.string().required('Code is required').min(3).max(20),
      value: Yup.number().required('Value is required').min(0.01).test(
        'max-percentage',
        'Percentage cannot exceed 100',
        function(value) {
          return this.parent.type === 'percentage' ? (value || 0) <= 100 : true;
        }
      ),
      min_order_amount: Yup.number().nullable().min(0),
      max_uses: Yup.number().nullable().min(1)
    }),
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          value: Number(values.value),
          min_order_amount: values.min_order_amount ? Number(values.min_order_amount) : null,
          max_uses: values.max_uses ? Number(values.max_uses) : null,
          expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null
        };

        if (isEditing) {
          await apiClient.put(`/tenant/discounts/${discount.id}`, payload);
          toast.success('Discount updated successfully');
        } else {
          await apiClient.post('/tenant/discounts', payload);
          toast.success('Discount created successfully');
        }
        onSuccess();
      } catch (error) {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} discount`);
      }
    }
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    formik.setFieldValue('code', result);
  };

  return (
    <form onSubmit={formik.handleSubmit} className="flex flex-col h-full space-y-6 pt-4 pb-20 sm:pb-4 px-1">
      <div className="space-y-4 flex-1">
        
        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Discount Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              {...formik.getFieldProps('code')}
              onChange={(e) => {
                formik.setFieldValue('code', e.target.value.toUpperCase().replace(/\s+/g, ''));
              }}
              placeholder="e.g. SUMMER2026"
              className={formik.touched.code && formik.errors.code ? 'border-red-500 font-mono uppercase' : 'font-mono uppercase'}
            />
            <Button type="button" variant="outline" onClick={generateRandomCode} title="Generate random code">
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
          {formik.touched.code && formik.errors.code && (
            <p className="text-xs text-red-500">{formik.errors.code}</p>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2 pt-2">
          <Label>Discount Type</Label>
          <RadioGroup
            value={formik.values.type}
            onValueChange={(val) => formik.setFieldValue('type', val)}
            className="flex flex-col sm:flex-row gap-4 pt-1"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => formik.setFieldValue('type', 'percentage')}>
              <RadioGroupItem value="percentage" id="r1" />
              <Label htmlFor="r1" className="cursor-pointer">Percentage %</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => formik.setFieldValue('type', 'fixed')}>
              <RadioGroupItem value="fixed" id="r2" />
              <Label htmlFor="r2" className="cursor-pointer">Fixed Amount</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Value */}
        <div className="space-y-2">
          <Label htmlFor="value">
            Value ({formik.values.type === 'percentage' ? '%' : 'GHS'})
          </Label>
          <Input
            id="value"
            type="number"
            step={formik.values.type === 'percentage' ? '1' : '0.01'}
            {...formik.getFieldProps('value')}
            className={formik.touched.value && formik.errors.value ? 'border-red-500' : ''}
          />
          {formik.touched.value && formik.errors.value && (
            <p className="text-xs text-red-500">{formik.errors.value as string}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Min Order */}
          <div className="space-y-2">
            <Label htmlFor="min_order_amount">Min Order Amount (Optional)</Label>
            <Input
              id="min_order_amount"
              type="number"
              step="0.01"
              placeholder="e.g. 500"
              {...formik.getFieldProps('min_order_amount')}
            />
          </div>

          {/* Max Uses */}
          <div className="space-y-2">
            <Label htmlFor="max_uses">Maximum Uses (Optional)</Label>
            <Input
              id="max_uses"
              type="number"
              placeholder="Leave empty for unlimited"
              {...formik.getFieldProps('max_uses')}
            />
          </div>
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
          <Input
            id="expires_at"
            type="date"
            {...formik.getFieldProps('expires_at')}
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between border rounded-lg p-4 mt-2 bg-muted/20">
          <div className="space-y-0.5">
            <Label>Active Status</Label>
            <p className="text-xs text-muted-foreground">Customers can only use active discounts.</p>
          </div>
          <Switch
            checked={formik.values.is_active}
            onCheckedChange={(checked) => formik.setFieldValue('is_active', checked)}
          />
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-auto">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={formik.isSubmitting}>
          {formik.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Discount'}
        </Button>
      </div>
    </form>
  );
}
