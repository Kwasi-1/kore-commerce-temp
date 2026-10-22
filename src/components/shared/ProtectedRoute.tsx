import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ForcePasswordChangeModal from '@/components/modals/ForcePasswordChangeModal';
import { roleAllowed } from '@/utils/roles';
import { useCan } from '@/hooks/usePermissions';

export const ProtectedRoute = ({
  children,
  allowedRoles,
  permission,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Page needs this permission (or any of these). Replaces allowedRoles when given. */
  permission?: string | string[];
}) => {
  const token = useAuthStore((state) => state.token);
  const staffUser = useAuthStore((state) => state.staffUser);
  const location = useLocation();
  const can = useCan();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed = permission ? can(permission) : !allowedRoles || roleAllowed(staffUser?.role, allowedRoles);
  if (staffUser && !allowed) {
    if (staffUser.role === 'cashier') {
      return <Navigate to="/pos/register" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <ForcePasswordChangeModal />
      {children}
    </>
  );
};
