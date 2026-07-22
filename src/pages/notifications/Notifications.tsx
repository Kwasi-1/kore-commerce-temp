import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Package, ShoppingBag, DollarSign, CheckCircle2, AlertTriangle, Info, Check, Trash2, Filter } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'inventory' | 'orders' | 'financial' | 'system';
  type: 'warning' | 'info' | 'success' | 'alert';
  timestamp: Date;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Low Stock Alert',
    message: 'Wireless Mouse stock level reached threshold (3 units left). Consider placing a purchase order.',
    category: 'inventory',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
    read: false,
  },
  {
    id: 'n2',
    title: 'New Online Order #ORD-8821',
    message: 'Customer Adelaide Afful placed an order for 2x Graphic T-Shirt via Paystack (GHS 50.00).',
    category: 'orders',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hrs ago
    read: false,
  },
  {
    id: 'n3',
    title: 'Cash Drawer Reconciliation Warning',
    message: 'Shift closing recorded a variance of -GHS 5.00 on Cash Drawer #1.',
    category: 'financial',
    type: 'alert',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hrs ago
    read: false,
  },
  {
    id: 'n4',
    title: 'System Update Completed',
    message: 'Kore Commerce Server successfully updated to version 2.4.0 with enhanced receipt printing.',
    category: 'system',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'inventory' | 'orders' | 'system'>('all');

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.read;
    if (activeTab === 'inventory') return item.category === 'inventory';
    if (activeTab === 'orders') return item.category === 'orders';
    if (activeTab === 'system') return item.category === 'system' || item.category === 'financial';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const getCategoryIcon = (category: NotificationItem['category'], type: NotificationItem['type']) => {
    switch (category) {
      case 'inventory':
        return <Package className="h-5 w-5 text-amber-500" />;
      case 'orders':
        return <ShoppingBag className="h-5 w-5 text-emerald-500" />;
      case 'financial':
        return <DollarSign className="h-5 w-5 text-rose-500" />;
      case 'system':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <PageLayout
      title="Notifications & Activity Log"
      subtitle="Real-time alerts, stock warnings, and transaction logs across your store."
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-4 rounded-xl">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'all'
                  ? 'bg-primary text-zinc-950 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                activeTab === 'unread'
                  ? 'bg-primary text-zinc-950 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'inventory'
                  ? 'bg-primary text-zinc-950 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Stock Alerts
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'orders'
                  ? 'bg-primary text-zinc-950 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'system'
                  ? 'bg-primary text-zinc-950 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              System & Finance
            </button>
          </div>

          {/* Action Buttons */}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs gap-1.5 border-border shrink-0"
            >
              <Check className="h-3.5 w-3.5" /> Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Notifications</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  You're all caught up! There are no notifications matching your current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={clsx(
                  'flex items-start justify-between gap-4 p-4 rounded-xl border transition-all duration-200',
                  item.read
                    ? 'bg-card border-border/80 opacity-85'
                    : 'bg-card border-foreground/20'
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-muted/60 shrink-0 mt-0.5">
                    {getCategoryIcon(item.category, item.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground tracking-tight">{item.title}</h4>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        • {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!item.read && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    title="Delete notification"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
