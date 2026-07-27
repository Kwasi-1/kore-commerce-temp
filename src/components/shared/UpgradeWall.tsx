/**
 * UpgradeWall.tsx
 * Shown when a user navigates to a page/feature locked by their current plan.
 * Clean, minimalistic, modern design.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Zap, 
  ArrowLeft, 
  Sparkles,
  BookOpen,
  ArrowLeftRight,
  Package,
  Truck,
  FileBadge,
  CreditCard,
  Layers,
  ClipboardList,
  Users,
  Receipt,
  TrendingUp,
  ShoppingBag,
  ShieldAlert
} from 'lucide-react';
import { MODULE_PLAN_REQUIREMENT, getPlanLabel } from '@/utils/permissions';
import { useFeaturesStore } from '@/store/featuresStore';

const MODULE_DESCRIPTIONS: Record<string, { label: string; description: string; icon: any }> = {
  credit_ledger:        { label: 'Credit Ledger',         description: 'Track customer credit sales and outstanding balances.',               icon: BookOpen },
  returns:              { label: 'Returns & Refunds',      description: 'Process sales returns, refunds, and exchange transactions.',          icon: ArrowLeftRight },
  inventory_advanced:   { label: 'Advanced Inventory',     description: 'Full inventory management with purchase orders and reconciliation.',  icon: Package },
  suppliers:            { label: 'Suppliers',              description: 'Manage your product suppliers and their contact information.',        icon: Truck },
  purchase_orders:      { label: 'Purchase Orders',        description: 'Create and track purchase orders from your suppliers.',              icon: FileBadge },
  supplier_credit:      { label: 'Supplier Credit',        description: 'Track credit extended by suppliers for your purchases.',             icon: CreditCard },
  stock_reconciliation: { label: 'Stock Reconciliation',   description: 'Audit and reconcile physical stock against system records.',         icon: Layers },
  adjustments:          { label: 'Stock Adjustments',      description: 'Log stock write-offs, damages, and manual corrections.',             icon: ClipboardList },
  staff:                { label: 'Staff Management',       description: 'Add staff members, set roles, and manage team access.',             icon: Users },
  expenses:             { label: 'Expenses',               description: 'Track business expenses, petty cash, and operational costs.',        icon: Receipt },
  reports_advanced:     { label: 'Advanced Reports',       description: 'Profit/loss statements, cashier performance, and product analytics.', icon: TrendingUp },
  ecommerce:            { label: 'Ecommerce Store',        description: 'Online storefront, product listings, and order management.',         icon: ShoppingBag },
  payroll:              { label: 'Payroll Tracking',       description: 'Track staff salaries, wages, and payroll records.',                  icon: CreditCard },
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
  
  const ModuleIcon = moduleInfo?.icon || Lock;

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <div className="max-w-lg w-full bg-card/70 dark:bg-card/40 backdrop-blur-xl border border-border/80 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl text-center flex flex-col items-center">

        {/* Feature Lock Tile */}
        <div className="relative mb-6">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-muted/80 border border-border/80 flex items-center justify-center text-foreground shadow-sm">
            <ModuleIcon className="h-8 w-8 md:h-9 md:w-9 text-foreground" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-card shadow-sm">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl md:text-2xl font-bold font-header text-foreground tracking-tight mb-2">
          {displayTitle}
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm max-w-sm mb-3 leading-relaxed">
          {displayDescription}
        </p>

        {/* Plan Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-xs text-muted-foreground mb-6">
          <span>Current Plan: <span className="font-semibold text-foreground capitalize">{planLabel}</span></span>
          <span>&bull;</span>
          <span>Requires <span className="font-bold text-primary capitalize">{requiredPlan}</span></span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full mb-8">
          <button
            onClick={() => navigate('/settings/plan')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition-all shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            Upgrade Plan
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground font-semibold text-sm transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Features Teaser List */}
        <div className="w-full p-4 md:p-5 rounded-xl md:rounded-2xl border border-border/60 bg-muted/20 text-left">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Included in {getPlanLabel(requiredPlan)} Plan
          </p>
          <div className="space-y-3">
            {Object.entries(MODULE_DESCRIPTIONS)
              .filter(([key]) => MODULE_PLAN_REQUIREMENT[key] === requiredPlan)
              .slice(0, 4)
              .map(([key, info]) => {
                const ItemIcon = info.icon;
                return (
                  <div key={key} className="flex items-start gap-3 text-xs md:text-sm">
                    <div className="h-7 w-7 rounded-lg bg-muted/80 border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      <ItemIcon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{info.label}</span>
                      <span className="text-muted-foreground text-xs">{info.description}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UpgradeWall;
