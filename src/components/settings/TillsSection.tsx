import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import CustomModal from '@/components/modals/modal';
import { useTillStore } from '@/store/tillStore';
import { useAuthStore } from '@/store/authStore';

interface Till {
  id: string;
  name: string;
  created_by: string | null;
  date_created: string | null;
  last_seen_at: string | null;
}

/**
 * Tills: devices set up for the "Who's working?" screen and PIN sign-in. Other devices sign in
 * with email and password. Removing a till stops its key working at once (e.g. a lost device).
 */
export default function TillsSection() {
  const { tillId, tillName, setTill, clearTill } = useTillStore();
  const businessName = useAuthStore((s) => s.tenant?.name);
  const [tills, setTills] = useState<Till[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Till | null>(null);

  const load = () =>
    apiClient
      .get('/tenant/tills')
      .then((r) => setTills(r.data?.success?.data?.tills || []))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const register = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post('/tenant/tills', { name: name.trim() || 'Till' });
      const data = r.data?.success?.data;
      setTill({ key: data.till_key, id: data.till.id, name: data.till.name, businessName });
      toast.success(`${data.till.name} is set up. Staff can now sign in here with their PIN.`);
      setName('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to set up this till');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (till: Till) => {
    setBusy(true);
    try {
      await apiClient.delete(`/tenant/tills/${till.id}`);
      if (till.id === tillId) clearTill();
      toast.success(`${till.name} is no longer a till`);
      setRemoving(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to remove till');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
      <h2 className="text-xl font-bold font-header tracking-tighter -mt-1 mb-1 text-foreground">Tills</h2>
      <p className="text-sm text-muted-foreground border-b mb-6 pb-4">
        Tills show the "Who's working?" screen, where staff tap their name and enter their PIN. Phones and laptops sign in with email
        and password.
      </p>

      {/* This device */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <h4 className="font-bold text-foreground text-[15px]">This device</h4>
        {tillId ? (
          <p className="text-sm text-muted-foreground mt-1">
            Set up as a till: <span className="font-semibold text-foreground">{tillName}</span>
          </p>
        ) : (
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Name, e.g. Front counter"
              className="flex-1 h-10 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40"
            />
            <Button onClick={register} disabled={busy} className="bg-primary text-primary-foreground font-semibold">
              Use this device as a till
            </Button>
          </div>
        )}
      </div>

      {/* All tills */}
      <h4 className="font-bold text-foreground text-[15px] mb-2">Registered tills</h4>
      {tills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tills yet.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {tills.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {t.name}
                  {t.id === tillId && <span className="ml-2 text-[10px] font-semibold text-primary">This device</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.created_by ? `Set up by ${t.created_by}` : 'Set up'}
                  {t.last_seen_at ? ` · last used ${formatDistanceToNow(new Date(t.last_seen_at), { addSuffix: true })}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRemoving(t)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <CustomModal
        isOpen={!!removing}
        onOpenChange={() => !busy && setRemoving(null)}
        size="sm"
        header={<h2 className="text-lg font-bold px-1 pt-2">Remove {removing?.name}?</h2>}
        body={
          <p className="py-2 text-sm text-muted-foreground">
            That device stops showing "Who's working?" straight away. Staff there will need to sign in with email and password.
          </p>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-1">
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={busy} className="w-full">
              Cancel
            </Button>
            <Button onClick={() => removing && remove(removing)} disabled={busy} className="w-full !bg-destructive text-white hover:opacity-80 font-semibold">
              Remove till
            </Button>
          </div>
        }
      />
    </section>
  );
}
