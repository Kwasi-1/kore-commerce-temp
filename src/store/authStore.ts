import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StaffUser {
  id: string;
  name: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface Tenant {
  id: string;
  name: string;         // mapped from business_name
  business_name?: string;
  plan: string;
  track_expiry_enabled?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  staffUser: StaffUser | null;
  tenant: Tenant | null;
  isFirstLogin: boolean;
  login: (token: string, refreshToken: string, staffUser: any, tenant: Tenant, isFirstLogin?: boolean) => void;
  logout: () => void;
  setTenant: (tenant: Tenant) => void;
  completeFirstLogin: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      staffUser: null,
      tenant: null,
      isFirstLogin: false,
      login: (token, refreshToken, staff, tenant, isFirstLogin = false) => {
        const enrichedUser: StaffUser = {
          ...staff,
          name: staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Admin User'
        };
        const enrichedTenant: Tenant = {
          ...tenant,
          name: tenant.name || tenant.business_name || 'My Business',
        };
        set({ token, refreshToken, staffUser: enrichedUser, tenant: enrichedTenant, isFirstLogin });
      },
      logout: () =>
        set({ token: null, refreshToken: null, staffUser: null, tenant: null, isFirstLogin: false }),
      setTenant: (tenant) => set({ tenant }),
      completeFirstLogin: () => set({ isFirstLogin: false }),
    }),
    {
      name: 'headlesspos-auth', // localStorage key
    }
  )
);
