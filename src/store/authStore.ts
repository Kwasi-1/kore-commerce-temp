import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  plan: string;
  track_expiry_enabled?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  staffUser: StaffUser | null;
  tenant: Tenant | null;
  isFirstLogin: boolean;
  login: (token: string, refreshToken: string, staffUser: StaffUser, tenant: Tenant, isFirstLogin?: boolean) => void;
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
      login: (token, refreshToken, staffUser, tenant, isFirstLogin = false) =>
        set({ token, refreshToken, staffUser, tenant, isFirstLogin }),
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
