import React, { useState, useEffect } from 'react';
import { CustomInputTextField, CustomSelectField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import { Plus, Trash2 } from 'lucide-react';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface POFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface POItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  cost_price: number;
}

export default function PurchaseOrderForm({ onSuccess, onCancel }: POFormProps) {
  const { formatAmount } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{label: string, value: string}[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    reference_number: '',
    notes: ''
  });

  const [items, setItems] = useState<POItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('');
  const [lineCostPrice, setLineCostPrice] = useState('');

  useEffect(() => {
    // Fetch suppliers
    apiClient.get('/tenant/suppliers?limit=100').then(res => {
      const activeSuppliers = res.data.data.suppliers || [];
      setSuppliers(activeSuppliers.map((s: any) => ({ label: s.name, value: s.id })));
    }).catch(console.error);

    // Fetch products for line items
    apiClient.get('/tenant/products?limit=100').then(res => {
      setProducts(res.data.data.products || []);
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSupplierSelect = (keys: any) => {
    const val = Array.from(keys)[0] as string;
    setFormData(prev => ({ ...prev, supplier_id: val }));
  };

  const handleProductSelect = (keys: any) => {
    const pId = Array.from(keys)[0] as string;
    setSelectedProductId(pId);
    // auto-fill cost price if available
    const prod = products.find(p => p.id === pId);
    if (prod && prod.cost_price) {
      setLineCostPrice(prod.cost_price.toString());
    }
  };

  const addLineItem = () => {
    if (!selectedProductId || !lineQty || !lineCostPrice) {
      toast.error('Please select a product, quantity, and cost price.');
      return;
    }
    
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    // Check if product already in items
    const existsIndex = items.findIndex(i => i.product_id === selectedProductId);
    if (existsIndex >= 0) {
      const newItems = [...items];
      newItems[existsIndex].quantity += parseInt(lineQty);
      // optionally update cost price to newest
      newItems[existsIndex].cost_price = parseFloat(lineCostPrice);
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: parseInt(lineQty),
        cost_price: parseFloat(lineCostPrice)
      }]);
    }

    // Reset line item fields
    setSelectedProductId('');
    setLineQty('');
    setLineCostPrice('');
  };

  const removeLineItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    if (!formData.reference_number) {
      toast.error('Reference number is required');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        supplier_id: formData.supplier_id,
        reference_number: formData.reference_number,
        notes: formData.notes,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          cost_price: i.cost_price
        }))
      };

      await apiClient.post('/tenant/purchase-orders', payload);
      toast.success('Draft Purchase Order created');
      onSuccess();
    } catch (error: any) {
      console.error('Create PO error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create PO');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPoValue = items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white p-6 space-y-6">
      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-2">
        
        {/* Header Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-800">PO Details</h3>
          
          <CustomSelectField
            label="Supplier"
            options={suppliers}
            value={formData.supplier_id}
            inputProps={{
              onSelectionChange: handleSupplierSelect
            }}
            placeholder="Select a supplier"
            required
          />

          <CustomInputTextField
            label="Reference Number (Invoice / Receipt)"
            name="reference_number"
            value={formData.reference_number}
            onChange={handleChange}
            required
            placeholder="e.g. INV-2026-001"
            inputProps={{ required: true }}
          />
        </div>

        {/* Line Items Builder */}
        <div className="space-y-4 bg-gray-50 dark:bg-[#1f1f1f] p-4 rounded-xl border border-border dark:border-gray-800">
          <h3 className="font-semibold text-sm">Add Line Item</h3>
          
          <CustomSelectField
            label="Select Product"
            options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            value={selectedProductId}
            inputProps={{
              onSelectionChange: handleProductSelect
            }}
            placeholder="Search products..."
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomInputTextField
              label="Qty Ordered"
              type="number"
              value={lineQty}
              onChange={e => setLineQty(e.target.value)}
              placeholder="0"
              inputProps={{ min: "1" }}
            />
            <CustomInputTextField
              label="Unit Cost Price"
              type="number"
              value={lineCostPrice}
              onChange={e => setLineCostPrice(e.target.value)}
              placeholder="0.00"
              inputProps={{ min: "0", step: "0.01" }}
            />
          </div>

          <Button 
            type="button" 
            onPress={addLineItem}
            className="w-full bg-gray-200 dark:bg-gray-700 text-foreground font-semibold"
            startContent={<Plus className="h-4 w-4" />}
          >
            Add to Order
          </Button>
        </div>

        {/* Line Items Table */}
        {items.length > 0 && (
          <div className="border border-border dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(item => (
                  <tr key={item.product_id} className="bg-white">
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatAmount(item.cost_price)}</td>
                    <td className="px-3 py-2 font-medium">{formatAmount(item.quantity * item.cost_price)}</td>
                    <td className="px-3 py-2 text-right">
                      <button 
                        type="button" 
                        onClick={() => removeLineItem(item.product_id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-[#1f1f1f] font-bold">
                  <td colSpan={3} className="px-3 py-3 text-right">Grand Total:</td>
                  <td colSpan={2} className="px-3 py-3 text-primary"><CurrencyDisplay amount={totalPoValue} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <CustomTextareaField
          label="Order Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions for this order..."
          rows={2}
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
          Create PO
        </Button>
      </div>
    </form>
  );
}
