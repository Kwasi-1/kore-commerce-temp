/**
 * ModuleRoute.tsx
 * Route-level feature gate.
 * Renders children if the tenant has the required module.
 * Otherwise renders <UpgradeWall> in place (no silent redirect).
 *
 * Usage in App.tsx:
 *   <ModuleRoute requiredModule="credit_ledger">
 *     <CreditLedger />
 *   </ModuleRoute>
 */
import React, { createContext, useContext, useEffect } from 'react';
import { useFeaturesStore } from '@/store/featuresStore';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';
import { UpgradeWall } from '@/components/shared/UpgradeWall';

interface ModuleContextType {
  requiredModule?: string;
  isGraceAccess: boolean;
}

const ModuleContext = createContext<ModuleContextType>({
  isGraceAccess: false,
});

export const useModuleContext = () => useContext(ModuleContext);

interface ModuleRouteProps {
  children: React.ReactNode;
  requiredModule: string;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ children, requiredModule }) => {
  const tenant = useAuthStore((s) => s.tenant);
  const graceInfo = useAuthStore((s) => s.graceInfo);
  const inGracePeriod = Boolean(graceInfo && graceInfo.active);
  const isLoaded = useFeaturesStore((s) => s.isLoaded);
  const hasModule = useFeaturesStore((s) => s.hasModule);
  const loadFeatures = useFeaturesStore((s) => s.loadFeatures);

  // If features haven't been loaded yet (e.g. page refresh), trigger a load
  useEffect(() => {
    if (!isLoaded) {
      loadFeatures();
    }
  }, [isLoaded, loadFeatures]);

  if (!tenant) {
    return <Navigate to="/login" replace />;
  }

  // Show nothing during the brief load — avoids flashing the UpgradeWall
  if (!isLoaded) {
    return null;
  }

  const isUnlocked = hasModule(requiredModule) || inGracePeriod;

  if (!isUnlocked) {
    return <UpgradeWall module={requiredModule} />;
  }

  // Active grace access: route is unlocked via active grace period rather than plan module ownership
  const isGraceAccess = inGracePeriod && !hasModule(requiredModule);

  return (
    <ModuleContext.Provider value={{ requiredModule, isGraceAccess }}>
      {children}
    </ModuleContext.Provider>
  );
};
