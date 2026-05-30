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
const BusinessProfile = lazy(() => import('@/pages/settings/BusinessProfile'));
const PlanBilling = lazy(() => import('@/pages/settings/PlanBilling'));

// POS
const Shifts = lazy(() => import('@/pages/pos/Shifts'));
const Transactions = lazy(() => import('@/pages/pos/Transactions'));

// Inventory
const Products = lazy(() => import('@/pages/inventory/Products'));
const Suppliers = lazy(() => import('@/pages/inventory/Suppliers'));
const PurchaseOrders = lazy(() => import('@/pages/inventory/PurchaseOrders'));
const StockManagement = lazy(() => import('@/pages/inventory/StockManagement'));
const StockReconciliation = lazy(() => import('@/pages/inventory/StockReconciliation'));

// Staff & Expenses
const StaffManagement = lazy(() => import('@/pages/staff/StaffManagement'));
const Expenses = lazy(() => import('@/pages/expenses/Expenses'));

// Reports
const SalesSummary = lazy(() => import('@/pages/reports/SalesSummary'));
const ProductReport = lazy(() => import('@/pages/reports/ProductReport'));
const CashierReport = lazy(() => import('@/pages/reports/CashierReport'));
const EndOfDay = lazy(() => import('@/pages/reports/EndOfDay'));

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
          
          {/* Settings */}
          <Route path="/settings/profile" element={<BusinessProfile />} />
          <Route path="/settings/plan" element={<PlanBilling />} />
          
          {/* POS Dashboard Views */}
          <Route path="/pos/shifts" element={<Shifts />} />
          <Route path="/pos/transactions" element={<Transactions />} />
          
          {/* Inventory */}
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/suppliers" element={<Suppliers />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/inventory/stock" element={<StockManagement />} />
          <Route path="/inventory/stock-reconciliation" element={<StockReconciliation />} />
          
          {/* Operations */}
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/expenses" element={<Expenses />} />
          
          {/* Reports */}
          <Route path="/reports/sales" element={<SalesSummary />} />
          <Route path="/reports/products" element={<ProductReport />} />
          <Route path="/reports/cashiers" element={<CashierReport />} />
          <Route path="/reports/end-of-day" element={<EndOfDay />} />
          {/* Catch-all for other dashboard routes */}
          <Route path="/dashboard/*" element={<Overview />} />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
