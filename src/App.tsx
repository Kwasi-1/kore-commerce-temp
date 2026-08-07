import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ModuleRoute } from '@/components/shared/ModuleRoute';
import { usePrefetchModules } from '@/hooks/usePrefetchModules';
import { useAuthStore } from '@/store/authStore';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary';

// Layouts (not lazy — tiny files, always needed)
import AuthLayout from '@/layouts/AuthLayout';
import POSLayout from '@/layouts/POSLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProductFormPage from '@/pages/inventory/ProductFormPage';
import SupplierCredit from '@/pages/inventory/SupplierCredit';
import PlanGraceModal from '@/components/shared/PlanGraceModal';
import PlanBlockedWall from '@/components/shared/PlanBlockedWall';

// Pages — lazy with auto-retry for code splitting.
const Login = lazyWithRetry(() => import('@/pages/Login'));

const Register = lazyWithRetry(() => import('@/pages/pos/register/Register'));
const Overview = lazyWithRetry(() => import('@/pages/dashboard/Overview'));
const BusinessProfile = lazyWithRetry(() => import('@/pages/settings/BusinessProfile'));
const POSSettings = lazyWithRetry(() => import('@/pages/settings/POSSettings'));
const PlanBilling = lazyWithRetry(() => import('@/pages/settings/PlanBilling'));

// POS
const Transactions = lazyWithRetry(() => import('@/pages/pos/Transactions'));
const CreditLedger = lazyWithRetry(() => import('@/pages/pos/CreditLedger'));
const CashierLockScreen = lazyWithRetry(() => import('@/pages/pos/CashierLockScreen'));
const Returns = lazyWithRetry(() => import('@/pages/pos/Returns'));

// Inventory
const Products = lazyWithRetry(() => import('@/pages/inventory/Products'));
const Suppliers = lazyWithRetry(() => import('@/pages/inventory/Suppliers'));
const PurchaseOrders = lazyWithRetry(() => import('@/pages/inventory/PurchaseOrders'));
const StockManagement = lazyWithRetry(() => import('@/pages/inventory/StockManagement'));
const StockReconciliation = lazyWithRetry(() => import('@/pages/inventory/StockReconciliation'));
const StockAuditScreen = lazyWithRetry(() => import('@/pages/inventory/StockAuditScreen'));
const StockAdjustments = lazyWithRetry(() => import('@/pages/inventory/StockAdjustments'));

// Staff, Expenses & Notifications
const StaffManagement = lazyWithRetry(() => import('@/pages/staff/StaffManagement'));
const Expenses = lazyWithRetry(() => import('@/pages/expenses/Expenses'));
const Notifications = lazyWithRetry(() => import('@/pages/notifications/Notifications'));

// Ecommerce
const OnlineOrders = lazyWithRetry(() => import('@/pages/ecommerce/OnlineOrders'));
const Customers = lazyWithRetry(() => import('@/pages/ecommerce/Customers'));
const StorefrontSettings = lazyWithRetry(() => import('@/pages/ecommerce/StorefrontSettings'));
const Discounts = lazyWithRetry(() => import('@/pages/ecommerce/Discounts'));

// Reports
const SalesSummary = lazyWithRetry(() => import('@/pages/reports/SalesSummary'));
const ProductReport = lazyWithRetry(() => import('@/pages/reports/ProductReport'));
const CashierReport = lazyWithRetry(() => import('@/pages/reports/CashierReport'));
const EndOfDay = lazyWithRetry(() => import('@/pages/reports/EndOfDay'));

/** Minimal full-screen spinner shown only on the very first chunk load */
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide font-header uppercase">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  // Fires silently in background after login — warms the browser cache
  // so navigation to allowed pages is instant with no Suspense flash.
  usePrefetchModules();
  const staffUser = useAuthStore((state) => state.staffUser);
  const isCashier = staffUser?.role === 'cashier';

  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Standalone Cashier Lock Screen (Requires Auth) */}
      <Route
        path="/pos/locked"
        element={
          <ProtectedRoute>
            <CashierLockScreen />
          </ProtectedRoute>
        }
      />

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
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Overview /></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings/profile" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><BusinessProfile /></ProtectedRoute>} />
        <Route path="/settings/pos" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><POSSettings /></ProtectedRoute>} />
        <Route path="/settings/plan" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><PlanBilling /></ProtectedRoute>} />

        {/* POS Dashboard Views */}
        <Route path="/pos/transactions" element={<ModuleRoute requiredModule="pos"><Transactions /></ModuleRoute>} />
        <Route path="/pos/credit-ledger" element={<ModuleRoute requiredModule="credit_ledger"><CreditLedger /></ModuleRoute>} />
        <Route path="/pos/returns" element={<ModuleRoute requiredModule="returns"><Returns /></ModuleRoute>} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Products /></ProtectedRoute>} />
        <Route path="/inventory/products/new" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ProductFormPage /></ProtectedRoute>} />
        <Route path="/inventory/products/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ProductFormPage /></ProtectedRoute>} />
        <Route path="/inventory/suppliers" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="suppliers"><Suppliers /></ModuleRoute></ProtectedRoute>} />
        <Route path="/inventory/purchase-orders" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="purchase_orders"><PurchaseOrders /></ModuleRoute></ProtectedRoute>} />
        <Route path="/inventory/stock" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><StockManagement /></ProtectedRoute>} />
        <Route path="/inventory/stock-reconciliation" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="stock_reconciliation"><StockReconciliation /></ModuleRoute></ProtectedRoute>} />
        <Route path="/inventory/stock-upload/audit" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="adjustments"><StockAuditScreen /></ModuleRoute></ProtectedRoute>} />
        <Route path="/inventory/adjustments" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="adjustments"><StockAdjustments /></ModuleRoute></ProtectedRoute>} />
        <Route path="/inventory/supplier-credit" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="supplier_credit"><SupplierCredit /></ModuleRoute></ProtectedRoute>} />

        {/* Operations & Notifications */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="staff"><StaffManagement /></ModuleRoute></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="expenses"><Expenses /></ModuleRoute></ProtectedRoute>} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Reports */}
        <Route path="/reports/sales" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><SalesSummary /></ProtectedRoute>} />
        <Route path="/reports/products" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="reports_advanced"><ProductReport /></ModuleRoute></ProtectedRoute>} />
        <Route path="/reports/cashiers" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="reports_advanced"><CashierReport /></ModuleRoute></ProtectedRoute>} />
        <Route path="/reports/end-of-day" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="reports_advanced"><EndOfDay /></ModuleRoute></ProtectedRoute>} />


        {/* Ecommerce */}
        <Route path="/ecommerce/orders" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="ecommerce"><OnlineOrders /></ModuleRoute></ProtectedRoute>} />
        <Route path="/ecommerce/customers" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="ecommerce"><Customers /></ModuleRoute></ProtectedRoute>} />
        <Route path="/ecommerce/storefront" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="ecommerce"><StorefrontSettings /></ModuleRoute></ProtectedRoute>} />
        <Route path="/ecommerce/discounts" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><ModuleRoute requiredModule="ecommerce"><Discounts /></ModuleRoute></ProtectedRoute>} />

        {/* Catch-all for other dashboard routes */}
        <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Overview /></ProtectedRoute>} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to={isCashier ? "/pos/register" : "/dashboard"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <PlanBlockedWall />
        <PlanGraceModal />
        <AppRoutes />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
