import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ModuleRoute } from '@/components/shared/ModuleRoute';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import POSLayout from '@/layouts/POSLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages
const Login = lazy(() => import('@/pages/Login'));
const PinLogin = lazy(() => import('@/pages/PinLogin'));
const Register = lazy(() => import('@/pages/pos/Register'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/pin" element={<PinLogin />} />
        </Route>

        {/* POS Routes (Requires Auth + POS Module) */}
        <Route
          element={
            <ProtectedRoute>
              <ModuleRoute requiredModule="pos">
                <POSLayout />
              </ModuleRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/pos/register" element={<Register />} />
        </Route>

        {/* Dashboard Routes (Requires Auth) */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Overview />} />
          {/* Catch-all for other dashboard routes */}
          <Route path="/dashboard/*" element={<Overview />} />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
