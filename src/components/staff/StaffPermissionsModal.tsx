import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@nextui-org/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/roles';
import { cn } from '@/lib/utils';

interface Permission {
  key: string;
  label: string;
  description: string;
}

interface Catalog {
  groups: { group: string; permissions: Permission[] }[];
  role_defaults: Record<string, string[]>;
  grantable: string[];
  owner_granted: string[];
  can_customise_cashiers: boolean;
}

interface Props {
  staff: any | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Waiting on the person: leave the group / close with unsaved changes, or reset everything */
type Confirm = 'leave' | 'close' | 'reset' | null;

/**
 * Edit one person's permissions. A list of groups; open one to change its switches, and save it
 * before leaving (the footer only shows once something has changed). Switches start at what they
 * can do now (role defaults plus any changes); only differences from the role's defaults are
 * saved. Rules are enforced by the backend (security/permissions.py); this mirrors them to lock
 * switches with a reason.
 */
export default function StaffPermissionsModal({ staff, onClose, onSaved }: Props) {
  const isOwner = useAuthStore((s) => s.staffUser?.role) === 'owner';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  // The person as last saved; updated from each save so the modal can stay open
  const [saved, setSaved] = useState<any | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => new Set<string>(saved?.effective_permissions || []), [saved]);

  useEffect(() => {
    if (!staff) return;
    setSaved(staff);
    setOpenGroup(null);
    setConfirm(null);
    apiClient
      .get('/tenant/staff/permissions/catalog')
      .then((r) => setCatalog(r.data?.success?.data))
      .catch(() => toast.error('Failed to load permissions'));
  }, [staff]);

  useEffect(() => {
    setDraft(Object.fromEntries([...current].map((k) => [k, true])));
  }, [current]);

  // Opening someone else: wait for the effect to switch over rather than flash the last person
  if (!staff || !saved || saved.id !== staff.id) return null;

  const name = `${saved.first_name || ''} ${saved.last_name || ''}`.trim() || saved.email;
  const roleLabel = ROLE_LABELS[saved.role] || saved.role;
  const defaults = new Set(catalog?.role_defaults?.[saved.role] || []);
  const planLocked = saved.role === 'cashier' && catalog && !catalog.can_customise_cashiers;
  const customised = Object.keys(saved.permissions || {}).length > 0;

  // "Manage admins" only applies to admins
  const visible = (perms: Permission[]) => perms.filter((p) => p.key !== 'staff.manage_admins' || saved.role === 'admin');
  const groups = (catalog?.groups || []).map((g) => ({ ...g, permissions: visible(g.permissions) })).filter((g) => g.permissions.length > 0);
  const group = groups.find((g) => g.group === openGroup) || null;
  const changed = (group?.permissions || []).map((p) => p.key).filter((k) => !!draft[k] !== current.has(k));

  const lockReason = (key: string): string | null => {
    if (!catalog) return null;
    if (planLocked) return 'Needs Business or Unlimited seats';
    if (catalog.owner_granted.includes(key) && !isOwner) return 'Owner only';
    if (!catalog.grantable.includes(key)) return "You don't have this";
    return null;
  };

  const discard = () => setDraft(Object.fromEntries([...current].map((k) => [k, true])));

  /** Saves and stays open; true when it worked */
  const save = async (body: any, message: string) => {
    setSaving(true);
    try {
      const r = await apiClient.put(`/tenant/staff/${saved.id}/permissions`, body);
      const next = r.data?.success?.data?.staff;
      if (next) setSaved(next);
      toast.success(message);
      onSaved();
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to save permissions');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = () => save({ permissions: Object.fromEntries(changed.map((k) => [k, !!draft[k]])) }, `${group?.group} updated`);

  // Back, ✕, Escape and clicking outside all ask first when the open group has unsaved changes
  const back = () => (changed.length ? setConfirm('leave') : setOpenGroup(null));
  const requestClose = () => {
    if (saving) return;
    if (changed.length) setConfirm('close');
    else onClose();
  };
  const finish = (after: Confirm) => {
    setConfirm(null);
    if (after === 'leave') setOpenGroup(null);
    if (after === 'close') onClose();
  };

  const footer = (() => {
    if (confirm === 'reset') {
      return (
        <>
          <p className="text-sm text-foreground min-w-0">Reset all permissions to {roleLabel} defaults?</p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => (await save({ reset: true }, 'Back to role defaults')) && setConfirm(null)}
              className="bg-primary text-primary-foreground font-semibold px-5"
            >
              {saving ? 'Resetting…' : 'Reset'}
            </Button>
          </div>
        </>
      );
    }
    if (!group || (!changed.length && !confirm)) return null;
    const asking = confirm === 'leave' || confirm === 'close';
    return (
      <>
        <p className="text-sm text-foreground min-w-0">
          {asking ? `Save changes to ${group.group}?` : `${changed.length} unsaved change${changed.length > 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => {
              discard();
              finish(confirm);
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => (await saveGroup()) && finish(confirm)}
            className="bg-primary text-primary-foreground font-semibold px-5"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </>
    );
  })();

  return (
    <CustomModal
      isOpen={!!staff}
      onOpenChange={requestClose}
      placement="right"
      size="lg"
      classNames={{ base: 'sm:w-[520px]' }}
      header={
        <div className="pt-3 px-2 pb-2 border-b border-border/80">
          {group ? (
            <div className="flex items-center gap-2 -ml-1.5">
              <button
                type="button"
                onClick={back}
                disabled={saving}
                aria-label="Back to all permissions"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Icon icon="solar:alt-arrow-left-linear" className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold">{group.group}</h2>
            </div>
          ) : (
            <h2 className="text-xl font-bold">Permissions</h2>
          )}
          <p className="text-sm text-muted-foreground font-normal">
            {name} · {roleLabel}
          </p>
        </div>
      }
      body={
        !catalog ? (
          <div className="py-10 flex justify-center">
            <Spinner />
          </div>
        ) : group ? (
          <div key={group.group} className="py-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="rounded-lg border border-border divide-y divide-border">
              {group.permissions.map((p) => {
                const on = !!draft[p.key];
                const reason = lockReason(p.key);
                const differsFromDefault = on !== defaults.has(p.key);
                return (
                  <div key={p.key} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{p.label}</span>
                        {differsFromDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">Changed</span>
                        )}
                        {reason && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{reason}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={on}
                      isDisabled={!!reason || saving || !!confirm}
                      onValueChange={(v) => setDraft((d) => ({ ...d, [p.key]: v }))}
                      aria-label={p.label}
                      className={cn('shrink-0', reason && 'opacity-60')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div key="groups" className="py-2 space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
            {planLocked && (
              <p className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2">
                Cashiers use the default permissions on your plan. Custom cashier permissions need the Business plan or the Unlimited seats add-on.
              </p>
            )}
            <div className="rounded-lg border border-border divide-y divide-border">
              {groups.map((g) => {
                const on = g.permissions.filter((p) => current.has(p.key)).length;
                return (
                  <button
                    key={g.group}
                    type="button"
                    onClick={() => setOpenGroup(g.group)}
                    disabled={!!confirm}
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="text-sm font-medium text-foreground">{g.group}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {on} of {g.permissions.length} on
                      </span>
                      <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </button>
                );
              })}
            </div>
            {customised && !planLocked && !confirm && (
              <button
                type="button"
                onClick={() => setConfirm('reset')}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to defaults
              </button>
            )}
          </div>
        )
      }
      footer={
        footer && (
          <div className="flex items-center justify-between gap-3 w-full pt-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {footer}
          </div>
        )
      }
    />
  );
}
