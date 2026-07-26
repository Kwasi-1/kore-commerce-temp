/**
 * utils/permissions.ts
 * Frontend plan-to-modules mapping.
 * IMPORTANT: Keep in sync with models/tenants.py PLAN_MODULES on the backend.
 *
 * Usage:
 *   const modules = getModules(tenant.plan);
 *   if (modules.staff) { ... }
 *
 *   OR — preferred for new code:
 *   const hasModule = useFeaturesStore(s => s.hasModule);
 *   if (hasModule('staff')) { ... }
 */

export type TenantPlan =
  | 'starter'
  | 'standard'
  | 'business'
  | 'ecom_only'
  // Legacy values — kept for graceful backwards compat during migration
  | 'pos_only'
  | 'ecommerce_only'
  | 'full_suite'
  | string;

/**
 * Returns a structured boolean map of accessible modules for a given plan.
 * Used by Sidebar, BottomNav, and any component that needs a quick boolean check.
 * @deprecated Prefer useFeaturesStore(s => s.hasModule)('key') for new code.
 */
export const getModules = (plan: TenantPlan) => {
  const hasPOS       = ['starter', 'standard', 'business', 'pos_only', 'full_suite'].includes(plan);
  const hasAdvanced  = ['standard', 'business', 'full_suite'].includes(plan);
  const hasEcommerce = ['business', 'ecom_only', 'ecommerce_only', 'full_suite'].includes(plan);

  return {
    // Section-level show/hide booleans used by Sidebar & BottomNav
    pos:               hasPOS,
    credit_ledger:     hasAdvanced,
    returns:           hasAdvanced,
    inventory:         true,                 // always visible — level filtered inside
    inventory_advanced: hasAdvanced,
    suppliers:         hasAdvanced,
    purchase_orders:   hasAdvanced,
    supplier_credit:   hasAdvanced,
    stock_reconciliation: hasAdvanced,
    adjustments:       hasAdvanced,
    staff:             hasAdvanced,
    expenses:          hasAdvanced,
    ecommerce:         hasEcommerce,
    reports:           true,                 // basic reports always available
    reports_advanced:  hasAdvanced,
    settings:          true,                 // always
  };
};

/**
 * Human-readable plan label.
 */
export const getPlanLabel = (plan: TenantPlan): string => {
  const labels: Record<string, string> = {
    starter:        'Starter',
    standard:       'Standard',
    business:       'Business',
    ecom_only:      'Ecom Only',
    // Legacy
    pos_only:       'Starter',
    ecommerce_only: 'Ecom Only',
    full_suite:     'Business',
  };
  return labels[plan] || plan;
};

/**
 * Which plan tier is required to unlock a given module.
 */
export const MODULE_PLAN_REQUIREMENT: Record<string, string> = {
  pos:                  'Starter',
  inventory_basic:      'Starter',
  inventory_advanced:   'Standard',
  credit_ledger:        'Standard',
  returns:              'Standard',
  suppliers:            'Standard',
  purchase_orders:      'Standard',
  supplier_credit:      'Standard',
  stock_reconciliation: 'Standard',
  adjustments:          'Standard',
  staff:                'Standard',
  expenses:             'Standard',
  reports_basic:        'Starter',
  reports_advanced:     'Standard',
  ecommerce:            'Business or Ecom Only',
  payroll:              'Business',
};
