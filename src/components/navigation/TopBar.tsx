import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const staffUser = useAuthStore((state) => state.staffUser);
  const logout = useAuthStore((state) => state.logout);
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b bg-pos-surface-panel dark:bg-pos-dark-panel dark:border-pos-dark-border flex items-center justify-between px-6 transition-colors duration-200">
      <div className="flex items-center gap-4">
        {/* Mobile menu button could go here */}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <Moon className="h-5 w-5 text-gray-500" />
          )}
        </button>

        <div className="flex items-center gap-3 border-l dark:border-pos-dark-border pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {staffUser?.name || 'Staff User'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {staffUser?.role || 'Role'}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-pos-accent flex items-center justify-center text-pos-accent-text font-bold">
            <User className="h-5 w-5" />
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 p-2 text-gray-500 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
