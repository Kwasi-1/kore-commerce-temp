import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useAuthStore } from '@/store/authStore';
import { useFeaturesStore, PLAN_MODULES } from '@/store/featuresStore';
import { getPlanLabel } from '@/utils/permissions';
import { CheckCircle2, Lock, Puzzle, Sparkles } from 'lucide-react';
import { Button } from '@nextui-org/react';

export default function PlanBilling() {
  const { tenant } = useAuthStore();
  const { plan: featurePlan, hasModule, addons } = useFeaturesStore();

  if (!tenant) return null;

  const currentPlan = tenant.plan || featurePlan || 'starter';
  const planLabel = getPlanLabel(currentPlan);
  const basePlanModules = PLAN_MODULES[currentPlan] || PLAN_MODULES['starter'] || [];

  const planTiers = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Essential Point of Sale and basic inventory for single-register retail.',
      features: [
        'POS Terminal & Cash Float',
        'Basic Inventory Management',
        'Basic Sales & Daily Reports',
        'Cashier Shifts & Staff Login',
      ],
      isCurrent: ['starter', 'pos_only'].includes(currentPlan),
    },
    {
      id: 'standard',
      name: 'Standard',
      description: 'Advanced inventory, returns, purchasing, and staff management.',
      features: [
        'All Starter Features',
        'Advanced Stock Reconciliation',
        'Purchase Orders & Suppliers',
        'Customer & Supplier Credit Ledgers',
        'Expense Tracking & Staff Roles',
      ],
      isCurrent: ['standard', 'full_suite'].includes(currentPlan),
      isPopular: true,
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Complete multi-channel suite with Ecommerce storefront and Payroll.',
      features: [
        'All Standard Features',
        'Ecommerce Storefront Integration',
        'Staff Payroll Management',
        'Advanced Analytics & Export',
        'Priority Platform Support',
      ],
      isCurrent: ['business'].includes(currentPlan),
    },
  ];

  const entitlements = [
    {
      name: 'Point of Sale (POS)',
      key: 'pos',
      description: 'In-store sale checkouts, cashier shift management, printed receipts.',
      available: hasModule('pos'),
      isAddon: !basePlanModules.includes('pos') && hasModule('pos'),
    },
    {
      name: 'Inventory & Stock Reconciliation',
      key: 'inventory_basic',
      description: 'Product catalog, variant pricing, tier packaging, and stock adjustments.',
      available: hasModule('inventory_basic'),
      isAddon: !basePlanModules.includes('inventory_basic') && hasModule('inventory_basic'),
    },
    {
      name: 'Suppliers & Purchase Orders',
      key: 'suppliers',
      description: 'Supplier tracking, purchase orders, and supplier credit ledgers.',
      available: hasModule('suppliers'),
      isAddon: !basePlanModules.includes('suppliers') && hasModule('suppliers'),
    },
    {
      name: 'Staff & Expense Management',
      key: 'staff',
      description: 'Role-based access controls, expense tracking, and cashier shifts.',
      available: hasModule('staff'),
      isAddon: !basePlanModules.includes('staff') && hasModule('staff'),
    },
    {
      name: 'Ecommerce Storefront',
      key: 'ecommerce',
      description: 'Integrated online store, digital customer checkout, and digital orders.',
      available: hasModule('ecommerce'),
      isAddon: !basePlanModules.includes('ecommerce') && hasModule('ecommerce'),
    },
    {
      name: 'Payroll Management',
      key: 'payroll',
      description: 'Staff salaries, deductions, allowances, and payslip generation.',
      available: hasModule('payroll'),
      isAddon: !basePlanModules.includes('payroll') && hasModule('payroll'),
    },
  ];

  return (
    <PageLayout title="Plan & Billing">
      <div className="max-w-4xl space-y-6">
        {/* Current Subscription Card */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-header">
                  Current Subscription
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <h1 className="text-[1.6rem] md:text-3xl font-extrabold font-header tracking-tight text-foreground">
                {planLabel} Plan
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Determines which modules, register settings, and features are active across your business.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                isDisabled
                className="bg-foreground text-background font-bold text-xs uppercase font-header tracking-wider px-5 h-10 rounded-xl"
              >
                Upgrade Plan (Coming Soon)
              </Button>
              <Button
                isDisabled
                variant="flat"
                className="bg-secondary text-secondary-foreground font-bold text-xs uppercase font-header tracking-wider px-5 h-10 rounded-xl border border-border"
              >
                View Invoices
              </Button>
            </div>
          </div>
        </section>

        {/* Active Add-ons Section */}
        {addons && addons.length > 0 && (
          <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold font-header tracking-tight text-foreground">
                Active Add-ons
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5 pb-3 border-b">
              Modular extensions attached to your subscription without altering your base plan.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {addons.map((a: any) => (
                <div
                  key={a.id || a.addon_key}
                  className="p-4 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground capitalize text-sm font-header">
                        {a.addon_key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {a.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {a.billing_cycle === 'complimentary' || !a.price
                        ? 'Complimentary'
                        : `GH₵ ${Number(a.price).toFixed(2)} / ${a.billing_cycle === 'one_time' ? 'setup' : 'mo'}`}
                      {a.date_activated && ` · Activated ${new Date(a.date_activated).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Module Entitlements Breakdown */}
        <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-6 border border-border dark:border-border/60">
          <h2 className="text-xl font-bold font-header tracking-tight mb-1 text-foreground">
            Module Entitlements
          </h2>
          <p className="text-sm text-muted-foreground mb-6 pb-4 border-b">
            Features and modules included in your current subscription.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entitlements.map((item) => (
              <div
                key={item.key}
                className={`p-4 rounded-lg transition-all flex items-start gap-3.5 ${
                  item.available
                    ? 'bg-secondary/40 border-border/60'
                    : 'bg-muted/20 border-border/40 opacity-60'
                }`}
              >
                {item.available ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground font-header">
                      {item.name}
                    </h4>
                    {item.isAddon ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                        Active via Add-on
                      </span>
                    ) : !item.available ? (
                      <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.2 rounded-full border border-amber-500/20">
                        Upgrade Required
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
