import { Icon } from '@iconify/react/dist/iconify.js';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useCanManageNotifications, useNotificationActions, type NotificationItem } from '@/hooks/useNotifications';

const CATEGORY_ICON: Record<NotificationItem['category'], string> = {
  inventory: 'solar:box-minimalistic-linear',
  orders: 'solar:bag-3-linear',
  financial: 'solar:wallet-money-linear',
  system: 'solar:shield-warning-linear',
};

const timeAgo = (ts: string | null) => {
  if (!ts) return '';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return '';
  }
};

interface RowProps {
  item: NotificationItem;
  action: { label: string; run: () => void } | null;
  busy?: boolean;
  /** Compact layout for the header bell */
  compact?: boolean;
  /** Runs after the row's action (e.g. close the bell popover) */
  onAfterAction?: () => void;
}

export function NotificationRow({ item, action, busy, compact, onAfterAction }: RowProps) {
  const canManage = useCanManageNotifications();
  const { markRead, remove } = useNotificationActions();
  const runAction = () => {
    if (canManage && !item.read) markRead.mutate(item.id);
    action?.run();
    onAfterAction?.();
  };

  if (compact) {
    return (
      <div
        role={canManage ? 'button' : undefined}
        tabIndex={canManage ? 0 : undefined}
        onClick={() => canManage && !item.read && markRead.mutate(item.id)}
        className={clsx(
          'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
          canManage && 'cursor-pointer hover:bg-muted/60',
          !item.read && 'bg-muted/30',
        )}
      >
        <Icon icon={CATEGORY_ICON[item.category] || CATEGORY_ICON.system} className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={clsx('text-xs truncate', item.read ? 'text-foreground/80' : 'font-semibold text-foreground')}>{item.title}</p>
            {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">{item.message}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">{timeAgo(item.timestamp)}</span>
            {action && (
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  runAction();
                }}
                className="text-[11px] font-semibold text-foreground hover:underline disabled:opacity-50"
              >
                {busy ? 'Opening…' : action.label} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl border transition-all duration-150',
        item.read ? 'bg-card/70 border-border/70 text-muted-foreground' : 'bg-card border-foreground/20 shadow-xs',
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div className="p-2.5 rounded-[10px] border shrink-0 mt-0.5 bg-muted/50 border-border/80 text-foreground">
          <Icon icon={CATEGORY_ICON[item.category] || CATEGORY_ICON.system} className="h-5 w-5 text-foreground/80" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={clsx('text-sm font-bold', item.read ? 'text-foreground/90' : 'text-foreground')}>{item.title}</h4>
            {!item.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
            {item.timestamp && <span className="text-xs text-muted-foreground">· {timeAgo(item.timestamp)}</span>}
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">{item.message}</p>
        </div>
      </div>

      {(action || canManage) && (
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
          {action && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={runAction}
              className="h-8 px-3 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted text-foreground"
            >
              <span>{busy ? 'Opening…' : action.label}</span>
              <Icon icon="solar:arrow-right-linear" className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {canManage && (
            <div className="flex items-center gap-1 ml-auto sm:ml-0">
              {!item.read && (
                <button
                  onClick={() => markRead.mutate(item.id)}
                  disabled={markRead.isPending}
                  title="Mark as read"
                  aria-label="Mark as read"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => remove.mutate(item.id)}
                disabled={remove.isPending}
                title="Delete"
                aria-label="Delete notification"
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
