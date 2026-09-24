import { create } from 'zustand';

export type NavDrawerGroup = 'reports' | 'settings' | 'ecommerce' | null;

interface NavDrawerState {
  isOpen: boolean;
  activeGroup: NavDrawerGroup;
  openDrawer: (group?: NavDrawerGroup) => void;
  closeDrawer: () => void;
  setIsOpen: (open: boolean) => void;
  setActiveGroup: (group: NavDrawerGroup) => void;
  toggleDrawer: () => void;
}

export const useNavDrawerStore = create<NavDrawerState>((set) => ({
  isOpen: false,
  activeGroup: null,
  openDrawer: (group = null) => set({ isOpen: true, activeGroup: group }),
  closeDrawer: () => set({ isOpen: false, activeGroup: null }),
  setIsOpen: (isOpen) => set((state) => ({ isOpen, activeGroup: isOpen ? state.activeGroup : null })),
  setActiveGroup: (activeGroup) => set({ activeGroup }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen, activeGroup: null })),
}));
