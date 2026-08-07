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
import { useFeaturesStore, getPlanModules } from '@/store/featuresStore';
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

  const hasDirectModule = hasModule(requiredModule);

  // If in a grace period, check if the module was part of the tenant's previous plan or standard plan
  const previousPlan = (graceInfo as any)?.previous_plan || 'standard';
  const previousPlanModules = getPlanModules(previousPlan);
  const isGraceModuleAllowed = inGracePeriod && previousPlanModules.includes(requiredModule);

  const isUnlocked = hasDirectModule || isGraceModuleAllowed;

  if (!isUnlocked) {
    return <UpgradeWall module={requiredModule} />;
  }

  const isGraceAccess = inGracePeriod && !hasDirectModule;

  return (
    <ModuleContext.Provider value={{ requiredModule, isGraceAccess }}>
      {children}
    </ModuleContext.Provider>
  );
};
