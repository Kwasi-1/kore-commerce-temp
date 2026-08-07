import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PlanGraceModal() {
  const graceInfo = useAuthStore((state) => state.graceInfo);
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      if (graceInfo) {
        setIsOpen(true);
      }
    };
    window.addEventListener('open-plan-grace-modal', handleOpen);
    return () => window.removeEventListener('open-plan-grace-modal', handleOpen);
  }, [graceInfo]);

  useEffect(() => {
    if (!graceInfo || !graceInfo.active || tenant?.plan !== 'starter') {
      setIsOpen(false);
      return;
    }

    const { days_remaining } = graceInfo;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastSeenDate = localStorage.getItem('hpos_last_grace_modal_date');

    // Rule:
    // 14 -> 8 days: No modal auto-popup (only banner)
    // 7 -> 4 days: Show modal once per calendar day
    // 3 -> 1 days: Show modal on every login/refresh
    if (days_remaining <= 3) {
      setIsOpen(true);
    } else if (days_remaining <= 7) {
      if (lastSeenDate !== todayStr) {
        setIsOpen(true);
      }
    }
  }, [graceInfo, tenant]);

  const handleDismiss = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('hpos_last_grace_modal_date', todayStr);
    setIsOpen(false);
  };

  if (!isOpen || !graceInfo) return null;

  const isOwner = staffUser?.role === 'owner';
  const { days_remaining, expires_at } = graceInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            {days_remaining <= 3 ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="font-header font-bold text-lg tracking-[-0.015rem] text-foreground">
              Subscription Grace Period Active
            </h3>
            <span className="text-[13px] md:text-sm text-muted-foreground">
              {days_remaining} {days_remaining === 1 ? 'day' : 'days'} remaining until multi-user lock
            </span>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-2 border border-border/50">
          <p>
            Your tenant account was recently downgraded to the <span className="font-bold text-foreground">Starter</span> plan (1 user allowed).
          </p>
          <p>
            You are currently in a grace period. On <span className="font-bold text-foreground">{expires_at}</span>, non-owner staff users will be restricted from logging into registers and dashboard views.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs font-semibold">
            Dismiss
          </Button>

          {isOwner && (
            <Button
              size="sm"
              onClick={() => {
                handleDismiss();
                navigate('/settings/plan');
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold gap-1.5"
            >
              Upgrade Plan <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
