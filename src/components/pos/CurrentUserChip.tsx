import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useTillStore } from '@/store/tillStore';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/utils/roles';

/**
 * Who is signed in at the register. "Switch user / Lock" ends this person's session and goes to
 * the "Who's working?" screen; on a registered till the shop's held sales and products stay.
 */
export default function CurrentUserChip() {
  const navigate = useNavigate();
  const staffUser = useAuthStore((s) => s.staffUser);
  const endSession = useAuthStore((s) => s.endSession);
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore((s) => s.items.length);
  const isTill = !!useTillStore((s) => s.tillKey);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = staffUser?.name || `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() || 'Staff';
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const leave = () => {
    setConfirmOpen(false);
    // On a till: keep the shop's data for the next person. Elsewhere: a normal sign-out.
    if (isTill) endSession();
    else logout();
    navigate('/login');
  };

  const requestLeave = () => (cartCount > 0 ? setConfirmOpen(true) : leave());

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 h-10 pl-1 pr-3 rounded-full border border-border bg-background hover:bg-muted transition-colors"
            title="Switch user or lock"
          >
            <span className="h-8 w-8 rounded-full bg-primary/15 text-foreground flex items-center justify-center text-xs font-bold">
              {initials}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold text-foreground max-w-[120px] truncate">{name}</span>
              <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[staffUser?.role || ''] || staffUser?.role}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Signed in as {name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={requestLeave} className="gap-2 text-sm cursor-pointer">
            <Users className="h-4 w-4" /> Switch user
          </DropdownMenuItem>
          <DropdownMenuItem onClick={requestLeave} className="gap-2 text-sm cursor-pointer">
            <Lock className="h-4 w-4" /> Lock
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomModal
        isOpen={confirmOpen}
        onOpenChange={() => setConfirmOpen(false)}
        size="sm"
        header={<h2 className="text-lg font-bold px-1 pt-2">Clear the current sale?</h2>}
        body={
          <p className="py-2 text-sm text-muted-foreground">
            There {cartCount === 1 ? 'is 1 item' : `are ${cartCount} items`} in the cart. They'll be cleared when you switch. Hold the
            sale first if you want to keep it.
          </p>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-1">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="w-full">
              Go back
            </Button>
            <Button onClick={leave} className="w-full bg-primary text-primary-foreground font-semibold">
              Clear and switch
            </Button>
          </div>
        }
      />
    </>
  );
}
