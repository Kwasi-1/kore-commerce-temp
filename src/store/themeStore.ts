import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

// Function to get initial theme from localStorage
const getInitialTheme = (): boolean => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('headlesspos-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Default to light mode as per specs
    return false;
  }
  return false;
};

// Function to apply theme class
const applyThemeClass = (isDark: boolean) => {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

// Apply initial theme on load
const initialIsDark = getInitialTheme();
applyThemeClass(initialIsDark);

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialIsDark,
  toggleTheme: () =>
    set((state) => {
      const newIsDark = !state.isDark;
      localStorage.setItem('headlesspos-theme', newIsDark ? 'dark' : 'light');
      applyThemeClass(newIsDark);
      return { isDark: newIsDark };
    }),
}));
