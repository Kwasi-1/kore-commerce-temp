import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export default function BusinessProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const [profileData, setProfileData] = useState({
    storeName: '',
    description: ''
  });

  const [contactData, setContactData] = useState({
    email: '',
    phoneNumber: '',
    additionalNumber: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/tenant/settings');
        const store = response.data.success.data.store;
        
        setProfileData({
          storeName: store.name || '',
          description: store.description || ''
        });
        
        setContactData({
          email: store.email || '',
          phoneNumber: store.phoneNumber || '',
          additionalNumber: store.additionalNumber || ''
        });
      } catch (error) {
        console.error('Fetch settings error:', error);
        toast.error('Failed to load business profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await apiClient.patch('/tenant/settings/profile', profileData);
      toast.success('Business profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    try {
      await apiClient.patch('/tenant/settings/contact', contactData);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pos-accent"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Business Profile">
      <div className="max-w-4xl space-y-8">
        
        {/* Profile Section */}
        <section className="bg-white dark:bg-pos-dark-card rounded-xl p-6 border border-gray-100 dark:border-pos-dark-border">
          <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">General Information</h2>
          <p className="text-sm text-gray-500 mb-6">Update your store's public-facing name and description.</p>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-2xl">
            <CustomInputTextField
              label="Business Name"
              value={profileData.storeName}
              onChange={(e) => setProfileData(p => ({ ...p, storeName: e.target.value }))}
              required
            />
            <CustomTextareaField
              label="Business Description"
              value={profileData.description}
              onChange={(e) => setProfileData(p => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Tell your customers about your business..."
            />
            <div className="pt-2">
              <Button 
                type="submit" 
                isLoading={isSavingProfile}
                className="bg-pos-accent text-pos-accent-text font-bold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </section>

        {/* Contact Section */}
        <section className="bg-white dark:bg-pos-dark-card rounded-xl p-6 border border-gray-100 dark:border-pos-dark-border">
          <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Contact Details</h2>
          <p className="text-sm text-gray-500 mb-6">How customers and the platform can reach you.</p>
          
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
                isLoading={isSavingContact}
                className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-bold"
              >
                Update Contact
              </Button>
            </div>
          </form>
        </section>

      </div>
    </PageLayout>
  );
}
