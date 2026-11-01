import { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';

import { useSettingsStore } from '@/store/settingsStore';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import PayoutAccountCard from '@/components/settings/PayoutAccountCard';
import SettingsSection from '@/components/settings/SettingsSection';
import UnsavedChanges from '@/components/shared/UnsavedChanges';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAuthStore } from '@/store/authStore';

const EMPTY_PROFILE = { storeName: '', description: '', location: '' };
const EMPTY_CONTACT = { email: '', phoneNumber: '', additionalNumber: '' };

const changedKeys = <T extends Record<string, string>>(now: T, before: T) =>
  (Object.keys(now) as (keyof T)[]).filter((k) => now[k] !== before[k]);

export default function BusinessProfile() {
  const { fetchSettings: reloadStoreSettings } = useSettingsStore();
  const isOwner = useAuthStore((st) => st.staffUser?.role === 'owner');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Show every field error once a save was tried, not just on fields that were edited
  const [triedSave, setTriedSave] = useState(false);

  const [profileData, setProfileData] = useState(EMPTY_PROFILE);
  const [initialProfileData, setInitialProfileData] = useState(EMPTY_PROFILE);
  const [contactData, setContactData] = useState(EMPTY_CONTACT);
  const [initialContactData, setInitialContactData] = useState(EMPTY_CONTACT);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/tenant/settings');
        const data = response.data.success.data;
        const store = data.store || {};

        const fetchedProfile = {
          storeName: store.name || '',
          description: store.description || '',
          location: data.location?.address || store.address || '',
        };
        const fetchedContact = {
          email: store.email || '',
          phoneNumber: store.phoneNumber || '',
          additionalNumber: store.additionalNumber || '',
        };

        setProfileData(fetchedProfile);
        setInitialProfileData(fetchedProfile);
        setContactData(fetchedContact);
        setInitialContactData(fetchedContact);
      } catch (error) {
        console.error('Fetch settings error:', error);
        toast.error('Failed to load business profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const profileChanges = changedKeys(profileData, initialProfileData);
  const contactChanges = changedKeys(contactData, initialContactData);
  const changeCount = profileChanges.length + contactChanges.length;
  const guard = useUnsavedChanges(changeCount > 0);

  // Required fields, shown under the field once it was edited or a save was tried
  const errors: Record<string, string | undefined> = {
    storeName: !profileData.storeName.trim() ? 'Enter your business name' : undefined,
    email: !contactData.email.trim()
      ? 'Enter a contact email'
      : !/^\S+@\S+\.\S+$/.test(contactData.email.trim())
        ? 'Enter a valid email address'
        : undefined,
    phoneNumber: !contactData.phoneNumber.trim() ? 'Enter a phone number' : undefined,
  };
  const edited = new Set<string>([...profileChanges, ...contactChanges]);
  const errorFor = (key: string) => ((triedSave || edited.has(key)) ? errors[key] : undefined);

  const discard = () => {
    setProfileData(initialProfileData);
    setContactData(initialContactData);
    setTriedSave(false);
  };

  /** Saves both parts that changed; true when all of it went through */
  const saveAll = async () => {
    if (Object.values(errors).some(Boolean)) {
      setTriedSave(true);
      toast.error('Fix the highlighted fields first');
      return false;
    }
    setIsSaving(true);
    try {
      const [profile, contact] = await Promise.allSettled([
        profileChanges.length
          ? apiClient.patch('/tenant/settings/profile', {
              storeName: profileData.storeName,
              description: profileData.description,
              address: profileData.location,
            })
          : Promise.resolve(),
        contactChanges.length ? apiClient.patch('/tenant/settings/contact', contactData) : Promise.resolve(),
      ]);
      if (profile.status === 'fulfilled') setInitialProfileData({ ...profileData });
      if (contact.status === 'fulfilled') setInitialContactData({ ...contactData });
      reloadStoreSettings();

      const failed = [profile, contact].find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) {
        toast.error(failed.reason?.response?.data?.error?.message || "Some changes couldn't be saved. Try again.");
        return false;
      }
      setTriedSave(false);
      toast.success('Business profile saved');
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Business Profile">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Business Profile">
      <div className="max-w-4xl space-y-4 md:space-y-6 mb-4 custom-header">
        <SettingsSection title="General Information" description="Your store's public-facing details and address.">
          <CustomInputTextField
            label="Business Name"
            value={profileData.storeName}
            onChange={(e) => setProfileData((p) => ({ ...p, storeName: e.target.value }))}
            error={errorFor('storeName')}
            required
          />
          <CustomInputTextField
            label="Store Location / Address"
            value={profileData.location}
            onChange={(e) => setProfileData((p) => ({ ...p, location: e.target.value }))}
            placeholder="e.g. 123 Commerce St, Accra, Ghana"
          />
          <CustomTextareaField
            label="Business Description"
            value={profileData.description}
            onChange={(e) => setProfileData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Tell your customers about your business..."
          />
        </SettingsSection>

        <SettingsSection title="Contact Details" description="How customers and the platform can reach you.">
          <CustomInputTextField
            label="Contact Email"
            type="email"
            value={contactData.email}
            onChange={(e) => setContactData((p) => ({ ...p, email: e.target.value }))}
            error={errorFor('email')}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomInputTextField
              label="Primary Phone Number"
              type="tel"
              value={contactData.phoneNumber}
              onChange={(e) => setContactData((p) => ({ ...p, phoneNumber: e.target.value }))}
              error={errorFor('phoneNumber')}
              required
            />
            <CustomInputTextField
              label="Additional Number (Optional)"
              type="tel"
              value={contactData.additionalNumber}
              onChange={(e) => setContactData((p) => ({ ...p, additionalNumber: e.target.value }))}
            />
          </div>
        </SettingsSection>

        {/* Payouts: owner only, with its own change flow (not part of the save bar) */}
        {isOwner && <PayoutAccountCard />}

        <UnsavedChanges
          guard={guard}
          count={changeCount}
          saving={isSaving}
          onDiscard={discard}
          onSave={saveAll}
          subject="your business profile"
        />
      </div>
    </PageLayout>
  );
}
