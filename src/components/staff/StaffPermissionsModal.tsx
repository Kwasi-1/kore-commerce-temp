import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@nextui-org/react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/roles';
import { cn } from '@/lib/utils';

interface Catalog {
  groups: { group: string; permissions: { key: string; label: string; description: string }[] }[];
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

/**
 * Edit one person's permissions. Switches start at what they can do now (role defaults plus any
 * changes); only differences from the role's defaults are saved. Rules are enforced by the
 * backend (security/permissions.py); this mirrors them to lock switches with a reason.
 */
export default function StaffPermissionsModal({ staff, onClose, onSaved }: Props) {
  const isOwner = useAuthStore((s) => s.staffUser?.role) === 'owner';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => new Set<string>(staff?.effective_permissions || []), [staff]);

  useEffect(() => {
    if (!staff) return;
    setDraft(Object.fromEntries([...current].map((k) => [k, true])));
    apiClient
      .get('/tenant/staff/permissions/catalog')
      .then((r) => setCatalog(r.data?.success?.data))
      .catch(() => toast.error('Failed to load permissions'));
  }, [staff, current]);

  if (!staff) return null;

  const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;
  const defaults = new Set(catalog?.role_defaults?.[staff.role] || []);
  const planLocked = staff.role === 'cashier' && catalog && !catalog.can_customise_cashiers;

  const lockReason = (key: string): string | null => {
    if (!catalog) return null;
    if (planLocked) return 'Needs Business or Unlimited seats';
    if (catalog.owner_granted.includes(key) && !isOwner) return 'Owner only';
    if (!catalog.grantable.includes(key)) return "You don't have this";
    return null;
  };

  const changed = (catalog?.groups || [])
    .flatMap((g) => g.permissions.map((p) => p.key))
    .filter((k) => !!draft[k] !== current.has(k));
  const customised = Object.keys(staff.permissions || {}).length > 0;

  const save = async (body: any, message: string) => {
    setSaving(true);
    try {
      await apiClient.put(`/tenant/staff/${staff.id}/permissions`, body);
      toast.success(message);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={!!staff}
      onOpenChange={() => !saving && onClose()}
      placement="right"
      size="lg"
      classNames={{ base: 'sm:w-[520px]' }}
      header={
        <div className="pt-3 px-2 pb-2 border-b border-border/80">
          <h2 className="text-xl font-bold">Permissions</h2>
          <p className="text-sm text-muted-foreground font-normal">
            {name} · {ROLE_LABELS[staff.role] || staff.role}
          </p>
        </div>
      }
      body={
        !catalog ? (
          <div className="py-10 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="py-2 space-y-5">
            {planLocked && (
              <p className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2">
                Cashiers use the default permissions on your plan. Custom cashier permissions need the Business plan or the Unlimited seats add-on.
              </p>
            )}
            {catalog.groups.map((group) => {
              // "Manage admins" only applies to admins
              const perms = group.permissions.filter((p) => p.key !== 'staff.manage_admins' || staff.role === 'admin');
              if (perms.length === 0) return null;
              return (
                <section key={group.group}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{group.group}</h3>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {perms.map((p) => {
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
                            isDisabled={!!reason || saving}
                            onValueChange={(v) => setDraft((d) => ({ ...d, [p.key]: v }))}
                            aria-label={p.label}
                            className={cn('shrink-0', reason && 'opacity-60')}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )
      }
      footer={
        <div className="flex items-center justify-between gap-2 w-full pt-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving || !customised || !!planLocked}
            onClick={() => save({ reset: true }, 'Back to role defaults')}
          >
            Reset to defaults
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="hidden md:flex">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving || changed.length === 0}
              onClick={() => save({ permissions: Object.fromEntries(changed.map((k) => [k, !!draft[k]])) }, 'Permissions updated')}
              className="bg-primary text-primary-foreground font-semibold px-5"
            >
              {saving ? 'Saving…' : changed.length ? `Save ${changed.length} change${changed.length > 1 ? 's' : ''}` : 'Save'}
            </Button>
          </div>
        </div>
      }
    />
  );
}
