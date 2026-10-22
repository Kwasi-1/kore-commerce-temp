import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loginWithPassword } from '@/api/auth';
import { useTillStore, TillStaff } from '@/store/tillStore';
import SetPinModal from '@/components/pos/SetPinModal';
import apiClient from '@/api/client';
import { APP_CONFIG } from '@/config/app.config';
import NumPad from '@/components/pos/NumPad';
import { toast } from 'sonner';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomInputTextField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import koreLogo from '@/assets/images/kore.png';

type LoginView = 'staff_grid' | 'pin_entry' | 'manual_login';

export default function Login() {
  // "Who's working?" only appears on a registered till (POS Settings > Tills); other devices sign
  // in with email and password. The grid comes from the till's own key, cached for offline use.
  const { tillKey, tillName, businessName, staff: cachedStaff, setDirectory, clearTill } = useTillStore();
  const [staffList, setStaffList] = useState<TillStaff[]>(cachedStaff);
  const [isLoadingStaff, setIsLoadingStaff] = useState(!!tillKey && cachedStaff.length === 0);

  const [currentView, setCurrentView] = useState<LoginView>(tillKey ? 'staff_grid' : 'manual_login');
  const [selectedStaff, setSelectedStaff] = useState<TillStaff | null>(null);
  const [pinKey, setPinKey] = useState(0); // remounts the keypad to clear it after a wrong PIN
  const [defaultPinSession, setDefaultPinSession] = useState(false);

  // Manual login / Password entry states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (!tillKey) return;
    apiClient
      .get('/pos/auth/till')
      .then((response) => {
        const data = response.data.success?.data || {};
        const staff: TillStaff[] = data.staff || [];
        setStaffList(staff);
        setDirectory({ businessName: data.business?.name, tillName: data.till?.name, staff });
        if (staff.length === 0) setCurrentView('manual_login');
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          // The till was removed (or its key is no longer valid): back to a normal device
          clearTill();
          setStaffList([]);
          setCurrentView('manual_login');
          toast.error('This device is no longer set up as a till. Sign in with your email.');
        }
        // Offline: keep showing the saved staff list
      })
      .finally(() => setIsLoadingStaff(false));
  }, [tillKey, setDirectory, clearTill]);

  const handleSuccessfulAuth = (access_token: string, refresh_token: string, staff: any, tenant: any, isFirstLogin = false, graceInfo = null) => {
    login(access_token, refresh_token, staff, tenant, isFirstLogin, graceInfo);

    // Smart Routing
    if (staff.role === 'cashier') {
      navigate('/pos/register');
    } else {
      // Owners / Managers go to dashboard
      navigate('/dashboard');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedStaff || isAuthenticating) return;
    setIsAuthenticating(true);
    const toastId = toast.loading('Checking PIN...');

    try {
      // The till's key goes with the request (api/client.ts)
      const response = await apiClient.post('/pos/auth/verify-pin', { staff_id: selectedStaff.id, pin });
      const data = response.data.success?.data || {};
      toast.dismiss(toastId);
      if (data.is_default_pin) {
        // Still on 1234: choose a personal PIN first (that step signs them in)
        setDefaultPinSession(true);
        return;
      }
      toast.success(`Welcome, ${selectedStaff.first_name}`);
      handleSuccessfulAuth(data.access_token, data.refresh_token, data.staff, data.tenant, false, data.grace_info);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.response?.data?.error?.message || 'Incorrect PIN');
      setPinKey((k) => k + 1);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginEmail = email;

    if (!loginEmail || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsAuthenticating(true);
    const toastId = toast.loading('Authenticating...');

    try {
      const response = await loginWithPassword(loginEmail, password);
      const { access_token, refresh_token, staff, tenant, is_first_login, grace_info } = response;
      toast.success('Welcome back!', { id: toastId });
      handleSuccessfulAuth(access_token, refresh_token, staff, tenant, is_first_login, grace_info);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // On a till everyone signs in with their PIN; owner-only actions still ask for a password
  const selectUser = (user: TillStaff) => {
    setSelectedStaff(user);
    setCurrentView('pin_entry');
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
        <h1 className="text-2xl font-bold text-foreground">Who's working?</h1>
        <p className="text-muted-foreground mt-1">
          {businessName ? `${businessName}${tillName ? ` · ${tillName}` : ''}` : 'Select your profile to continue'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto px-2 pb-4 scrollbar-hide">
        {isLoadingStaff ? (
          <div className="col-span-2 py-8 text-center text-muted-foreground">Loading staff...</div>
        ) : (
          staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => selectUser(staff)}
              className="flex flex-col items-center p-6 bg-muted hover:bg-primary/10 dark:hover:bg-primary/20 border border-border rounded-2xl transition-all hover:scale-105 hover:border-primary/30 hover:shadow-sm group"
            >
              <div className="h-16 w-16 rounded-full bg-card text-card-foreground flex items-center justify-center text-primary shadow-sm mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="text-xl font-bold uppercase">
                  {staff.first_name?.[0] || '?'}
                </span>
              </div>
              <span className="font-semibold text-foreground mb-1">
                {staff.first_name}
              </span>
              <span className="text-xs text-muted-foreground capitalize tracking-wide">
                {staff.role}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-border text-center">
        <button
          onClick={() => setCurrentView('manual_login')}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
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
        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground dark:hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to users
      </button>

      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <span className="text-2xl font-bold uppercase">
            {selectedStaff?.first_name?.[0] || '?'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-foreground">Hi, {selectedStaff?.first_name}</h2>
        <p className="text-muted-foreground mt-1">Enter your PIN</p>
      </div>

      <NumPad key={pinKey} onComplete={handlePinSubmit} maxLength={4} mask={true} />
    </motion.div>
  );

  const renderManualLogin = () => (
    <motion.div
      key="manual_login"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="text-center mb-8 fontheader spacing-sm">
        <div className="hidden mx-auto h-[65.5px] w-[65.5px] mb-6 md:flex items-center justify-center rounded-[0.9rem] bg-white/5 border border-foreground/[0.08] dark:border-white/10 shadw backdrop-blur-sm">
          <Icon icon={'arcticons:shop-apotheke-redcare'} className="h-8 w-8" />
        </div>
        <div className="md:hidden mx-auto h-fit w-fit p-[1.5px] mb-6 flex items-center justify-center rounded-[0.9rem] bg-white/5 border border-border/5 dark:border-white/10 shadow backdrop-blur-sm">
          <img
            src={koreLogo}
            alt="Kore Commerce Logo"
            className="h-16 w-16 object-contain mx-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-foreground !tracking-tighter">{APP_CONFIG.name}</h2>
        <p className="text-muted-foreground mt-1">Sign in to your workspace</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md md:max-w-lg mx-auto">
        <CustomInputTextField
          label="Email Address"
          type="email"
          required
          value={email}
          placeholder="admin@store.com"
          onChange={(e: any) => setEmail(e?.target ? e.target.value : e)}
        />

        <CustomInputTextField
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          value={password}
          placeholder="••••••••"
          onChange={(e: any) => setPassword(e?.target ? e.target.value : e)}
          endContent={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground/80 hover:text-foreground/80 p-1 transition-colors duration-300 focus:outline-none cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          }
        />
        <Button
          type="submit"
          disabled={isAuthenticating}
          className="w-full py-3 px-4 h-auto bg-primary text-primary-foreground font-bold rounded-xl shadow shadow-pos-accent/20 hover:shadow-pos-accent/40 active:scale-95 disabled:opacity-50 transition-all mt-4"
        >
          {isAuthenticating ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {tillKey && staffList.length > 0 && (
        <div className="mt-8 text-center border-t border-border pt-6">
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              setCurrentView('staff_grid');
            }}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Show Staff Quick Login
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-background font-header spacing-sm">
      {/* Left side - Dynamic Auth Panel */}
      <div className="w-full lg:max-w-[480px] xl:max-w-xl 2xl:min-w-[36rem] 2xl:max-w-full 2xl:w-[37%] flex flex-col justify-center px-8 lg:px-12 py-12 relative z-10 bg-card dark:bg-card/60 text-card-foreground shadow-2xl m-2 lg:ml-5 lg:my-5 lg:mr-0 rounded-2xl">
        <AnimatePresence mode="wait">
          {currentView === 'staff_grid' && renderStaffGrid()}
          {currentView === 'pin_entry' && renderPinEntry()}
          {currentView === 'manual_login' && renderManualLogin()}
        </AnimatePresence>
        <SetPinModal
          isOpen={defaultPinSession}
          staff={selectedStaff ? { id: selectedStaff.id, name: selectedStaff.first_name, role: selectedStaff.role } : null}
          onSuccess={(resData: any) => {
            setDefaultPinSession(false);
            if (resData?.access_token) {
              handleSuccessfulAuth(resData.access_token, resData.refresh_token, resData.staff, resData.tenant, false, resData.grace_info);
            }
          }}
          onCancel={() => {
            setDefaultPinSession(false);
            setPinKey((k) => k + 1);
          }}
        />
      </div>

      {/* Right side - Hero / Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-muted/10 dark:bg-background relative overflow-hidden">
        {/* Subtle Tech Grid Pattern with Radial Falloff */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:66px_66px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 dark:opacity-20 pointer-events-none" />

        {/* Ambient Brand Halos */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-primary/10 dark:bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-md text-center relative z-10 px6">
          {/* Official Brand Logo Glass Tile */}
          <div className="mb-6 inline-flex p-2 rounded-3xl bg-card/60 dark:bg-white/[0.04] backdrop-blur-xl border border-border/50 dark:border-white/10 shadow-2xl">
            <img
              src={koreLogo}
              alt="Kore Commerce Logo"
              className="h-24 w-24 object-contain"
            />
          </div>
          <h2 className="text-4xl font-extrabold text-foreground mb-4 !tracking-tighter">
            Next-Gen Retail
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Manage your sales, inventory, and staff all from one intelligent terminal. Let's make today a great day.
          </p>
        </div>
      </div>
    </div>
  );
}
