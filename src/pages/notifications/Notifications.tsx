import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import {
  useCanManageNotifications,
  useNotificationActions,
  useNotificationList,
  useUnreadNotifications,
  type NotificationItem,
  type NotificationTab,
} from '@/hooks/useNotifications';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import NotificationGroup from '@/components/notifications/NotificationGroup';
import StockStrip from '@/components/notifications/StockStrip';
import { useNotificationAction } from '@/components/notifications/useNotificationAction';

export type { NotificationItem } from '@/hooks/useNotifications';

const TABS: { key: NotificationTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'inventory', label: 'Stock Alerts' },
  { key: 'orders', label: 'Orders & Sales' },
  { key: 'financial', label: 'Financials' },
  { key: 'system', label: 'System & Security' },
];

/** Notifications of one kind group into a stack from this many (fewer stay as rows) */
const GROUP_FROM = 3;

type FeedEntry = { type: 'row'; item: NotificationItem } | { type: 'group'; kind: string; items: NotificationItem[] };

const kindOf = (n: NotificationItem) => (n.referenceType === 'low_stock' ? 'low_stock' : n.category);

const isToday = (ts: string | null) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/**
 * "Today" and "Earlier", and inside each, kinds with GROUP_FROM or more notifications become one
 * stack (placed where its newest one was). Searching shows plain rows so no match is hidden in a stack.
 */
function buildFeed(items: NotificationItem[], grouped: boolean) {
  const sections = [
    { label: 'Today', items: items.filter((n) => isToday(n.timestamp)) },
    { label: 'Earlier', items: items.filter((n) => !isToday(n.timestamp)) },
  ].filter((sec) => sec.items.length > 0);

  return sections.map((sec) => {
    const counts = new Map<string, number>();
    sec.items.forEach((n) => counts.set(kindOf(n), (counts.get(kindOf(n)) || 0) + 1));
    const entries: FeedEntry[] = [];
    const placed = new Set<string>();
    for (const n of sec.items) {
      const kind = kindOf(n);
      if (grouped && (counts.get(kind) || 0) >= GROUP_FROM) {
        if (placed.has(kind)) continue;
        placed.add(kind);
        entries.push({ type: 'group', kind, items: sec.items.filter((x) => kindOf(x) === kind) });
      } else {
        entries.push({ type: 'row', item: n });
      }
    }
    return { label: sec.label, entries };
  });
}

export default function Notifications() {
  const canManage = useCanManageNotifications();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');

  // Search runs on the server, a moment after typing stops
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const list = useNotificationList(activeTab, search);
  const unreadCount = useUnreadNotifications();
  const { markAllRead, clearRead } = useNotificationActions();
  const { actionFor, restockModal, loadingId } = useNotificationAction();

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.notifications) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  const searching = !!search.trim();
  const feed = useMemo(() => buildFeed(items, !searching), [items, searching]);
  const summary = list.data?.pages[0]?.stockSummary;
  const stripShown = (activeTab === 'all' || activeTab === 'inventory') && !!summary && summary.low + summary.out > 0;

  return (
    <PageLayout title="Notifications" className="md:max-w-3xl mx-auto sm:px-4 md:px-8 xl:px-0">
      <div className="space-y-5 pb-10 sm:px-0">
        {/* Controls Card */}
        <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search alerts by title, order, or keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-foreground/20"
              />
            </div>

            {canManage && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                  >
                    <Icon icon="solar:check-read-linear" className="h-4 w-4" />
                    <span>Mark all as read</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearRead.mutate()}
                  disabled={clearRead.isPending}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4 mr-1" />
                  <span>Clear read</span>
                </Button>
              </div>
            )}
          </div>

          {/* Cashiers only get stock alerts, so they don't need the category tabs */}
          {canManage && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/50">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 shrink-0',
                    activeTab === t.key ? 'bg-muted text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <span>{t.label}</span>
                  {t.key === 'all' && activeTab === 'all' && !list.isLoading && <span>({total})</span>}
                  {t.key === 'unread' && unreadCount > 0 && (
                    <span
                      className={clsx(
                        'px-1.5 py-0.2 text-[11px] font-bold rounded-full',
                        activeTab === 'unread' ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="space-y-2.5">
          {stripShown && summary && <StockStrip summary={summary} search={search} />}
          {list.isLoading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : list.isError ? (
            <Card className="border-border/60 bg-card">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center gap-3">
                <p className="text-sm text-muted-foreground">Couldn't load notifications.</p>
                <Button variant="outline" size="sm" onClick={() => list.refetch()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : items.length === 0 && searching ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No notifications match "{search.trim()}".</p>
          ) : items.length === 0 && stripShown ? (
            // The stack above already says what matters (for cashiers it's all they get): no empty state
            <p className="pt-2 text-center text-xs text-muted-foreground">New alerts appear here as items run low.</p>
          ) : items.length === 0 ? (
            // No card behind it: in dark mode a card here shows as a large grey block
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
                <Icon icon="solar:bell-linear" className="h-6 w-6 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Notifications</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
                You're all caught up! There are no alerts matching your current filter.
              </p>
            </div>
          ) : (
            <>
              {feed.map((section) => (
                <section key={section.label} className="space-y-2.5">
                  <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</h3>
                  {section.entries.map((entry) =>
                    entry.type === 'group' ? (
                      <NotificationGroup
                        key={`${section.label}-${entry.kind}`}
                        kind={entry.kind}
                        items={entry.items}
                        actionFor={actionFor}
                        loadingId={loadingId}
                      />
                    ) : (
                      <NotificationRow key={entry.item.id} item={entry.item} action={actionFor(entry.item)} busy={loadingId === entry.item.id} />
                    ),
                  )}
                </section>
              ))}
              {list.hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                    {list.isFetchingNextPage ? 'Loading…' : `Load more (${total - items.length} left)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {restockModal}
    </PageLayout>
  );
}
