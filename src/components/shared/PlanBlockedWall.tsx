import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PlanBlockedWall() {
  const graceInfo = useAuthStore((state) => state.graceInfo);
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  if (!staffUser || !tenant) return null;

  // Owner is NEVER blocked by this wall
  if (staffUser.role === 'owner') return null;

  // Check if non-owner is blocked due to starter plan single-user limit (grace period expired)
  const isStarter = tenant.plan === 'starter';
  const isLimitReached = graceInfo?.plan_limit_reached || (graceInfo?.active && graceInfo?.days_remaining === 0);

  if (!isStarter || !isLimitReached) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="h-16 w-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-header font-bold text-foreground">
            Account Access Restricted
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your store's subscription was moved to the <span className="font-semibold text-foreground">Starter</span> plan, which includes 1 user account (Owner only).
          </p>
        </div>

        <div className="bg-muted/60 p-4 rounded-xl text-xs text-left space-y-1.5 border border-border">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Action Required</span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Please ask your account owner ({tenant.name || 'Store Owner'}) to upgrade the plan from the Admin settings page to restore staff access.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-10 border-border text-foreground hover:bg-muted font-bold text-xs gap-2"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
