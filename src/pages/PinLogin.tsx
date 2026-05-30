import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loginWithPin } from '@/api/auth';
import apiClient from '@/api/client';
import NumPad from '@/components/pos/NumPad';
import toast from 'react-hot-toast';
import { UserSquare2 } from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function PinLogin() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedStaffEmail, setSelectedStaffEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    // Fetch staff list for the dropdown
    // Note: The prompt implies this is a public-ish call scoped by tenant API key
    // We pass it directly if available in the env, or just rely on the interceptor if already authenticated as a terminal
    const fetchStaff = async () => {
      try {
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        const response = await apiClient.get('/tenant/staff', {
          headers: {
            'X-API-Key': apiKey,
          },
        });
        setStaffList(response.data.data.staff || []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        toast.error('Could not load staff members. Are you logged in as a terminal?');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const handlePinSubmit = async (pin: string) => {
    if (!selectedStaffEmail) {
      toast.error('Please select your name first');
      return;
    }

    try {
      const toastId = toast.loading('Authenticating...');
      const response = await loginWithPin(selectedStaffEmail, pin);
      
      const { access_token, refresh_token, staff, tenant } = response.data;
      
      login(access_token, refresh_token, staff, tenant);
      toast.success('Logged in successfully', { id: toastId });
      
      // Navigate to POS Register since PIN login is for cashiers
      navigate('/pos/register');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error?.message || 'Invalid PIN');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pos-surface-app dark:bg-pos-dark-app p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-pos-dark-card rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-pos-dark-border">
        <div className="bg-pos-accent p-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-pos-accent-text mb-4 shadow-sm">
            <UserSquare2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-pos-accent-text">Quick Login</h1>
          <p className="text-pos-accent-text/80 text-sm mt-1">Enter your PIN to access the register</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Staff Dropdown */}
          <div className="space-y-2">
            <label htmlFor="staff-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Cashier
            </label>
            <select
              id="staff-select"
              value={selectedStaffEmail}
              onChange={(e) => setSelectedStaffEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-pos-dark-border bg-white dark:bg-pos-dark-panel text-gray-900 dark:text-gray-100 shadow-sm focus:border-pos-accent focus:ring-pos-accent sm:text-lg py-3 px-4 transition-colors"
              disabled={isLoading}
            >
              <option value="" disabled>
                {isLoading ? 'Loading staff...' : 'Choose your name'}
              </option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.email}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>

          {/* NumPad for PIN */}
          <div className="pt-4">
            <NumPad onComplete={handlePinSubmit} maxLength={4} mask={true} />
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4"
            >
              Switch to Password Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
