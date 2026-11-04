import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock, PauseCircle } from 'lucide-react';
import { useFeaturesStore } from '@/store/featuresStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

/**
 * Shown to owners and managers when the plan no longer includes the online store: it stays open
 * for a grace period, then pauses until they upgrade. Hidden when the store is covered.
 */
export default function StorefrontPlanBanner({ className }: { className?: string }) {
  const storefront = useFeaturesStore((s) => s.storefront);
  const role = useAuthStore((s) => s.staffUser?.role);
  const navigate = useNavigate();

  if (!storefront?.has_store || storefront.state === 'full' || (role !== 'owner' && role !== 'manager')) {
    return null;
  }

  const paused = storefront.state === 'lapsed';
  const pauseDate = storefront.pauses_at
    ? new Date(storefront.pauses_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-3 text-sm',
        paused ? 'border-border bg-muted/40' : 'border-amber-500/30 bg-amber-500/5',
        className,
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        {paused ? (
          <PauseCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        ) : (
          <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <p className="text-foreground">
          {paused
            ? 'Your online store is paused, so shoppers can\'t place orders. Your products and orders are kept.'
            : `Your plan no longer includes the online store. It pauses on ${pauseDate ?? 'soon'}${
                storefront.days_left ? ` (${storefront.days_left} day${storefront.days_left === 1 ? '' : 's'} left)` : ''
              }.`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/settings/plan')}
        className="shrink-0 inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold"
      >
        {paused ? 'Upgrade to reopen' : 'Upgrade plan'} <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
