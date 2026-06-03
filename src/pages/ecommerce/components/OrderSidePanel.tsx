import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, Package, Download, RefreshCcw, Phone, MessageCircle } from 'lucide-react';
import { CurrencyDisplay } from '@/hooks/useCurrency';
import { StatusBadge } from '@/components/ui/status-badge';
import { CustomSelectField } from '@/components/shared/text-field';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { EcommerceInvoice } from './EcommerceInvoice';

interface OrderSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onUpdateStatusClick: (order: any, newStatus: string) => void;
  onIssueRefundClick: () => void;
  onPrintInvoice: () => void;
}

export default function OrderSidePanel({
  isOpen,
  onClose,
  order,
  onUpdateStatusClick,
  onIssueRefundClick,
  onPrintInvoice
}: OrderSidePanelProps) {
  if (!order) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="md"
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{order.reference}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>
          <StatusBadge status={order.status} />
        </div>
      }
      body={
        <>
          {/* Print Only Invoice */}
          <div className="hidden print:block w-full">
            <EcommerceInvoice order={order} />
          </div>

          {/* Screen Only Panel Content */}
          <div className="flex-1 overflow-y-auto px-2 py-4 bg-muted/10 space-y-6 print:hidden">
          
          {/* Status Updater */}
          {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'refunded' && (
            <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-2 shadow-sm">
              <span className="text-sm font-semibold text-foreground mb-1">Update Status</span>
              <CustomSelectField
                options={[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Processing', value: 'processing' },
                  { label: 'Shipped', value: 'shipped' },
                  { label: 'Delivered', value: 'delivered' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
                value={order.status}
                inputProps={{
                  onChange: (e) => onUpdateStatusClick(order, e.target.value)
                }}
                labelPlacement="outside"
                className="w-full"
              />
            </div>
          )}

          {/* Customer & Delivery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <User className="h-4 w-4 text-primary" />
                Customer Details
              </div>
              <div className="text-sm font-medium">{order.customer_name}</div>
              <div className="text-xs text-muted-foreground">{order.customer_email}</div>
              {order.customer_phone || true ? (
                <div className="mt-1">
                  <Dropdown>
                    <DropdownTrigger>
                      <button className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 transition-colors">
                        <Phone className="w-3 h-3" />
                        {order.customer_phone || '024 123 4567'}
                      </button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Contact Customer">
                      <DropdownItem 
                        key="call" 
                        startContent={<Phone className="w-4 h-4" />}
                        onClick={() => window.open(`tel:${order.customer_phone || '0241234567'}`, '_self')}
                      >
                        Call
                      </DropdownItem>
                      <DropdownItem 
                        key="whatsapp" 
                        startContent={<MessageCircle className="w-4 h-4 text-green-500" />}
                        onClick={() => window.open(`https://wa.me/${(order.customer_phone || '0241234567').replace(/[^0-9]/g, '')}`, '_blank')}
                      >
                        WhatsApp
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              ) : null}
            </div>

            <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                Delivery Address
              </div>
              <div className="text-sm text-muted-foreground">Store Pickup</div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-2 shadow-sm">
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
          <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
            <div className="bg-muted/50 px-4 py-2 border-b border-border font-semibold flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Order Items
            </div>
            <div className="divide-y divide-border">
              {/* Mocking order items for display */}
              <div className="p-3 flex justify-between items-center bg-card">
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-10 bg-muted/50 rounded-md flex items-center justify-center border border-border">
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
            <div className="bg-muted/10 p-4 space-y-2 border-t border-border text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span><CurrencyDisplay amount={order.total_amount} /></span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border text-foreground mt-2">
                <span>Total</span>
                <span className="text-primary"><CurrencyDisplay amount={order.total_amount} /></span>
              </div>
            </div>
          </div>
        </div>
        </>
      }
      footer={
        <div className="flex flex-col gap-3 w-full pb-4 print:hidden">
          <Button 
            variant="outline"
            className="w-full"
            onClick={onPrintInvoice}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Invoice
          </Button>
          <Button 
            variant="destructive"
            className="w-full"
            onClick={onIssueRefundClick}
            disabled={order.status === 'refunded' || order.status === 'partially_refunded'}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {(order.status === 'refunded' || order.status === 'partially_refunded') ? 'Already Refunded' : 'Issue Refund'}
          </Button>
        </div>
      }
    />
  );
}
