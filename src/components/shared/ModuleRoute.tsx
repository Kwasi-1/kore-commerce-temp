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
import React, { useEffect } from 'react';
import { useFeaturesStore } from '@/store/featuresStore';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';
import { UpgradeWall } from '@/components/shared/UpgradeWall';

interface ModuleRouteProps {
  children: React.ReactNode;
  requiredModule: string;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ children, requiredModule }) => {
  const tenant = useAuthStore((s) => s.tenant);
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

  if (!hasModule(requiredModule)) {
    return <UpgradeWall module={requiredModule} />;
  }

  return <>{children}</>;
};
