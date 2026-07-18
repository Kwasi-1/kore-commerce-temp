import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mail, Phone, Calendar, ShoppingBag, History } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks/useCurrency';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface CustomerDetailPanelProps {
  customer: any;
  onClose: () => void;
}

export const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({
  customer,
  onClose
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (!customer?.id) return;
    
    const fetchOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const res = await apiClient.get(`/tenant/customers/${customer.id}/orders`);
        setOrders(res.data.success?.data?.orders || []);
      } catch (error) {
        console.error('Failed to fetch customer orders:', error);
        toast.error('Failed to load customer orders');
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [customer?.id]);

  if (!customer) return null;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border shadow-xl w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {customer.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-foreground leading-tight">{customer.name}</h2>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center gap-1">
            <ShoppingBag className="h-5 w-5 text-primary mb-1" />
            <div className="text-2xl font-bold">{customer.total_orders}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Orders</div>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center gap-1">
            <div className="text-2xl font-bold text-primary"><CurrencyDisplay amount={customer.total_spent} /></div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Spent</div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col gap-3">
          <h3 className="font-semibold text-sm border-b border-border pb-2">Contact Information</h3>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Email Address</span>
              <span className="font-medium text-foreground">{customer.email || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Phone Number</span>
              <span className="font-medium text-foreground">{customer.phone || '—'}</span>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-semibold flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Order History
            </div>
            <span className="text-xs font-normal text-muted-foreground">{orders.length} orders found</span>
          </div>
          
          <div className="divide-y divide-border">
            {isLoadingOrders ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No orders found for this customer.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="p-3 flex justify-between items-center bg-card hover:bg-muted/20 transition-colors cursor-pointer group">
                  <div>
                    <div className="font-semibold text-sm group-hover:text-primary transition-colors">{order.reference}</div>
                    <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-bold text-sm"><CurrencyDisplay amount={order.total_amount} /></div>
                    <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      order.status === 'delivered' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' 
                      : order.status === 'cancelled' ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
                      : 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
