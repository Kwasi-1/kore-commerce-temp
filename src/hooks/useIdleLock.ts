import { useEffect } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';

/** Something at the till that mustn't be interrupted by the idle lock (e.g. the payment window). */
export const useTillBusyStore = create<{ busy: number; setBusy: (on: boolean) => void }>((set) => ({
  busy: 0,
  setBusy: (on) => set((s) => ({ busy: Math.max(0, s.busy + (on ? 1 : -1)) })),
}));

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

/**
 * Locks the till after POS settings' "idle lock" minutes with no taps or typing. Skipped while
 * offline (the PIN that unlocks it is checked online) and while the till is busy (payment window).
 */
export function useIdleLock() {
  const minutes = useFeaturesStore((s) => s.posSettings?.pos_idle_lock_minutes || 0);

  useEffect(() => {
    if (!minutes) return;
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const auth = useAuthStore.getState();
      if (!auth.token || auth.isLocked) {
        last = Date.now();
        return;
      }
      if (!navigator.onLine || useTillBusyStore.getState().busy > 0) {
        last = Date.now();
        return;
      }
      if (Date.now() - last >= minutes * 60_000) auth.lock();
    }, 15_000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [minutes]);
}
