import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CustomModal from '@/components/modals/modal';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useScreenSize';
import {
  useCanManageNotifications,
  useNotificationActions,
  useRecentNotifications,
  useUnreadNotifications,
} from '@/hooks/useNotifications';
import { NotificationRow } from './NotificationRow';
import StockStrip from './StockStrip';
import { useNotificationAction } from './useNotificationAction';

interface Props {
  /** The bell button's look (each header styles it to match its pill) */
  className?: string;
  iconClassName?: string;
  dotClassName?: string;
}

/**
 * Header bell: the latest 10 notifications (unread first) with "View all". A popover on desktop,
 * a bottom sheet on phones.
 */
export default function NotificationBell({ className, iconClassName, dotClassName }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotifications();
  const canManage = useCanManageNotifications();
  const recent = useRecentNotifications(open);
  const { markAllRead } = useNotificationActions();
  const { actionFor, restockModal, loadingId } = useNotificationAction();
  const close = () => setOpen(false);

  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={isMobile ? () => setOpen(true) : undefined}
      className={cn('relative', className)}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
    >
      <Bell className={iconClassName} />
      {unread > 0 && <span className={cn('absolute h-2 w-2 rounded-full bg-red-500', dotClassName)} />}
    </Button>
  );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-foreground">Notifications</span>
      {canManage && unread > 0 && (
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Mark all as read
        </button>
      )}
    </div>
  );

  const list = recent.isLoading ? (
    <div className="py-10 flex justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ) : recent.isError ? (
    <p className="py-8 text-center text-xs text-muted-foreground">Couldn't load notifications.</p>
  ) : (
    <div className="space-y-1.5">
      {recent.data && <StockStrip summary={recent.data.stockSummary} compact onNavigate={close} />}
      {(recent.data?.items || []).length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {/* Not "all caught up" right under "81 items need restocking" */}
          {recent.data && recent.data.stockSummary.low + recent.data.stockSummary.out > 0 ? 'No new notifications.' : "You're all caught up."}
        </p>
      ) : (
        <div className="space-y-0.5">
          {(recent.data?.items || []).map((n) => (
            <NotificationRow key={n.id} item={n} action={actionFor(n)} busy={loadingId === n.id} compact onAfterAction={close} />
          ))}
        </div>
      )}
    </div>
  );

  const viewAll = (
    <button
      type="button"
      onClick={() => {
        close();
        navigate('/notifications');
      }}
      className="w-full text-center text-xs font-semibold text-foreground hover:underline py-1"
    >
      View all
    </button>
  );

  return (
    <>
      {isMobile ? (
        <>
          {button}
          <CustomModal
            isOpen={open}
            onOpenChange={close}
            onClose={close}
            placement="bottom"
            scrollBehavior="inside"
            header={header}
            body={list}
            footer={viewAll}
            classNames={{ header: 'pr-12', body: 'px-2 py-1', footer: 'justify-center border-t border-border/60 py-2' }}
          />
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{button}</PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border/60">{header}</div>
            <div className="max-h-[420px] overflow-y-auto p-1.5">{list}</div>
            <div className="border-t border-border/60 px-3 py-1.5">{viewAll}</div>
          </PopoverContent>
        </Popover>
      )}
      {restockModal}
    </>
  );
}
