import React from 'react';
import { CurrencyDisplay } from '@/hooks/useCurrency';

interface EcommerceInvoiceProps {
  order: any;
}

export const EcommerceInvoice: React.FC<EcommerceInvoiceProps> = ({ order }) => {
  if (!order) return null;

  return (
    <div id={`invoice-${order.id}`} className="bg-white text-black p-8 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">INVOICE</h1>
          <p className="text-sm text-gray-500 mt-1">Order Ref: {order.reference}</p>
          <p className="text-sm text-gray-500">Date: {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-900">HeadlessPOS Store</h2>
          <p className="text-sm text-gray-600">123 Commerce Ave, Accra, Ghana</p>
          <p className="text-sm text-gray-600">contact@headlesspos.com</p>
          <p className="text-sm text-gray-600">+233 24 123 4567</p>
        </div>
      </div>

      {/* Billing & Shipping Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
          <p className="font-semibold text-gray-900">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_email}</p>
          {order.customer_phone && <p className="text-sm text-gray-600">{order.customer_phone}</p>}
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Details</h3>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">Method: </span> 
            <span className="capitalize">{order.payment_method?.replace('_', ' ')}</span>
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">Status: </span> 
            <span className="uppercase text-green-600 font-semibold">{order.status === 'refunded' ? 'Refunded' : 'Paid'}</span>
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-3 text-sm font-semibold text-gray-900">Description</th>
              <th className="py-3 text-sm font-semibold text-gray-900 text-center">Qty</th>
              <th className="py-3 text-sm font-semibold text-gray-900 text-right">Unit Price</th>
              <th className="py-3 text-sm font-semibold text-gray-900 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Mock Items - in reality map over order.items */}
            <tr>
              <td className="py-4 text-sm text-gray-800">
                <p className="font-medium">Sample Product</p>
                <p className="text-xs text-gray-500">SKU-12345</p>
              </td>
              <td className="py-4 text-sm text-gray-800 text-center">{order.items_count || 1}</td>
              <td className="py-4 text-sm text-gray-800 text-right"><CurrencyDisplay amount={(order.total_amount || 0) / (order.items_count || 1)} /></td>
              <td className="py-4 text-sm text-gray-800 text-right font-medium"><CurrencyDisplay amount={order.total_amount || 0} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2 max-w-sm">
          <div className="flex justify-between py-2 text-sm text-gray-600">
            <span>Subtotal</span>
            <span><CurrencyDisplay amount={order.total_amount || 0} /></span>
          </div>
          <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
            <span>Tax (0%)</span>
            <span><CurrencyDisplay amount={0} /></span>
          </div>
          <div className="flex justify-between py-3 text-lg font-bold text-gray-900">
            <span>Total</span>
            <span><CurrencyDisplay amount={order.total_amount || 0} /></span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-8 mt-16">
        <p>Thank you for your business.</p>
        <p className="mt-1">If you have any questions about this invoice, please contact support.</p>
      </div>
    </div>
  );
};
