import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loginWithPin, loginWithPassword } from '@/api/auth';
import apiClient from '@/api/client';
import NumPad from '@/components/pos/NumPad';
import toast from 'react-hot-toast';
import { UserSquare2, ChevronLeft, Lock, Mail, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

type LoginView = 'staff_grid' | 'pin_entry' | 'password_entry' | 'manual_login';

export default function Login() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  
  const [currentView, setCurrentView] = useState<LoginView>('staff_grid');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  
  // Manual login / Password entry states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const apiKey = import.meta.env.VITE_TENANT_API_KEY || '';
        if (!apiKey) {
          // If no API key is configured, fallback immediately to manual login
          setCurrentView('manual_login');
          setIsLoadingStaff(false);
          return;
        }

        const response = await apiClient.get('/tenant/staff', {
          headers: { 'X-API-Key': apiKey },
        });
        
        const staff = response.data.data.staff || [];
        setStaffList(staff);
        
        if (staff.length === 0) {
          setCurrentView('manual_login');
        }
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        setCurrentView('manual_login');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaff();
  }, []);

  const handleSuccessfulAuth = (access_token: string, refresh_token: string, staff: any, tenant: any) => {
    login(access_token, refresh_token, staff, tenant);
    
    // Smart Routing
    if (staff.role === 'cashier') {
      navigate('/pos/register');
    } else {
      // Owners / Managers go to dashboard
      navigate('/dashboard');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedStaff) return;
    setIsAuthenticating(true);
    const toastId = toast.loading('Authenticating...');
    
    try {
      const response = await loginWithPin(selectedStaff.email, pin);
      const { access_token, refresh_token, staff, tenant } = response.data;
      toast.success('Logged in successfully', { id: toastId });
      handleSuccessfulAuth(access_token, refresh_token, staff, tenant);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.response?.data?.error?.message || 'Invalid PIN');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginEmail = selectedStaff ? selectedStaff.email : email;
    
    if (!loginEmail || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsAuthenticating(true);
    const toastId = toast.loading('Authenticating...');

    try {
      const response = await loginWithPassword(loginEmail, password);
      const { access_token, refresh_token, staff, tenant } = response.data;
      toast.success('Welcome back!', { id: toastId });
      handleSuccessfulAuth(access_token, refresh_token, staff, tenant);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const selectUser = (user: StaffUser) => {
    setSelectedStaff(user);
    if (user.role === 'cashier') {
      setCurrentView('pin_entry');
    } else {
      setCurrentView('password_entry');
    }
  };

  const goBack = () => {
    setSelectedStaff(null);
    setPassword('');
    setCurrentView('staff_grid');
  };

  const renderStaffGrid = () => (
    <motion.div 
      key="staff_grid"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Who's working?</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Select your profile to continue</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto px-2 pb-4 scrollbar-hide">
        {isLoadingStaff ? (
          <div className="col-span-2 py-8 text-center text-gray-500">Loading staff...</div>
        ) : (
          staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => selectUser(staff)}
              className="flex flex-col items-center p-6 bg-gray-50 dark:bg-pos-dark-panel hover:bg-pos-accent/10 dark:hover:bg-pos-accent/20 border border-gray-100 dark:border-pos-dark-border rounded-2xl transition-all hover:scale-105 hover:border-pos-accent/30 hover:shadow-sm group"
            >
              <div className="h-16 w-16 rounded-full bg-white dark:bg-pos-dark-card flex items-center justify-center text-pos-accent shadow-sm mb-3 group-hover:bg-pos-accent group-hover:text-white transition-colors">
                <span className="text-xl font-bold uppercase">
                  {staff.first_name?.[0] || staff.name[0]}
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white mb-1">
                {staff.first_name || staff.name.split(' ')[0]}
              </span>
              <span className="text-xs text-gray-500 capitalize tracking-wide">
                {staff.role}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-pos-dark-border text-center">
        <button
          onClick={() => setCurrentView('manual_login')}
          className="text-sm font-medium text-gray-500 hover:text-pos-accent transition-colors"
        >
          Login Manually
        </button>
      </div>
    </motion.div>
  );

  const renderPinEntry = () => (
    <motion.div 
      key="pin_entry"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <button 
        onClick={goBack}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to users
      </button>

      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-pos-accent/10 flex items-center justify-center text-pos-accent mb-4">
          <span className="text-2xl font-bold uppercase">
            {selectedStaff?.first_name?.[0] || selectedStaff?.name[0]}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hi, {selectedStaff?.first_name || selectedStaff?.name.split(' ')[0]}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Enter your POS PIN</p>
      </div>

      <NumPad onComplete={handlePinSubmit} maxLength={4} mask={true} />
    </motion.div>
  );

  const renderPasswordEntry = () => (
    <motion.div 
      key="password_entry"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <button 
        onClick={goBack}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to users
      </button>

      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-pos-accent/10 flex items-center justify-center text-pos-accent mb-4">
          <UserSquare2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Access</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Enter password for {selectedStaff?.email}</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-pos-dark-border rounded-xl bg-white dark:bg-pos-dark-panel text-gray-900 dark:text-white focus:ring-pos-accent focus:border-pos-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isAuthenticating}
          className="w-full py-3 px-4 bg-pos-accent text-white font-bold rounded-xl shadow-sm hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center"
        >
          {isAuthenticating ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </motion.div>
  );

  const renderManualLogin = () => (
    <motion.div 
      key="manual_login"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-pos-accent flex items-center justify-center text-white mb-6 shadow-lg shadow-pos-accent/30">
          <Store className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">HeadlessPOS</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your workspace</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-pos-dark-border rounded-xl bg-white dark:bg-pos-dark-panel text-gray-900 dark:text-white focus:ring-pos-accent focus:border-pos-accent transition-colors"
              placeholder="admin@store.com"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-pos-dark-border rounded-xl bg-white dark:bg-pos-dark-panel text-gray-900 dark:text-white focus:ring-pos-accent focus:border-pos-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isAuthenticating}
          className="w-full py-3 px-4 bg-pos-accent text-white font-bold rounded-xl shadow-lg shadow-pos-accent/20 hover:shadow-pos-accent/40 active:scale-95 disabled:opacity-50 transition-all mt-4"
        >
          {isAuthenticating ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {staffList.length > 0 && (
        <div className="mt-8 text-center border-t border-gray-100 dark:border-pos-dark-border pt-6">
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              setCurrentView('staff_grid');
            }}
            className="text-sm font-medium text-gray-500 hover:text-pos-accent transition-colors"
          >
            Show Staff Quick Login
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-pos-dark-app">
      {/* Left side - Dynamic Auth Panel */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 lg:px-12 py-12 relative z-10 bg-white dark:bg-pos-dark-card shadow-2xl">
        <AnimatePresence mode="wait">
          {currentView === 'staff_grid' && renderStaffGrid()}
          {currentView === 'pin_entry' && renderPinEntry()}
          {currentView === 'password_entry' && renderPasswordEntry()}
          {currentView === 'manual_login' && renderManualLogin()}
        </AnimatePresence>
      </div>

      {/* Right side - Hero / Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-pos-accent/5 dark:bg-pos-dark-app relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pos-accent/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>
        
        <div className="max-w-md text-center relative z-10">
          <div className="mb-8 inline-flex p-4 rounded-3xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
             <Store className="h-16 w-16 text-pos-accent" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Next-Gen Retail
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Manage your sales, inventory, and staff all from one intelligent terminal. Let's make today a great day.
          </p>
        </div>
      </div>
    </div>
  );
}
