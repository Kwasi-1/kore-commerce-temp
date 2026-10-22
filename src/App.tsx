import { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ModuleRoute } from '@/components/shared/ModuleRoute';
import { usePrefetchModules } from '@/hooks/usePrefetchModules';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

// Layouts (not lazy — tiny files, always needed)
import AuthLayout from '@/layouts/AuthLayout';
import POSLayout from '@/layouts/POSLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProductFormPage from '@/pages/inventory/ProductFormPage';
import SupplierCredit from '@/pages/inventory/SupplierCredit';
import PlanGraceModal from '@/components/shared/PlanGraceModal';
import PlanBlockedWall from '@/components/shared/PlanBlockedWall';
import ReloadPrompt from '@/components/shared/ReloadPrompt';
import AccountSettings from '@/pages/settings/AccountSettings';
import TopProgressBar from '@/components/shared/TopProgressBar';
import ApprovalModal from '@/components/pos/ApprovalModal';

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
const LockTill = lazyWithRetry(() => import('@/pages/pos/LockTill'));
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
const PayrollManagement = lazyWithRetry(() => import('@/pages/staff/PayrollManagement'));
const Expenses = lazyWithRetry(() => import('@/pages/expenses/Expenses'));
const Notifications = lazyWithRetry(() => import('@/pages/notifications/Notifications'));

// Ecommerce
const OnlineOrders = lazyWithRetry(() => import('@/pages/ecommerce/OnlineOrders'));
const Customers = lazyWithRetry(() => import('@/pages/ecommerce/Customers'));
const StorefrontSettings = lazyWithRetry(() => import('@/pages/ecommerce/StorefrontSettings'));
const Discounts = lazyWithRetry(() => import('@/pages/ecommerce/Discounts'));

