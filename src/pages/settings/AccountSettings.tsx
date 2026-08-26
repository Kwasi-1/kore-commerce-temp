import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { CustomInputTextField } from '@/components/shared/text-field';
import CustomModal from '@/components/modals/modal';

export default function AccountSettings() {
  const { staffUser, tenant, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Update & Cache state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date'>('idle');

  // Sign out modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPass(true);
    try {
      await apiClient.post('/auth/staff/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to change password';
      toast.error(msg);
    } finally {
      setIsChangingPass(false);
    }
  };

  // Manual check for PWA / worker updates
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          for (const reg of registrations) {
            await reg.update();
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setUpdateStatus('up-to-date');
      toast.success('App is running the latest available version');
    } catch (err) {
      console.error('Check update error:', err);
      toast.error('Failed to check for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Force clear browser caches, unregister service workers, and hard-reload
  const handleClearCacheAndReload = async () => {
    setIsClearingCache(true);
    toast.loading('Clearing app cache and reloading...');

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }

      sessionStorage.clear();

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Clear cache error:', err);
      toast.dismiss();
      toast.error('Failed to clear cache');
      setIsClearingCache(false);
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userName =
    staffUser?.name ||
    `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() ||
    'Staff User';
  const userRole = staffUser?.role || 'Staff';
  const userEmail = (staffUser as any)?.email || '—';
  const businessName = tenant?.name || tenant?.business_name || 'My Store';

  return (
    <PageLayout
      title="Account Settings"
      subtitle="Manage your personal profile, security credentials, and app updates."
    >
      <div className="max-w-4xl space-y-6 pb-12 custom-header">
        {/* ========================================================================= */}
        {/* 1. USER PROFILE SECTION                                                   */}
        {/* ========================================================================= */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-muted text-foreground/90 font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                {getUserInitials(userName)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-foreground capitalize">
                    {userName}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-muted/30 text-muted-foreground border border-primary/20">
                    {userRole}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="solar:letter-linear" className="text-sm" />
                    {userEmail}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="solar:shop-2-linear" className="text-sm" />
                    {businessName}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 shrink-0 font-medium"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <Icon icon="solar:logout-2-linear" className="text-base mr-1.5" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. APP UPDATES & VERSION HUB                                              */}
        {/* ========================================================================= */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold mb-1 text-foreground">App Updates & Version</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ensure you are running the most recent features and inventory fixes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Version Info Box */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Current Version
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-base font-bold text-foreground">v1.2.4</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Progressive Web App (PWA)
              </p>
            </div>

            {/* Check for Updates Action */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Update Status
                </span>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {updateStatus === 'up-to-date' ? (
                    <>
                      <Icon icon="solar:check-circle-bold" className="text-emerald-500 text-base" />
                      <span>Up to date</span>
                    </>
                  ) : (
                    <span>Ready to check</span>
                  )}
                </div>
              </div>
              <div className="pt-3">
                <Button
                  size="sm"
                  className="w-full font-semibold text-xs"
                  disabled={isCheckingUpdate}
                  onClick={handleCheckForUpdates}
                >
                  <Icon
                    icon="solar:restart-circle-linear"
                    className={`text-base mr-1.5 ${isCheckingUpdate ? 'animate-spin' : ''}`}
                  />
                  {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                </Button>
              </div>
            </div>

            {/* Clear Cache & Force Reload Action */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Troubleshooting
                </span>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  Force clear cached assets if updates do not appear immediately.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full font-semibold text-xs"
                  disabled={isClearingCache}
                  onClick={handleClearCacheAndReload}
                >
                  <Icon icon="solar:trash-bin-trash-linear" className="text-base mr-1.5 text-muted-foreground" />
                  {isClearingCache ? 'Clearing...' : 'Clear Cache & Reload'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. SECURITY & PASSWORD SECTION                                            */}
        {/* ========================================================================= */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold mb-1 text-foreground">Security & Password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Update your login password to keep your account secure.
          </p>

          <form
            onSubmit={handleChangePassword}
            autoComplete="off"
            className="space-y-4 max-w-xl"
          >
            {/* Hidden dummy inputs to prevent aggressive Chrome/Safari password autofill */}
            <input
              type="text"
              name="fakeusernameremembered"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
            <input
              type="password"
              name="fakepasswordremembered"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <CustomInputTextField
              label="Current Password"
              name="current-password-field"
              type={showCurrentPass ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter your current password"
              inputProps={{
                autoComplete: 'new-password',
                autoCorrect: 'off',
                spellCheck: false,
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <Icon
                    icon={showCurrentPass ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                    className="text-base"
                  />
                </button>
              }
            />

            <CustomInputTextField
              label="New Password"
              name="new-password-field"
              type={showNewPass ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              inputProps={{
                autoComplete: 'new-password',
                autoCorrect: 'off',
                spellCheck: false,
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <Icon
                    icon={showNewPass ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                    className="text-base"
                  />
                </button>
              }
            />

            <CustomInputTextField
              label="Confirm New Password"
              name="confirm-password-field"
              type={showConfirmPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your new password"
              inputProps={{
                autoComplete: 'new-password',
                autoCorrect: 'off',
                spellCheck: false,
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <Icon
                    icon={showConfirmPass ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                    className="text-base"
                  />
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isChangingPass || !currentPassword || !newPassword || !confirmPassword}
              >
                <Icon icon="solar:lock-password-linear" className="text-base mr-1.5" />
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* 4. THEME & APPEARANCE SECTION                                             */}
        {/* ========================================================================= */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold mb-1 text-foreground">Theme & Appearance</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Customize your interface viewing preference.
          </p>

          <div className="flex items-center justify-between max-w-xl p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <span className="text-sm font-bold text-foreground block">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              <span className="text-xs text-muted-foreground">
                {isDark
                  ? 'High contrast dark palette tailored for night & retail environments.'
                  : 'Clean, high-visibility bright interface for daylight.'}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="font-medium text-xs"
              onClick={toggleTheme}
            >
              <Icon
                icon={isDark ? 'solar:sun-2-linear' : 'solar:moon-linear'}
                className="text-base mr-1.5 text-amber-500"
              />
              Switch to {isDark ? 'Light' : 'Dark'}
            </Button>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* SIGN OUT CONFIRMATION MODAL                                               */}
      {/* ========================================================================= */}
      <CustomModal
        isOpen={isLogoutModalOpen}
        onOpenChange={() => setIsLogoutModalOpen(!isLogoutModalOpen)}
        size="md"
        header={
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Icon icon="solar:logout-2-linear" className="text-red-500 text-lg" />
            <span>Confirm Sign Out</span>
          </div>
        }
        body={
          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to sign out of your account on this device?
            </p>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={() => {
                setIsLogoutModalOpen(false);
                logout();
                window.location.href = '/login';
              }}
            >
              Sign Out
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}
