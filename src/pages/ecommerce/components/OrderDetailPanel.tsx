import React from 'react';
import { Button } from '@/components/ui/button';
import { X, User, MapPin, CreditCard, Clock, Activity, Package } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks/useCurrency';
import { StatusBadge } from '@/components/ui/status-badge';

interface OrderDetailPanelProps {
  order: any;
  onClose: () => void;
  onUpdateStatus: (order: any, newStatus: string) => void;
  isUpdatingStatus: boolean;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  onClose,
  onUpdateStatus,
  isUpdatingStatus
}) => {
  if (!order) return null;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border shadow-xl w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{order.reference}</h2>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
        <div className="flex gap-2">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <select
              disabled={isUpdatingStatus}
              value={order.status}
              onChange={(e) => onUpdateStatus(order, e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Customer & Delivery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
              <User className="h-4 w-4 text-primary" />
              Customer Details
            </div>
            <div className="text-sm font-medium">{order.customer_name}</div>
            <div className="text-xs text-muted-foreground">{order.customer_email}</div>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
              <MapPin className="h-4 w-4 text-primary" />
              Delivery Address
            </div>
            <div className="text-sm">Store Pickup</div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment Information
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Method</span>
            <span className="capitalize font-medium">{order.payment_method?.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Order Items */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b border-border font-semibold flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            Order Items
          </div>
          <div className="divide-y divide-border">
            {/* Mocking order items until we fetch them properly */}
            <div className="p-3 flex justify-between items-center bg-card">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center border">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-sm">Sample Product</div>
                  <div className="text-xs text-muted-foreground">SKU-12345</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm"><CurrencyDisplay amount={order.total_amount} /></div>
                <div className="text-xs text-muted-foreground">Qty: {order.items_count}</div>
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="bg-muted/30 p-4 space-y-2 border-t border-border text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span><CurrencyDisplay amount={order.total_amount} /></span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border text-foreground">
              <span>Total</span>
              <span className="text-primary"><CurrencyDisplay amount={order.total_amount} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
