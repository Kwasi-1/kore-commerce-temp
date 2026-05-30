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
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  staffUser: StaffUser | null;
  tenant: Tenant | null;
  login: (token: string, refreshToken: string, staffUser: StaffUser, tenant: Tenant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      staffUser: null,
      tenant: null,
      login: (token, refreshToken, staffUser, tenant) =>
        set({ token, refreshToken, staffUser, tenant }),
      logout: () =>
        set({ token: null, refreshToken: null, staffUser: null, tenant: null }),
    }),
    {
      name: 'headlesspos-auth', // localStorage key
    }
  )
);
