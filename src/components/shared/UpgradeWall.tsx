/**
 * UpgradeWall.tsx
 * Shown when a user navigates to a page/feature locked by their current plan.
 * Much better UX than a silent redirect + toast (which was the old behavior).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ArrowLeft } from 'lucide-react';
import { MODULE_PLAN_REQUIREMENT, getPlanLabel } from '@/utils/permissions';
import { useFeaturesStore } from '@/store/featuresStore';

const MODULE_DESCRIPTIONS: Record<string, { label: string; description: string; icon: string }> = {
  credit_ledger:        { label: 'Credit Ledger',         description: 'Track customer credit sales and outstanding balances.',               icon: '📒' },
  returns:              { label: 'Returns & Refunds',      description: 'Process sales returns, refunds, and exchange transactions.',          icon: '↩️' },
  inventory_advanced:   { label: 'Advanced Inventory',     description: 'Full inventory management with purchase orders and reconciliation.',  icon: '📦' },
  suppliers:            { label: 'Suppliers',              description: 'Manage your product suppliers and their contact information.',        icon: '🚛' },
  purchase_orders:      { label: 'Purchase Orders',        description: 'Create and track purchase orders from your suppliers.',              icon: '📋' },
  supplier_credit:      { label: 'Supplier Credit',        description: 'Track credit extended by suppliers for your purchases.',             icon: '💳' },
  stock_reconciliation: { label: 'Stock Reconciliation',   description: 'Audit and reconcile physical stock against system records.',         icon: '🔍' },
  adjustments:          { label: 'Stock Adjustments',      description: 'Log stock write-offs, damages, and manual corrections.',             icon: '⚖️' },
  staff:                { label: 'Staff Management',       description: 'Add staff members, set roles, and manage team access.',             icon: '👥' },
  expenses:             { label: 'Expenses',               description: 'Track business expenses, petty cash, and operational costs.',        icon: '🧾' },
  reports_advanced:     { label: 'Advanced Reports',       description: 'Profit/loss statements, cashier performance, and product analytics.', icon: '📊' },
  ecommerce:            { label: 'Ecommerce Store',        description: 'Online storefront, product listings, and order management.',         icon: '🌐' },
  payroll:              { label: 'Payroll Tracking',       description: 'Track staff salaries, wages, and payroll records.',                  icon: '💰' },
};

interface UpgradeWallProps {
  module?: string;
  title?: string;
  description?: string;
}

export const UpgradeWall: React.FC<UpgradeWallProps> = ({ module, title, description }) => {
  const navigate = useNavigate();
  const plan = useFeaturesStore((s) => s.plan);
  const planLabel = getPlanLabel(plan);

  const moduleInfo = module ? MODULE_DESCRIPTIONS[module] : null;
  const requiredPlan = module ? MODULE_PLAN_REQUIREMENT[module] : 'a higher';

  const displayTitle = title || moduleInfo?.label || 'Feature Locked';
  const displayDescription =
    description ||
    moduleInfo?.description ||
    'This feature is not available on your current plan.';
  const displayIcon = moduleInfo?.icon || '🔒';

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center">

        {/* Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-4xl shadow-xl">
            {displayIcon}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-foreground mb-2">{displayTitle}</h2>
        <p className="text-muted-foreground text-sm mb-1">{displayDescription}</p>
        <p className="text-xs text-muted-foreground/70 mt-2 mb-6">
          You are on the{' '}
          <span className="font-semibold text-foreground capitalize">{planLabel}</span> plan.
          Unlock this on the{' '}
          <span className="font-semibold text-primary">{requiredPlan}</span> plan.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/settings/plan')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            <Zap className="w-4 h-4" />
            Upgrade Plan
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Features teaser */}
        <div className="mt-8 p-4 rounded-xl border border-border bg-muted/30 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            What you get when you upgrade
          </p>
          <ul className="space-y-2">
            {Object.entries(MODULE_DESCRIPTIONS)
              .filter(([key]) => MODULE_PLAN_REQUIREMENT[key] === requiredPlan)
              .slice(0, 4)
              .map(([key, info]) => (
                <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-base leading-none mt-0.5">{info.icon}</span>
                  <span><span className="font-medium text-foreground">{info.label}</span> — {info.description}</span>
                </li>
              ))}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default UpgradeWall;
