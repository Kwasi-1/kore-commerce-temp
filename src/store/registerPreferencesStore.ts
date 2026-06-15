import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RegisterPreferences {
  showProductImages: boolean;
  gridDensity: 'compact' | 'normal' | 'large';
  showStockCount: boolean;
  defaultPriceType: 'retail' | 'wholesale';
  soundEffectsEnabled: boolean;
}

interface RegisterPreferencesState extends RegisterPreferences {
  setPreference: <K extends keyof RegisterPreferences>(key: K, value: RegisterPreferences[K]) => void;
  togglePreference: (key: 'showProductImages' | 'showStockCount' | 'soundEffectsEnabled') => void;
}

export const useRegisterPreferencesStore = create<RegisterPreferencesState>()(
  persist(
    (set) => ({
      showProductImages: false, // Default to disabled as requested
      gridDensity: 'normal',
      showStockCount: true,
      defaultPriceType: 'retail',
      soundEffectsEnabled: true,

      setPreference: (key, value) => set({ [key]: value }),
      togglePreference: (key) => set((state) => ({ [key]: !state[key] })),
    }),
    {
      name: 'headlesspos-register-preferences',
    }
  )
);

// Synthesized clean POS beep chime using Web Audio API
export const playCartChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Classic short, premium register beep
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime); // subtle volume
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12); // fast decay
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn("Audio Context playback blocked or unsupported:", e);
  }
};
