import React, { useState, useEffect } from 'react';
import { 
  CustomInputTextField, 
  CustomSelectField, 
  CustomTextareaField 
} from '@/components/shared/text-field';

import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';

interface ProductFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    costPrice: initialData?.costPrice?.toString() || '',
    quantity: initialData?.quantity?.toString() || '0',
    category: initialData?.category || '',
    status: initialData?.status || 'active'
  });

  useEffect(() => {
    // Fetch unique categories for the dropdown from existing products
    apiClient.get('/tenant/products?limit=100').then((res) => {
      const prods = res.data.data.products || [];
      const cats = Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean))) as string[];
      setCategories(cats);
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: Array.from(value)[0] || value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.price) {
      toast.error('Name, SKU, and Price are required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        quantity: parseInt(formData.quantity) || 0,
      };

      if (isEditing) {
        await apiClient.put(`/tenant/products/${initialData.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await apiClient.post('/tenant/products', payload);
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save product error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = categories.map(c => ({ label: c, value: c }));
  // Add a way to enter a new category if needed
  if (formData.category && !categories.includes(formData.category)) {
    categoryOptions.push({ label: formData.category, value: formData.category });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-transparent py-6 px-4 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-2">
        <CustomInputTextField
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g. Nike Air Max"
          inputProps={{ required: true }}
        />

        <CustomInputTextField
          label="SKU / Barcode"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          required
          placeholder="e.g. NKE-AM-001"
          inputProps={{ required: true }}
        />

        <div className="grid grid-cols-2 gap-4">
          <CustomInputTextField
            label="Selling Price (GHS)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            required
            placeholder="0.00"
            inputProps={{ required: true, min: "0", step: "0.01" }}
          />

          <CustomInputTextField
            label="Cost Price (GHS)"
            name="costPrice"
            type="number"
            value={formData.costPrice}
            onChange={handleChange}
            placeholder="0.00"
            inputProps={{ min: "0", step: "0.01" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CustomInputTextField
            label="Initial Stock Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0"
            inputProps={{ min: "0" }}
          />

          <CustomSelectField
            label="Category"
            options={categoryOptions.length > 0 ? categoryOptions : [{ label: 'General', value: 'General' }]}
            value={formData.category}
            inputProps={{
              onSelectionChange: (keys) => handleSelectChange('category', keys)
            }}
            placeholder="Select category"
          />
        </div>

        <CustomSelectField
          label="Status"
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Draft', value: 'draft' },
          ]}
          value={formData.status}
          inputProps={{
            onSelectionChange: (keys) => handleSelectChange('status', keys)
          }}
          required
        />

        <CustomTextareaField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed product description..."
          rows={4}
        />
        
        {/* Placeholder for Image Upload */}
        <div className="p-4 border-2 border-dashed border-border dark:border-gray-700 rounded-lg text-center mt-2">
          <p className="text-sm text-muted-foreground">Image upload (Cloudinary) to be implemented</p>
        </div>

      </div>

      <div className="pt-4 border-t border-border dark:border-gray-800 flex justify-end gap-3 mt-auto">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="font-medium px-6 rounded-full"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isLoading}
          className="bg-primary text-primary-foreground font-bold px-6 rounded-full"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
