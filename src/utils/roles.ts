/**
 * Staff roles (mirrors the backend StaffRole):
 * - owner: one per business. Only the owner handles billing, payouts, closing the account and admins.
 * - admin: everything the owner can do except those owner-only actions.
 * - manager: back office, manages cashiers only.
 * - cashier: POS only.
 */
export type StaffRoleKey = 'owner' | 'admin' | 'manager' | 'cashier';

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
};

export const isOwner = (role?: string | null) => role === 'owner';

/** Owner or admin: full back-office access. */
export const isOwnerOrAdmin = (role?: string | null) => role === 'owner' || role === 'admin';

/** Owner, admin or manager. */
export const isManagement = (role?: string | null) =>
  role === 'owner' || role === 'admin' || role === 'manager';

/** Route/role-list check where an admin passes wherever an owner does (same rule as the backend). */
export const roleAllowed = (role: string | undefined | null, allowed: string[]) =>
  !!role && (allowed.includes(role) || (role === 'admin' && allowed.includes('owner')));