// Reports
const SalesSummary = lazyWithRetry(() => import('@/pages/reports/SalesSummary'));
const ProductReport = lazyWithRetry(() => import('@/pages/reports/product-report'));
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
  const token = useAuthStore((state) => state.token);
  const isCashier = staffUser?.role === 'cashier';

  useEffect(() => {
    if (token) {
      useSettingsStore.getState().fetchSettings().catch(() => {});
    }
  }, [token]);

  return (
    <>
      <TopProgressBar />
      <ApprovalModal />
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Lock the till: sign out to "Who's working?" (the login screen) */}
        <Route path="/pos/locked" element={<LockTill />} />

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
          <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/settings/profile" element={<ProtectedRoute permission={'settings.store'}><BusinessProfile /></ProtectedRoute>} />
          <Route path="/settings/pos" element={<ProtectedRoute permission={'settings.pos'}><POSSettings /></ProtectedRoute>} />
          <Route path="/settings/plan" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><PlanBilling /></ProtectedRoute>} />

          {/* POS Dashboard Views */}
          <Route path="/pos/transactions" element={<ModuleRoute requiredModule="pos"><Transactions /></ModuleRoute>} />
          <Route path="/pos/credit-ledger" element={<ModuleRoute requiredModule="credit_ledger"><CreditLedger /></ModuleRoute>} />
          <Route path="/pos/returns" element={<ModuleRoute requiredModule="returns"><Returns /></ModuleRoute>} />

          {/* Inventory */}
          <Route path="/inventory/products" element={<ProtectedRoute permission={'products.edit'}><Products /></ProtectedRoute>} />
          <Route path="/inventory/products/new" element={<ProtectedRoute permission={'products.edit'}><ProductFormPage /></ProtectedRoute>} />
          <Route path="/inventory/products/:id/edit" element={<ProtectedRoute permission={'products.edit'}><ProductFormPage /></ProtectedRoute>} />
          <Route path="/inventory/suppliers" element={<ProtectedRoute permission={['purchasing.manage', 'purchasing.supplier_payments']}><ModuleRoute requiredModule="suppliers"><Suppliers /></ModuleRoute></ProtectedRoute>} />
          <Route path="/inventory/purchase-orders" element={<ProtectedRoute permission={'purchasing.manage'}><ModuleRoute requiredModule="purchase_orders"><PurchaseOrders /></ModuleRoute></ProtectedRoute>} />
          <Route path="/inventory/stock" element={<ProtectedRoute permission={['stock.adjust', 'products.edit']}><StockManagement /></ProtectedRoute>} />
          <Route path="/inventory/stock-reconciliation" element={<ProtectedRoute permission={'stock.count'}><ModuleRoute requiredModule="stock_reconciliation"><StockReconciliation /></ModuleRoute></ProtectedRoute>} />
          <Route path="/inventory/stock-upload/audit" element={<ProtectedRoute permission={'stock.adjust'}><ModuleRoute requiredModule="adjustments"><StockAuditScreen /></ModuleRoute></ProtectedRoute>} />
          <Route path="/inventory/adjustments" element={<ProtectedRoute permission={['stock.adjust', 'stock.approve']}><ModuleRoute requiredModule="adjustments"><StockAdjustments /></ModuleRoute></ProtectedRoute>} />
          <Route path="/inventory/supplier-credit" element={<ProtectedRoute permission={['purchasing.manage', 'purchasing.supplier_payments']}><ModuleRoute requiredModule="supplier_credit"><SupplierCredit /></ModuleRoute></ProtectedRoute>} />

          {/* Operations & Notifications */}
          <Route path="/staff" element={<ProtectedRoute permission={['staff.manage_cashiers', 'staff.manage_managers', 'staff.manage_admins']}><ModuleRoute requiredModule="staff"><StaffManagement /></ModuleRoute></ProtectedRoute>} />
          <Route path="/staff/payroll" element={<ProtectedRoute permission={'payroll.manage'}><ModuleRoute requiredModule="payroll"><PayrollManagement /></ModuleRoute></ProtectedRoute>} />
          <Route path="/staff/payroll/run" element={<ProtectedRoute permission={'payroll.manage'}><ModuleRoute requiredModule="payroll"><PayrollManagement /></ModuleRoute></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute permission={'expenses.manage'}><ModuleRoute requiredModule="expenses"><Expenses /></ModuleRoute></ProtectedRoute>} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Reports */}
          <Route path="/reports/sales" element={<ProtectedRoute permission={'reports.sales'}><SalesSummary /></ProtectedRoute>} />
          <Route path="/reports/products" element={<ProtectedRoute permission={'reports.profit'}><ModuleRoute requiredModule="reports_advanced"><ProductReport /></ModuleRoute></ProtectedRoute>} />
          <Route path="/reports/cashiers" element={<ProtectedRoute permission={'reports.profit'}><ModuleRoute requiredModule="reports_advanced"><CashierReport /></ModuleRoute></ProtectedRoute>} />
          <Route path="/reports/end-of-day" element={<ProtectedRoute permission={'reports.sales'}><ModuleRoute requiredModule="reports_advanced"><EndOfDay /></ModuleRoute></ProtectedRoute>} />


          {/* Ecommerce */}
          <Route path="/ecommerce/orders" element={<ProtectedRoute permission={'online.orders'}><ModuleRoute requiredModule="ecommerce"><OnlineOrders /></ModuleRoute></ProtectedRoute>} />
          <Route path="/ecommerce/customers" element={<ProtectedRoute permission={'online.orders'}><ModuleRoute requiredModule="ecommerce"><Customers /></ModuleRoute></ProtectedRoute>} />
          <Route path="/ecommerce/storefront" element={<ProtectedRoute permission={'online.storefront'}><ModuleRoute requiredModule="ecommerce"><StorefrontSettings /></ModuleRoute></ProtectedRoute>} />
          <Route path="/ecommerce/discounts" element={<ProtectedRoute permission={'online.storefront'}><ModuleRoute requiredModule="ecommerce"><Discounts /></ModuleRoute></ProtectedRoute>} />

          {/* Catch-all for other dashboard routes */}
          <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Overview /></ProtectedRoute>} />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to={isCashier ? "/pos/register" : "/dashboard"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  // Proactively refresh the access token on startup before any route renders.
  // This prevents ProtectedRoute from seeing an expired token and redirecting
  // to /login when the user still has a valid refresh token (e.g. after overnight).
  const tokenStatus = useTokenRefresh();

  if (tokenStatus === 'loading') {
    return <PageLoader />;
  }

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <PlanBlockedWall />
        <PlanGraceModal />
        <ReloadPrompt />
        <AppRoutes />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
