import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useReceiptHeader(receiptData?: any) {
  const { tenant } = useAuthStore();
  const { storeSettings, fetchSettings } = useSettingsStore();

  // Automatically fetch store settings if they haven't been loaded yet
  useEffect(() => {
    if (!storeSettings?.phoneNumber && !storeSettings?.email && !storeSettings?.address) {
      fetchSettings().catch(() => {});
    }
  }, [storeSettings?.phoneNumber, storeSettings?.email, storeSettings?.address, fetchSettings]);

  // Name resolution: receiptData -> storeSettings -> tenant
  const storeName = (
    receiptData?.storeName ||
    receiptData?.tenant?.name ||
    storeSettings?.name ||
    tenant?.name ||
    tenant?.business_name ||
    'My Store'
  ).toUpperCase();

  // Location resolution: storeSettings -> tenant -> fallback to email
  const storeLocation = (
    storeSettings?.address ||
    storeSettings?.location ||
    (tenant as any)?.address ||
    (tenant as any)?.location ||
    storeSettings?.email ||
    (tenant as any)?.email ||
    ''
  );

  // Phone number resolution: storeSettings -> tenant -> additionalNumber
  const storePhone = (
    storeSettings?.phoneNumber ||
    (tenant as any)?.phoneNumber ||
    (tenant as any)?.phone_number ||
    (tenant as any)?.phone ||
    storeSettings?.additionalNumber ||
    ''
  );

  // Email resolution
  const storeEmail = storeSettings?.email || (tenant as any)?.email || '';

  return {
    storeName,
    storeLocation,
    storePhone,
    storeEmail,
  };
}
