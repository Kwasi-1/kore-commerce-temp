import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import { Switch } from '@nextui-org/react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export default function POSSettings() {
  const { posSettings, fetchSettings, updatePOSSettings, isLoading } = useSettingsStore();
  const { staffUser, tenant, setTenant } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  
  const [localSettings, setLocalSettings] = useState(posSettings);

  useEffect(() => {
    fetchSettings();
    // Fetch track_expiry_enabled from settings
    apiClient.get('/tenant/settings').then(res => {
      const isEnabled = res.data.success?.data?.store?.track_expiry_enabled || false;
      setExpiryEnabled(isEnabled);
      if (tenant && tenant.track_expiry_enabled !== isEnabled) {
        setTenant({ ...tenant, track_expiry_enabled: isEnabled });
      }
    }).catch(console.error);
  }, [fetchSettings]);

  useEffect(() => {
    setLocalSettings(posSettings);
  }, [posSettings]);

  const handleToggleExpiry = async (val: boolean) => {
    try {
      const endpoint = val ? '/tenant/settings/expiry/enable' : '/tenant/settings/expiry/disable';
      await apiClient.post(endpoint);
      setExpiryEnabled(val);
      if (tenant) {
        setTenant({ ...tenant, track_expiry_enabled: val });
      }
      toast.success(val ? 'Expiry tracking enabled' : 'Expiry tracking disabled');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update expiry tracking setting');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePOSSettings(localSettings);
      toast.success('POS Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update POS settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !localSettings.receipt_footer) {
    return (
      <PageLayout title="POS Settings">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="POS Settings">
      <div className="max-w-4xl space-y-8">
        
        <section className="bg-card text-card-foreground rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold mb-1 text-foreground">Checkout & Printing</h2>
          <p className="text-sm text-muted-foreground mb-6">Manage how receipts are printed and credit sales are handled during checkout.</p>
          
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            
            {/* Auto Print Setting */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">Auto-Print Receipts</label>
              <p className="text-xs text-muted-foreground mb-3">Determine what happens after a successful transaction.</p>
              
              <div className="flex bg-secondary/50 p-1.5 rounded-xl border border-border/50 max-w-md">
                {[
                  { value: 'always', label: 'Always Print' },
                  { value: 'ask', label: 'Ask Every Time' },
                  { value: 'never', label: 'Never Print' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLocalSettings(p => ({ ...p, auto_print: option.value as any }))}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                      localSettings.auto_print === option.value
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/50 my-6"></div>

            {/* Credit Sale Rule */}
            <div className="flex items-between justify-between">
              <div>
                <h4 className="font-bold text-foreground text-[15px]">Require Customer Info for Credit</h4>
                <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                  When enabled, cashiers must enter a customer name and phone number to complete a credit sale.
                </p>
              </div>
              <Switch 
                isSelected={localSettings.require_customer_for_credit} 
                onValueChange={(val) => setLocalSettings(p => ({ ...p, require_customer_for_credit: val }))} 
                color="primary"
              />
            </div>

            {staffUser?.role === 'owner' && (
              <>
                <div className="border-t border-border/50 my-6"></div>
                {/* Expiry Tracking Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground text-[15px]">Enable Expiry Date Tracking</h4>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      When enabled, you will need to enter expiry dates when receiving stock for products with expiry tracking turned on.
                    </p>
                  </div>
                  <Switch 
                    isSelected={expiryEnabled} 
                    onValueChange={handleToggleExpiry} 
                    color="primary"
                  />
                </div>
              </>
            )}

            <div className="border-t border-border/50 my-6"></div>

            {/* Receipt Footer */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">Receipt Footer Message</label>
              <p className="text-xs text-muted-foreground mb-3">This text will appear at the bottom of printed receipts.</p>
              <CustomTextareaField
                value={localSettings.receipt_footer}
                onChange={(e) => setLocalSettings(p => ({ ...p, receipt_footer: e.target.value }))}
                rows={3}
                placeholder="e.g. Thank you for shopping with us! Return within 30 days."
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                isLoading={isSaving}
                className="bg-foreground text-background font-bold px-8 h-12 rounded-full"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </section>

      </div>
    </PageLayout>
  );
}
