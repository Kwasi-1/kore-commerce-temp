import { useEffect, useRef, useState } from 'react';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useApprovalStore } from '@/store/approvalStore';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/roles';
import { cn } from '@/lib/utils';

interface TillStaff {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

/**
 * Asks someone who has the needed permission to approve one action with their till PIN.
 * Mounted once at the app root; opened by the API client (see api/client.ts).
 */
export default function ApprovalModal() {
  const { request, answer } = useApprovalStore();
  const myId = useAuthStore((s) => s.staffUser?.id);
  const [staff, setStaff] = useState<TillStaff[] | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request) return;
    setPin('');
    apiClient
      .get('/pos/auth/staff', { skipApproval: true })
      .then((r) => {
        const all: TillStaff[] = r.data?.success?.data?.staff || [];
        const eligible = all.filter((s) => s.id !== myId && request.permissions.some((p) => s.permissions.includes(p)));
        setStaff(eligible);
        setApproverId((current) => (current && eligible.some((s) => s.id === current) ? current : eligible[0]?.id ?? null));
      })
      .catch(() => setStaff([]));
  }, [request, myId]);

  useEffect(() => {
    if (request && approverId) pinRef.current?.focus();
  }, [request, approverId]);

  if (!request) return null;

  const submit = () => {
    if (!approverId || pin.length !== 4) return;
    answer({ staff_id: approverId, pin });
  };

  return (
    <CustomModal
      isOpen={!!request}
      onOpenChange={() => answer(null)}
      size="md"
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
          <h2 className="text-lg font-bold text-foreground">Approval needed</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {request.message || "You don't have permission for this."} Ask someone who does to enter their PIN.
          </p>
        </div>
      }
      body={
        staff === null ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : staff.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nobody on the team can approve this. The owner can change permissions on the Staff page.</p>
        ) : (
          <form
            id="approval-form"
            className="py-2 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setApproverId(s.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                    approverId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  )}
                >
                  <span className="font-medium text-foreground block">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</span>
                </button>
              ))}
            </div>
            <label className="block">
              <span className="block text-xs text-muted-foreground mb-1">Their 4-digit PIN</span>
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full h-11 px-3 text-lg tracking-[0.5em] text-center border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40"
              />
            </label>
            {request.error && <p className="text-[12px] text-destructive">{request.error}</p>}
          </form>
        )
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
          <Button variant="outline" type="button" onClick={() => answer(null)} className="font-medium w-full">
            Cancel
          </Button>
          <Button
            type="submit"
            form="approval-form"
            disabled={!approverId || pin.length !== 4}
            className="bg-primary text-primary-foreground font-semibold w-full hover:bg-primary/90"
          >
            Approve
          </Button>
        </div>
      }
    />
  );
}
