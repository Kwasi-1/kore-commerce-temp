import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { CustomInputTextField, CustomTextareaField } from '@/components/shared/text-field';
import { Button } from '@nextui-org/react';
import { Switch } from '@nextui-org/react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { getPlanLabel } from '@/utils/permissions';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';


export default function POSSettings() {
  const { posSettings, fetchSettings, updatePOSSettings, isLoading } = useSettingsStore();
  const { staffUser, tenant, setTenant } = useAuthStore();
  const { posSettings: featureSettings, plan, updatePOSSettings: updateFeaturePOSSettings, loadFeatures } = useFeaturesStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);

  const [localSettings, setLocalSettings] = useState(posSettings);
  const [localFeatures, setLocalFeatures] = useState(featureSettings);


  useEffect(() => {
    fetchSettings();
    loadFeatures();
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

  useEffect(() => {
    setLocalFeatures(featureSettings);
  }, [featureSettings]);

  const handleSaveFeatures = async () => {
    setIsSavingFeatures(true);
    try {
      const res = await apiClient.put('/tenant/features/pos', localFeatures);
      const updated = res.data.success?.data?.pos_settings || {};
      updateFeaturePOSSettings(updated);
      const blocked = res.data.success?.data?.blocked || [];
      if (blocked.length > 0) {
        toast.error(`${blocked.length} setting(s) require a higher plan. Others saved.`);
      } else {
        toast.success('POS feature settings updated!');
      }
    } catch (err) {
      toast.error('Failed to save POS feature settings');
    } finally {
      setIsSavingFeatures(false);
    }
  };


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

        {/* ── POS Micro-Features Section ─────────────────────────────────── */}
        <section className="bg-card text-card-foreground rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold mb-1 text-foreground">POS Features</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure which features are active during checkout. Some features require a higher plan.
            You are on the <span className="font-semibold text-foreground capitalize">{getPlanLabel(plan)}</span> plan.
          </p>

          <div className="space-y-5">

            {/* Tax */}
            {(() => {
              const locked = !['standard', 'business'].includes(plan);
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">VAT / Tax on Transactions</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Add a tax line to every sale. Enter the rate (e.g. 0.15 for 15% Ghana VAT).
                      {locked && <span className="block text-amber-500 mt-1">Requires Standard plan or higher.</span>}
                    </p>
                    {!locked && localFeatures.pos_tax_enabled && (
                      <div className="flex gap-3 mt-3">
                        <div className="flex-1">
                          <CustomInputTextField
                            label="Tax Rate (e.g. 0.15 for 15%)"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={String(localFeatures.pos_tax_rate)}
                            onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_tax_rate: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="flex-1">
                          <CustomInputTextField
                            label="Tax Label (e.g. VAT, NHIL+GETFund)"
                            value={localFeatures.pos_tax_label}
                            onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_tax_label: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_tax_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_tax_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

            <div className="border-t border-border/50" />

            {/* Credit Sales */}
            {(() => {
              const locked = !['standard', 'business'].includes(plan);
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">Credit Sales (Sell on Credit)</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Allow cashiers to complete sales on credit. The balance is tracked in the Credit Ledger.
                      {locked && <span className="block text-amber-500 mt-1">Requires Standard plan or higher.</span>}
                    </p>
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_credit_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_credit_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

            <div className="border-t border-border/50" />

            {/* Discounts */}
            {(() => {
              const locked = !['standard', 'business'].includes(plan);
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">Item Discounts</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Allow cashiers to apply percentage or fixed discounts on individual items.
                      {locked && <span className="block text-amber-500 mt-1">Requires Standard plan or higher.</span>}
                    </p>
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_discounts_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_discounts_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

            <div className="border-t border-border/50" />

            {/* Split Payment */}
            {(() => {
              const locked = !['standard', 'business'].includes(plan);
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">Split Payment</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Allow customers to pay using multiple payment methods (e.g. part cash, part mobile money).
                      {locked && <span className="block text-amber-500 mt-1">Requires Standard plan or higher.</span>}
                    </p>
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_split_payment_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_split_payment_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

            <div className="border-t border-border/50" />

            {/* Wholesale Pricing */}
            {(() => {
              const locked = plan !== 'business';
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">Wholesale Pricing Mode</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Show a wholesale price toggle in the register, allowing cashiers to switch between retail and wholesale pricing.
                      {locked && <span className="block text-amber-500 mt-1">Requires Business plan.</span>}
                    </p>
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_wholesale_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_wholesale_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

            <div className="border-t border-border/50" />

            {/* Service Charge */}
            {(() => {
              const locked = plan !== 'business';
              return (
                <div className={`flex items-start justify-between gap-4 ${locked ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-[15px]">Service Charge</h4>
                      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-[400px]">
                      Add a service charge percentage to all sales (e.g. 10% for restaurants).
                      {locked && <span className="block text-amber-500 mt-1">Requires Business plan.</span>}
                    </p>
                    {!locked && localFeatures.pos_service_charge_enabled && (
                      <div className="flex gap-3 mt-3">
                        <div className="flex-1">
                          <CustomInputTextField
                            label="Rate (e.g. 0.10 for 10%)"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={String(localFeatures.pos_service_charge_rate)}
                            onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_service_charge_rate: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="flex-1">
                          <CustomInputTextField
                            label="Label (e.g. Service Charge)"
                            value={localFeatures.pos_service_charge_label}
                            onChange={(e: any) => setLocalFeatures(p => ({ ...p, pos_service_charge_label: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Switch
                    isSelected={locked ? false : localFeatures.pos_service_charge_enabled}
                    isDisabled={locked}
                    onValueChange={(val) => setLocalFeatures(p => ({ ...p, pos_service_charge_enabled: val }))}
                    color="primary"
                  />
                </div>
              );
            })()}

          </div>

          <div className="pt-6">
            <Button
              type="button"
              onPress={handleSaveFeatures}
              isLoading={isSavingFeatures}
              className="bg-foreground text-background font-bold px-8 h-12 rounded-full"
            >
              Save Feature Settings
            </Button>
          </div>
        </section>

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
