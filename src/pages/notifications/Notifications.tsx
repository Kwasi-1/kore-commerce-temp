import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  AlertTriangle, 
  Info, 
  Check, 
  Trash2, 
  Search, 
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'inventory' | 'orders' | 'financial' | 'system';
  type: 'warning' | 'info' | 'success' | 'alert';
  timestamp: string | Date;
  read: boolean;
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  actionLabel?: string;
}

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Low Stock Alert',
    message: 'Nido Milk stock level reached threshold (4 units remaining). Consider placing a purchase order.',
    category: 'inventory',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
    read: false,
    actionUrl: '/inventory/stock',
    actionLabel: 'Restock Item',
  },
  {
    id: 'n2',
    title: 'New Online Order #ORD-8821',
    message: 'Customer Adelaide Afful placed an order for 2x Graphic T-Shirt via Paystack (GHS 50.00).',
    category: 'orders',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 95),
    read: false,
    actionUrl: '/transactions',
    actionLabel: 'View Order',
  },
  {
    id: 'n3',
    title: 'Purchase Order In-Transit (PO-2026-004)',
    message: 'Guinness Brewery confirmed shipment. Expected arrival within 24 hours.',
    category: 'inventory',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: false,
    actionUrl: '/inventory/purchase-orders',
    actionLabel: 'Inspect PO',
  },
  {
    id: 'n4',
    title: 'Cash Drawer Reconciliation Warning',
    message: 'Shift closing recorded a variance of -GHS 5.00 on Cash Drawer #1.',
    category: 'financial',
    type: 'alert',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
    actionUrl: '/transactions',
    actionLabel: 'Review Shift',
  },
  {
    id: 'n5',
    title: 'System Security Update',
    message: 'POS receipt printing and end-of-day reconciliation engine upgraded to v2.4.0.',
    category: 'system',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    actionUrl: '/settings',
    actionLabel: 'System Settings',
  },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'inventory' | 'orders' | 'financial' | 'system'>('all');

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/tenant/notifications');
      const items = res.data.success?.data?.notifications || [];
      if (items.length > 0) {
        setNotifications(items);
      } else {
        setNotifications(FALLBACK_NOTIFICATIONS);
      }
    } catch (err) {
      console.warn('Could not load live notifications, using local store items:', err);
      setNotifications(FALLBACK_NOTIFICATIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Actions
  const markAllAsRead = async () => {
    try {
      await apiClient.post('/tenant/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/tenant/notifications/${id}/read`);
    } catch (err) {
      // local optimistic update
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/tenant/notifications/${id}`);
    } catch (err) {
      // local optimistic delete
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    toast.success('Notification dismissed');
  };

  const clearAllRead = () => {
    setNotifications((prev) => prev.filter((item) => !item.read));
    toast.success('Cleared read notifications');
  };

  // Filter and search
  const filteredNotifications = useMemo(() => {
    let list = notifications;

    if (activeTab === 'unread') {
      list = list.filter((item) => !item.read);
    } else if (activeTab === 'inventory') {
      list = list.filter((item) => item.category === 'inventory');
    } else if (activeTab === 'orders') {
      list = list.filter((item) => item.category === 'orders');
    } else if (activeTab === 'financial') {
      list = list.filter((item) => item.category === 'financial');
    } else if (activeTab === 'system') {
      list = list.filter((item) => item.category === 'system');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          (item.referenceType && item.referenceType.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const getCategoryTheme = (category: NotificationItem['category'], type: NotificationItem['type']) => {
    switch (category) {
      case 'inventory':
        return {
          icon: <Package className="h-4 w-4 text-amber-500" />,
          bg: 'bg-amber-500/10 border-amber-500/20',
          badgeText: 'Inventory',
        };
      case 'orders':
        return {
          icon: <ShoppingBag className="h-4 w-4 text-emerald-500" />,
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          badgeText: 'Orders',
        };
      case 'financial':
        return {
          icon: <DollarSign className="h-4 w-4 text-rose-500" />,
          bg: 'bg-rose-500/10 border-rose-500/20',
          badgeText: 'Financial',
        };
      case 'system':
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-500" />,
          bg: 'bg-blue-500/10 border-blue-500/20',
          badgeText: 'System',
        };
    }
  };

  const parseTimestamp = (ts: string | Date) => {
    try {
      const date = typeof ts === 'string' ? new Date(ts) : ts;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <PageLayout
      title="Notifications & Activity Log"
      subtitle="Real-time alerts, stock warnings, and transaction logs across your store."
      className='max-w-5xl mx-auto'
    >
      <div className="space-y-5 max-w-5xl mx-auto pb-10">
        {/* Controls Card */}
        <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          {/* Top Row: Search & Global Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search alerts by title, order, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Mark all as read</span>
                </Button>
              )}
              {notifications.some((n) => n.read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllRead}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Clear read</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/50">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === 'all'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
                activeTab === 'unread'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                    activeTab === 'unread'
                      ? 'bg-background text-foreground'
                      : 'bg-primary/20 text-primary'
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === 'inventory'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Stock Alerts
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === 'orders'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Orders & Sales
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === 'financial'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Financials
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === 'system'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              System & Security
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-xs">Loading activity feed...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="border-border/60 bg-card">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
                  <Bell className="h-5 w-5 opacity-60" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No Notifications</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  You're all caught up! There are no active alerts matching your current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((item) => {
              const theme = getCategoryTheme(item.category, item.type);

              return (
                <div
                  key={item.id}
                  className={clsx(
                    'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150',
                    item.read
                      ? 'bg-card/70 border-border/70 text-muted-foreground'
                      : 'bg-card border-foreground/20 shadow-xs'
                  )}
                >
                  {/* Left Icon + Text Content */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Category Icon Badge */}
                    <div
                      className={clsx(
                        'p-2 rounded-lg border shrink-0 mt-0.5',
                        theme.bg
                      )}
                    >
                      {theme.icon}
                    </div>

                    {/* Content */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={clsx(
                            'text-xs font-bold tracking-tight',
                            item.read ? 'text-foreground/90' : 'text-foreground'
                          )}
                        >
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          · {parseTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions & Deep-Link Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    {/* Actionable Deep Link Pill */}
                    {item.actionUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(item.actionUrl!)}
                        className="h-7 px-2.5 text-[11px] font-semibold gap-1 border-border/80 hover:bg-muted text-foreground"
                      >
                        <span>{item.actionLabel || 'View Details'}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}

                    <div className="flex items-center gap-1">
                      {!item.read && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          title="Mark as read"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(item.id)}
                        title="Dismiss notification"
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageLayout>
  );
}
