import { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CustomInputTextField, SearchableSelectField } from '@/components/shared/text-field';
import { useApprovalStore } from '@/store/approvalStore';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/roles';

interface TillStaff {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

// Most likely approvers first
const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, manager: 2, cashier: 3 };
const MASK = '•';

/**
 * Asks someone who has the needed permission to approve one action with their till PIN.
 * Mounted once at the app root; opened by the API client (see api/client.ts).
 */
export default function ApprovalModal() {
  const { request, answer } = useApprovalStore();
  const myId = useAuthStore((s) => s.staffUser?.id);
  const [staff, setStaff] = useState<TillStaff[] | null>(null);
  const [approverId, setApproverId] = useState<string>('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!request) return;
    setPin('');
    apiClient
      .get('/pos/auth/staff', { skipApproval: true })
      .then((r) => {
        const all: TillStaff[] = r.data?.success?.data?.staff || [];
        const eligible = all
          .filter((s) => s.id !== myId && request.permissions.some((p) => s.permissions.includes(p)))
          .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name));
        setStaff(eligible);
        // Keep the last pick (e.g. after a wrong PIN); pick automatically if there's only one
        setApproverId((current) =>
          current && eligible.some((s) => s.id === current) ? current : eligible.length === 1 ? eligible[0].id : ''
        );
      })
      .catch(() => setStaff([]));
  }, [request, myId]);

  if (!request) return null;

  // The PIN field is plain text showing dots (digits live in state), so browsers never treat it
  // as a password to fill in or save
  const onPinChange = (raw: string) => {
    const kept = (raw.match(new RegExp(MASK, 'g')) || []).length;
    const typed = raw.replace(new RegExp(MASK, 'g'), '').replace(/\D/g, '');
    setPin((pin.slice(0, kept) + typed).slice(0, 4));
  };

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
        <div className="pt-2 px-1">
          <h2 className="text-lg font-bold text-foreground">Approval needed</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-[1.6]">
            {request.message || "You don't have permission for this."}
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
            autoComplete="off"
            className="py-2 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <SearchableSelectField
              label="Who's approving?"
              placeholder="Type a name"
              value={approverId}
              options={staff.map((s) => ({ label: s.name, value: s.id, description: ROLE_LABELS[s.role] || s.role }))}
              onValueChange={(v) => {
                setApproverId(v || '');
                setPin('');
              }}
            />
            <CustomInputTextField
              label="Their PIN"
              name={`approval-code-${request.permissions.join('-')}`}
              type="text"
              inputMode="numeric"
              value={MASK.repeat(pin.length)}
              onChange={(e) => onPinChange(e.target.value)}
              placeholder="4 digits"
              disabled={!approverId}
              inputProps={{ autoComplete: 'off', autoCorrect: 'off', spellCheck: false, 'data-lpignore': 'true', 'data-1p-ignore': 'true' } as any}
            />
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
