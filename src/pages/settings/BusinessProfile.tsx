import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';

import { useSettingsStore } from '@/store/settingsStore';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function BusinessProfile() {
  const { fetchSettings: reloadStoreSettings } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const [profileData, setProfileData] = useState({
    storeName: '',
    description: '',
    location: ''
  });
  const [initialProfileData, setInitialProfileData] = useState({
    storeName: '',
    description: '',
    location: ''
  });

  const [contactData, setContactData] = useState({
    email: '',
    phoneNumber: '',
    additionalNumber: ''
  });
  const [initialContactData, setInitialContactData] = useState({
    email: '',
    phoneNumber: '',
    additionalNumber: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/tenant/settings');
        const data = response.data.success.data;
        const store = data.store || {};
        const loc = data.location?.address || store.address || '';
        
        const fetchedProfile = {
          storeName: store.name || '',
          description: store.description || '',
          location: loc
        };
        
        const fetchedContact = {
          email: store.email || '',
          phoneNumber: store.phoneNumber || '',
          additionalNumber: store.additionalNumber || ''
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

  const isProfileDirty = 
    profileData.storeName !== initialProfileData.storeName ||
    profileData.description !== initialProfileData.description ||
    profileData.location !== initialProfileData.location;

  const isContactDirty = 
    contactData.email !== initialContactData.email ||
    contactData.phoneNumber !== initialContactData.phoneNumber ||
    contactData.additionalNumber !== initialContactData.additionalNumber;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileDirty) return;
    setIsSavingProfile(true);
    try {
      await apiClient.patch('/tenant/settings/profile', {
        storeName: profileData.storeName,
        description: profileData.description,
        address: profileData.location
      });
      await reloadStoreSettings();
      setInitialProfileData({ ...profileData });
      toast.success('Business profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContactDirty) return;
    setIsSavingContact(true);
    try {
      await apiClient.patch('/tenant/settings/contact', contactData);
      await reloadStoreSettings();
      setInitialContactData({ ...contactData });
      toast.success('Contact information updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update contact info');
    } finally {
      setIsSavingContact(false);
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
      <div className="max-w-4xl space-y-5 md:space-y-6 custom-header">
        
        {/* Profile Section */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold mb-1 text-foreground">General Information</h2>
          <p className="text-sm text-muted-foreground mb-6">Update your store's public-facing details and address.</p>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-2xl">
            <CustomInputTextField
              label="Business Name"
              value={profileData.storeName}
              onChange={(e) => setProfileData(p => ({ ...p, storeName: e.target.value }))}
              required
            />
            <CustomInputTextField
              label="Store Location / Address"
              value={profileData.location}
              onChange={(e) => setProfileData(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. 123 Commerce St, Accra, Ghana"
            />
            <CustomTextareaField
              label="Business Description"
              value={profileData.description}
              onChange={(e) => setProfileData(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Tell your customers about your business..."
            />
            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={!isProfileDirty || isSavingProfile}
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* Contact Section */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold mb-1 text-foreground">Contact Details</h2>
          <p className="text-sm text-muted-foreground mb-6">How customers and the platform can reach you.</p>
          
          <form onSubmit={handleContactSubmit} className="space-y-4 max-w-2xl">
            <CustomInputTextField
              label="Contact Email"
              type="email"
              value={contactData.email}
              onChange={(e) => setContactData(p => ({ ...p, email: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInputTextField
                label="Primary Phone Number"
                type="tel"
                value={contactData.phoneNumber}
                onChange={(e) => setContactData(p => ({ ...p, phoneNumber: e.target.value }))}
                required
              />
              <CustomInputTextField
                label="Additional Number (Optional)"
                type="tel"
                value={contactData.additionalNumber}
                onChange={(e) => setContactData(p => ({ ...p, additionalNumber: e.target.value }))}
              />
            </div>
            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={!isContactDirty || isSavingContact}
              >
                {isSavingContact ? 'Updating...' : 'Update Contact'}
              </Button>
            </div>
          </form>
        </section>

      </div>
    </PageLayout>
  );
}
