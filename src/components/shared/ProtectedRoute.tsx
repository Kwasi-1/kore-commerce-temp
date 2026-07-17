import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ForcePasswordChangeModal from '@/components/modals/ForcePasswordChangeModal';

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const token = useAuthStore((state) => state.token);
  const staffUser = useAuthStore((state) => state.staffUser);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && staffUser && !allowedRoles.includes(staffUser.role)) {
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
