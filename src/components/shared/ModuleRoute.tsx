import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const ModuleRoute = ({ children, requiredModule }: { children: React.ReactNode, requiredModule: string }) => {
  const tenant = useAuthStore((state) => state.tenant);

  if (!tenant) {
    return <Navigate to="/login" replace />;
  }

  const plan = tenant.plan;
  let hasAccess = false;

  if (plan === 'full_suite') hasAccess = true;
  else if (requiredModule === 'pos' && plan === 'pos_only') hasAccess = true;
  else if (requiredModule === 'ecommerce' && plan === 'ecommerce_only') hasAccess = true;

  useEffect(() => {
    if (!hasAccess) {
      toast.error(`Your current plan does not have access to the ${requiredModule} module.`);
    }
  }, [hasAccess, requiredModule]);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
