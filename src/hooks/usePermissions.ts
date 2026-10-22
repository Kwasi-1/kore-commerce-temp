import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { isManagement } from '@/utils/roles';

/**
 * Staff permissions (mirrors security/permissions.py on the backend, which is the source of truth
 * and also enforces them). The owner always has every permission.
 *
 * Permissions come from /tenant/features (refreshed with the plan) for the signed-in person, or
 * from the login response until that has loaded.
 */
export function permissionsAllow(role: string | undefined | null, perms: string[] | null, keys: string | string[]) {
  if (role === 'owner') return true;
  const wanted = Array.isArray(keys) ? keys : [keys];
  // No permission data yet (e.g. a session from before permissions existed): fall back to the
  // old rule of "back office is for management roles"
  if (!perms) return isManagement(role);
  return wanted.some((k) => perms.includes(k));
}

export function useCan() {
  const staffId = useAuthStore((s) => s.staffUser?.id);
  const role = useAuthStore((s) => s.staffUser?.role);
  const fromLogin = useAuthStore((s) => s.staffUser?.effective_permissions);
  const fromFeatures = useFeaturesStore((s) => s.permissions);
  const featuresFor = useFeaturesStore((s) => s.permissionsFor);
  // Only trust the features copy if it belongs to whoever is signed in now (shared tills)
  const perms = (fromFeatures && featuresFor === staffId ? fromFeatures : fromLogin) ?? null;

  return useCallback((keys: string | string[]) => permissionsAllow(role, perms, keys), [role, perms]);
}
