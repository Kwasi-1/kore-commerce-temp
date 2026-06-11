import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ModuleRoute } from '@/components/shared/ModuleRoute';
import { usePrefetchModules } from '@/hooks/usePrefetchModules';

// Layouts (not lazy — tiny files, always needed)
import AuthLayout from '@/layouts/AuthLayout';
import POSLayout from '@/layouts/POSLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages — lazy for code splitting. Chunks are prefetched by role after login.
const Login = lazy(() => import('@/pages/Login'));

const Register = lazy(() => import('@/pages/pos/register/Register'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const BusinessProfile = lazy(() => import('@/pages/settings/BusinessProfile'));
const POSSettings = lazy(() => import('@/pages/settings/POSSettings'));
const PlanBilling = lazy(() => import('@/pages/settings/PlanBilling'));

// POS
const Transactions = lazy(() => import('@/pages/pos/Transactions'));
const CreditLedger = lazy(() => import('@/pages/pos/CreditLedger'));
const CashierLockScreen = lazy(() => import('@/pages/pos/CashierLockScreen'));
const Returns = lazy(() => import('@/pages/pos/Returns'));

// Inventory
const Products = lazy(() => import('@/pages/inventory/Products'));
const Suppliers = lazy(() => import('@/pages/inventory/Suppliers'));
const PurchaseOrders = lazy(() => import('@/pages/inventory/PurchaseOrders'));
const StockManagement = lazy(() => import('@/pages/inventory/StockManagement'));
const StockReconciliation = lazy(() => import('@/pages/inventory/StockReconciliation'));
const StockAuditScreen = lazy(() => import('@/pages/inventory/StockAuditScreen'));
const StockAdjustments = lazy(() => import('@/pages/inventory/StockAdjustments'));
const SupplierCredit = lazy(() => import('@/pages/inventory/SupplierCredit'));

// Staff & Expenses
const StaffManagement = lazy(() => import('@/pages/staff/StaffManagement'));
const Expenses = lazy(() => import('@/pages/expenses/Expenses'));

// Ecommerce
const OnlineOrders = lazy(() => import('@/pages/ecommerce/OnlineOrders'));
const Customers = lazy(() => import('@/pages/ecommerce/Customers'));
const StorefrontSettings = lazy(() => import('@/pages/ecommerce/StorefrontSettings'));
const Discounts = lazy(() => import('@/pages/ecommerce/Discounts'));

// Reports
const SalesSummary = lazy(() => import('@/pages/reports/SalesSummary'));
const ProductReport = lazy(() => import('@/pages/reports/ProductReport'));
const CashierReport = lazy(() => import('@/pages/reports/CashierReport'));
const EndOfDay = lazy(() => import('@/pages/reports/EndOfDay'));

/** Minimal full-screen spinner shown only on the very first chunk load */
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  // Fires silently in background after login — warms the browser cache
  // so navigation to allowed pages is instant with no Suspense flash.
  usePrefetchModules();

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
        <Route path="/dashboard" element={<Overview />} />

        {/* Settings */}
        <Route path="/settings/profile" element={<BusinessProfile />} />
        <Route path="/settings/pos" element={<POSSettings />} />
        <Route path="/settings/plan" element={<PlanBilling />} />

        {/* POS Dashboard Views */}
        <Route path="/pos/transactions" element={<Transactions />} />
        <Route path="/pos/credit-ledger" element={<CreditLedger />} />
        <Route path="/pos/returns" element={<Returns />} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<Products />} />
        <Route path="/inventory/suppliers" element={<Suppliers />} />
        <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/inventory/stock" element={<StockManagement />} />
        <Route path="/inventory/stock-reconciliation" element={<StockReconciliation />} />
        <Route path="/inventory/stock-upload/audit" element={<StockAuditScreen />} />
        <Route path="/inventory/adjustments" element={<StockAdjustments />} />
        <Route path="/inventory/supplier-credit" element={<SupplierCredit />} />

        {/* Operations */}
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/expenses" element={<Expenses />} />

        {/* Reports */}
        <Route path="/reports/sales" element={<SalesSummary />} />
        <Route path="/reports/products" element={<ProductReport />} />
        <Route path="/reports/cashiers" element={<CashierReport />} />
        <Route path="/reports/end-of-day" element={<EndOfDay />} />

        {/* Ecommerce */}
        <Route path="/ecommerce/orders" element={<ModuleRoute requiredModule="ecommerce"><OnlineOrders /></ModuleRoute>} />
        <Route path="/ecommerce/customers" element={<ModuleRoute requiredModule="ecommerce"><Customers /></ModuleRoute>} />
        <Route path="/ecommerce/storefront" element={<ModuleRoute requiredModule="ecommerce"><StorefrontSettings /></ModuleRoute>} />
        <Route path="/ecommerce/discounts" element={<ModuleRoute requiredModule="ecommerce"><Discounts /></ModuleRoute>} />

        {/* Catch-all for other dashboard routes */}
        <Route path="/dashboard/*" element={<Overview />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
    </Suspense>
  );
}
