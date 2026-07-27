import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { Clock, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlanGraceBanner() {
  const graceInfo = useAuthStore((state) => state.graceInfo);
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const navigate = useNavigate();

  // Only render if grace period is active or tenant plan is starter with downgraded status
  if (!graceInfo || !graceInfo.active || tenant?.plan !== 'starter') {
    return null;
  }

  const { days_remaining, expires_at } = graceInfo;
  const isOwner = staffUser?.role === 'owner';

  // Tiered urgency styles adhering to monochromatic / refined theme
  let urgencyStyle = "bg-muted/60 border-border text-foreground";
  let badgeStyle = "bg-foreground/10 text-foreground border-foreground/20";
  let iconColor = "text-muted-foreground";

  if (days_remaining <= 3) {
    urgencyStyle = "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400";
    badgeStyle = "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30";
    iconColor = "text-red-500";
  } else if (days_remaining <= 7) {
    urgencyStyle = "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
    badgeStyle = "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30";
    iconColor = "text-amber-500";
  }

  return (
    <div className="px-3 py-2 my-2">
      <div className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${urgencyStyle}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold">
            {days_remaining <= 3 ? (
              <ShieldAlert className={`h-4 w-4 shrink-0 ${iconColor}`} />
            ) : (
              <Clock className={`h-4 w-4 shrink-0 ${iconColor}`} />
            )}
            <span>Plan Downgraded</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
            {days_remaining}d left
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-tight">
          Starter plan supports 1 user. Access for additional staff expires on <span className="font-semibold text-foreground">{expires_at}</span>.
        </p>

        {isOwner && (
          <button
            onClick={() => navigate('/settings/plan')}
            className="w-full mt-1 py-1.5 px-2 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
          >
            Upgrade Plan <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
